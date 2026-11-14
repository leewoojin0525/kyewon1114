import { z } from "zod";
import { authenticate } from "@/lib/auth";
import { pool } from "@/lib/db";
import { getBlob } from "@/lib/media";
export const dynamic = "force-dynamic";
export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string; size: string }> },
) {
  const { id, size } = await ctx.params;
  if (!z.uuid().safeParse(id).success || !/^\d+\.webp$/.test(size))
    return new Response("Not found", { status: 404 });
  const {
    rows: [media],
  } = await pool.query(
    "SELECT derivatives, EXISTS(SELECT 1 FROM w_media_refs r WHERE r.media_id=m.id) AS public FROM w_media m WHERE id=$1",
    [id],
  );
  if (!media) return new Response("Not found", { status: 404 });
  if (!media.public)
    try {
      await authenticate(req.headers);
    } catch {
      return new Response("Not found", { status: 404 });
    }
  const derivative = media.derivatives.find(
    (d: { key: string }) => d.key === `${id}/${size}`,
  );
  if (!derivative) return new Response("Not found", { status: 404 });
  try {
    return new Response(new Uint8Array(await getBlob(derivative.key)), {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "X-Robots-Tag": media.public ? "all" : "noindex",
      },
    });
  } catch {
    return new Response("Unavailable", { status: 503 });
  }
}
