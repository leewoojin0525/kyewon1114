import { readFile, writeFile, mkdir, link, stat } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { createHash } from "node:crypto";
import sharp from "sharp";

// Prepare a separate initial deployment snapshot. The source backup stays intact.
const source = resolve(process.argv[2] || "");
if (!process.argv[2]) throw new Error("Pass the verified backup directory");
const target = resolve(".data/deployment-snapshot");
await mkdir(target, { recursive: true, mode: 0o700 });
const sourceRaw = await readFile(resolve(source, "database.json"), "utf8");
const manifest = JSON.parse(
  await readFile(resolve(source, "manifest.json"), "utf8"),
);
const hash = (data: Buffer | string) =>
  createHash("sha256").update(data).digest("hex");
if (hash(sourceRaw) !== manifest.sha256)
  throw new Error("Backup checksum mismatch");
const snapshot = JSON.parse(sourceRaw);
const originals = new Map(snapshot.blobs.map((b: any) => [b.key, b.sha256]));
const media = snapshot.tables.find((t: any) => t.name === "w_media").rows;
let sourceBytes = 0;
for (const m of media)
  sourceBytes +=
    Number(m.bytes) +
    m.derivatives.reduce((n: number, d: any) => n + d.bytes, 0);
// Retain the full display size plus one responsive 960px size when available.
for (const m of media) {
  const largest = m.derivatives.at(-1);
  m.derivatives = m.derivatives.filter(
    (d: any) => d.key === largest.key || d.width === 960,
  );
}
let deployBytes = media.reduce(
  (n: number, m: any) =>
    n +
    Number(m.bytes) +
    m.derivatives.reduce((s: number, d: any) => s + d.bytes, 0),
  0,
);
const converted: Array<{ id: string; before: number; after: number }> = [];
const blobs: Array<{ key: string; sha256: string }> = [];
for (const m of [...media].sort(
  (a: any, b: any) => Number(b.bytes) - Number(a.bytes),
)) {
  for (const key of [m.original_key, ...m.derivatives.map((d: any) => d.key)]) {
    const input = resolve(source, "media", key),
      output = resolve(target, "media", key);
    await mkdir(dirname(output), { recursive: true, mode: 0o700 });
    const bytes = await readFile(input);
    if (hash(bytes) !== originals.get(key))
      throw new Error("Source image checksum mismatch");
    let existing: Buffer | undefined;
    try {
      existing = await readFile(output);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    if (existing) {
      if (hash(existing) !== hash(bytes)) {
        if (
          key !== m.original_key ||
          m.mime !== "image/png" ||
          (await sharp(existing).metadata()).format !== "webp"
        )
          throw new Error("Unexpected existing deployment file");
        const a = await sharp(bytes).ensureAlpha().raw().toBuffer();
        const b = await sharp(existing).ensureAlpha().raw().toBuffer();
        if (!a.equals(b))
          throw new Error("Existing lossless image pixel verification failed");
        converted.push({
          id: m.id,
          before: bytes.length,
          after: existing.length,
        });
        deployBytes -= bytes.length - existing.length;
        m.mime = "image/webp";
        m.bytes = existing.length;
      }
      blobs.push({ key, sha256: hash(existing) });
      continue;
    }
    if (
      key === m.original_key &&
      m.mime === "image/png" &&
      deployBytes > 850_000_000
    ) {
      const encoded = await sharp(bytes)
        .webp({ lossless: true, effort: 4 })
        .toBuffer();
      if (encoded.length < bytes.length) {
        const a = await sharp(bytes).ensureAlpha().raw().toBuffer();
        const b = await sharp(encoded).ensureAlpha().raw().toBuffer();
        if (!a.equals(b))
          throw new Error("Lossless image pixel verification failed");
        await writeFile(output, encoded, { flag: "wx", mode: 0o600 });
        converted.push({
          id: m.id,
          before: bytes.length,
          after: encoded.length,
        });
        deployBytes -= bytes.length - encoded.length;
        m.mime = "image/webp";
        m.bytes = encoded.length;
        blobs.push({ key, sha256: hash(encoded) });
        continue;
      }
    }
    await link(input, output);
    blobs.push({ key, sha256: hash(bytes) });
  }
}
snapshot.blobs = blobs;
// Local test inquiries, transient login sessions and rate limits do not become production data.
for (const table of snapshot.tables) {
  if (
    [
      "w_inquiries",
      "w_notification_jobs",
      "w_worker_health",
      "w_rate_limits",
      "users_sessions",
    ].includes(table.name)
  )
    table.rows = [];
  if (table.schema === "cms" && table.name === "users")
    for (const user of table.rows) {
      user.active = false;
      user.reset_password_token = null;
      user.reset_password_expiration = null;
    }
}
if (deployBytes >= 950_000_000 || blobs.length >= 1850)
  throw new Error(
    `Free-tier target not met: ${deployBytes} bytes, ${blobs.length} files`,
  );
const raw = JSON.stringify(snapshot);
await writeFile(resolve(target, "database.json"), raw, { mode: 0o600 });
await writeFile(
  resolve(target, "manifest.json"),
  JSON.stringify(
    {
      format: 1,
      sha256: hash(raw),
      tables: snapshot.tables.length,
      blobs: blobs.length,
    },
    null,
    2,
  ),
  { mode: 0o600 },
);
const report = {
  source,
  sourceBytes,
  deployBytes,
  savedBytes: sourceBytes - deployBytes,
  files: blobs.length,
  converted,
  allPixelsVerified: true,
  originalBackupUnchanged: true,
};
await writeFile(
  resolve(target, "optimization.json"),
  JSON.stringify(report, null, 2),
  { mode: 0o600 },
);
console.log(JSON.stringify({ ...report, converted: converted.length }));
