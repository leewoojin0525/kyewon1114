import { writeFile } from "node:fs/promises";
import { pool, type Actor } from "../src/lib/db";
import { listPublic, getDraft, saveDraft, workflow } from "../src/lib/content";
import { appEnv } from "../src/lib/env";
if (appEnv !== "development") throw new Error("Local content update only");
const {
  rows: [owner],
} = await pool.query(
  "SELECT id FROM cms.users WHERE role='owner' AND active=true ORDER BY id LIMIT 1",
);
const actor: Actor = { id: owner.id, role: "owner" };
try {
  const projects = await listPublic("projects");
  const sam = projects.find((p) => p.data.slug === "samjeon-165-18")!;
  const gong = projects.find((p) => p.data.slug === "gong-cha-korea-2015")!;
  const changes = [];
  // Explicit requested positions make this operation safe to re-run.
  for (const [doc, order] of [
    [sam, 2],
    [gong, 29],
  ] as const) {
    const current = await getDraft(doc.id);
    if (current.current_version !== current.published_version)
      throw new Error("Unpublished changes: " + doc.data.title);
    if (current.data.order === order) continue;
    const saved = await saveDraft(actor, doc.id, current.current_version, {
      ...current.data,
      order,
    });
    await workflow(actor, doc.id, "publish", saved.version);
    changes.push({ title: doc.data.title, order, version: saved.version });
  }
  const settings = (await listPublic("settings"))[0];
  const current = await getDraft(settings.id);
  if (current.current_version !== current.published_version)
    throw new Error("Unpublished settings");
  const biography = current.data.biography
    .replace(/\n*\[Profile archive[^\n]+\n*/g, "")
    .replace("Co-existence Is Imagination", "Coexistence Is Imagination")
    .replace("Soemi Gallery", "Gallery Seomi")
    .replace(
      "Seoul Design Olympic furniture exhibition",
      "Furniture exhibition, Seoul Design Olympiad",
    );
  const selectedProjects =
    sam.data.order === 2
      ? current.data.selectedProjects
      : current.data.selectedProjects.map((id: string) =>
          id === sam.id ? gong.id : id === gong.id ? sam.id : id,
        );
  const data = { ...current.data, biography, selectedProjects };
  if (JSON.stringify(data) !== JSON.stringify(current.data)) {
    const saved = await saveDraft(
      actor,
      settings.id,
      current.current_version,
      data,
    );
    await workflow(actor, settings.id, "publish", saved.version);
    changes.push({ settings: settings.id, version: saved.version });
  }
  await writeFile(
    "docs/profile-order-result.json",
    JSON.stringify({ updatedAt: new Date().toISOString(), changes }, null, 2),
  );
  console.log(JSON.stringify(changes));
} finally {
  await pool.end();
}
