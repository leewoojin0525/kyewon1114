import type { Metadata } from "next";
import { headers } from "next/headers";
import { authenticate } from "@/lib/auth";
import { listPublic } from "@/lib/content";
import { imagesIn, settingsSchema } from "@/lib/model";
import { mediaInfo } from "@/lib/media";
import { homeReviewSnapshot } from "@/lib/home-review";
import {
  projectPhotoSnapshot,
  readReviewCatalog,
} from "@/lib/photo-review-catalog";
import references from "@/data/photo-review-references.json";
import { PhotoReview } from "./review";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "프로젝트 사진목록 · 메인 사진 선택",
  robots: { index: false, follow: false },
};
export default async function Page() {
  const requestHeaders = await headers();
  let privateHistory = false;
  if (requestHeaders.get("cookie")?.includes("payload-token=")) {
    try {
      privateHistory =
        (await authenticate(new Headers(requestHeaders))).role === "owner";
    } catch {
      /* Public photographs remain available without a session. */
    }
  }
  const [projects, settingsDocs, catalog] = await Promise.all([
    listPublic("projects"),
    listPublic("settings"),
    readReviewCatalog(),
  ]);
  const media = await mediaInfo([
    ...new Set(
      projects.flatMap((p) => imagesIn(p.data).map((photo) => photo.id)),
    ),
  ]);
  const home = homeReviewSnapshot(
    projects,
    settingsSchema.parse(settingsDocs[0]?.data || {}),
    settingsDocs[0]?.version || 0,
    media,
    references,
  );
  const snapshot = projectPhotoSnapshot(
    home,
    projects.map((p) => ({
      id: p.id,
      title: p.data.title.toUpperCase(),
      version: p.version,
    })),
    catalog,
    privateHistory,
  );
  return <PhotoReview snapshot={snapshot} />;
}
