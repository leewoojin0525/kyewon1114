import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { HomeReviewSnapshot } from "./home-review";
import type { PhotoReviewSnapshot, CatalogPhoto } from "./photo-review";

export type ReviewCatalogRecord = {
  reference: string;
  projectId: string;
  photoId: string;
  slug: string;
  order: number;
  width: number;
  height: number;
  sourceStatus: string;
  lowResolution: boolean;
  thumbnail: boolean;
};
export type ReviewCatalog = { schemaVersion: 1; photos: ReviewCatalogRecord[] };
const reviewDirectory = () =>
  resolve(process.env.PHOTO_REVIEW_DIRECTORY || ".site-review");

export async function readReviewCatalog(): Promise<ReviewCatalog> {
  return JSON.parse(
    await readFile(resolve(reviewDirectory(), "catalog.json"), "utf8"),
  );
}

/** Explicit allowlist projection. Historical images and metadata require Owner access. */
export function projectPhotoSnapshot(
  home: HomeReviewSnapshot,
  projects: PhotoReviewSnapshot["projects"],
  catalog: ReviewCatalog,
  privateHistory: boolean,
): PhotoReviewSnapshot {
  const byReference = new Map(catalog.photos.map((p) => [p.reference, p]));
  const activeRefs = new Set(home.photos.map((p) => p.reference));
  const projectMap = new Map(projects.map((p) => [p.id, p]));
  const history = catalog.photos.filter(
    (p) => projectMap.has(p.projectId) && !activeRefs.has(p.reference),
  );
  const photos: CatalogPhoto[] = home.photos.map((p) => {
    const source = byReference.get(p.reference);
    return {
      ...p,
      deleted: false,
      sourceStatus: source?.sourceStatus || "원본 재확인",
      lowResolution: source?.lowResolution || false,
    };
  });
  if (privateHistory)
    for (const p of history) {
      if (!p.thumbnail) continue;
      const project = projectMap.get(p.projectId)!;
      photos.push({
        key: `${p.projectId}:${p.photoId}`,
        projectId: p.projectId,
        photoId: p.photoId,
        projectVersion: project.version,
        title: project.title,
        reference: p.reference,
        order: p.order,
        deleted: true,
        sourceStatus: p.sourceStatus,
        lowResolution: p.lowResolution,
        src: `/api/review/photos/${encodeURIComponent(p.reference)}`,
        largeSrc: `/api/review/photos/${encodeURIComponent(p.reference)}`,
        alt: `${project.title} — ${p.reference}`,
        width: p.width,
        height: p.height,
      });
    }
  return {
    home,
    projects,
    photos,
    privateHistory,
    deletedCount: history.length,
  };
}

export async function privateReviewThumbnail(reference: string) {
  if (!/^[A-Za-z0-9-]{1,120}$/.test(reference)) return null;
  const catalog = await readReviewCatalog();
  if (!catalog.photos.some((p) => p.reference === reference && p.thumbnail))
    return null;
  return readFile(resolve(reviewDirectory(), "thumbs", `${reference}.webp`));
}
