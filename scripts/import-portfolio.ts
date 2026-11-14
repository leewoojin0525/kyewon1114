import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pool } from "../src/lib/db";
import { uploadPhoto } from "../src/lib/media";
import { createContent } from "../src/lib/content";
import { appEnv } from "../src/lib/env";
if (appEnv === "production")
  throw new Error("먼저 접근이 제한된 준비 환경에서 초안을 검토하세요.");
try {
  const previous = JSON.parse(
    await readFile(".data/portfolio-import.json", "utf8"),
  );
  console.log(`이미 가져온 초안: ${previous.contentId}`);
  process.exit(0);
} catch {}
const directory = resolve("assets/portfolio-candidates/kyobo-hottracks-2015");
const manifest = JSON.parse(
  await readFile(resolve(directory, "photo_manifest.json"), "utf8"),
);
const {
  rows: [user],
} = await pool.query(
  "SELECT id FROM cms.users WHERE role='owner' AND active=true ORDER BY id LIMIT 1",
);
if (!user) throw new Error("대표 계정을 먼저 생성하세요.");
const actor = { id: user.id, role: "owner" as const },
  photos = [];
for (const item of manifest) {
  const asset = await uploadPhoto(actor, {
    bytes: await readFile(resolve(directory, item.original_file)),
    type: "image/png",
  });
  photos.push({
    id: asset.id,
    alt: `KYOBO HOTTRACKS 매장 내부, 포트폴리오 ${item.source_page}쪽 사진`,
    caption: `LEE WOOJIN ASSOCIATES 포트폴리오 p.${item.source_page} · 촬영자 및 사용 권리 확인 대기`,
  });
}
const document = await createContent(actor, "projects", {
  title: "KYOBO HOTTRACKS",
  slug: "kyobo-hottracks-2015",
  summary:
    "서가와 상품 진열, 열람 공간이 함께 구성된 매장. 포트폴리오의 2015년 KYOBO HOTTRACKS 사진 기록입니다.",
  year: 2015,
  category: "상업",
  hero: photos[0],
  blocks: [
    {
      type: "text",
      heading: "공간의 기록",
      body: "기존 포트폴리오에 수록된 매장 사진입니다. 표기된 연도의 의미, 지점·지역, 실제 담당 범위와 사진 크레딧은 확인 중입니다.",
    },
    { type: "image", image: photos[1], width: "wide" },
    { type: "pair", left: photos[2], right: photos[3], ratio: "equal" },
    { type: "image", image: photos[4], width: "wide" },
    { type: "pair", left: photos[5], right: photos[6], ratio: "equal" },
  ],
  credits:
    "출처: LEE WOOJIN ASSOCIATES 포트폴리오 2–8쪽. 촬영자·공개 사용 권리 확인 대기.",
  creditConfirmed: false,
  publishReviewed: false,
});
await writeFile(
  ".data/portfolio-import.json",
  JSON.stringify(
    {
      contentId: document.id,
      mediaIds: photos.map((p) => p.id),
      status: "draft",
      source: "assets/portfolio-candidates/kyobo-hottracks-2015",
    },
    null,
    2,
  ),
  { mode: 0o600 },
);
console.log(
  `프로젝트 초안 저장: ${document.id} · 실제 사진 ${photos.length}장 · 미발행`,
);
await pool.end();
