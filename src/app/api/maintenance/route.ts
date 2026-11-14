import { timingSafeEqual } from "node:crypto";
import { runWorker } from "@/lib/inquiries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const expected = Buffer.from(`Bearer ${secret || ""}`);
  const received = Buffer.from(request.headers.get("authorization") || "");
  if (
    !secret ||
    expected.length !== received.length ||
    !timingSafeEqual(expected, received)
  )
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return Response.json(await runWorker(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return Response.json({ error: "Maintenance unavailable" }, { status: 503 });
  }
}
