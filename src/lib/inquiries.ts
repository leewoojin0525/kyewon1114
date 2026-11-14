import { createHash, createHmac, randomUUID } from "node:crypto";
import { z } from "zod";
z.config(z.locales.ko());
import { AppError, audit, owner, pool, transaction, type Actor } from "./db";
import { appURL, isLive, required } from "./env";
export const privacyVersion = "2026-11-14-v1";
export const inquirySchema = z
  .object({
    submissionKey: z.uuid(),
    name: z.string().trim().min(2, "이름은 2자 이상 입력하세요.").max(50),
    replyMethod: z.enum(["email", "phone"]),
    contact: z.string().trim().max(254),
    message: z
      .string()
      .trim()
      .min(10, "문의 내용을 10자 이상 입력하세요.")
      .max(3000),
    projectType: z
      .enum(["", "신축", "리모델링", "인테리어", "기타·상담"])
      .default(""),
    service: z
      .enum(["", "디자인", "PM", "디자인+PM", "상담 후 결정"])
      .default(""),
    region: z.string().max(120).default(""),
    area: z.string().max(100).default(""),
    budget: z.string().max(150).default(""),
    schedule: z.string().max(150).default(""),
    reference: z.string().max(180).default(""),
    consent: z
      .boolean()
      .refine((v) => v === true, "개인정보 수집·이용 안내를 확인해 주세요."),
    website: z.string().max(200).default(""),
    startedAt: z.number(),
  })
  .superRefine((d, ctx) => {
    if (d.replyMethod === "email" && !z.email().safeParse(d.contact).success)
      ctx.addIssue({
        code: "custom",
        path: ["contact"],
        message: "올바른 이메일 주소를 입력하세요.",
      });
    if (d.replyMethod === "phone" && !/^\+?[0-9 ()-]{9,22}$/.test(d.contact))
      ctx.addIssue({
        code: "custom",
        path: ["contact"],
        message: "회신 가능한 전화번호를 입력하세요.",
      });
  });
