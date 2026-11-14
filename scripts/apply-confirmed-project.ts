// User-confirmed in this chat on 2026-11-14: D-Cube City branch, new manual design,
// own design work and permission to use all portfolio photos. No PM claim or guessed photographer.
import { readFile, writeFile } from "node:fs/promises";
import { pool } from "../src/lib/db";
import { getDraft, saveDraft, workflow } from "../src/lib/content";
import { appEnv } from "../src/lib/env";
if (appEnv !== "development")
  throw new Error("이 연결 스크립트는 로컬 검수 전용입니다.");
const mapping = JSON.parse(
  await readFile(".data/portfolio-import.json", "utf8"),
);
const draft = await getDraft(mapping.contentId);
const {
  rows: [account],
} = await pool.query(
  "SELECT id FROM cms.users WHERE role='owner' AND active=true ORDER BY id LIMIT 1",
);
const actor = { id: account.id, role: "owner" as const };
const photo = (p: any, index = 0) => ({
  ...p,
  alt:
    index === 0
      ? "교보핫트랙스 디큐브시티점의 서가와 진열대 사이에 놓인 열람 좌석"
      : `교보핫트랙스 디큐브시티점 매장 내부 ${index + 1}`,
  caption: "",
});
const data = {
  ...draft.data,
  title: "교보핫트랙스 디큐브시티점",
  summary: "교보핫트랙스의 새로운 공간 매뉴얼 디자인 프로젝트.",
  region: "디큐브시티점",
  workType: "인테리어",
  services: "공간 매뉴얼 디자인",
  company: "이우진어소시에이트",
  hero: photo(draft.data.hero),
  blocks: [
    {
      type: "text",
      heading: "새로운 공간 매뉴얼",
      body: "교보핫트랙스 디큐브시티점의 공간 매뉴얼 디자인 프로젝트입니다. 이우진어소시에이트 시기의 작업으로, 디자인을 맡았습니다.",
    },
    ...draft.data.blocks
      .filter((b: any) => b.type !== "text")
      .map((b: any, i: number) =>
        b.type === "image"
          ? { ...b, image: photo(b.image, i + 1) }
          : b.type === "pair"
            ? { ...b, left: photo(b.left, i + 1), right: photo(b.right, i + 2) }
            : b,
      ),
  ],
  credits: "디자인: 이우진 / 이우진어소시에이트\n사진 제공: 이우진",
  creditConfirmed: true,
  publishReviewed: true,
};
const saved = await saveDraft(actor, draft.id, draft.current_version, data);
await workflow(actor, draft.id, "publish", saved.version);
mapping.status = "published-locally";
mapping.userConfirmationDate = "2026-11-14";
await writeFile(
  ".data/portfolio-import.json",
  JSON.stringify(mapping, null, 2),
  { mode: 0o600 },
);
console.log(
  "확인된 프로젝트를 로컬 공개본과 홈 대표작에 연결했습니다. 외부 배포 없음.",
);
await pool.end();
