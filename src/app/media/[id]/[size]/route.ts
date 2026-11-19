import { z } from "zod";
import { authenticate } from "@/lib/auth";
import { pool } from "@/lib/db";
import { getBlob } from "@/lib/storage-read";
import type { PackedMedia } from "@/lib/packed-media";
export const dynamic = "force-dynamic";
const notFound = () =>
  new Response("Not found", {
    status: 404,
    headers: { "Cache-Control": "private, no-store" },
  });
export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string; size: string }> },
) {
  const { id, size } = await ctx.params;
  if (!z.uuid().safeParse(id).success || !/^\d+\.webp$/.test(size))
    return notFound();
  const {
    rows: [media],
  } = await pool.query(
    "SELECT derivatives, EXISTS(SELECT 1 FROM w_media_refs r WHERE r.media_id=m.id) AS public FROM w_media m WHERE id=$1",
    [id],
  );
  if (!media) return notFound();
  if (!media.public)
    try {
      await authenticate(req.headers);
    } catch {
      return notFound();
    }
  const derivative = media.derivatives.find(
    (d: { key: string; packed?: PackedMedia }) => d.key === `${id}/${size}`,
  );
  if (!derivative) return notFound();
  // Immutable derivative IDs identify the bytes. Always check current publication
  // above before allowing the browser to reuse a previously downloaded image.
  const etag = `"${id}/${size}"`;
  const headers = new Headers({
    "Content-Type": "image/webp",
    "Cache-Control": media.public
      ? "private, no-cache, max-age=0, must-revalidate"
      : "private, no-store",
    "X-Content-Type-Options": "nosniff",
    "X-Robots-Tag": media.public ? "all" : "noindex",
  });
  if (media.public) {
    headers.set("ETag", etag);
    const validators = req.headers.get("if-none-match")?.split(",") || [];
    if (
      validators.some((value) => {
        const tag = value.trim().replace(/^W\//, "");
        return tag === "*" || tag === etag;
      })
    )
      return new Response(null, { status: 304, headers });
  }
  try {
    return new Response(
      new Uint8Array(await getBlob(derivative.key, derivative.packed)),
      { headers },
    );
  } catch {
    return new Response("Unavailable", {
      status: 503,
      headers: { "Cache-Control": "private, no-store" },
    });
  }
}
