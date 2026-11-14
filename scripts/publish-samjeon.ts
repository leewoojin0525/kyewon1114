import { readFile, writeFile, rename } from "node:fs/promises";
import { pool, type Actor } from "../src/lib/db";
import { uploadPhoto } from "../src/lib/media";
import { getDraft, saveDraft, workflow } from "../src/lib/content";
import { type Photo, type Block } from "../src/lib/model";
import { appEnv } from "../src/lib/env";
if (appEnv !== "development") throw new Error("로컬 사진 적용 전용입니다.");
const mapPath = ".data/drive-project-import.json";
const mapping = JSON.parse(await readFile(mapPath, "utf8"));
const sources = JSON.parse(await readFile("assets/drive-projects/samjeon/source-files.json", "utf8"));
const record = mapping.projects["samjeon-165-18"];
const { rows: [account] } = await pool.query("SELECT id FROM cms.users WHERE role='owner' AND active=true ORDER BY id LIMIT 1");
const actor: Actor = { id: account.id, role: "owner" };
async function checkpoint() { await writeFile(`${mapPath}.tmp`, JSON.stringify(mapping, null, 2), { mode: 0o600 }); await rename(`${mapPath}.tmp`, mapPath); }
const order = [12,14,22,24,23,25,18,15,16,19,20,21,17,28,26,3,8,27,1,4,29,30,31,5,6,7,2,9,10,11,13];
try {
  if (record.phonePhotosPublished) { console.log("삼전동 사진 이미 적용됨"); } else {
    const current = await getDraft(record.contentId);
    if (current.current_version !== record.version || current.published_version) throw new Error("삼전동 초안에 추가 변경이 있어 자동 발행을 중단합니다.");
    const photos: Photo[] = [];
    for (const number of order) {
      const source = sources[number-1], key = source.id;
      const file = `samjeon/originals/${key}.jpg`;
      if (!mapping.assets[key]) {
        const m = await uploadPhoto(actor, { bytes: await readFile(`assets/drive-projects/${file}`), type: "image/jpeg" });
        mapping.assets[key] = { mediaId: m.id, file, sha256: source.sha256 };
        await checkpoint();
      }
      photos.push({ id: mapping.assets[key].mediaId, alt: number === 12 ? "Samjeon 165-18 at dusk with an illuminated facade" : `Samjeon 165-18 — architectural photograph ${number}`, caption: "", focalX: 50, focalY: 50, mobileFocalX: 50, mobileFocalY: 50 });
    }
    const blocks: Block[] = [];
    for (let i = 1; i < photos.length; i++) {
      const first = sources[order[i]-1], second = sources[order[i+1]-1];
      if (first.height > first.width && second && second.height > second.width) {
        blocks.push({ type: "pair", left: photos[i], right: photos[++i], ratio: "equal" });
      } else blocks.push({ type: "image", image: photos[i], width: "wide" });
    }
    const data = { ...current.data, title: "Samjeon 165-18", summary: "Samjeon 165-18. A spatial design project by Lee Woojin.", hero: photos[0], blocks, region: "", credits: "사용자가 2026-11-14 Drive의 삼전동 사진 폴더에 제공한 실제 촬영 사진 31장. 사용 권리 확인. 사진의 기존 워터마크 유지. 영상 추출 참고 장면은 이전 초안에만 보관.", creditConfirmed: true, publishReviewed: true, seoTitle: "Samjeon 165-18", seoDescription: "Samjeon 165-18. A project from the WOVN STUDIO portfolio." };
    const saved = await saveDraft(actor, record.contentId, current.current_version, data);
    await workflow(actor, record.contentId, "publish", saved.version);
    Object.assign(record, { version: saved.version, published: true, phonePhotosPublished: true, title: data.title, photoCount: photos.length, heroSourceId: sources[11].id, note: "2026-11-14 추가 사진 31장으로 영상 참고 초안을 대체해 발행. 표지: 12번, 푸른 저녁 하늘과 밝은 입면의 대비." });
    await checkpoint();
    await writeFile("docs/drive-project-import-result.json", JSON.stringify({ importedAt: new Date().toISOString(), environment: "local-development", projects: mapping.projects }, null, 2));
    console.log(`Samjeon 165-18: ${photos.length}장, 버전 ${saved.version} 발행`);
  }
} finally { await pool.end(); }
