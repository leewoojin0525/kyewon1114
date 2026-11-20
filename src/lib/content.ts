import { randomUUID } from "node:crypto";
import { cache } from "react";
import { type PoolClient } from "pg";
import { AppError, audit, owner, pool, transaction, type Actor } from "./db";
import {
  documentSchema,
  imagesIn,
  mediaIds,
  parseContent,
  settingsSchema,
  categories,
  journalCategories,
  workTypes,
  type Content,
  type Kind,
  type Publication,
} from "./model";
import { isLive } from "./env";
import { settingsPublicationAllowed } from "./settings-publication";

async function requireAssets(db: PoolClient, data: Record<string, unknown>) {
  const ids = mediaIds(data);
  if (!ids.length) return;
  const result = await db.query(
    "SELECT id FROM w_media WHERE id=ANY($1::uuid[]) FOR SHARE",
    [ids],
  );
  if (result.rowCount !== ids.length)
    throw new AppError(422, "존재하지 않거나 삭제된 사진이 포함되어 있습니다.");
}
async function validatePublication(
  db: PoolClient,
  kind: Kind,
  raw: unknown,
  previousSettings?: unknown,
) {
  const data = parseContent(kind, raw);
  if (!data.publishReviewed)
    throw new AppError(
      422,
      "공개 정보와 권리를 확인한 뒤 공개 검토를 체크하세요.",
    );
  if (isLive && data.demo)
    throw new AppError(422, "DEMO 자료는 운영 환경에서 공개할 수 없습니다.");
  if (kind === "settings") {
    const s = settingsSchema.parse(data);
    if (isLive && !settingsPublicationAllowed(s, previousSettings))
      throw new AppError(
        422,
        "승인 로고·실제 연락처·개인정보 처리 안내가 필요합니다.",
      );
    const ids = [
      ...new Set([s.featuredProject, ...s.selectedProjects].filter(Boolean)),
    ];
    if (ids.length) {
      const result = await db.query(
        "SELECT id FROM w_content WHERE kind='projects' AND published_version IS NOT NULL AND id=ANY($1::uuid[]) FOR SHARE",
        [ids],
      );
      if (result.rowCount !== ids.length)
        throw new AppError(
          422,
          "홈에는 현재 공개된 프로젝트만 선택할 수 있습니다.",
        );
    }
  } else {
    const d = documentSchema.parse(data);
    if (
      !d.title.trim() ||
      !d.slug ||
      !d.hero ||
      !d.creditConfirmed ||
      (kind === "journal" && (!d.summary.trim() || !d.credits.trim()))
    )
      throw new AppError(
        422,
        kind === "projects"
          ? "제목·주소·대표 사진·사진 사용 권리 확인이 필요합니다."
          : "제목·주소·요약·게재 지면·확인된 크레딧이 필요합니다.",
      );
    if (
      kind === "projects" &&
      ((d.category &&
        !categories.includes(d.category as (typeof categories)[number])) ||
        (d.workType &&
          !workTypes.includes(d.workType as (typeof workTypes)[number])))
    )
      throw new AppError(
        422,
        "용도와 작업 유형은 확인된 경우 목록에서 선택하세요.",
      );
    if (
      kind === "journal" &&
      !journalCategories.includes(
        d.category as (typeof journalCategories)[number],
      )
    )
      throw new AppError(422, "저널 분류를 선택하세요.");
    for (const block of d.blocks) {
      if (
        (block.type === "image" && !block.image) ||
        (block.type === "pair" && (!block.left || !block.right)) ||
        (block.type === "text" && !block.body.trim()) ||
        (block.type === "quote" && !block.text.trim()) ||
        (block.type === "facts" && !block.rows.length)
      )
        throw new AppError(422, "빈 본문 블록을 채우거나 삭제하세요.");
    }
    if (imagesIn(d).some((p) => !p.alt.trim()))
      throw new AppError(422, "모든 사진에 대체 텍스트를 입력하세요.");
    await requireAssets(db, d);
  }
  return data;
}

