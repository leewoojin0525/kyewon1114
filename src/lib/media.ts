import sharp from "sharp";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { AppError, pool, transaction, audit, type Actor } from "./db";
import { isLive, required } from "./env";
import { put as vercelPut, del as vercelDelete } from "@vercel/blob";
const sizes = [640, 960, 1440, 1920];
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
export async function putBlob(key: string, data: Buffer, type: string) {
  if (process.env.STORAGE_DRIVER === "vercel-blob")
    await vercelPut(key, data, {
      access: "private",
      contentType: type,
      addRandomSuffix: false,
      allowOverwrite: false,
    });
  else if (process.env.STORAGE_DRIVER === "s3")
    await s3().send(
      new PutObjectCommand({
        Bucket: required("S3_BUCKET"),
        Key: key,
        Body: data,
        ContentType: type,
      }),
    );
  else {
    const p = localPath(key);
    await mkdir(dirname(p), { recursive: true });
    await writeFile(p, data, { flag: "wx" });
  }
}
export { getBlob } from "./storage-read";
async function deleteBlob(key: string) {
  if (process.env.STORAGE_DRIVER === "vercel-blob") await vercelDelete(key);
  else if (process.env.STORAGE_DRIVER === "s3")
    await s3().send(
      new DeleteObjectCommand({ Bucket: required("S3_BUCKET"), Key: key }),
    );
  else await unlink(localPath(key)).catch(() => {});
}
export async function uploadPhoto(
  actor: Actor,
  file: { bytes: Buffer; type: string },
) {
  if (file.bytes.length > 25 * 1024 * 1024)
    throw new AppError(413, "사진은 한 장당 25MB 이하여야 합니다.");
  const types: Record<string, string> = {
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
  };
  let metadata: sharp.Metadata;
  try {
    metadata = await sharp(file.bytes, {
      limitInputPixels: 80000000,
      failOn: "warning",
    }).metadata();
  } catch {
    throw new AppError(
      422,
      "읽을 수 없는 사진입니다. JPEG·PNG·WebP로 변환하세요.",
    );
  }
  if (
    !metadata.format ||
    !types[metadata.format] ||
    file.type !== types[metadata.format] ||
    (metadata.pages || 1) > 1
  )
    throw new AppError(422, "정지 JPEG·PNG·WebP 사진만 업로드할 수 있습니다.");
  const id = randomUUID(),
    keys: string[] = [],
    derivatives: {
      width: number;
      height: number;
      key: string;
      bytes: number;
    }[] = [];
  try {
    // Auto orientation and no withMetadata(): EXIF/GPS is stripped from every derivative.
    const normalized = await sharp(file.bytes, {
      limitInputPixels: 80000000,
      failOn: "warning",
    })
      .rotate()
      .toBuffer({ resolveWithObject: true });
    for (const width of [
      ...new Set([
        ...sizes.filter((s) => s < normalized.info.width),
        Math.min(normalized.info.width, 1920),
      ]),
    ]) {
      const { data, info } = await sharp(normalized.data)
        .resize({ width, withoutEnlargement: true })
        .webp({ quality: 84 })
        .toBuffer({ resolveWithObject: true });
      const key = `${id}/${info.width}.webp`;
      await putBlob(key, data, "image/webp");
      keys.push(key);
      derivatives.push({
        width: info.width,
        height: info.height,
        key,
        bytes: data.length,
      });
    }
    const originalKey = `${id}/original`;
    await putBlob(originalKey, file.bytes, file.type);
    keys.push(originalKey);
    await pool.query(
      "INSERT INTO w_media(id,original_key,mime,bytes,width,height,derivatives,uploaded_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8)",
      [
        id,
        originalKey,
        file.type,
        file.bytes.length,
        normalized.info.width,
        normalized.info.height,
        JSON.stringify(derivatives),
        actor.id,
      ],
    );
    return {
      id,
      width: normalized.info.width,
      height: normalized.info.height,
      derivatives,
    };
  } catch (e) {
    await Promise.allSettled(keys.map(deleteBlob));
    throw e;
  }
}
export async function mediaInfo(ids: string[]) {
  if (!ids.length) return [];
  return (
    await pool.query(
      "SELECT id,width,height,derivatives,created_at FROM w_media WHERE id=ANY($1::uuid[])",
      [ids],
    )
  ).rows;
}
export async function deleteMedia(actor: Actor, id: string) {
  const keys = await transaction(async (db) => {
    const {
      rows: [media],
    } = await db.query("SELECT * FROM w_media WHERE id=$1 FOR UPDATE", [id]);
    if (!media) throw new AppError(404, "사진이 없습니다.");
    // Historical versions must remain restorable; keep any image referenced by any version.
    const { rows } = await db.query(
      "SELECT DISTINCT c.id,v.data->>'title' AS title FROM w_versions v JOIN w_content c ON c.id=v.content_id WHERE v.data::text LIKE $1 LIMIT 10",
      [`%${id}%`],
    );
    if (rows.length)
      throw new AppError(
        409,
        `본문 또는 이전 버전에서 사용 중입니다: ${rows.map((r) => r.title || r.id).join(", ")}`,
      );
    await db.query("DELETE FROM w_media WHERE id=$1", [id]);
    await audit(db, actor, "media.delete", id);
    return [
      media.original_key,
      ...media.derivatives.map((d: { key: string }) => d.key),
    ] as string[];
  });
  await Promise.all(keys.map(deleteBlob));
}
