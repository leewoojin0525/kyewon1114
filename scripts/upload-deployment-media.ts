import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseEnv } from "node:util";
import { createHash } from "node:crypto";
import { put, list, head, get } from "@vercel/blob";

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
for (let i = 0; i < snapshot.blobs.length; i += 4) {
  const batch = snapshot.blobs.slice(i, i + 4);
  const results = await Promise.allSettled(
    batch.map(async (blob: any) => {
      if (completed[blob.key] === blob.sha256) return;
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
  if (i % 100 === 0)
    console.log(
      `Uploaded ${Object.keys(completed).length}/${snapshot.blobs.length}`,
    );
}
console.log(
  `Private media upload complete: ${Object.keys(completed).length} files`,
);
