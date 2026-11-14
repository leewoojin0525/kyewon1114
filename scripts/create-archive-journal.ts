import { readFile, writeFile } from "node:fs/promises";
import { pool } from "../src/lib/db";
import { createContent, getDraft, workflow } from "../src/lib/content";
import { imagesIn } from "../src/lib/model";
import { appEnv } from "../src/lib/env";
if (appEnv !== "development") throw new Error("로컬 자료 연결 전용입니다.");
const mapping = JSON.parse(
  await readFile(".data/portfolio-full-import.json", "utf8"),
);
const existing = await pool.query(
  "SELECT c.id FROM w_content c JOIN w_versions v ON v.content_id=c.id AND v.version=c.current_version WHERE c.kind='journal' AND v.data->>'slug'='kyobo-space-archive'",
);
if (existing.rowCount) {
  console.log("기존 아카이브 저널을 보존합니다.");
  await pool.end();
  process.exit(0);
}
const project = await getDraft(mapping.projects["01"].contentId);
const photos = imagesIn(project.data);
const {
  rows: [account],
} = await pool.query(
  "SELECT id FROM cms.users WHERE role='owner' AND active=true ORDER BY id LIMIT 1",
);
const actor = { id: account.id, role: "owner" as const };
const document = await createContent(actor, "journal", {
  title: "서가 사이에 놓인 자리",
  slug: "kyobo-space-archive",
  category: "공간 관찰",
  summary:
    "교보핫트랙스 디큐브시티점의 사진에서 살펴보는 서가, 진열대, 열람 좌석의 관계.",
  hero: photos[0],
  blocks: [
    {
      type: "text",
      heading: "책과 상품, 그리고 머무는 공간",
      body: "높은 서가와 낮은 진열대 사이에 테이블과 소파가 놓여 있습니다. 사진에서는 상품을 둘러보는 영역과 앉아 머무는 영역이 하나의 실내에 함께 구성된 모습을 볼 수 있습니다.",
    },
    { type: "image", image: photos[1], width: "wide" },
    {
      type: "text",
      heading: "위와 아래의 리듬",
      body: "천장의 선형 조명은 여러 방향으로 이어지고, 그 아래에는 목재 마감의 서가와 진열 가구가 배치되어 있습니다. 같은 공간 안에서도 가구의 높이와 좌석의 방향에 따라 서로 다른 장면이 만들어집니다.\n\n이 기록은 교보핫트랙스 디큐브시티점의 새로운 공간 매뉴얼 디자인 작업을 담은 기존 포트폴리오 사진을 바탕으로 구성했습니다. 자료에는 2015년 작업으로 표기되어 있습니다.",
    },
    { type: "pair", left: photos[2], right: photos[3], ratio: "equal" },
    {
      type: "text",
      heading: "작업 기록",
      body: "이우진어소시에이트 시기의 디자인 작업입니다.\n\n[프로젝트 사진 전체 보기](/projects/kyobo-hottracks-2015)",
    },
  ],
  relatedProjects: [project.id],
  credits:
    "디자인: 이우진 / 이우진어소시에이트\n사진 제공: 이우진\n자료: LEE WOOJIN ASSOCIATES 포트폴리오",
  creditConfirmed: true,
  publishReviewed: true,
});
await workflow(actor, document.id, "publish", document.version);
await writeFile(
  "docs/journal-source.json",
  JSON.stringify(
    {
      contentId: document.id,
      projectId: project.id,
      source: "assets/portfolio/01_KYOBO_HOTTRACKS_NEW_MANUAL_DESIGN",
      editorialMethod:
        "Provided photographs and user-confirmed project facts; no fabricated quote or design intent.",
      status: "published-locally",
    },
    null,
    2,
  ),
);
console.log("실제 프로젝트 사진에 근거한 공간 관찰 저널 1건을 연결했습니다.");
await pool.end();
