import { readFile, writeFile } from "node:fs/promises";
import { pool, type Actor } from "../src/lib/db";
import { getDraft, saveDraft, workflow } from "../src/lib/content";
import { imagesIn, type Content, type Photo } from "../src/lib/model";
import { appEnv } from "../src/lib/env";

if (appEnv !== "development")
  throw new Error("로컬 표지 선택 적용 전용입니다.");
const selection = JSON.parse(
  await readFile("docs/cover-selection.json", "utf8"),
);
const mapping = JSON.parse(
  await readFile(".data/portfolio-full-import.json", "utf8"),
);
const {
  rows: [account],
} = await pool.query(
  "SELECT id FROM cms.users WHERE role='owner' AND active=true ORDER BY id LIMIT 1",
);
const actor: Actor = { id: account.id, role: "owner" };
const report = [];
try {
  for (const item of selection.selections) {
    const contentId = mapping.projects[item.source_project_id].contentId;
    const current = await getDraft(contentId);
    if (!current.published_version)
      throw new Error(`${item.project_name}: 비공개 항목은 변경하지 않습니다.`);
    if (current.current_version !== current.published_version)
      throw new Error(`${item.project_name}: 별도 편집 중인 초안이 있습니다.`);
    const data = current.data as Content;
    const chosenId = mapping.assets[item.selected_asset_id].mediaId;
    const chosen = imagesIn(data).find((p) => p.id === chosenId);
    if (!chosen || !data.hero)
      throw new Error(`${item.project_name}: 본문 사진 연결을 확인하세요.`);
    const hero: Photo = {
      ...chosen,
      focalX: item.focalX,
      focalY: item.focalY,
      mobileFocalX: item.focalX,
      mobileFocalY: item.focalY,
    };
    if (JSON.stringify(data.hero) === JSON.stringify(hero)) {
      report.push({
        title: data.title,
        contentId,
        version: current.current_version,
        status: "already applied",
        hero: chosenId,
      });
      continue;
    }
    // Exchange the chosen body photo with the previous cover, preserving every photograph and the layout.
    const previous = data.hero;
    const exchange = (p?: Photo) =>
      p?.id === chosenId && chosenId !== previous.id ? previous : p;
    const blocks = data.blocks.map((b) =>
      b.type === "image"
        ? { ...b, image: exchange(b.image) }
        : b.type === "pair"
          ? { ...b, left: exchange(b.left), right: exchange(b.right) }
          : b,
    );
    const updated = { ...data, hero, blocks };
    const before = imagesIn(data)
      .map((p) => p.id)
      .sort();
    const after = imagesIn(updated)
      .map((p) => p.id)
      .sort();
    if (JSON.stringify(before) !== JSON.stringify(after))
      throw new Error("사진 보존 검증 실패");
    const saved = await saveDraft(
      actor,
      contentId,
      current.current_version,
      updated,
    );
    await workflow(actor, contentId, "publish", saved.version);
    report.push({
      title: data.title,
      contentId,
      previousVersion: current.current_version,
      version: saved.version,
      previousHero: previous.id,
      hero: chosenId,
      status: previous.id === chosenId ? "focal updated" : "cover changed",
      photoCount: after.length,
    });
    await writeFile(
      "docs/cover-application-result.json",
      JSON.stringify(report, null, 2),
    );
    console.log(`${data.title}: ${report.at(-1)!.status}`);
  }
  await writeFile(
    "docs/cover-application-result.json",
    JSON.stringify(report, null, 2),
  );
} finally {
  await pool.end();
}
