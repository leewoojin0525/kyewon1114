/** Prepare a sanitized private catalogue and small, authenticated history previews. */
import fs from "node:fs/promises";
import sharp from "sharp";
import type {
  ReviewCatalog,
  ReviewCatalogRecord,
} from "../src/lib/photo-review-catalog";
const current = JSON.parse(
  await fs.readFile(".data/current-photo-catalog.json", "utf8"),
);
const history = JSON.parse(
  await fs.readFile(".data/photo-review-history.json", "utf8"),
);
const active = new Set<string>(
  current.photos.map((p: { reference: string }) => p.reference),
);
const all = new Map<string, any>(
  Object.values<any>(history).map((p) => [p.reference, p]),
);
for (const p of current.photos) all.set(p.reference, p);
const projects = new Map<string, string>(
  current.groups.map((g: any) => [g.slug, g.photos[0].projectId]),
);
await fs.mkdir(".site-review/thumbs", { recursive: true });
const photos: ReviewCatalogRecord[] = [];
for (const p of all.values()) {
  const projectId = projects.get(p.slug);
  if (!projectId || !/^[A-Za-z0-9-]{1,120}$/.test(p.reference))
    throw new Error("Unmapped review photo");
  const thumbnail = !active.has(p.reference);
  if (thumbnail)
    await sharp(p.output)
      .rotate()
      .resize({
        width: 640,
        height: 640,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 78 })
      .toFile(`.site-review/thumbs/${p.reference}.webp`);
  photos.push({
    reference: p.reference,
    projectId,
    photoId: p.mediaId,
    slug: p.slug,
    order: p.order,
    width: p.width,
    height: p.height,
    sourceStatus: p.sourceStatus || "원본 재확인",
    lowResolution: Boolean(p.lowResolution),
    thumbnail,
  });
}
const catalog: ReviewCatalog = { schemaVersion: 1, photos };
await fs.writeFile(".site-review/catalog.json", JSON.stringify(catalog));
console.log({
  projects: projects.size,
  current: active.size,
  history: photos.filter((p) => p.thumbnail).length,
});
