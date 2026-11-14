import { randomUUID } from "node:crypto";
import { generateClientTokenFromReadWriteToken } from "@vercel/blob/client";
import { get, del } from "@vercel/blob";
import { AppError, type Actor } from "./db";
import { uploadPhoto } from "./media";

const maximumSize = 25 * 1024 * 1024;
export function uploadPathBelongsTo(actor: Actor, pathname: string) {
  return new RegExp(`^staging/${actor.id}/[a-f0-9-]{36}$`).test(pathname);
}
export async function prepareDirectUpload(actor: Actor) {
  if (process.env.STORAGE_DRIVER !== "vercel-blob") return { direct: false };
  const pathname = `staging/${actor.id}/${randomUUID()}`;
  const token = await generateClientTokenFromReadWriteToken({
    pathname,
    maximumSizeInBytes: maximumSize,
    allowedContentTypes: ["image/jpeg", "image/png", "image/webp"],
    validUntil: Date.now() + 10 * 60 * 1000,
    addRandomSuffix: false,
    allowOverwrite: false,
    ttlDays: 1,
  });
  return { direct: true, pathname, token };
}
export async function finishDirectUpload(actor: Actor, pathname: string) {
  if (
    process.env.STORAGE_DRIVER !== "vercel-blob" ||
    !uploadPathBelongsTo(actor, pathname)
  )
    throw new AppError(403, "이 업로드에 접근할 수 없습니다.");
  const result = await get(pathname, { access: "private", useCache: false });
  if (!result || result.statusCode !== 200)
    throw new AppError(404, "업로드를 다시 시도하세요.");
  if (result.blob.size > maximumSize)
    throw new AppError(413, "사진은 한 장당 25MB까지 가능합니다.");
  const reader = result.stream.getReader(),
    chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > maximumSize) {
      await reader.cancel();
      throw new AppError(413, "사진은 한 장당 25MB까지 가능합니다.");
    }
    chunks.push(value);
  }
  const media = await uploadPhoto(actor, {
    bytes: Buffer.concat(chunks),
    type: result.blob.contentType,
  });
  // A failed cleanup must not turn a successful, registered upload into an error.
  await del(pathname).catch(() => {});
  return media;
}
