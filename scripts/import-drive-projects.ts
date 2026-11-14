import { readFile, writeFile, rename } from "node:fs/promises";
import { resolve, extname } from "node:path";
import { createHash } from "node:crypto";
import { pool, type Actor } from "../src/lib/db";
import { uploadPhoto } from "../src/lib/media";
import { createContent, workflow, getDraft } from "../src/lib/content";
import { type Photo, type Block } from "../src/lib/model";
import { appEnv } from "../src/lib/env";

if (appEnv !== "development") throw new Error("로컬 자료 연결 전용입니다.");
const root = resolve("assets/drive-projects");
const mappingPath = ".data/drive-project-import.json";
let mapping: any = { assets: {}, projects: {} };
try {
  mapping = JSON.parse(await readFile(mappingPath, "utf8"));
} catch (e: any) {
  if (e.code !== "ENOENT") throw e;
}
async function checkpoint() {
  await writeFile(`${mappingPath}.tmp`, JSON.stringify(mapping, null, 2), {
    mode: 0o600,
  });
  await rename(`${mappingPath}.tmp`, mappingPath);
}
const {
  rows: [account],
} = await pool.query(
  "SELECT id FROM cms.users WHERE role='owner' AND active=true ORDER BY id LIMIT 1",
);
const actor: Actor = { id: account.id, role: "owner" };
type Source = { key: string; file: string; alt: string; focalY?: number };
type Project = {
  slug: string;
  title: string;
  order: number;
  publish: boolean;
  sources: Source[];
  note: string;
};
const hab = JSON.parse(
  await readFile(resolve(root, "hab-house-7/source-files.json"), "utf8"),
);
const apartment = JSON.parse(
  await readFile(
    resolve(root, "gwangjang-apartment/source-files.json"),
    "utf8",
  ),
);
const habOrder = [
  2, 6, 4, 1, 3, 5, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22,
  23, 24, 25, 26,
];
const apartmentOrder = [6, 7, 2, 1, 8, 9, 3, 5, 4, 10, 11, 12];
const projects: Project[] = [
  {
    slug: "hab-house-7",
    title: "햅하우스 7",
    order: 26,
    publish: true,
    note: "Drive 실제 사진 26장 시각 검수. 흑백 원본 유지. CG 3장 제외. 표지는 구름과 사선 입면이 함께 보이는 낮 전경 선택.",
    sources: habOrder.map((n) => ({
      key: hab[n - 1].id,
      file: `hab-house-7/originals/${hab[n - 1].id}.jpg`,
      alt: `햅하우스 7 건축 사진 ${n}`,
      focalY: n === 2 ? 35 : 50,
    })),
  },
  {
    slug: "yeonhui-seed",
    title: "연희동 씨앗",
    order: 27,
    publish: true,
    note: "매각자료 12~13쪽의 해당 건물 외관 사진 3장만 분리. 공사 중 실내, 비교 매물, 가격과 연락처 제외. 완공 시점은 기재하지 않음.",
    sources: [
      {
        key: "yeonhui-p12-2",
        file: "yeonhui-seed/originals/p12-2.jpg",
        alt: "연희동 씨앗 석재 입면과 상부 테라스",
        focalY: 20,
      },
      {
        key: "yeonhui-p12-1",
        file: "yeonhui-seed/originals/p12-1.jpg",
        alt: "연희동 씨앗 건물 외관 전경",
      },
      {
        key: "yeonhui-p13-2",
        file: "yeonhui-seed/originals/p13-2.jpg",
        alt: "연희동 씨앗 정면 외관 기록",
      },
    ],
  },
  {
    slug: "gwangjang-apartment",
    title: "광장아파트",
    order: 28,
    publish: true,
    note: "Drive 고해상도 사진 12장 시각 검수. 원본 별도 보존, sRGB/1920px 웹 사본을 CMS에 연결. 표지는 목재와 밝은 벽의 대비, 열린 동선이 함께 보이는 거실 컷.",
    sources: apartmentOrder.map((n) => ({
      key: apartment[n - 1].id,
      file: `gwangjang-apartment/web/${apartment[n - 1].id}.webp`,
      alt: `광장아파트 실내 사진 ${n}`,
    })),
  },
  {
    slug: "samjeon-165-18",
    title: "삼전동 165-18",
    order: 29,
    publish: false,
    note: "Drive 완공 영상 2개(76.92초,45.08초) 발견·보존. 외관·계단·실내·테라스 확인. 별도 사진 원본 없음. 임대 홍보 문구와 계정 워터마크가 있는 영상 추출 장면이므로 공개하지 않고 참고 초안으로 보관.",
    sources: [
      {
        key: "samjeon-video1-frame00",
        file: "samjeon/review-video-1/frame-00.jpg",
        alt: "삼전동 165-18 외관 영상 추출 참고 장면",
      },
      {
        key: "samjeon-video1-frame17",
        file: "samjeon/review-video-1/frame-17.jpg",
        alt: "삼전동 165-18 테라스 영상 추출 참고 장면",
      },
    ],
  },
];
try {
  for (const p of projects) {
    if (mapping.projects[p.slug]) {
      console.log(`이미 연결됨: ${p.title}`);
      continue;
    }
    const photos: Photo[] = [];
    for (const source of p.sources) {
      if (!mapping.assets[source.key]) {
        const bytes = await readFile(resolve(root, source.file));
        const result = await uploadPhoto(actor, {
          bytes,
          type: extname(source.file) === ".webp" ? "image/webp" : "image/jpeg",
        });
        mapping.assets[source.key] = {
          mediaId: result.id,
          file: source.file,
          sha256: createHash("sha256").update(bytes).digest("hex"),
        };
        await checkpoint();
      }
      photos.push({
        id: mapping.assets[source.key].mediaId,
        alt: source.alt,
        caption: p.publish ? "" : "영상에서 추출한 참고 장면",
        focalX: 50,
        focalY: source.focalY ?? 50,
        mobileFocalX: 50,
        mobileFocalY: source.focalY ?? 50,
      });
    }
    const blocks: Block[] = [];
    for (let i = 1; i < photos.length; i++) {
      if (p.slug === "hab-house-7" && i % 3 === 1 && photos[i + 1]) {
        blocks.push({
          type: "pair",
          left: photos[i],
          right: photos[++i],
          ratio: "equal",
        });
      } else blocks.push({ type: "image", image: photos[i], width: "wide" });
    }
    const saved = await createContent(actor, "projects", {
      title: p.title,
      slug: p.slug,
      hero: photos[0],
      blocks,
      order: p.order,
      summary: "",
      region: "",
      credits: `사용자가 디자인 및 사진 사용 권리를 확인함.\n${p.note}`,
      creditConfirmed: true,
      publishReviewed: p.publish,
    });
    mapping.projects[p.slug] = {
      contentId: saved.id,
      version: saved.version,
      photoCount: photos.length,
      published: false,
      title: p.title,
      note: p.note,
    };
    await checkpoint();
    if (p.publish) {
      await workflow(actor, saved.id, "publish", saved.version);
      mapping.projects[p.slug].published = true;
      await checkpoint();
    }
    console.log(
      `${p.publish ? "발행" : "참고 초안"}: ${p.title} · ${photos.length}장`,
    );
  }
  await writeFile(
    "docs/drive-project-import-result.json",
    JSON.stringify(
      {
        importedAt: new Date().toISOString(),
        environment: "local-development",
        projects: mapping.projects,
      },
      null,
      2,
    ),
  );
} finally {
  await pool.end();
}
