import { pool } from "../src/lib/db";
import { publicSettings, listPublic } from "../src/lib/content";
const failures: string[] = [];
for (const name of [
  "APP_URL",
  "DATABASE_URL",
  "PAYLOAD_SECRET",
  "RATE_LIMIT_SECRET",
  "RESEND_API_KEY",
  "MAIL_FROM",
  "NOTIFICATION_TO",
])
  if (!process.env[name]) failures.push(`${name} 미설정`);
if (process.env.APP_ENV !== "production")
  failures.push("APP_ENV가 production이 아님");
if (!process.env.APP_URL?.startsWith("https://"))
  failures.push("HTTPS 공개 주소 미설정");
if (process.env.STORAGE_DRIVER === "vercel-blob") {
  if (!process.env.BLOB_READ_WRITE_TOKEN)
    failures.push("비공개 Blob 저장소 미연결");
} else if (process.env.STORAGE_DRIVER === "s3") {
  for (const name of [
    "S3_ENDPOINT",
    "S3_BUCKET",
    "S3_ACCESS_KEY_ID",
    "S3_SECRET_ACCESS_KEY",
  ])
    if (!process.env[name]) failures.push(`${name} 미설정`);
} else failures.push("영구 사진 저장소 미연결");
if (
  process.env.MAIL_ADAPTER !== "resend" ||
  process.env.ALLOW_EXTERNAL_MAIL !== "true"
)
  failures.push("실제 메일 어댑터 미연결");
const settings = await publicSettings(),
  projects = await listPublic("projects"),
  journal = await listPublic("journal");
if (!settings.logoApproved) failures.push("승인 로고 확인 전");
if (!settings.privacyApproved || !settings.privacyProcessors || !settings.email)
  failures.push("연락처·개인정보 처리 안내 확인 전");
if (projects.filter((p) => !p.data.demo).length < 4)
  failures.push("실제 프로젝트 4건 미만");
if (!journal.some((j) => !j.data.demo)) failures.push("실제 저널 1건 미만");
const testAccounts = await pool.query(
  "SELECT COUNT(*) FROM cms.users WHERE active=true AND email LIKE '%.test'",
);
if (Number(testAccounts.rows[0].count))
  failures.push("개발 시험 계정 활성 상태");
const health = await pool.query(
  "SELECT 1 FROM w_worker_health WHERE heartbeat>now()-interval '1 minute'",
);
if (!health.rowCount) failures.push("최근 작업자 실행 기록 없음");
const sent = await pool.query(
  "SELECT 1 FROM w_notification_jobs WHERE state='sent' LIMIT 1",
);
if (!sent.rowCount) failures.push("실제 알림 수신 검증 필요");
await pool.end();
if (failures.length) {
  console.log(
    "공개 전 연결·검증 필요:\n" + failures.map((f) => `- ${f}`).join("\n"),
  );
  process.exitCode = 1;
} else
  console.log(
    "자동 공개 전 검사 통과. 실제 콘텐츠·DNS/MX 보존·복원·성능 검수 결과를 별도로 확인하세요.",
  );
