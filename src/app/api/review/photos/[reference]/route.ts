import { authenticate } from "@/lib/auth";
import { owner } from "@/lib/db";
import { privateReviewThumbnail } from "@/lib/photo-review-catalog";

export const dynamic = "force-dynamic";
export async function GET(
  req: Request,
  ctx: { params: Promise<{ reference: string }> },
) {
  const headers = {
    "Cache-Control": "private, no-store",
    "X-Robots-Tag": "noindex, nofollow",
  };
  try {
    owner(await authenticate(req.headers));
  } catch {
    return new Response("Not found", { status: 404, headers });
  }
  const { reference } = await ctx.params;
  try {
    const bytes = await privateReviewThumbnail(reference);
    if (bytes)
      return new Response(new Uint8Array(bytes), {
        headers: {
          ...headers,
          "Content-Type": "image/webp",
          "X-Content-Type-Options": "nosniff",
        },
      });
  } catch {
    /* Missing private derivative is never replaced by an original. */
  }
  return new Response("Not found", { status: 404, headers });
}
