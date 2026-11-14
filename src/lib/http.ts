import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError } from "./db";
import { appURL } from "./env";
export function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
export function failure(e: unknown) {
  if (e instanceof ZodError)
    return json(
      {
        error: "입력 내용을 확인해 주세요.",
        fields: Object.fromEntries(
          e.issues.map((i) => [i.path.join("."), i.message]),
        ),
      },
      422,
    );
  if (e instanceof AppError)
    return json({ error: e.message, fields: e.fields }, e.status);
  if ((e as { code?: string })?.code === "23505")
    return json({ error: "이미 사용 중인 주소 또는 값입니다." }, 409);
  // Never log form content, credentials, SQL parameter values or provider responses.
  console.error(
    "WOVN request failed:",
    e instanceof Error ? e.name : "UnknownError",
  );
  return json(
    {
      error:
        "지금은 처리할 수 없습니다. 입력 내용을 유지한 채 잠시 후 다시 시도해 주세요.",
    },
    503,
  );
}
export function sameOrigin(req: Request) {
  if (
    req.headers.get("origin") !== appURL ||
    req.headers.get("sec-fetch-site") === "cross-site"
  )
    throw new AppError(403, "허용되지 않은 요청입니다.");
}
export async function readJSON(req: Request, max = 1024 * 1024) {
  if (!req.headers.get("content-type")?.includes("application/json"))
    throw new AppError(415, "JSON 형식이 필요합니다.");
  const reader = req.body?.getReader();
  if (!reader) throw new AppError(400, "입력값이 없습니다.");
  let size = 0;
  const chunks: Uint8Array[] = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > max) {
      await reader.cancel();
      throw new AppError(413, "입력 크기를 줄여 주세요.");
    }
    chunks.push(value);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new AppError(400, "입력 형식이 올바르지 않습니다.");
  }
}
export function networkKey(req: Request) {
  return process.env.TRUST_PROXY === "true"
    ? req.headers.get("x-real-ip") || "unknown"
    : "untrusted-network";
}
