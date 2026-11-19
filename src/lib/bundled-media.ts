import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { readLocalPackedMedia } from "./packed-media";

const derivativeKey =
  /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}\/[0-9]+\.webp$/;
const packKey = /^packs\/[a-f0-9]{64}\.bin$/;
const digest = /^[a-f0-9]{64}$/;
type Manifest = { format: 1; entries: Record<string, unknown> };
const manifests = new Map<string, Promise<Manifest | null>>();

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

async function loadManifest(directory: string): Promise<Manifest | null> {
  let raw: string;
  try {
    raw = await readFile(resolve(directory, "manifest.json"), "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
  const value: unknown = JSON.parse(raw);
  if (
    !record(value) ||
    !Object.hasOwn(value, "format") ||
    value.format !== 1 ||
    !Object.hasOwn(value, "entries") ||
    !record(value.entries)
  )
    throw new Error("Invalid bundled media manifest");
  return value as Manifest;
}

/** Read immutable deployment derivatives only; caller still enforces publication ACL. */
export async function getBundledMedia(key: string): Promise<Buffer | null> {
  // Originals and physical packs never resolve through this derivative lookup.
  if (!derivativeKey.test(key)) return null;
  const directory = resolve(
    process.env.MEDIA_BUNDLE_DIRECTORY || ".site-media",
  );
  let pending = manifests.get(directory);
  if (!pending) {
    pending = loadManifest(directory);
    manifests.set(directory, pending);
  }
  const manifest = await pending;
  if (!manifest || !Object.hasOwn(manifest.entries, key)) return null;
  const entry = manifest.entries[key];
  if (
    !record(entry) ||
    !Object.hasOwn(entry, "key") ||
    typeof entry.key !== "string" ||
    !Object.hasOwn(entry, "bytes") ||
    typeof entry.bytes !== "number" ||
    !Number.isSafeInteger(entry.bytes) ||
    entry.bytes < 1 ||
    entry.bytes > 8 * 1024 * 1024 ||
    !Object.hasOwn(entry, "sha256") ||
    typeof entry.sha256 !== "string" ||
    !digest.test(entry.sha256)
  )
    throw new Error("Invalid bundled media entry");

  const file = resolve(directory, entry.key);
  if (Object.hasOwn(entry, "offset")) {
    if (!packKey.test(entry.key) || typeof entry.offset !== "number")
      throw new Error("Invalid bundled media range");
    return readLocalPackedMedia(file, {
      key: entry.key,
      offset: entry.offset,
      bytes: entry.bytes,
      sha256: entry.sha256,
    });
  }
  if (!derivativeKey.test(entry.key))
    throw new Error("Invalid bundled media path");
  const bytes = await readFile(file);
  if (
    bytes.length !== entry.bytes ||
    createHash("sha256").update(bytes).digest("hex") !== entry.sha256
  )
    throw new Error("Bundled photo checksum mismatch");
  return bytes;
}
