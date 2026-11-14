import { z } from "zod";
import { authenticate, cms } from "@/lib/auth";
import { AppError, audit, owner, pool, transaction } from "@/lib/db";
import {
  createContent,
  getDraft,
  history,
  listDrafts,
  saveDraft,
  workflow,
  publicSettings,
} from "@/lib/content";
import { json, failure, readJSON, sameOrigin, networkKey } from "@/lib/http";
import {
  listInquiries,
  submitInquiry,
  updateInquiry,
  removeInquiry,
  retryNotification,
  rateLimit,
  runWorker,
} from "@/lib/inquiries";
import { deleteMedia, uploadPhoto } from "@/lib/media";
import { appURL, isLive } from "@/lib/env";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ path: string[] }> };
const uuid = z.string().uuid();
async function handle(req: Request, ctx: Context) {
  try {
    const path = (await ctx.params).path,
      route = path.join("/"),
      method = req.method;
    if (method !== "GET") sameOrigin(req);
    if (route === "inquiry" && method === "POST") {
      if (isLive && !(await publicSettings()).privacyApproved)
        throw new AppError(
          503,
          "문의 접수를 준비 중입니다. 공개된 연락처로 문의해 주세요.",
        );
      return json(
        await submitInquiry(await readJSON(req, 20000), networkKey(req)),
        201,
      );
    }
    if (route === "login" && method === "POST") {
      await rateLimit(`login:${networkKey(req)}`, 25, 900);
      const d = z
        .object({ email: z.email(), password: z.string().min(1).max(200) })
        .parse(await readJSON(req, 2000));
      try {
        const result = await (
          await cms()
        ).login({ collection: "users", data: d, overrideAccess: false });
        const response = json({ ok: true });
        response.cookies.set("payload-token", result.token!, {
          httpOnly: true,
          secure: appURL.startsWith("https:"),
          sameSite: "strict",
          path: "/",
          maxAge: 7200,
        });
        return response;
      } catch {
        throw new AppError(
          401,
          "이메일 또는 비밀번호를 확인하세요. 반복 실패 시 15분 동안 잠깁니다.",
        );
      }
    }
    const actor = await authenticate(req.headers);
    if (route === "session" && method === "GET") return json({ user: actor });
    if (route === "logout" && method === "POST") {
      const payload = await cms();
      // Invalidate all sessions for this account, including copied session cookies.
      await payload.db.updateOne({
        collection: "users",
        id: actor.id,
        data: { sessions: [] },
        returning: false,
      });
      const response = json({ ok: true });
      response.cookies.set("payload-token", "", {
        httpOnly: true,
        path: "/",
        maxAge: 0,
      });
      return response;
    }
    if (route === "dashboard" && method === "GET") {
      const documents = await listDrafts();
      const health =
        actor.role === "owner"
          ? (
              await pool.query(
                "SELECT heartbeat FROM w_worker_health WHERE id=1",
              )
            ).rows[0]
          : null;
      return json({
        user: actor,
        documents,
        worker: health,
        environment: isLive ? "production" : "development",
      });
    }
    if (route === "content" && method === "POST") {
      const d = z
        .object({
          kind: z.enum(["projects", "journal", "settings"]),
          data: z.unknown(),
        })
        .parse(await readJSON(req));
      return json(await createContent(actor, d.kind, d.data), 201);
    }
    if (path[0] === "content" && path.length >= 2) {
      const id = uuid.parse(path[1]);
      if (path.length === 2 && method === "GET")
        return json({
          document: await getDraft(id),
          history: await history(id),
        });
      if (path.length === 2 && method === "PUT") {
        const d = z
          .object({
            expectedVersion: z.number().int().positive(),
            data: z.unknown(),
          })
          .parse(await readJSON(req));
        return json(await saveDraft(actor, id, d.expectedVersion, d.data));
      }
      if (path.length === 3 && method === "POST") {
        const action = z
          .enum(["review", "reject", "publish", "unpublish", "restore"])
          .parse(path[2]);
        const d = z
          .object({
            expectedVersion: z.number().int().positive(),
            restoreVersion: z.number().int().positive().optional(),
          })
          .parse(await readJSON(req));
        return json(
          await workflow(
            actor,
            id,
            action,
            d.expectedVersion,
            d.restoreVersion,
          ),
        );
      }
    }
    if (route === "media" && method === "GET")
      return json({
        media: (
          await pool.query(
            "SELECT id,width,height,derivatives,created_at FROM w_media ORDER BY created_at DESC LIMIT 1000",
          )
        ).rows,
      });
    if (route === "media" && method === "POST") {
      // One file per request; UI handles batches up to 20 and per-file retry.
      const length = Number(req.headers.get("content-length") || 0);
      if (length > 26 * 1024 * 1024)
        throw new AppError(413, "사진은 한 장당 25MB까지 가능합니다.");
      const reader = req.body?.getReader();
      if (!reader) throw new AppError(400, "사진을 선택하세요.");
      const chunks: Uint8Array[] = [];
      let total = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.length;
        if (total > 25 * 1024 * 1024) {
          await reader.cancel();
          throw new AppError(413, "사진은 한 장당 25MB까지 가능합니다.");
        }
        chunks.push(value);
      }
      return json(
        await uploadPhoto(actor, {
          bytes: Buffer.concat(chunks),
          type: req.headers.get("content-type") || "",
        }),
        201,
      );
    }
    if (path[0] === "media" && path.length === 2 && method === "DELETE") {
      await deleteMedia(actor, uuid.parse(path[1]));
      return json({ ok: true });
    }
    if (route === "inquiries" && method === "GET")
      return json({ inquiries: await listInquiries(actor) });
    if (path[0] === "inquiries" && path.length >= 2) {
      const id = uuid.parse(path[1]);
      if (path.length === 2 && method === "PUT") {
        await updateInquiry(actor, id, await readJSON(req, 25000));
        return json({ ok: true });
      }
      if (path.length === 2 && method === "DELETE") {
        await removeInquiry(actor, id);
        return json({ ok: true });
      }
      if (path[2] === "retry" && method === "POST") {
        await retryNotification(actor, id);
        return json({ ok: true });
      }
    }
    if (route === "users") {
      owner(actor);
      const payload = await cms();
      const { user } = await payload.auth({ headers: req.headers });
      if (method === "GET") {
        const result = await payload.find({
          collection: "users",
          user,
          overrideAccess: false,
          limit: 100,
          depth: 0,
        });
        return json({
          users: result.docs.map((u) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role,
            active: u.active,
          })),
        });
      }
      if (method === "POST") {
        const d = z
          .object({
            name: z.string().min(1).max(100),
            email: z.email(),
            password: z.string().min(12).max(128),
            role: z.enum(["owner", "editor"]),
          })
          .parse(await readJSON(req, 3000));
        const created = await payload.create({
          collection: "users",
          data: { ...d, active: true },
          user,
          overrideAccess: false,
        });
        await transaction((db) =>
          audit(db, actor, "user.create", String(created.id)),
        );
        return json({ id: created.id }, 201);
      }
    }
    if (path[0] === "users" && path.length === 2 && method === "PUT") {
      owner(actor);
      const id = z.coerce.number().int().positive().parse(path[1]);
      if (id === actor.id)
        throw new AppError(
          422,
          "자신의 역할과 활성 상태는 변경할 수 없습니다.",
        );
      const d = z
        .object({
          active: z.boolean(),
          role: z.enum(["owner", "editor"]),
          password: z.string().min(12).max(128).optional(),
        })
        .parse(await readJSON(req, 3000));
      const payload = await cms();
      const { user } = await payload.auth({ headers: req.headers });
      await payload.update({
        collection: "users",
        id,
        data: d,
        user,
        overrideAccess: false,
      });
      await payload.db.updateOne({
        collection: "users",
        id,
        data: { sessions: [] },
        returning: false,
      });
      await transaction((db) => audit(db, actor, "user.update", String(id)));
      return json({ ok: true });
    }
    if (route === "audit" && method === "GET") {
      owner(actor);
      return json({
        events: (
          await pool.query(
            "SELECT * FROM w_audit ORDER BY created_at DESC LIMIT 200",
          )
        ).rows,
      });
    }
    throw new AppError(404, "요청한 기능을 찾을 수 없습니다.");
  } catch (e) {
    return failure(e);
  }
}
export { handle as GET, handle as POST, handle as PUT, handle as DELETE };
