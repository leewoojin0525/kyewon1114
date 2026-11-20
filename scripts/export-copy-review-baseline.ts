/** Read-only verification of the bilingual source against current publications. */
import fs from "node:fs/promises";
import { parseEnv, isDeepStrictEqual } from "node:util";

const source = "output/editorial-20261120";
const production = process.argv.includes("--production");
Object.assign(
  process.env,
  parseEnv(
    await fs.readFile(
      production ? ".data/production-runtime.env" : ".env",
      "utf8",
    ),
  ),
  production ? { APP_ENV: "production" } : {},
);
const { pool } = await import("../src/lib/db");
const { settingsSchema, imagesIn } = await import("../src/lib/model");
try {
  const rows = (
    await pool.query(
      `SELECT c.id,c.kind,c.published_version,v.data
     FROM w_content c JOIN w_versions v
     ON v.content_id=c.id AND v.version=c.published_version
     WHERE c.kind IN ('settings','projects')`,
    )
  ).rows;
  const projectSource = JSON.parse(
    await fs.readFile(`${source}/WOVN-Project-Copy-KO-EN.json`, "utf8"),
  );
  const studio = JSON.parse(
    await fs.readFile(`${source}/WOVN-Studio-Copy-KO-EN.json`, "utf8"),
  );
  const catalog = JSON.parse(
    await fs.readFile(".data/current-photo-catalog.json", "utf8"),
  );
  const projects = projectSource.projects.map(
    (p: { id: string; slug: string; title: string; en: string }) => {
      const live = rows.find((r) => r.kind === "projects" && r.id === p.id);
      const blocks =
        live?.data.blocks.filter((b: { type: string }) => b.type === "text") ||
        [];
      if (
        !live ||
        live.data.slug !== p.slug ||
        live.data.title !== p.title ||
        blocks.length !== 1 ||
        blocks[0].body !== p.en
      ) {
        throw new Error(`Refresh the project copy source: ${p.slug}`);
      }
      const photos = catalog.groups.find(
        (g: { slug: string }) => g.slug === p.slug,
      )?.photos;
      if (!photos?.length || photos[0].mediaId !== imagesIn(live.data)[0]?.id)
        throw new Error(`Refresh the cover: ${p.slug}`);
      return { id: p.id, slug: p.slug, version: live.published_version };
    },
  );
  if (projects.length !== rows.filter((r) => r.kind === "projects").length)
    throw new Error("Project copy source is incomplete");
  const settings = rows.find((r) => r.kind === "settings");
  if (!settings) throw new Error("Published Studio settings are required");
  const s = settingsSchema.parse(settings.data);
  const expected = {
    studioMotto: studio.motto.en,
    studioIntro: studio.intro.en,
    studioStatements: studio.statements.map(
      (r: { headingEn: string; en: string }) => ({
        heading: r.headingEn,
        body: r.en,
      }),
    ),
    studioServicesIntro: studio.servicesIntro.en,
    studioServices: studio.services.map((r: { en: string }) => r.en).join("\n"),
    studioServiceDescriptions: studio.services.map(
      (r: { descriptionEn: string }) => r.descriptionEn,
    ),
    studioProcessIntro: studio.processIntro.en,
    studioProcess: studio.process.map((r: { en: string }) => r.en).join("\n"),
    biography: studio.biography.en,
  };
  for (const [field, value] of Object.entries(expected)) {
    if (!isDeepStrictEqual(s[field as keyof typeof s], value))
      throw new Error(`Refresh the Studio source: ${field}`);
  }
  const result = {
    checkedAt: new Date().toISOString(),
    projects,
    studio: { id: settings.id, version: settings.published_version },
  };
  await fs.writeFile(
    ".data/current-copy-review-baseline.json",
    JSON.stringify(result, null, 2) + "\n",
    { mode: 0o600 },
  );
  console.log({
    projects: projects.length,
    studioVersion: settings.published_version,
    result: "Published copy matches bilingual review sources",
  });
} finally {
  await pool.end();
}