export function fingerprint(value: string) {
  return createHmac("sha256", required("RATE_LIMIT_SECRET"))
    .update(value)
    .digest("hex");
}
export async function rateLimit(key: string, limit: number, seconds: number) {
  const {
    rows: [row],
  } = await pool.query(
    "INSERT INTO w_rate_limits(key,hits,resets_at) VALUES($1,1,now()+$2*interval '1 second') ON CONFLICT(key) DO UPDATE SET hits=CASE WHEN w_rate_limits.resets_at<now() THEN 1 ELSE w_rate_limits.hits+1 END,resets_at=CASE WHEN w_rate_limits.resets_at<now() THEN now()+$2*interval '1 second' ELSE w_rate_limits.resets_at END RETURNING hits",
    [fingerprint(key), seconds],
  );
  if (row.hits > limit)
    throw new AppError(
      429,
      "요청이 많습니다. 잠시 후 다시 시도하거나 이메일로 연락해 주세요.",
    );
}
export async function submitInquiry(raw: unknown, networkKey: string) {
  const d = inquirySchema.parse(raw);
  if (d.website || Date.now() - d.startedAt < 2000 || d.startedAt > Date.now())
    throw new AppError(400, "입력 내용을 확인하고 다시 제출해 주세요.");
  const { submissionKey, website, startedAt, ...data } = d;
  const hash = createHash("sha256").update(JSON.stringify(data)).digest("hex");
  const existing = await pool.query(
    "SELECT receipt,payload_hash FROM w_inquiries WHERE submission_key=$1",
    [submissionKey],
  );
  if (existing.rows[0]) {
    if (existing.rows[0].payload_hash !== hash)
      throw new AppError(
        409,
        "이미 접수된 제출 키입니다. 새 문의를 시작하세요.",
      );
    return { receipt: existing.rows[0].receipt };
  }
  await rateLimit(`inquiry:network:${networkKey}`, 30, 3600);
  await rateLimit(`inquiry:contact:${d.contact.toLowerCase()}`, 5, 3600);
  return transaction(async (db) => {
    // Serializes retries even across application instances.
    await db.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [
      submissionKey,
    ]);
    const {
      rows: [prior],
    } = await db.query(
      "SELECT receipt,payload_hash FROM w_inquiries WHERE submission_key=$1",
      [submissionKey],
    );
    if (prior) {
      if (prior.payload_hash !== hash)
        throw new AppError(409, "이미 접수된 제출 키입니다.");
      return { receipt: prior.receipt };
    }
    const id = randomUUID(),
      receipt = `WV-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${randomUUID().slice(0, 8).toUpperCase()}`;
    await db.query(
      "INSERT INTO w_inquiries(id,receipt,submission_key,payload_hash,data,privacy_version,consent_at) VALUES($1,$2,$3,$4,$5,$6,now())",
      [id, receipt, submissionKey, hash, data, privacyVersion],
    );
    await db.query(
      "INSERT INTO w_notification_jobs(id,inquiry_id) VALUES($1,$2)",
      [randomUUID(), id],
    );
    return { receipt };
  });
}
export async function listInquiries(actor: Actor) {
  owner(actor);
  return (
    await pool.query(
      "SELECT i.*,j.state AS notification_state,j.attempts,j.error_code,j.next_at FROM w_inquiries i JOIN w_notification_jobs j ON j.inquiry_id=i.id ORDER BY i.created_at DESC LIMIT 500",
    )
  ).rows;
}
export async function updateInquiry(actor: Actor, id: string, raw: unknown) {
  owner(actor);
  const d = z
    .object({
      state: z.enum(["new", "reviewing", "answered", "archived"]),
      note: z.string().max(5000),
    })
    .parse(raw);
  await pool.query("UPDATE w_inquiries SET state=$2,note=$3 WHERE id=$1", [
    id,
    d.state,
    d.note,
  ]);
}
export async function removeInquiry(actor: Actor, id: string) {
  owner(actor);
  await transaction(async (db) => {
    await db.query("DELETE FROM w_inquiries WHERE id=$1", [id]);
    await audit(db, actor, "inquiry.delete", id);
  });
}
export async function retryNotification(actor: Actor, id: string) {
  owner(actor);
  await transaction(async (db) => {
    // A fresh generation is used only for a conclusively failed/test job; never re-send a delivered job.
    const result = await db.query(
      "UPDATE w_notification_jobs SET state='pending',attempts=0,next_at=now(),error_code=NULL,generation=generation+1 WHERE inquiry_id=$1 AND state IN ('failed','test') RETURNING id",
      [id],
    );
    if (!result.rowCount)
      throw new AppError(
        409,
        "실패 또는 테스트 보관 상태의 알림만 재시도할 수 있습니다.",
      );
    await audit(db, actor, "notification.retry", id);
  });
}
type MailJob = {
  id: string;
  inquiry_id: string;
  attempts: number;
  generation: number;
  receipt: string;
  project_type: string;
  created_at: Date;
};
export async function deliver(job: MailJob) {
  if (process.env.MAIL_ADAPTER === "test" && !isLive)
    return { state: "test", providerId: null };
  if (
    process.env.MAIL_ADAPTER !== "resend" ||
    process.env.ALLOW_EXTERNAL_MAIL !== "true"
  )
    throw new Error("MAIL_NOT_CONFIGURED");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    signal: AbortSignal.timeout(15000),
    headers: {
      Authorization: `Bearer ${required("RESEND_API_KEY")}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `inquiry/${job.inquiry_id}/${job.generation}`,
    },
    body: JSON.stringify({
      from: required("MAIL_FROM"),
      to: [required("NOTIFICATION_TO")],
      subject: `[WOVN] 새 문의 ${job.receipt}`,
      text: `접수번호: ${job.receipt}\n유형: ${job.project_type || "미지정"}\n접수: ${new Date(job.created_at).toISOString()}\n관리자에서 확인: ${appURL}/admin?tab=inquiries\n개인정보는 인증된 관리자에서 확인하세요.`,
    }),
  });
  if (!response.ok) throw new Error(`MAIL_HTTP_${response.status}`);
  const result = await response.json();
  if (!result.id) throw new Error("MAIL_INVALID_RESPONSE");
  return { state: "sent", providerId: result.id as string };
}
export async function runWorker(send: typeof deliver = deliver) {
  await pool.query(
    "INSERT INTO w_worker_health(id,heartbeat) VALUES(1,now()) ON CONFLICT(id) DO UPDATE SET heartbeat=excluded.heartbeat",
  );
  let processed = 0;
  for (let n = 0; n < 20; n++) {
    const job = await transaction(async (db) => {
      const {
        rows: [job],
      } = await db.query(
        "SELECT j.*,i.receipt,i.data->>'projectType' AS project_type,i.created_at FROM w_notification_jobs j JOIN w_inquiries i ON i.id=j.inquiry_id WHERE (j.state IN ('pending','retry') AND j.next_at<=now()) OR (j.state='processing' AND j.locked_until<now()) ORDER BY j.next_at FOR UPDATE OF j SKIP LOCKED LIMIT 1",
      );
      if (!job) return null;
      await db.query(
        "UPDATE w_notification_jobs SET state='processing',locked_until=now()+interval '2 minutes',updated_at=now() WHERE id=$1",
        [job.id],
      );
      return job as MailJob;
    });
    if (!job) break;
    try {
      const result = await send(job);
      await pool.query(
        "UPDATE w_notification_jobs SET state=$2,provider_id=$3,attempts=attempts+1,locked_until=NULL,error_code=NULL,updated_at=now() WHERE id=$1",
        [job.id, result.state, result.providerId],
      );
    } catch (e) {
      const attempt = job.attempts + 1,
        delay = [60, 300, 1800][attempt - 1] || 1800;
      const code =
        e instanceof Error && /^(MAIL_[A-Z0-9_]+)$/.test(e.message)
          ? e.message
          : "MAIL_UNAVAILABLE";
      await pool.query(
        "UPDATE w_notification_jobs SET state=$2,attempts=$3,next_at=now()+$4*interval '1 second',locked_until=NULL,error_code=$5,updated_at=now() WHERE id=$1",
        [job.id, attempt >= 4 ? "failed" : "retry", attempt, delay, code],
      );
    }
    processed++;
  }
  // Data minimization: deleting an inquiry cascades to its notification job.
  await transaction(async (db) => {
    const { rows } = await db.query(
      "DELETE FROM w_inquiries WHERE expires_at<now() RETURNING id",
    );
    for (const row of rows)
      await audit(db, null, "inquiry.retention-delete", row.id);
    await db.query("DELETE FROM w_rate_limits WHERE resets_at<now()");
  });
  return { processed };
}