export async function createContent(actor: Actor, kind: Kind, raw: unknown) {
  const data = parseContent(kind, raw),
    id = randomUUID();
  return transaction(async (db) => {
    await requireAssets(db, data);
    await db.query("INSERT INTO w_content(id,kind) VALUES($1,$2)", [id, kind]);
    await db.query(
      "INSERT INTO w_versions(content_id,version,data,created_by) VALUES($1,1,$2,$3)",
      [id, data, actor.id],
    );
    await audit(db, actor, "draft.create", id);
    return { id, version: 1 };
  });
}
export async function saveDraft(
  actor: Actor,
  id: string,
  expected: number,
  raw: unknown,
) {
  return transaction(async (db) => {
    const {
      rows: [row],
    } = await db.query("SELECT * FROM w_content WHERE id=$1 FOR UPDATE", [id]);
    if (!row) throw new AppError(404, "콘텐츠를 찾을 수 없습니다.");
    if (row.current_version !== expected)
      throw new AppError(
        409,
        "다른 사람이 수정했습니다. 최신 버전을 다시 불러온 뒤 변경사항을 반영하세요.",
      );
    const data = parseContent(row.kind, raw),
      version = expected + 1;
    await requireAssets(db, data);
    await db.query(
      "INSERT INTO w_versions(content_id,version,data,created_by) VALUES($1,$2,$3,$4)",
      [id, version, data, actor.id],
    );
    await db.query(
      "UPDATE w_content SET current_version=$2,review_version=NULL,updated_at=now() WHERE id=$1",
      [id, version],
    );
    return { id, version };
  });
}
export async function workflow(
  actor: Actor,
  id: string,
  action: "review" | "reject" | "publish" | "unpublish" | "restore",
  expected: number,
  restoreVersion?: number,
) {
  if (action !== "review") owner(actor);
  return transaction(async (db) => {
    const {
      rows: [row],
    } = await db.query("SELECT * FROM w_content WHERE id=$1 FOR UPDATE", [id]);
    if (!row) throw new AppError(404, "콘텐츠를 찾을 수 없습니다.");
    if (row.current_version !== expected)
      throw new AppError(
        409,
        "검토한 뒤 새 수정이 저장되었습니다. 최신 버전을 확인하세요.",
      );
    if (action === "review" || action === "reject") {
      await db.query(
        "UPDATE w_content SET review_version=$2,updated_at=now() WHERE id=$1",
        [id, action === "review" ? expected : null],
      );
      await audit(db, actor, action, id);
      return { id, version: expected };
    }
    if (action === "unpublish") {
      await db.query(
        "UPDATE w_content SET published_version=NULL,published_at=NULL WHERE id=$1",
        [id],
      );
      await db.query("DELETE FROM w_media_refs WHERE content_id=$1", [id]);
      await db.query(
        "INSERT INTO w_publications(content_id,version,action,actor_id) VALUES($1,$2,$3,$4)",
        [id, row.published_version || expected, action, actor.id],
      );
      await audit(db, actor, action, id);
      return { id, version: expected };
    }
    const sourceVersion = action === "restore" ? restoreVersion : expected;
    if (!sourceVersion) throw new AppError(422, "복구할 버전을 선택하세요.");
    const {
      rows: [snapshot],
    } = await db.query(
      "SELECT data FROM w_versions WHERE content_id=$1 AND version=$2",
      [id, sourceVersion],
    );
    if (!snapshot) throw new AppError(404, "이전 버전을 찾을 수 없습니다.");
    const previousSettings =
      row.kind === "settings" && row.published_version
        ? (
            await db.query(
              "SELECT data FROM w_versions WHERE content_id=$1 AND version=$2",
              [id, row.published_version],
            )
          ).rows[0]?.data
        : undefined;
    const data = await validatePublication(
      db,
      row.kind,
      snapshot.data,
      previousSettings,
    );
    const collision = await db.query(
      "SELECT content_id FROM w_redirects WHERE kind=$1 AND slug=$2 AND content_id<>$3",
      [row.kind, data.slug, id],
    );
    if (collision.rowCount)
      throw new AppError(
        409,
        "다른 콘텐츠의 이전 주소입니다. 새 주소를 입력하세요.",
      );
    let version = expected;
    if (action === "restore") {
      version += 1;
      await db.query(
        "INSERT INTO w_versions(content_id,version,data,created_by) VALUES($1,$2,$3,$4)",
        [id, version, data, actor.id],
      );
    }
    if (row.public_slug && row.public_slug !== data.slug) {
      await db.query(
        "INSERT INTO w_redirects(kind,slug,content_id) VALUES($1,$2,$3) ON CONFLICT(kind,slug) DO UPDATE SET content_id=excluded.content_id",
        [row.kind, row.public_slug, id],
      );
    }
    await db.query(
      "UPDATE w_content SET current_version=$2,published_version=$2,public_slug=$3,published_at=now(),review_version=NULL,updated_at=now() WHERE id=$1",
      [id, version, data.slug],
    );
    await db.query("DELETE FROM w_media_refs WHERE content_id=$1", [id]);
    for (const mediaId of mediaIds(data))
      await db.query(
        "INSERT INTO w_media_refs(content_id,media_id) VALUES($1,$2)",
        [id, mediaId],
      );
    await db.query(
      "INSERT INTO w_publications(content_id,version,action,actor_id) VALUES($1,$2,$3,$4)",
      [id, version, action, actor.id],
    );
    await audit(db, actor, action, id);
    return { id, version };
  });
}

