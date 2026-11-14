import { runWorker } from "../src/lib/inquiries";
import { pool } from "../src/lib/db";
let stopping = false;
process.on("SIGINT", () => {
  stopping = true;
});
process.on("SIGTERM", () => {
  stopping = true;
});
console.log(
  "WOVN 알림 작업자 시작 · 15초 간격 · 개인정보를 로그에 남기지 않습니다.",
);
while (!stopping) {
  try {
    await runWorker();
  } catch {
    console.error("작업자 처리 실패. DB와 환경 설정을 확인하세요.");
  }
  await new Promise((r) => setTimeout(r, 15000));
}
await pool.end();
