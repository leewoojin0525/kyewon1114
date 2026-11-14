import { readFile, writeFile } from "node:fs/promises";
import { pool, type Actor } from "../src/lib/db";
import { getDraft, listPublic, saveDraft, workflow } from "../src/lib/content";
import { appEnv } from "../src/lib/env";
import { imagesIn, type Photo } from "../src/lib/model";

if (appEnv !== "development") throw new Error("Local content update only");
try {
  const projects = await listPublic("projects");
  const heim = projects.find(
    (p) => p.data.slug === "refresh-your-life-heim-2014",
  )!;
  const tied = projects.find((p) => p.data.slug === "tied-2013")!;
  const house = projects.find((p) => p.data.slug === "gwangjang-apartment")!;
  const settings = (await listPublic("settings"))[0];
  const drafts = await Promise.all(
    [heim, tied, house, settings].map((p) => getDraft(p.id)),
  );
  if (drafts.some((d) => d.current_version !== d.published_version))
    throw new Error("Review unpublished changes before applying refinements");
  const {
    rows: [account],
  } = await pool.query(
    "SELECT id FROM cms.users WHERE role='owner' AND active=true ORDER BY id LIMIT 1",
  );
  const actor: Actor = { id: account.id, role: "owner" };
  const changes: unknown[] = [];
  async function publish(current: any, data: any) {
    if (JSON.stringify(current.data) === JSON.stringify(data)) return;
    const saved = await saveDraft(
      actor,
      current.id,
      current.current_version,
      data,
    );
    await workflow(actor, current.id, "publish", saved.version);
    changes.push({
      id: current.id,
      title: data.title,
      order: data.order,
      version: saved.version,
    });
  }
  await publish(drafts[0], { ...drafts[0].data, order: 11 });
  await publish(drafts[1], { ...drafts[1].data, order: 3 });
  const mapping = JSON.parse(
    await readFile(".data/drive-project-import.json", "utf8"),
  );
  const coverSourceId = "1V1HCyKT0g15Gy7jhl9dJvlIF6ctCzj0Z";
  const coverId = mapping.assets[coverSourceId].mediaId;
  const data = structuredClone(drafts[2].data);
  const allPhotos = imagesIn(data);
  const selected = allPhotos.find((p: Photo) => p.id === coverId);
  if (!selected) throw new Error("Reviewed cover is missing from project");
  if (data.hero.id !== coverId) {
    const oldHero = structuredClone(data.hero);
    data.hero = structuredClone(selected);
    for (const block of data.blocks) {
      for (const key of ["image", "left", "right"])
        if (block[key]?.id === coverId) block[key] = oldHero;
    }
  }
  data.title = "S-house";
  for (const key of ["summary", "seoTitle", "seoDescription"])
    data[key] = data[key].replaceAll("Gwangjang Apartment", "S-house");
  for (const photo of imagesIn(data))
    photo.alt = photo.alt.replaceAll("Gwangjang Apartment", "S-house");
  data.hero.alt = "S-house — sculptural oak walls and warm daylight";
  if (new Set(imagesIn(data).map((p: Photo) => p.id)).size !== 23)
    throw new Error("Keep all 23 selected photographs");
  await publish(drafts[2], data);
  if (heim.data.order === 3 && tied.data.order === 11) {
    await publish(drafts[3], {
      ...drafts[3].data,
      selectedProjects: drafts[3].data.selectedProjects.map((id: string) =>
        id === heim.id ? tied.id : id === tied.id ? heim.id : id,
      ),
    });
  }
  await writeFile(
    "docs/project-refinements-result.json",
    JSON.stringify(
      {
        updatedAt: new Date().toISOString(),
        changes,
        coverSourceId,
        photoCount: 23,
      },
      null,
      2,
    ),
  );
  console.log(JSON.stringify(changes));
} finally {
  await pool.end();
}
