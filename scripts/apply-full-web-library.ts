import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { parseEnv, isDeepStrictEqual as same } from "node:util";
import { put, get, list } from "@vercel/blob";

const root = ".data/full-library-20261118";
const config = parseEnv(await readFile(".data/production-runtime.env", "utf8"));
if (
  config.APP_URL !== "https://kyewon1114.vercel.app" ||
  config.STORAGE_DRIVER !== "vercel-blob"
)
  throw new Error("Wrong production target");
Object.assign(process.env, config);
const { pool } = await import("../src/lib/db");
const { createContent, getDraft, saveDraft, workflow } = await import(
  "../src/lib/content"
);
const { parseContent, mediaIds } = await import("../src/lib/model");
const plan = JSON.parse(await readFile(root + "/plan.json", "utf8"));
const mode = process.argv[2] || "check";
if (!["check", "upload", "publish", "verify"].includes(mode))
  throw new Error("Invalid mode");
const hash = (b: Buffer) => createHash("sha256").update(b).digest("hex");
const save = (name: string, data: unknown) =>
  writeFile(root + "/" + name, JSON.stringify(data, null, 2), { mode: 0o600 });
const created = JSON.parse(
  await readFile(root + "/created-projects.json", "utf8").catch(() => "{}"),
);
const actualId = (p: any) => created[p.id] || p.id;
const targetVersion = (p: any) =>
  p.expectedVersion ? p.expectedVersion + 1 : 1;
