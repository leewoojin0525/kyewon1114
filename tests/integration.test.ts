import "../src/lib/env";
import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes, randomUUID, createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import pg from "pg";
import sharp from "sharp";
let db: typeof import("../src/lib/db"),
  content: typeof import("../src/lib/content"),
  inquiries: typeof import("../src/lib/inquiries"),
  media: typeof import("../src/lib/media"),
  route: typeof import("../src/app/api/wovn/[...path]/route"),
  mediaRoute: typeof import("../src/app/media/[id]/[size]/route"),
  payload: Awaited<ReturnType<(typeof import("../src/lib/auth"))["cms"]>>;
let owner: any,
  editor: any,
  ownerCookie: string,
  editorCookie: string,
  asset: any,
  docId: string;
const dbName = `wovn_test_${Date.now()}`,
  admin = new pg.Pool({ connectionString: process.env.DATABASE_URL }),
  base = "http://127.0.0.1:3000";
const password = randomBytes(24).toString("hex");
test("direct uploads require authentication, same origin, and an actor-owned path", async () => {
  const { uploadPathBelongsTo } = await import("../src/lib/direct-upload");
  const id = randomUUID();
  assert.equal(
    uploadPathBelongsTo({ id: 7, role: "editor" }, `staging/7/${id}`),
    true,
  );
  for (const path of [
    `staging/8/${id}`,
    `staging/7/../${id}`,
    `https://example.com/${id}`,
    `${id}/original`,
  ])
    assert.equal(uploadPathBelongsTo({ id: 7, role: "editor" }, path), false);
  assert.equal((await request("media/prepare", "POST", {})).status, 401);
  assert.equal(
    (
      await request(
        "media/prepare",
        "POST",
        {},
        editorCookie,
        "https://other.example",
      )
    ).status,
    403,
  );
  const prepared = await request("media/prepare", "POST", {}, editorCookie);
  assert.equal(prepared.status, 200);
  assert.deepEqual(await prepared.json(), { direct: false });
});
test("scheduled maintenance rejects requests without the configured secret", async () => {
  const maintenance = await import("../src/app/api/maintenance/route");
  assert.equal(
    (await maintenance.GET(new Request(`${base}/api/maintenance`))).status,
    401,
  );
  assert.equal(
    (
      await maintenance.GET(
        new Request(`${base}/api/maintenance`, {
          headers: { authorization: "Bearer invalid" },
        }),
      )
    ).status,
    401,
  );
});
async function request(
  path: string,
  method = "GET",
  body?: unknown,
  cookie = "",
  origin = base,
) {
  const req = new Request(`${base}/api/wovn/${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Origin: origin,
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return route[method as "GET" | "POST" | "PUT" | "DELETE"](req, {
    params: Promise.resolve({ path: path.split("/") }),
  });
}
function validData(title = "DEMO — 권한 시험") {
  return {
    title,
    slug: "demo-authorization-test",
    summary: "자동 시험용 자료입니다. 우븐의 실제 프로젝트가 아닙니다.",
    year: 2026,
    category: "업무",
    workType: "리모델링",
    region: "시험 지역",
    services: "시험 역할",
    company: "시험용 회사",
    credits: "자동 생성 단색 시험 이미지",
    creditConfirmed: true,
    publishReviewed: true,
    demo: true,
    hero: { id: asset.id, alt: "시험 단색 이미지" },
    blocks: [
      {
        type: "text",
        heading: "시험",
        body: "이 자료는 통합 시험 종료 시 삭제됩니다.",
      },
      {
        type: "image",
        image: { id: asset.id, alt: "본문 시험 이미지" },
        width: "wide",
      },
    ],
  };
}
test("a single-photo project publishes its reviewed cover and still requires rights", async () => {
  const data = { ...validData(), slug: "single-photo-project", blocks: [] };
  const created = await content.createContent(owner, "projects", data);
  await assert.rejects(
    content.workflow(editor, created.id, "publish", created.version),
    { status: 403 },
  );
  await content.workflow(owner, created.id, "review", created.version);
  await content.workflow(owner, created.id, "publish", created.version);
  const { doc } = await content.publicBySlug("projects", data.slug);
  assert.ok(doc);
  assert.equal(doc.data.hero?.id, asset.id);
  assert.deepEqual(doc.data.blocks, []);
  await content.saveDraft(owner, created.id, created.version, {
    ...data,
    creditConfirmed: false,
  });
  await assert.rejects(
    content.workflow(owner, created.id, "publish", created.version + 1),
    { status: 422 },
  );
  assert.equal(
    (await content.publicBySlug("projects", data.slug)).doc?.version,
    created.version,
  );
  await content.workflow(owner, created.id, "unpublish", created.version + 1);
});
test("large project galleries serve only the published photo inside a private bundle", async () => {
  const photo = await media.getBlob(asset.derivatives[0].key);
  const prefix = Buffer.from("PRIVATE-BEFORE"),
    suffix = Buffer.from("PRIVATE-AFTER");
  const pack = Buffer.concat([prefix, photo, suffix]);
  const packKey = `packs/${createHash("sha256").update(pack).digest("hex")}.bin`;
  const { mkdtemp, mkdir, writeFile, rm } = await import("node:fs/promises");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const bundleDir = await mkdtemp(join(tmpdir(), "wovn-route-bundle-"));
  await mkdir(join(bundleDir, "packs"));
  await writeFile(join(bundleDir, packKey), pack);
  const id = randomUUID(),
    width = asset.derivatives[0].width,
    height = asset.derivatives[0].height,
    key = `${id}/${width}.webp`;
  const packed = {
    key: packKey,
    offset: prefix.length,
    bytes: photo.length,
    sha256: createHash("sha256").update(photo).digest("hex"),
  };
  await db.pool.query(
    "INSERT INTO w_media(id,original_key,mime,bytes,width,height,derivatives,uploaded_by) VALUES($1,$2,'image/webp',$3,$4,$5,$6,$7)",
    [
      id,
      key,
      photo.length,
      width,
      height,
      JSON.stringify([{ width, height, key, bytes: photo.length, packed }]),
      owner.id,
    ],
  );
  const data = {
    ...validData(),
    slug: "packed-gallery-test",
    hero: { id, alt: "Verified photograph" },
    blocks: Array.from({ length: 141 }, () => ({
      type: "image",
      image: { id, alt: "Gallery photograph" },
      width: "wide",
    })),
  };
  await writeFile(
    join(bundleDir, "manifest.json"),
    JSON.stringify({
      format: 1,
      entries: {
        [key]: {
          key: packKey,
          offset: prefix.length,
          bytes: photo.length,
          sha256: packed.sha256,
        },
      },
    }),
  );
  const previousBundle = process.env.MEDIA_BUNDLE_DIRECTORY;
  process.env.MEDIA_BUNDLE_DIRECTORY = bundleDir;
  try {
    const created = await content.createContent(owner, "projects", data);
    const read = () =>
      mediaRoute.GET(new Request(`${base}/media/${key}`), {
        params: Promise.resolve({ id, size: `${width}.webp` }),
      });
    assert.equal((await read()).status, 404);
    await content.workflow(owner, created.id, "publish", created.version);
    const response = await read();
    assert.equal(response.status, 200);
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), photo);
    assert.equal(
      (
        await mediaRoute.GET(new Request(`${base}/media/${packKey}`), {
          params: Promise.resolve({ id: "packs", size: packKey.split("/")[1] }),
        })
      ).status,
      404,
    );
    await content.workflow(owner, created.id, "unpublish", created.version);
    assert.equal((await read()).status, 404);
  } finally {
    if (previousBundle === undefined) delete process.env.MEDIA_BUNDLE_DIRECTORY;
    else process.env.MEDIA_BUNDLE_DIRECTORY = previousBundle;
    await rm(bundleDir, { recursive: true, force: true });
  }
});
before(
  async () => {
    await admin.query(`CREATE DATABASE "${dbName}"`);
    const u = new URL(process.env.DATABASE_URL!);
    u.pathname = `/${dbName}`;
    process.env.DATABASE_URL = u.toString();
    process.env.CMS_SCHEMA_PUSH = "false";
    process.env.APP_ENV = "test";
    process.env.MAIL_ADAPTER = "test";
    process.env.MEDIA_DIRECTORY = `.data/test-media-${dbName}`;
    db = await import("../src/lib/db");
    await db.pool.query(await readFile("migrations/001_editorial.sql", "utf8"));
    const auth = await import("../src/lib/auth");
    payload = await auth.cms();
    await payload.db.migrate();
    const own = await payload.create({
      collection: "users",
      data: {
        name: "테스트 대표",
        email: "owner@example.test",
        password,
        role: "owner",
        active: true,
      },
      overrideAccess: true,
    });
    const ed = await payload.create({
      collection: "users",
      data: {
        name: "테스트 직원",
        email: "editor@example.test",
        password,
        role: "editor",
        active: true,
      },
      overrideAccess: true,
    });
    owner = { id: own.id, role: "owner" };
    editor = { id: ed.id, role: "editor" };
    content = await import("../src/lib/content");
    inquiries = await import("../src/lib/inquiries");
    media = await import("../src/lib/media");
    route = await import("../src/app/api/wovn/[...path]/route");
    mediaRoute = await import("../src/app/media/[id]/[size]/route");
    const a = await request("login", "POST", {
      email: "owner@example.test",
      password,
    });
    assert.equal(a.status, 200);
    ownerCookie = a.headers.get("set-cookie")!.split(";")[0];
    const b = await request("login", "POST", {
      email: "editor@example.test",
      password,
    });
    assert.equal(b.status, 200);
    editorCookie = b.headers.get("set-cookie")!.split(";")[0];
    asset = await media.uploadPhoto(editor, {
      bytes: await sharp({
        create: {
          width: 1200,
          height: 800,
          channels: 3,
          background: "#ded6c9",
        },
      })
        .png()
        .toBuffer(),
      type: "image/png",
    });
  },
  { timeout: 60000 },
);
after(async () => {
  if (payload) {
    // Payload 3.93 retains a checked-out connection for reconnect monitoring.
    // Close each test-owned client before ending this isolated test pool.
    const p = (
      payload.db as unknown as {
        pool: pg.Pool & {
          _clients: pg.PoolClient[];
          _idle: { client: pg.PoolClient }[];
        };
      }
    ).pool;
    for (const c of [...p._clients])
      if (!p._idle.some((i) => i.client === c)) c.release(true);
    await p.end();
    await payload.destroy();
  }
  if (db) {
    await db.pool.end();
  }
  await admin.query(`DROP DATABASE IF EXISTS "${dbName}" WITH (FORCE)`);
  await admin.end();
  const { rm } = await import("node:fs/promises");
  await rm(`.data/test-media-${dbName}`, { recursive: true, force: true });
});
test("익명과 직원: 문의·계정·활동 기록 접근 거부", async () => {
  for (const path of ["dashboard", "inquiries", "users", "audit", "media"])
    assert.equal((await request(path)).status, 401);
  for (const path of ["inquiries", "users", "audit"])
    assert.equal(
      (await request(path, "GET", undefined, editorCookie)).status,
      403,
    );
});
test("직원 초안 작성, 직접 발행·상태 주입 차단, 원본·초안 사진 차단", async () => {
  const r = await request(
    "content",
    "POST",
    {
      kind: "projects",
      data: { ...validData(), _status: "published", published_version: 1 },
    },
    editorCookie,
  );
  assert.equal(r.status, 201);
  docId = (await r.json()).id;
  assert.equal((await content.listPublic("projects")).length, 0);
  for (const action of ["publish", "unpublish", "restore", "reject"])
    assert.equal(
      (
        await request(
          `content/${docId}/${action}`,
          "POST",
          { expectedVersion: 1, restoreVersion: 1 },
          editorCookie,
        )
      ).status,
      403,
    );
  const read = (size: string, cookie = "") =>
    mediaRoute.GET(
      new Request(`${base}/media/${asset.id}/${size}`, {
        headers: { Cookie: cookie, "Sec-Fetch-Site": "same-origin" },
      }),
      { params: Promise.resolve({ id: asset.id, size }) },
    );
  assert.equal((await read("960.webp")).status, 404);
  assert.equal((await read("original", ownerCookie)).status, 404);
  const privateImage = await read("960.webp", editorCookie);
  assert.equal(privateImage.status, 200);
  assert.equal(privateImage.headers.get("cache-control"), "private, no-store");
  assert.equal(privateImage.headers.get("etag"), null);
  assert.equal((await request(`content/${docId}`)).status, 401);
});
test("대표 발행 후 수정 초안·검토 요청·보완 요청은 기존 공개본 유지", async () => {
  assert.equal(
    (
      await request(
        `content/${docId}/review`,
        "POST",
        { expectedVersion: 1 },
        editorCookie,
      )
    ).status,
    200,
  );
  assert.equal(
    (
      await request(
        `content/${docId}/publish`,
        "POST",
        { expectedVersion: 1 },
        ownerCookie,
      )
    ).status,
    200,
  );
  const publicBefore = (await content.listPublic("projects"))[0];
  assert.equal(publicBefore.data.title, "DEMO — 권한 시험");
  const r = await request(
    `content/${docId}`,
    "PUT",
    { expectedVersion: 1, data: validData("직원의 새 수정") },
    editorCookie,
  );
  assert.equal(r.status, 200);
  await request(
    `content/${docId}/review`,
    "POST",
    { expectedVersion: 2 },
    editorCookie,
  );
  await request(
    `content/${docId}/reject`,
    "POST",
    { expectedVersion: 2 },
    ownerCookie,
  );
  assert.equal(
    (await content.listPublic("projects"))[0].data.title,
    publicBefore.data.title,
  );
});
test("검토 후 동시 수정 충돌은 409, 확인한 버전만 발행", async () => {
  await content.saveDraft(editor, docId, 2, validData("세 번째 초안"));
  assert.equal(
    (
      await request(
        `content/${docId}/publish`,
        "POST",
        { expectedVersion: 2 },
        ownerCookie,
      )
    ).status,
    409,
  );
  assert.equal(
    (
      await request(
        `content/${docId}`,
        "PUT",
        { expectedVersion: 2, data: validData("덮어쓰기 시도") },
        editorCookie,
      )
    ).status,
    409,
  );
  assert.equal((await content.listPublic("projects"))[0].version, 1);
  assert.equal(
    (
      await request(
        `content/${docId}/publish`,
        "POST",
        { expectedVersion: 3 },
        ownerCookie,
      )
    ).status,
    200,
  );
});
test("이전판 복구는 새 버전·발행 이력, slug 변경은 리디렉션", async () => {
  assert.equal(
    (
      await request(
        `content/${docId}/restore`,
        "POST",
        { expectedVersion: 3, restoreVersion: 1 },
        ownerCookie,
      )
    ).status,
    200,
  );
  assert.equal((await content.listPublic("projects"))[0].version, 4);
  assert.equal(
    (await content.listPublic("projects"))[0].data.title,
    "DEMO — 권한 시험",
  );
  await content.saveDraft(editor, docId, 4, {
    ...validData(),
    slug: "demo-new-slug",
  });
  await content.workflow(owner, docId, "publish", 5);
  assert.equal(
    (await content.publicBySlug("projects", "demo-authorization-test"))
      .redirect,
    "demo-new-slug",
  );
  assert.ok(
    (await content.history(docId)).find((v) => v.version === 4).publications,
  );
});
test("공개 사진 불변, 사용 중 사진 삭제 금지, 비공개 즉시 접근 차단", async () => {
  assert.equal(
    (await request(`media/${asset.id}`, "PUT", {}, editorCookie)).status,
    404,
  );
  assert.equal(
    (await request(`media/${asset.id}`, "DELETE", undefined, editorCookie))
      .status,
    409,
  );
  const r = await mediaRoute.GET(
    new Request(`${base}/media/${asset.id}/960.webp`),
    { params: Promise.resolve({ id: asset.id, size: "960.webp" }) },
  );
  assert.equal(r.status, 200);
  assert.equal(
    r.headers.get("cache-control"),
    "private, no-cache, max-age=0, must-revalidate",
  );
  const etag = r.headers.get("etag")!;
  assert.ok(etag);
  const conditionalRead = (validator: string, size = "960.webp", cookie = "") =>
    mediaRoute.GET(
      new Request(`${base}/media/${asset.id}/${size}`, {
        headers: {
          "If-None-Match": validator,
          Cookie: cookie,
          "Sec-Fetch-Site": "same-origin",
        },
      }),
      { params: Promise.resolve({ id: asset.id, size }) },
    );
  for (const validator of [etag, `W/${etag}`, `"unrelated", ${etag}`, "*"]) {
    const cached = await conditionalRead(validator);
    assert.equal(cached.status, 304);
    assert.equal(await cached.text(), "");
    assert.equal(cached.headers.get("etag"), etag);
    assert.equal(
      cached.headers.get("cache-control"),
      r.headers.get("cache-control"),
    );
  }
  assert.equal((await conditionalRead('"unrelated"')).status, 200);
  assert.equal((await conditionalRead(etag, "123.webp")).status, 404);
  await content.workflow(owner, docId, "unpublish", 5);
  // A formerly public browser copy must not bypass publication withdrawal.
  assert.equal((await conditionalRead(etag)).status, 404);
  assert.equal((await conditionalRead("*")).status, 404);
  const privateAgain = await conditionalRead(etag, "960.webp", editorCookie);
  assert.equal(privateAgain.status, 200);
  assert.equal(privateAgain.headers.get("cache-control"), "private, no-store");
  assert.equal(privateAgain.headers.get("etag"), null);
  assert.equal((await content.listPublic("projects")).length, 0);
  assert.equal(
    (
      await mediaRoute.GET(new Request(`${base}/media/${asset.id}/960.webp`), {
        params: Promise.resolve({ id: asset.id, size: "960.webp" }),
      })
    ).status,
    404,
  );
  assert.equal(
    (await content.publicBySlug("projects", "demo-authorization-test"))
      .redirect,
    undefined,
  );
});
test("공개 필수 항목 검증, 직원 설정 공개 거부", async () => {
  const d = await content.createContent(editor, "journal", {
    title: "미완성 초안",
  });
  assert.equal(
    (
      await request(
        `content/${d.id}/publish`,
        "POST",
        { expectedVersion: 1 },
        ownerCookie,
      )
    ).status,
    422,
  );
  const s = await content.createContent(editor, "settings", {
    publishReviewed: true,
  });
  assert.equal(
    (
      await request(
        `content/${s.id}/publish`,
        "POST",
        { expectedVersion: 1 },
        editorCookie,
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await request(
        `content/${s.id}/publish`,
        "POST",
        { expectedVersion: 1 },
        ownerCookie,
      )
    ).status,
    200,
  );
});
test("사진 중심 프로젝트는 부가 정보 없이 발행하며 잘못된 유형과 미확인 권리는 거절", async () => {
  const data = {
    ...validData(),
    slug: "demo-no-location",
    region: "",
    workType: "",
    year: undefined,
    category: "",
    services: "",
    company: "",
    summary: "",
    credits: "",
  };
  const document = await content.createContent(editor, "projects", data);
  await content.workflow(owner, document.id, "publish", 1);
  const published = await content.publicBySlug("projects", data.slug);
  assert.ok(published.doc);
  assert.equal(published.doc.data.region, "");
  assert.equal(published.doc.data.workType, "");
  assert.equal(published.doc.data.year, undefined);
  assert.equal(published.doc.data.summary, "");
  await content.saveDraft(editor, document.id, 1, {
    ...data,
    workType: "미확인 임의 유형",
  });
  await assert.rejects(content.workflow(owner, document.id, "publish", 2), {
    status: 422,
  });
  await content.saveDraft(editor, document.id, 2, {
    ...data,
    creditConfirmed: false,
  });
  await assert.rejects(content.workflow(owner, document.id, "publish", 3), {
    status: 422,
  });
});
test("업로드 실제 형식·용량 검사와 EXIF 없는 파생 이미지", async () => {
  await assert.rejects(
    media.uploadPhoto(editor, {
      bytes: Buffer.from("<svg/>"),
      type: "image/png",
    }),
    { status: 422 },
  );
  await assert.rejects(
    media.uploadPhoto(editor, {
      bytes: Buffer.alloc(25 * 1024 * 1024 + 1),
      type: "image/png",
    }),
    { status: 413 },
  );
  const derivative = await media.getBlob(asset.derivatives[0].key);
  const meta = await sharp(derivative).metadata();
  assert.equal(meta.exif, undefined);
  assert.equal(meta.format, "webp");
  assert.ok(meta.width! <= 1200);
});
function inquiry() {
  return {
    submissionKey: randomUUID(),
    name: "시험 문의",
    replyMethod: "email",
    contact: `test-${randomUUID()}@example.test`,
    message: "실제 고객 정보가 아닌 자동 시험용 문의입니다.",
    consent: true,
    startedAt: Date.now() - 3000,
  };
}
test("문의 저장과 알림 작업 생성은 원자적이며 동시 재전송은 한 건", async () => {
  const d = inquiry(),
    responses = await Promise.all([
      request("inquiry", "POST", d),
      request("inquiry", "POST", d),
    ]);
  assert.equal(responses[0].status, 201);
  assert.equal(responses[1].status, 201);
  const a = await responses[0].json(),
    b = await responses[1].json();
  assert.equal(a.receipt, b.receipt);
  const { rows } = await db.pool.query(
    "SELECT i.id FROM w_inquiries i JOIN w_notification_jobs j ON j.inquiry_id=i.id WHERE i.submission_key=$1",
    [d.submissionKey],
  );
  assert.equal(rows.length, 1);
  assert.equal(
    (
      await request("inquiry", "POST", {
        ...d,
        message: "다른 내용으로 같은 키를 재사용합니다.",
      })
    ).status,
    409,
  );
});
test("DB 알림 생성 장애 시 문의도 롤백, 성공 메시지 없음", async () => {
  const d = inquiry();
  await db.pool.query(
    "CREATE FUNCTION test_job_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'test failure'; END $$; CREATE TRIGGER test_job_failure BEFORE INSERT ON w_notification_jobs FOR EACH ROW EXECUTE FUNCTION test_job_failure()",
  );
  try {
    const result = await request("inquiry", "POST", d);
    assert.equal(result.status, 503);
    assert.equal(
      (
        await db.pool.query(
          "SELECT id FROM w_inquiries WHERE submission_key=$1",
          [d.submissionKey],
        )
      ).rowCount,
      0,
    );
  } finally {
    await db.pool.query(
      "DROP TRIGGER test_job_failure ON w_notification_jobs; DROP FUNCTION test_job_failure()",
    );
  }
});
test("한국어 필드 오류, 동의·봇·CSRF 검증", async () => {
  const d = inquiry();
  const r = await request("inquiry", "POST", {
    ...d,
    contact: "invalid",
    consent: false,
    message: "짧음",
  });
  assert.equal(r.status, 422);
  const j = await r.json();
  assert.ok(j.fields.contact);
  assert.ok(j.fields.consent);
  assert.ok(j.fields.message);
  assert.equal(
    (await request("inquiry", "POST", { ...d, website: "https://bot.invalid" }))
      .status,
    400,
  );
  assert.equal(
    (await request("inquiry", "POST", d, "", "https://evil.invalid")).status,
    403,
  );
});
test("메일 실패: 1·5·30분 재시도 후 실패, 대표만 재시도, 중복 작업자 안전", async () => {
  const errors = async () => {
    throw new Error("MAIL_HTTP_503");
  };
  for (let attempt = 1; attempt <= 4; attempt++) {
    await inquiries.runWorker(errors);
    const job = (
      await db.pool.query(
        "SELECT * FROM w_notification_jobs ORDER BY updated_at DESC LIMIT 1",
      )
    ).rows[0];
    assert.equal(job.attempts, attempt);
    assert.equal(job.state, attempt === 4 ? "failed" : "retry");
    if (attempt < 4) {
      const seconds = (new Date(job.next_at).getTime() - Date.now()) / 1000;
      assert.ok(seconds > [60, 300, 1800][attempt - 1] - 5);
      await db.pool.query(
        "UPDATE w_notification_jobs SET next_at=now()-interval '1 second'",
      );
    }
  }
  const job = (await db.pool.query("SELECT * FROM w_notification_jobs LIMIT 1"))
    .rows[0];
  assert.equal(
    (
      await request(
        `inquiries/${job.inquiry_id}/retry`,
        "POST",
        undefined,
        editorCookie,
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await request(
        `inquiries/${job.inquiry_id}/retry`,
        "POST",
        undefined,
        ownerCookie,
      )
    ).status,
    200,
  );
  let sends = 0;
  const send = async () => {
    sends++;
    await new Promise((r) => setTimeout(r, 25));
    return { state: "sent", providerId: "test-provider-id" };
  };
  await Promise.all([inquiries.runWorker(send), inquiries.runWorker(send)]);
  assert.equal(sends, 1);
  await inquiries.runWorker(send);
  assert.equal(sends, 1);
  assert.equal(
    (
      await request(
        `inquiries/${job.inquiry_id}/retry`,
        "POST",
        undefined,
        ownerCookie,
      )
    ).status,
    409,
  );
});
test("테스트 메일은 실제 발송 완료가 아님, 만료 개인정보와 알림 삭제", async () => {
  const d = inquiry();
  await inquiries.submitInquiry(d, "test-retention");
  await inquiries.runWorker();
  const {
    rows: [row],
  } = await db.pool.query(
    "SELECT i.id,j.state FROM w_inquiries i JOIN w_notification_jobs j ON j.inquiry_id=i.id WHERE i.submission_key=$1",
    [d.submissionKey],
  );
  assert.equal(row.state, "test");
  await db.pool.query(
    "UPDATE w_inquiries SET expires_at=now()-interval '1 second' WHERE id=$1",
    [row.id],
  );
  await inquiries.runWorker();
  assert.equal(
    (await db.pool.query("SELECT id FROM w_inquiries WHERE id=$1", [row.id]))
      .rowCount,
    0,
  );
  assert.equal(
    (
      await db.pool.query(
        "SELECT id FROM w_notification_jobs WHERE inquiry_id=$1",
        [row.id],
      )
    ).rowCount,
    0,
  );
});
test("세션 폐기 후 토큰 재사용 거부", async () => {
  assert.equal(
    (await request("logout", "POST", undefined, editorCookie)).status,
    200,
  );
  assert.equal(
    (await request("dashboard", "GET", undefined, editorCookie)).status,
    401,
  );
});

test("Press: 단일 지면과 편집 순서·상단 고정은 재발행 뒤에도 유지", async () => {
  const ids: string[] = [];
  for (const [slug, order, pinned] of [
    ["press-newer", 1, false],
    ["press-older", 2, false],
    ["press-pinned", 3, true],
  ] as const) {
    const saved = await content.createContent(owner, "journal", {
      ...validData(slug),
      slug,
      category: "잡지 게재",
      order,
      pinned,
      blocks: [],
    });
    ids.push(saved.id);
    await content.workflow(owner, saved.id, "publish", saved.version);
  }
  await content.workflow(owner, ids[1], "publish", 1);
  assert.deepEqual(
    (await content.listPublic("journal")).map((p) => p.id),
    [ids[2], ids[0], ids[1]],
  );
  const invalid = await content.createContent(owner, "journal", {
    ...validData("press-unconfirmed"),
    slug: "press-unconfirmed",
    category: "잡지 게재",
    blocks: [],
    creditConfirmed: false,
  });
  await assert.rejects(
    content.workflow(owner, invalid.id, "publish", invalid.version),
  );
});

test("Press pagination returns four published snapshots and clamps page bounds", async () => {
  let firstId = "";
  for (let i = 0; i < 5; i++) {
    const saved = await content.createContent(owner, "journal", {
      ...validData(`paged-press-${i}`),
      slug: `paged-press-${i}`,
      category: "잡지 게재",
      order: 10 + i,
      blocks: [],
    });
    await content.workflow(owner, saved.id, "publish", saved.version);
    if (i === 0) {
      firstId = saved.id;
      const draft = await content.getDraft(saved.id);
      await content.saveDraft(owner, saved.id, 1, {
        ...draft!.data,
        title: "Unpublished revision",
      });
    }
  }
  const all = await content.listPublic("journal");
  const first = await content.publicPressPage(1);
  const second = await content.publicPressPage(2);
  assert.equal(first.total, 8);
  assert.equal(first.pages, 2);
  assert.equal(first.documents.length, 4);
  assert.equal(second.documents.length, 4);
  assert.deepEqual(
    [...first.documents, ...second.documents].map((p) => p.id),
    all.map((p) => p.id),
  );
  assert.notEqual(
    [...first.documents, ...second.documents].find((p) => p.id === firstId)
      ?.data.title,
    "Unpublished revision",
  );
  assert.equal((await content.publicPressPage(-1)).page, 1);
  assert.equal((await content.publicPressPage(Number.NaN)).page, 1);
  assert.equal((await content.publicPressPage(99999)).page, 2);
});
