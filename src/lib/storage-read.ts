import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { get as vercelGet } from "@vercel/blob";
import { AppError } from "./db";
import { isLive, required } from "./env";
import { getBundledMedia } from "./bundled-media";
import {
  readLocalPackedMedia,
  validatePackedMedia,
  verifyPackedBytes,
  type PackedMedia,
} from "./packed-media";
function s3() {
  return new S3Client({
    region: process.env.S3_REGION || "auto",
    endpoint: required("S3_ENDPOINT"),
    credentials: {
      accessKeyId: required("S3_ACCESS_KEY_ID"),
      secretAccessKey: required("S3_SECRET_ACCESS_KEY"),
    },
  });
}
function localPath(key: string) {
  if (
    !/^(?:[a-f0-9-]+\/(?:original|\d+\.webp)|packs\/[a-f0-9]{64}\.bin)$/.test(
      key,
    )
  )
    throw new Error("Invalid storage key");
  if (isLive) throw new Error("운영 환경에는 영구 객체 저장소가 필요합니다.");
  return resolve(process.env.MEDIA_DIRECTORY || ".data/media", key);
}
export async function getBlob(key: string, packed?: PackedMedia) {
  const bundled = await getBundledMedia(key);
  if (bundled) return packed ? verifyPackedBytes(bundled, packed) : bundled;
  if (packed) validatePackedMedia(packed);
  if (process.env.STORAGE_DRIVER === "vercel-blob") {
    const result = await vercelGet(packed?.key || key, {
      access: "private",
      ...(packed
        ? {
            headers: {
              Range: `bytes=${packed.offset}-${packed.offset + packed.bytes - 1}`,
            },
            abortSignal: AbortSignal.timeout(30000),
          }
        : {}),
    });
    if (!result || result.statusCode !== 200)
      throw new AppError(404, "사진이 없습니다.");
    if (packed) {
      const expected = `bytes ${packed.offset}-${packed.offset + packed.bytes - 1}/`;
      // Fail closed if storage ignores Range: never expose adjacent private images.
      if (
        !result.headers.get("content-range")?.startsWith(expected) ||
        result.blob.size !== packed.bytes
      ) {
        await result.stream.cancel();
        throw new Error("Storage did not honor the photo byte range");
      }
    }
    const data = Buffer.from(await new Response(result.stream).arrayBuffer());
    return packed ? verifyPackedBytes(data, packed) : data;
  }
  if (process.env.STORAGE_DRIVER === "s3") {
    const r = await s3().send(
      new GetObjectCommand({
        Bucket: required("S3_BUCKET"),
        Key: packed?.key || key,
        ...(packed
          ? {
              Range: `bytes=${packed.offset}-${packed.offset + packed.bytes - 1}`,
            }
          : {}),
      }),
    );
    const data = Buffer.from(await r.Body!.transformToByteArray());
    return packed ? verifyPackedBytes(data, packed) : data;
  }
  if (packed) return readLocalPackedMedia(localPath(packed.key), packed);
  return readFile(localPath(key));
}
