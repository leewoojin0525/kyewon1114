import { createHash } from "node:crypto";
import { open } from "node:fs/promises";

export type PackedMedia = {
  key: string;
  offset: number;
  bytes: number;
  sha256: string;
};
export function validatePackedMedia(p: PackedMedia) {
  if (
    !/^packs\/[a-f0-9]{64}\.bin$/.test(p.key) ||
    !Number.isSafeInteger(p.offset) ||
    p.offset < 0 ||
    !Number.isSafeInteger(p.bytes) ||
    p.bytes < 1 ||
    p.bytes > 8 * 1024 * 1024 ||
    !Number.isSafeInteger(p.offset + p.bytes) ||
    !/^[a-f0-9]{64}$/.test(p.sha256)
  )
    throw new Error("Invalid packed media reference");
}
export function verifyPackedBytes(data: Buffer, p: PackedMedia) {
  if (
    data.length !== p.bytes ||
    createHash("sha256").update(data).digest("hex") !== p.sha256
  )
    throw new Error("Packed photo checksum mismatch");
  return data;
}
export async function readLocalPackedMedia(file: string, p: PackedMedia) {
  validatePackedMedia(p);
  const handle = await open(file, "r");
  try {
    if (p.offset + p.bytes > (await handle.stat()).size)
      throw new Error("Packed photo exceeds file bounds");
    const data = Buffer.alloc(p.bytes);
    let read = 0;
    while (read < p.bytes) {
      const r = await handle.read(data, read, p.bytes - read, p.offset + read);
      if (!r.bytesRead) throw new Error("Incomplete packed photo");
      read += r.bytesRead;
    }
    return verifyPackedBytes(data, p);
  } finally {
    await handle.close();
  }
}
