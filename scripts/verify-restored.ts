import { readFile } from "node:fs/promises";
import { cms } from "../src/lib/auth";
import { listDrafts } from "../src/lib/content";
import { mediaInfo, getBlob } from "../src/lib/media";
const access = JSON.parse(await readFile(".data/local-access.json", "utf8")),
  payload = await cms();
const owner = access.accounts.find((a: { role: string }) => a.role === "owner");
const result = await payload.login({
  collection: "users",
  data: { email: owner.email, password: owner.password },
  overrideAccess: false,
});
if (!result.token) throw new Error("복원 계정 인증 실패");
const drafts = await listDrafts();
for (const d of drafts) {
  if (d.data.hero) {
    const [m] = await mediaInfo([d.data.hero.id]);
    if (!m || !(await getBlob(m.derivatives[0].key)).length)
      throw new Error("복원 사진 조회 실패");
  }
}
console.log("복원 환경 대표 로그인·관리자 초안·대표 사진 조회 성공");
process.exit(0);
