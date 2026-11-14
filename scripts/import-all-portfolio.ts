/**
 * User-authorized local import, 2026-11-14:
 * all photos may be used; publish eligible projects; omit all project locations.
 * Preserves extracted originals and records exactly which source entered the CMS.
 * Resumable mappings never overwrite a subsequently edited project.
 */
import { readFile, writeFile, rename, mkdir, stat } from "node:fs/promises";
import { resolve, extname } from "node:path";
import { createHash } from "node:crypto";
import { pool, type Actor } from "../src/lib/db";
import { uploadPhoto } from "../src/lib/media";
import {
  createContent,
  getDraft,
  saveDraft,
  workflow,
} from "../src/lib/content";
import { type Photo, type Block } from "../src/lib/model";
import { appEnv } from "../src/lib/env";

if (appEnv !== "development") throw new Error("로컬 자료 연결 전용입니다.");
type Asset = {
  asset_id: string;
  original_file: string;
  web_file: string;
  classification: string;
  source_page: number;
  original_width: number;
  original_height: number;
  low_resolution: boolean;
  duplicate_of?: string;
};
type Project = {
  id: string;
  name: string;
  source_year: number | null;
  category: string;
  workType: string | null;
  actual_role: string;
  factual_summary: string;
  factual_body: string[];
  credits: string;
  hero_asset_id: string | null;
  public_photo_asset_ids: string[];
  publish_candidate: boolean;
  publish_hold_reasons: string[];
  assets: Asset[];
  folder: string;
};
type Mapping = {
  assets: Record<
    string,
    { mediaId: string; importedFile: string; sha256?: string }
  >;
  projects: Record<
    string,
    {
      contentId: string;
      version: number;
      published: boolean;
      photoCount: number;
      title: string;
    }
  >;
  journalId?: string;
};
const root = resolve("assets/portfolio");
const projects: Project[] = JSON.parse(
  await readFile(resolve(root, "project_index.json"), "utf8"),
);
const mapPath = resolve(".data/portfolio-full-import.json");
let mapping: Mapping = { assets: {}, projects: {} };
try {
  mapping = JSON.parse(await readFile(mapPath, "utf8"));
} catch (e: any) {
  if (e.code !== "ENOENT") throw e;
}
async function checkpoint() {
  await writeFile(`${mapPath}.tmp`, JSON.stringify(mapping, null, 2), {
    mode: 0o600,
  });
  await rename(`${mapPath}.tmp`, mapPath);
}
const {
  rows: [account],
} = await pool.query(
  "SELECT id FROM cms.users WHERE role='owner' AND active=true ORDER BY id LIMIT 1",
);
if (!account) throw new Error("대표 계정을 먼저 준비하세요.");
const actor: Actor = { id: account.id, role: "owner" };
const firstImport = JSON.parse(
  await readFile(".data/portfolio-import.json", "utf8"),
);
// Seven unchanged source photographs were already imported in the first pass.
for (let i = 0; i < firstImport.mediaIds.length; i++) {
  const asset = projects[0].assets.find(
    (a) => a.source_page === i + 2 && a.classification === "photo",
  );
  if (asset && !mapping.assets[asset.asset_id])
    mapping.assets[asset.asset_id] = {
      mediaId: firstImport.mediaIds[i],
      importedFile: asset.original_file,
    };
}
const allAssets = new Map(
  projects.flatMap((p) => p.assets.map((a) => [a.asset_id, a] as const)),
);
const mime: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};
async function importAsset(asset: Asset): Promise<string> {
  if (mapping.assets[asset.asset_id])
    return mapping.assets[asset.asset_id].mediaId;
  if (asset.duplicate_of && allAssets.has(asset.duplicate_of)) {
    const id = await importAsset(allAssets.get(asset.duplicate_of)!);
    mapping.assets[asset.asset_id] = {
      ...mapping.assets[asset.duplicate_of],
      mediaId: id,
    };
    await checkpoint();
    return id;
  }
  let file = asset.original_file;
  if (
    !mime[extname(file).toLowerCase()] ||
    (await stat(resolve(root, file))).size > 25 * 1024 * 1024 ||
    asset.original_width * asset.original_height > 80_000_000
  )
    file = asset.web_file;
  const bytes = await readFile(resolve(root, file));
  const media = await uploadPhoto(actor, {
    bytes,
    type: mime[extname(file).toLowerCase()],
  });
  mapping.assets[asset.asset_id] = {
    mediaId: media.id,
    importedFile: file,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  };
  await checkpoint();
  return media.id;
}
function photo(p: Project, asset: Asset, index: number): Photo {
  const cg = asset.classification === "render";
  return {
    id: mapping.assets[asset.asset_id].mediaId,
    alt: `${p.name} ${cg ? "설계 투시도(CG)" : "공간 사진"} ${index + 1}`,
    caption: cg ? "설계 투시도(CG) · 완공 사진 아님" : "",
    focalX: 50,
    focalY: 50,
    mobileFocalX: 50,
    mobileFocalY: 50,
  };
}
function layout(photos: Photo[], intro: Block): Block[] {
  const blocks: Block[] = [intro];
  for (let i = 1; i < photos.length; ) {
    if (i % 3 === 2 && photos[i + 1]) {
      blocks.push({
        type: "pair",
        left: photos[i],
        right: photos[i + 1],
        ratio: "equal",
      });
      i += 2;
    } else {
      blocks.push({ type: "image", image: photos[i], width: "wide" });
      i++;
    }
  }
  return blocks;
}
try {
  for (const p of projects) {
    if (mapping.projects[p.id]?.version) {
      const prior = mapping.projects[p.id];
      if (!prior.published && p.publish_candidate) {
        const current = await getDraft(prior.contentId);
        if (current.current_version !== prior.version)
          throw new Error(`${p.name}: 추가 편집이 있어 발행을 중단합니다.`);
        await workflow(actor, prior.contentId, "publish", prior.version);
        prior.published = true;
        await checkpoint();
      }
      console.log(`이미 연결됨: ${p.name}`);
      continue;
    }
    const actual = p.assets.filter((a) => a.classification === "photo");
    // All actual photo records are in the library, including the low-resolution archival image.
    for (const asset of actual) await importAsset(asset);
    const selected = actual.length
      ? p.assets.filter(
          (a) =>
            p.public_photo_asset_ids.includes(a.asset_id) && !a.low_resolution,
        )
      : p.assets.filter((a) => a.classification === "render").slice(0, 2);
    const heroIndex = selected.findIndex((a) => a.asset_id === p.hero_asset_id);
    if (heroIndex > 0) selected.unshift(...selected.splice(heroIndex, 1));
    for (const asset of selected) await importAsset(asset);
    const photos = selected.map((a, i) => photo(p, a, i));
    const ready = p.publish_candidate && actual.length >= 2 && !!p.source_year;
    const body = [
      ...p.factual_body,
      ...(!ready
        ? [`공개 전 확인: ${p.publish_hold_reasons.join(" / ")}`]
        : []),
    ].join("\n\n");
    const data = {
      title: p.name,
      slug:
        p.id === "01"
          ? "kyobo-hottracks-2015"
          : p.folder
              .replace(/^\d+_/, "")
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/^-|-$/g, "") +
            (p.source_year ? `-${p.source_year}` : ""),
      summary: p.factual_summary,
      year: p.source_year ?? undefined,
      category: p.category,
      workType: p.workType || "",
      region: "",
      services: p.id === "01" ? "공간 매뉴얼 디자인" : "공간 디자인",
      company: "이우진어소시에이트",
      order: Number(p.id),
      credits: "디자인: 이우진 / 이우진어소시에이트\n사진 제공: 이우진",
      hero: photos[0],
      blocks: layout(photos, {
        type: "text",
        heading: ready ? "공간의 기록" : "설계 자료 · 공개 전 검토",
        body,
      }),
      creditConfirmed: true,
      publishReviewed: ready,
    };
    let saved;
    if (p.id === "01") {
      const previous = await getDraft(firstImport.contentId);
      if (previous.current_version !== 2)
        throw new Error(
          "교보 프로젝트에 추가 편집이 있습니다. 자동 덮어쓰기를 중단합니다.",
        );
      saved = {
        ...(await saveDraft(
          actor,
          previous.id,
          previous.current_version,
          data,
        )),
      };
    } else saved = await createContent(actor, "projects", data);
    mapping.projects[p.id] = {
      contentId: saved.id,
      version: saved.version,
      published: false,
      photoCount: actual.length ? photos.length : 0,
      title: p.name,
    };
    await checkpoint();
    if (ready) {
      await workflow(actor, saved.id, "publish", saved.version);
      mapping.projects[p.id].published = true;
      await checkpoint();
    }
    console.log(
      `${ready ? "발행" : "초안"}: ${p.name} · 사진 ${actual.length ? photos.length : 0}장`,
    );
  }
  await mkdir("docs", { recursive: true });
  const report = projects.map((p) => ({
    sourceId: p.id,
    ...mapping.projects[p.id],
    holdReasons: p.publish_hold_reasons,
    locationsOmitted: true,
    excludedLowResolution: p.assets
      .filter((a) => a.classification === "photo" && a.low_resolution)
      .map((a) => a.asset_id),
  }));
  await writeFile(
    "docs/portfolio-import-result.json",
    JSON.stringify(
      {
        importedAt: new Date().toISOString(),
        environment: "local-development",
        projects: report,
        sourceAssetMappings: Object.keys(mapping.assets).length,
      },
      null,
      2,
    ),
  );
  console.log(
    `완료: 프로젝트 ${report.length}개, 발행 ${report.filter((p) => p.published).length}개`,
  );
} finally {
  await pool.end();
}
