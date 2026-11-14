import { readFile, writeFile } from "node:fs/promises";
import { pool, type Actor } from "../src/lib/db";
import { getDraft, listPublic, saveDraft, workflow } from "../src/lib/content";
import { imagesIn } from "../src/lib/model";
import { appEnv } from "../src/lib/env";

if (appEnv !== "development") throw new Error("Local content update only");
try {
  const doc = (await listPublic("projects")).find(
    (p) => p.data.slug === "samjeon-165-18",
  )!;
  const current = await getDraft(doc.id);
  if (current.current_version !== current.published_version)
    throw new Error("Review unpublished changes first");
  const mapping = JSON.parse(
    await readFile(".data/drive-project-import.json", "utf8"),
  );
  const sourceId = "1NcZ_H0wKpxCuFyqvAMNr8_0JEJ_PtLEF";
  const mediaId = mapping.assets[sourceId].mediaId;
  const data = structuredClone(current.data);
  const selected = imagesIn(data).find((p) => p.id === mediaId);
  if (!selected) throw new Error("Reviewed front elevation photograph missing");
  if (data.hero.id !== mediaId) {
    const previous = structuredClone(data.hero);
    data.hero = structuredClone(selected);
    for (const block of data.blocks) {
      for (const key of ["image", "left", "right"])
        if (block[key]?.id === mediaId) block[key] = previous;
    }
  }
  data.hero.alt =
    "Samjeon 165-18 — complete building in a landscape view at dusk";
  delete data.hero.fit;
  for (const block of data.blocks)
    for (const key of ["image", "left", "right"])
      if (block[key]) delete block[key].fit;
  if (new Set(imagesIn(data).map((p) => p.id)).size !== 31)
    throw new Error("Keep all 31 photographs");
  if (JSON.stringify(data) !== JSON.stringify(current.data)) {
    const {
      rows: [account],
    } = await pool.query(
      "SELECT id FROM cms.users WHERE role='owner' AND active=true ORDER BY id LIMIT 1",
    );
    const actor: Actor = { id: account.id, role: "owner" };
    const saved = await saveDraft(actor, doc.id, current.current_version, data);
    await workflow(actor, doc.id, "publish", saved.version);
    await writeFile(
      "docs/samjeon-front-cover-result.json",
      JSON.stringify(
        {
          updatedAt: new Date().toISOString(),
          contentId: doc.id,
          version: saved.version,
          sourceId,
          mediaId,
          photoCount: 31,
          fit: "cover",
        },
        null,
        2,
      ),
    );
    console.log(
      `Samjeon landscape evening exterior published, v${saved.version}`,
    );
  }
} finally {
  await pool.end();
}