export async function listDrafts(kind?: Kind) {
  return (
    await pool.query(
      "SELECT c.*,v.data,v.created_by FROM w_content c JOIN w_versions v ON v.content_id=c.id AND v.version=c.current_version WHERE ($1::text IS NULL OR c.kind=$1) ORDER BY c.updated_at DESC",
      [kind || null],
    )
  ).rows;
}
export async function getDraft(id: string, version?: number) {
  const {
    rows: [row],
  } = await pool.query(
    "SELECT c.*,v.version,v.data,v.created_by,v.created_at AS version_date FROM w_content c JOIN w_versions v ON v.content_id=c.id AND v.version=COALESCE($2,c.current_version) WHERE c.id=$1",
    [id, version || null],
  );
  if (!row) throw new AppError(404, "콘텐츠를 찾을 수 없습니다.");
  return row;
}
export async function history(id: string) {
  return (
    await pool.query(
      "SELECT v.version,v.created_by,v.created_at, v.data->>'title' AS title, (SELECT json_agg(p ORDER BY p.created_at DESC) FROM w_publications p WHERE p.content_id=v.content_id AND p.version=v.version) AS publications FROM w_versions v WHERE content_id=$1 ORDER BY version DESC",
      [id],
    )
  ).rows;
}
// Deduplicate metadata/layout/page reads within one React server render only.
// This is not a persistent publication or media-permission cache.
export const listPublic = cache(async function listPublic(
  kind: Kind,
): Promise<Publication[]> {
  const { rows } = await pool.query(
    "SELECT c.id,c.kind,c.published_version AS version,c.published_at,v.data FROM w_content c JOIN w_versions v ON v.content_id=c.id AND v.version=c.published_version WHERE c.kind=$1 AND ($2::boolean=false OR COALESCE((v.data->>'demo')::boolean,false)=false) ORDER BY CASE WHEN c.kind='journal' THEN COALESCE((v.data->>'pinned')::boolean,false)::int ELSE 0 END DESC, CASE WHEN c.kind IN ('projects','journal') THEN COALESCE((v.data->>'order')::int,9999) ELSE 0 END ASC, CASE WHEN c.kind='projects' THEN COALESCE((v.data->>'year')::int,0) ELSE 0 END DESC, c.published_at DESC",
    [kind, isLive],
  );
  return rows;
});
export async function publicSettings() {
  const list = await listPublic("settings");
  return settingsSchema.parse(list[0]?.data || {});
}
export const publicBySlug = cache(async function publicBySlug(
  kind: Kind,
  slug: string,
) {
  const {
    rows: [doc],
  } = await pool.query<Publication>(
    "SELECT c.id,c.kind,c.published_version AS version,c.published_at,v.data FROM w_content c JOIN w_versions v ON v.content_id=c.id AND v.version=c.published_version WHERE c.kind=$1 AND c.public_slug=$2 AND ($3::boolean=false OR COALESCE((v.data->>'demo')::boolean,false)=false)",
    [kind, slug, isLive],
  );
  if (doc) return { doc };
  const {
    rows: [redirect],
  } = await pool.query(
    "SELECT c.public_slug FROM w_redirects r JOIN w_content c ON c.id=r.content_id WHERE r.kind=$1 AND r.slug=$2 AND c.published_version IS NOT NULL",
    [kind, slug],
  );
  return { redirect: redirect?.public_slug as string | undefined };
});

export const publicPressPage = cache(async function publicPressPage(page = 1) {
  const pageSize = 4;
  const requested = Number.isSafeInteger(page) && page > 0 ? page : 1;
  // Count and page come from one snapshot. Only four article bodies leave the DB.
  const {
    rows: [row],
  } = await pool.query<{
    total: number;
    page: number;
    documents: Publication[];
  }>(
    `WITH visible AS (
       SELECT c.id,c.kind,c.published_version AS version,c.published_at,v.data
       FROM w_content c JOIN w_versions v ON v.content_id=c.id AND v.version=c.published_version
       WHERE c.kind='journal' AND ($1::boolean=false OR COALESCE((v.data->>'demo')::boolean,false)=false)
     ), totals AS (SELECT count(*)::int AS total FROM visible), bounds AS (
       SELECT total, LEAST($2::int,GREATEST(1,ceil(total::numeric/$3::int)::int)) AS page FROM totals
     )
     SELECT total,page,COALESCE((SELECT json_agg(p) FROM (
       SELECT * FROM visible ORDER BY COALESCE((data->>'pinned')::boolean,false) DESC,
       COALESCE((data->>'order')::int,9999),published_at DESC,id
       LIMIT $3::int OFFSET ((SELECT page FROM bounds)-1)*$3::int
     ) p),'[]'::json) AS documents FROM bounds`,
    [isLive, Math.min(requested, 1000000), pageSize],
  );
  return { ...row, pages: Math.max(1, Math.ceil(row.total / pageSize)) };
});