const desired = (p: any) => parseContent("projects", p.data);
const derivative = (p: any) => [
  {
    width: p.width,
    height: p.height,
    key: p.key,
    bytes: p.bytes,
    ...(p.packed ? { packed: p.packed } : {}),
  },
];
async function inventory() {
  let cursor: string | undefined;
  const blobs = [];
  do {
    const r = await list({
      token: config.BLOB_READ_WRITE_TOKEN,
      cursor,
      limit: 1000,
    });
    blobs.push(...r.blobs);
    cursor = r.hasMore ? r.cursor : undefined;
  } while (cursor);
  return blobs;
}
async function checkVersions() {
  for (const p of plan.projects) {
    if (!p.expectedVersion && !created[p.id]) {
      const { rows } = await pool.query(
        "SELECT c.id FROM w_content c JOIN w_versions v ON v.content_id=c.id AND v.version=c.current_version WHERE c.kind='projects' AND v.data->>'slug'=$1",
        [p.slug],
      );
      if (rows.length)
        throw new Error(`Untracked project already exists: ${p.slug}`);
      continue;
    }
    const d = await getDraft(actualId(p));
    const before =
      d.current_version === p.expectedVersion &&
      d.published_version === p.publishedVersion &&
      same(d.data, p.beforeData);
    const applied =
      d.current_version === targetVersion(p) &&
      same(d.data, desired(p)) &&
      [p.publishedVersion, targetVersion(p)].includes(d.published_version);
    if (!before && !applied)
      throw new Error(`Reviewed version changed: ${p.slug}`);
  }
}
try {
  const { rows: owners } = await pool.query(
    "SELECT id,role FROM cms.users WHERE role='owner' AND active=true",
  );
  if (owners.length !== 1) throw new Error("Expected one active owner");
  const actor = owners[0];
  if (
    plan.appURL !== config.APP_URL ||
    plan.sourcePhotos !== 727 ||
    new Set(
      plan.photos.filter((p: any) => p.sourceId).map((p: any) => p.sourceId),
    ).size !== 727
  )
    throw new Error("Incomplete source coverage");
  if (
    new Set(plan.photos.map((p: any) => p.mediaId)).size !== plan.photos.length
  )
    throw new Error("Duplicate media ID");
  for (const p of plan.projects)
    if (!same([...mediaIds(desired(p))].sort(), [...p.photos].sort()))
      throw new Error(`Project photo mismatch: ${p.slug}`);
  await checkVersions();
  if (mode === "upload") {
    const blobs = await inventory(),
      remote = new Map(blobs.map((b) => [b.pathname, b.size]));
    const pending = plan.bundles
      .filter((b: any) => !remote.has(b.key))
      .reduce((n: number, b: any) => n + b.bytes, 0);
    if (blobs.reduce((n, b) => n + b.size, 0) + pending >= 950_000_000)
      throw new Error("Free storage headroom insufficient");
    const progress = JSON.parse(
      await readFile(root + "/upload-progress.json", "utf8").catch(() => "{}"),
    );
    for (const b of plan.bundles) {
      const bytes = await readFile(b.path);
      if (hash(bytes) !== b.sha256) throw new Error("Prepared bundle changed");
      if (!remote.has(b.key))
        await put(b.key, bytes, {
          token: config.BLOB_READ_WRITE_TOKEN,
          access: "private",
          contentType: "application/octet-stream",
          addRandomSuffix: false,
          allowOverwrite: false,
        });
      if (progress[b.key] !== b.sha256) {
        const r = await get(b.key, {
          token: config.BLOB_READ_WRITE_TOKEN,
          access: "private",
          useCache: false,
        });
        if (
          r?.statusCode !== 200 ||
          hash(Buffer.from(await new Response(r.stream).arrayBuffer())) !==
            b.sha256
        )
          throw new Error("Uploaded bundle checksum mismatch");
        progress[b.key] = b.sha256;
        await save("upload-progress.json", progress);
      }
      console.log(`Verified private image bundle: ${b.photos} photos`);
    }
    const added = plan.photos.filter((p: any) => !p.reuse);
    for (let i = 0; i < added.length; i += 50) {
      const rows = added
        .slice(i, i + 50)
        .map((p: any) => ({
          id: p.mediaId,
          original_key: p.key,
          bytes: p.bytes,
          width: p.width,
          height: p.height,
          derivatives: derivative(p),
          uploaded_by: actor.id,
        }));
      await pool.query(
        "INSERT INTO w_media(id,original_key,mime,bytes,width,height,derivatives,uploaded_by) SELECT id,original_key,'image/webp',bytes,width,height,derivatives,uploaded_by FROM jsonb_to_recordset($1::jsonb) AS x(id uuid,original_key text,bytes bigint,width integer,height integer,derivatives jsonb,uploaded_by integer) ON CONFLICT(id) DO NOTHING",
        [JSON.stringify(rows)],
      );
    }
    const { rows } = await pool.query(
      "SELECT * FROM w_media WHERE id=ANY($1::uuid[])",
      [plan.photos.map((p: any) => p.mediaId)],
    );
    const byId = new Map(rows.map((m) => [m.id, m]));
    for (const p of plan.photos) {
      const m = byId.get(p.mediaId);
      if (
        !m ||
        m.original_key !== p.key ||
        Number(m.bytes) !== p.bytes ||
        !same(m.derivatives, derivative(p))
      )
        throw new Error(`Stored media mismatch: ${p.reference}`);
    }
    await save("media-verified.json", {
      at: new Date().toISOString(),
      planHash: hash(await readFile(root + "/plan.json")),
      photos: rows.length,
    });
    console.log(`Verified ${rows.length} immutable media records`);
  } else if (mode === "publish") {
    const verified = JSON.parse(
      await readFile(root + "/media-verified.json", "utf8"),
    );
    if (verified.planHash !== hash(await readFile(root + "/plan.json")))
      throw new Error("Plan changed since upload verification");
    const published = [];
    for (const p of plan.projects) {
      let id = actualId(p);
      if (!p.expectedVersion && !created[p.id]) {
        const newProject = await createContent(actor, "projects", desired(p));
        id = newProject.id;
        created[p.id] = id;
        await save("created-projects.json", created);
      } else {
        const d = await getDraft(id);
        if (
          d.current_version === p.expectedVersion &&
          d.published_version === p.publishedVersion &&
          same(d.data, p.beforeData)
        )
          await saveDraft(actor, id, p.expectedVersion, desired(p));
      }
      const draft = await getDraft(id);
      if (
        draft.current_version !== targetVersion(p) ||
        !same(draft.data, desired(p))
      )
        throw new Error("Unexpected draft during publication");
      if (draft.published_version !== targetVersion(p)) {
        await workflow(actor, id, "review", targetVersion(p));
        await workflow(actor, id, "publish", targetVersion(p));
      }
      published.push({
        id,
        title: p.title,
        slug: p.slug,
        version: targetVersion(p),
        photos: p.photos.length,
      });
      await save("publication-result.json", {
        updatedAt: new Date().toISOString(),
        published,
      });
      console.log(`Published ${p.title}: ${p.photos.length} photos`);
    }
  } else if (mode === "verify") {
    const checks = JSON.parse(
      await readFile(root + "/public-checks.json", "utf8").catch(() => "{}"),
    );
    const pending = plan.photos.filter(
      (p: any) => checks[p.mediaId] !== p.sha256,
    );
    for (let i = 0; i < pending.length; i += 8) {
      await Promise.all(
        pending.slice(i, i + 8).map(async (p: any) => {
          let error;
          for (let attempt = 0; attempt < 3; attempt++) {
            try {
              const r = await fetch(plan.appURL + "/media/" + p.key, {
                signal: AbortSignal.timeout(60000),
              });
              if (
                r.status !== 200 ||
                hash(Buffer.from(await r.arrayBuffer())) !== p.sha256
              )
                throw new Error(
                  `Public photo mismatch: ${p.reference} (${r.status})`,
                );
              checks[p.mediaId] = p.sha256;
              return;
            } catch (e) {
              error = e;
            }
          }
          throw error;
        }),
      );
      await save("public-checks.json", checks);
      if (i % 80 === 0 || i + 8 >= pending.length)
        console.log(
          `Public photos verified ${Object.keys(checks).length}/${plan.photos.length}`,
        );
    }
    for (const p of plan.projects) {
      const d = await getDraft(actualId(p));
      if (d.published_version !== targetVersion(p) || !same(d.data, desired(p)))
        throw new Error("Published version mismatch");
      const { rows } = await pool.query(
        "SELECT media_id FROM w_media_refs WHERE content_id=$1",
        [actualId(p)],
      );
      if (!same(rows.map((r) => r.media_id).sort(), [...p.photos].sort()))
        throw new Error("Public media references incomplete");
    }
    const blobs = await inventory();
    const result = {
      at: new Date().toISOString(),
      projects: plan.projects.length,
      photos: plan.photos.length,
      drivePhotos: 727,
      retainedPhotos: plan.photos.filter((p: any) => p.retainedExisting).length,
      storageBytes: blobs.reduce((n, b) => n + b.size, 0),
      storageFiles: blobs.length,
      webBytes: plan.photos.reduce((n: number, p: any) => n + p.bytes, 0),
    };
    await save("final-verification.json", result);
    console.log(JSON.stringify(result));
  } else
    console.log(
      `Reviewed ${plan.projects.length} projects and ${plan.photos.length} photos; exact versions match`,
    );
} finally {
  await pool.end();
}
