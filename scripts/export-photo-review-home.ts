/** Capture only published homepage selections for the private photo review file. */
import fs from "node:fs/promises";
import { parseEnv } from "node:util";

if (process.argv.includes("--production")) {
  Object.assign(
    process.env,
    parseEnv(await fs.readFile(".data/production-runtime.env", "utf8")),
    { APP_ENV: "production" },
  );
} else {
  Object.assign(process.env, parseEnv(await fs.readFile(".env", "utf8")));
}

const { pool } = await import("../src/lib/db");
const { imagesIn, settingsSchema } = await import("../src/lib/model");
try {
  const rows = (
    await pool.query(
      `SELECT c.id, c.kind, c.published_version, v.data
       FROM w_content c JOIN w_versions v
       ON v.content_id=c.id AND v.version=c.published_version
       WHERE c.kind IN ('settings', 'projects')`,
    )
  ).rows;
  const settings = rows.find((row) => row.kind === "settings");
  if (!settings) throw new Error("Published settings are required");
  const catalog = JSON.parse(
    await fs.readFile(".data/current-photo-catalog.json", "utf8"),
  );
  const data = settingsSchema.parse(settings.data);
  const slides = data.homeSlides.map((slide, index) => {
    const project = rows.find(
      (row) => row.kind === "projects" && row.id === slide.projectId,
    );
    if (
      !project ||
      !imagesIn(project.data).some((p) => p.id === slide.photoId)
    ) {
      throw new Error("Homepage selection is no longer published");
    }
    const photo = catalog.photos.find(
      (p: { projectId: string; mediaId: string }) =>
        p.projectId === slide.projectId && p.mediaId === slide.photoId,
    );
    if (!photo)
      throw new Error("Refresh the photo catalog before homepage export");
    return {
      order: index + 1,
      reference: photo.reference,
      title: project.data.title,
      slug: project.data.slug,
      projectId: slide.projectId,
      photoId: slide.photoId,
    };
  });
  const result = {
    capturedAt: new Date().toISOString(),
    settingsVersion: settings.published_version,
    slides,
  };
  await fs.writeFile(
    ".data/current-home-selection.json",
    JSON.stringify(result, null, 2) + "\n",
    { mode: 0o600 },
  );
  console.log({
    settingsVersion: result.settingsVersion,
    references: slides.map((slide) => slide.reference),
  });
} finally {
  await pool.end();
}
