import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createHash } from "node:crypto";

export type ArchivedOriginal = {
  archive_id: string;
  original_key: string;
  sha256: string;
  bytes: number | string;
};

export async function readArchivedOriginal(
  root: string,
  record: ArchivedOriginal,
) {
  if (
    !/^[a-z0-9-]+$/.test(record.archive_id) ||
    !/^[a-f0-9-]+\/original$/.test(record.original_key)
  )
    throw new Error("Invalid original archive location");
  const bytes = await readFile(
    resolve(root, record.archive_id, "media", record.original_key),
  );
  if (
    bytes.length !== Number(record.bytes) ||
    createHash("sha256").update(bytes).digest("hex") !== record.sha256
  )
    throw new Error("Original archive checksum mismatch");
  return bytes;
}
