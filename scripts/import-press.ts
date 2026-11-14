import { readFile, writeFile, rename } from "node:fs/promises";
import { pool, type Actor } from "../src/lib/db";
import { uploadPhoto } from "../src/lib/media";
import {
  createContent,
  getDraft,
  saveDraft,
  workflow,
} from "../src/lib/content";
import { appEnv } from "../src/lib/env";
import { documentSchema, type Photo } from "../src/lib/model";
if (appEnv !== "development") throw new Error("로컬 Press 연결 전용입니다.");
const source = JSON.parse(
  await readFile("docs/press-source-review.json", "utf8"),
);
const portfolio = JSON.parse(
  await readFile(".data/portfolio-full-import.json", "utf8"),
);
const mappingPath = ".data/press-import.json";
let mapping: any = { assets: {}, records: {} };
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
try {
  // Oldest first so the public archive naturally places recent issues first.
  const records = source.records.filter(
    (record: any) => record.eligible_for_press,
  );
  for (const record of [...records].reverse() as any[]) {
    const existing = mapping.records[record.id];
    const current = existing ? await getDraft(existing.contentId) : undefined;
    if (
      current &&
      current.published_version !== null &&
      current.current_version !== current.published_version
    )
      throw new Error(`${record.id}: 편집 중인 초안이 있습니다.`);
    const ids = [
      record.cover_asset_id,
      ...record.asset_ids.filter((id: string) => id !== record.cover_asset_id),
    ];
    const title = record.title_en.replace(
      "KYOBO HOTTRACKS, D-Cube City",
      "KYOBO HOTTRACKS / Manual Design",
    );
    const photos: Photo[] = [];
    for (const [i, id] of ids.entries()) {
      const asset = source.assets.find((a: any) => a.asset_id === id);
      if (!asset?.visually_reviewed || !asset.selected_for_public_press)
        throw new Error(`${id}: 미검수 지면`);
      if (!mapping.assets[id]) {
        const mime =
          asset.format?.toLowerCase() === "png"
            ? "image/png"
            : asset.format?.toLowerCase() === "webp"
              ? "image/webp"
              : "image/jpeg";
        const media = await uploadPhoto(actor, {
          bytes: await readFile(asset.original_file),
          type: mime,
        });
        mapping.assets[id] = {
          mediaId: media.id,
          source: asset.original_file,
          sha256: asset.sha256,
        };
        await checkpoint();
      }
      photos.push({
        id: mapping.assets[id].mediaId,
        alt: `${record.magazine_name}${record.publication_date ? ` — ${record.publication_date}` : ""}, publication page ${i + 1}`,
        caption: "",
        focalX: 50,
        focalY: 50,
        mobileFocalX: 50,
        mobileFocalY: 50,
      });
    }
    const date = record.publication_date || "Date not stated";
    const issue = [
      record.issue
        ? /^(issue|vol\.?)/i.test(record.issue)
          ? record.issue
          : `Issue ${record.issue}`
        : "",
      date,
    ]
      .filter(Boolean)
      .join(" · ");
    const data = documentSchema.parse({
      ...current?.data,
      order: records.indexOf(record) + 1,
      title,
      slug: record.id,
      category: [
        "design_anthology",
        "yearbook",
        "book",
        "design_catalogue",
      ].includes(record.publication_type)
        ? "단행본 게재"
        : "잡지 게재",
      publicationName: record.magazine_name,
      publicationIssue: issue,
      sourceUrl: /^https?:/.test(record.source_url) ? "http://www.lwj.co.kr/m/" : "",
      summary: record.description_en.replace("D-Cube City", "Manual Design"),
      hero: photos[0],
      blocks: photos
        .slice(1)
        .map((image) => ({ type: "image", width: "wide", image })),
      relatedProjects: record.source_project_ids
        .map((id: string) => portfolio.projects[id]?.contentId)
        .filter(Boolean)
        .slice(0, 6),
      credits:
        `Source: ${record.source_url}\n${record.evidence.join("\n")}`.slice(
          0,
          2000,
        ),
      creditConfirmed: true,
      publishReviewed: true,
      seoDescription: `${record.magazine_name}, ${date}. Published coverage from the Lee Woojin Associates archive.`,
    });
    if (
      current &&
      current.current_version === current.published_version &&
      JSON.stringify(current.data) === JSON.stringify(data)
    )
      continue;
    const saved = current
      ? await saveDraft(
          actor,
          existing.contentId,
          current.current_version,
          data,
        )
      : await createContent(actor, "journal", data);
    mapping.records[record.id] = {
      contentId: saved.id,
      version: saved.version,
      published: false,
      title,
      pageCount: photos.length,
    };
    await checkpoint();
    await workflow(actor, saved.id, "publish", saved.version);
    mapping.records[record.id].published = true;
    await checkpoint();
    console.log(`${title}: ${photos.length}개 지면 발행`);
  }
  await writeFile(
    "docs/press-import-result.json",
    JSON.stringify(
      {
        importedAt: new Date().toISOString(),
        environment: "local-development",
        records: mapping.records,
      },
      null,
      2,
    ),
  );
} finally {
  await pool.end();
}
