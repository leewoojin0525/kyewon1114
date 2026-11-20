import fs from "node:fs/promises";
import path from "node:path";
import type { Metadata } from "next";
import { listPublic } from "@/lib/content";
import { imagesIn } from "@/lib/model";
import { mediaInfo } from "@/lib/media";
import {
  publicCopyReview,
  type CopyTranslations,
} from "@/lib/copy-review-public";
import { CopyReview } from "./review";
import { isJournalEntry } from "@/lib/editorial-section";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "글 읽기·수정 요청",
  description: "WOVN 프로젝트·Studio·Journal 한글·영문 원고 검토",
  robots: { index: false, follow: false },
};

export default async function CopyReviewPage() {
  const [projects, settings, bundle, articles] = await Promise.all([
    listPublic("projects"),
    listPublic("settings"),
    fs.readFile(path.join(process.cwd(), ".site-copy/review.json"), "utf8"),
    listPublic("journal"),
  ]);
  const journals = articles.filter(isJournalEntry);
  const covers = await mediaInfo(
    [...projects, ...journals].flatMap((p) => imagesIn(p.data)[0]?.id || []),
  );
  return (
    <CopyReview
      records={publicCopyReview(
        projects,
        settings[0],
        JSON.parse(bundle) as CopyTranslations,
        covers,
        journals,
      )}
    />
  );
}
