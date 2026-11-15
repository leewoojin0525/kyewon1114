import { writeFile } from "node:fs/promises";
import { pool } from "../src/lib/db";
import { listPublic } from "../src/lib/content";
import { imagesIn } from "../src/lib/model";
try {
  const { rows: counts } = await pool.query(
    "SELECT kind,COUNT(*)::int total,COUNT(published_version)::int published FROM w_content GROUP BY kind ORDER BY kind",
  );
  const [projects, press] = await Promise.all([
    listPublic("projects"),
    listPublic("journal"),
  ]);
  const result = {
    checkedAt: new Date().toISOString(),
    counts,
    projectPhotos: projects.reduce((n, p) => n + imagesIn(p.data).length, 0),
    pressPages: press.reduce((n, p) => n + imagesIn(p.data).length, 0),
    projects: projects.map((p) => ({
      id: p.id,
      slug: p.data.slug,
      title: p.data.title,
      version: p.version,
      photos: imagesIn(p.data).length,
    })),
    press: press.map((p) => ({
      title: p.data.title,
      slug: p.data.slug,
      version: p.version,
      pages: imagesIn(p.data).length,
    })),
    selections: {
      sHouse: "23 final photographs; S-house title; cover photograph 9.",
      yeonhuiSeed: "22 newly supplied photographs; cover photograph 7.",
      samjeon: "31 photographs; landscape evening exterior cover photograph 14.",
    },
  };
  await writeFile("docs/content-status.json", JSON.stringify(result, null, 2));
  console.log(
    JSON.stringify({
      counts,
      projectPhotos: result.projectPhotos,
      pressPages: result.pressPages,
    }),
  );
} finally {
  await pool.end();
}
