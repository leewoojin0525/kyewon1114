import type { Metadata } from "next";
import { listPublic } from "@/lib/content";
import { imagesIn, settingsSchema } from "@/lib/model";
import { mediaInfo } from "@/lib/media";
import { homeReviewSnapshot } from "@/lib/home-review";
import references from "@/data/photo-review-references.json";
import { HomePhotoPicker } from "./picker";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "메인 사진 고르기",
  description: "WOVN 홈페이지 메인 사진 선택 요청 도구",
  robots: { index: false, follow: false },
};

export default async function HomePhotoReview() {
  // Uses the same current publications and permission-checked media route as the portfolio.
  const [projects, settingDocs] = await Promise.all([
    listPublic("projects"),
    listPublic("settings"),
  ]);
  const settings = settingsSchema.parse(settingDocs[0]?.data || {});
  const media = await mediaInfo([
    ...new Set(
      projects.flatMap((p) => imagesIn(p.data).map((photo) => photo.id)),
    ),
  ]);
  const snapshot = homeReviewSnapshot(
    projects,
    settings,
    settingDocs[0]?.version || 0,
    media,
    references,
  );
  return <HomePhotoPicker snapshot={snapshot} />;
}
