import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseEnv } from "node:util";
import { createHash } from "node:crypto";
import { put, list, get } from "@vercel/blob";

const directory = resolve(".data/deployment-snapshot");
const secrets = parseEnv(
  await readFile(".data/production-runtime.env", "utf8"),
);
const token = secrets.BLOB_READ_WRITE_TOKEN;
if (!token) throw new Error("Missing private Blob credentials");
const raw = await readFile(resolve(directory, "database.json"), "utf8");
const manifest = JSON.parse(
  await readFile(resolve(directory, "manifest.json"), "utf8"),
);
const hash = (data: Buffer | string) =>
  createHash("sha256").update(data).digest("hex");
if (hash(raw) !== manifest.sha256)
  throw new Error("Snapshot checksum mismatch");
const snapshot = JSON.parse(raw);
const types = new Map<string, string>(
  snapshot.tables
    .find((t: any) => t.name === "w_media")
    .rows.map((m: any) => [m.original_key, m.mime]),
);
const progressFile = ".data/deployment-upload-progress.json";
let completed: Record<string, string> = {};
try {
  completed = JSON.parse(await readFile(progressFile, "utf8"));
} catch {}
const existing = new Set<string>();
let cursor: string | undefined;
do {
  const page = await list({ token, cursor, limit: 1000 });
  for (const blob of page.blobs) existing.add(blob.pathname);
  cursor = page.hasMore ? page.cursor : undefined;
} while (cursor);
// Check the actual store too: an old checkpoint must not hide a missing file.
const pending = snapshot.blobs.filter(
  (blob: any) => !existing.has(blob.key) || completed[blob.key] !== blob.sha256,
);
const prioritySlug = process.env.UPLOAD_PRIORITY_PROJECT;
if (prioritySlug) {
  const content = snapshot.tables
    .find((t: any) => t.name === "w_content")
    .rows.find((c: any) => c.public_slug === prioritySlug);
  if (!content) throw new Error("Priority project not found");
  const ids = new Set(
    snapshot.tables
      .find((t: any) => t.name === "w_media_refs")
      .rows.filter((r: any) => r.content_id === content.id)
      .map((r: any) => r.media_id),
  );
  pending.sort(
    (a: any, b: any) =>
      Number(ids.has(b.key.split("/")[0])) -
      Number(ids.has(a.key.split("/")[0])),
  );
}
const concurrency = 8;
console.log(`Resuming ${pending.length} files`);
for (let i = 0; i < pending.length; i += concurrency) {
  const batch = pending.slice(i, i + concurrency);
  const results = await Promise.allSettled(
    batch.map(async (blob: any) => {
      const data = await readFile(resolve(directory, "media", blob.key));
      if (hash(data) !== blob.sha256)
        throw new Error("Image checksum mismatch");
      if (existing.has(blob.key)) {
        const remote = await get(blob.key, {
          access: "private",
          token,
          useCache: false,
        });
        if (
          !remote ||
          remote.statusCode !== 200 ||
          hash(Buffer.from(await new Response(remote.stream).arrayBuffer())) !==
            blob.sha256
        )
          throw new Error("Remote file differs; refusing overwrite");
      } else {
        await put(blob.key, data, {
          access: "private",
          token,
          contentType: types.get(blob.key) || "image/webp",
          addRandomSuffix: false,
          allowOverwrite: false,
        });
      }
      completed[blob.key] = blob.sha256;
    }),
  );
  await writeFile(progressFile, JSON.stringify(completed), { mode: 0o600 });
  if (results.some((r) => r.status === "rejected")) {
    for (const r of results)
      if (r.status === "rejected")
        console.error(
          r.reason instanceof Error ? r.reason.name : "UploadError",
        );
    throw new Error("Upload interrupted; progress saved for retry");
  }
  if (i % 80 === 0 || i + concurrency >= pending.length)
    console.log(
      `Uploaded ${Object.keys(completed).length}/${snapshot.blobs.length}`,
    );
}
console.log(
  `Private media upload complete: ${Object.keys(completed).length} files`,
);
