"use client";
import { useCallback, useEffect, useState, useRef } from "react";
import Link from "next/link";
import {
  categories,
  journalCategories,
  workTypes,
  documentSchema,
  settingsSchema,
  photoSchema,
  type Photo,
  type Block,
} from "@/lib/model";
type User = {
  id: number;
  name: string;
  email: string;
  role: "owner" | "editor";
  active?: boolean;
};
type Doc = {
  id: string;
  kind: "projects" | "journal" | "settings";
  current_version: number;
  review_version: number | null;
  published_version: number | null;
  updated_at: string;
  data: Record<string, any>;
};
type Media = {
  id: string;
  width: number;
  height: number;
  derivatives: { key: string; width: number }[];
  created_at: string;
};
type Revision = {
  version: number;
  title: string;
  created_at: string;
  created_by: number;
  publications: unknown[] | null;
};
async function api(path: string, method = "GET", data?: unknown) {
  const r = await fetch(`/api/wovn/${path}`, {
    method,
    headers: data ? { "Content-Type": "application/json" } : undefined,
    body: data ? JSON.stringify(data) : undefined,
    cache: "no-store",
  });
  const result = await r.json();
  if (!r.ok)
    throw new Error(
      result.error +
        (result.fields ? "\n" + Object.values(result.fields).join("\n") : ""),
    );
  return result;
}
function time(value: string) {
  return new Date(value).toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    dateStyle: "short",
    timeStyle: "short",
  });
}
function Badge({ doc }: { doc: Doc }) {
  return (
    <span
      className={`badge ${doc.review_version ? "review" : doc.published_version ? "live" : ""}`}
    >
      {doc.review_version
        ? "검토 요청"
        : doc.published_version
          ? doc.current_version === doc.published_version
            ? "공개"
            : "공개 + 수정 초안"
          : "초안"}
    </span>
  );
}
function Field({
  label,
  value,
  onChange,
  type = "text",
  rows,
  options,
  placeholder,
}: {
  label: string;
  value: unknown;
  onChange: (value: string) => void;
  type?: string;
  rows?: number;
  options?: readonly string[];
  placeholder?: string;
}) {
  return (
    <label className="field">
      {label}
      {options ? (
        <select
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">선택</option>
          {options.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
      ) : rows ? (
        <textarea
          rows={rows}
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      ) : (
        <input
          type={type}
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      )}
    </label>
  );
}
function PhotoEditor({
  photo,
  media,
  onChange,
  label = "사진",
}: {
  photo?: Photo;
  media: Media[];
  onChange: (p: Photo | undefined) => void;
  label?: string;
}) {
  const item = media.find((m) => m.id === photo?.id);
  return (
    <div className="media-picker">
      <label className="field">
        {label}
        <select
          value={photo?.id || ""}
          onChange={(e) =>
            onChange(
              e.target.value
                ? photoSchema.parse({
                    id: e.target.value,
                    ...(photo
                      ? { alt: photo.alt, caption: photo.caption }
                      : {}),
                  })
                : undefined,
            )
          }
        >
          <option value="">사진 선택</option>
          {media.map((m, i) => (
            <option key={m.id} value={m.id}>
              사진 {i + 1} · {m.width} × {m.height} · {m.id.slice(0, 8)}
            </option>
          ))}
        </select>
      </label>
      {photo && (
        <>
          {item && (
            <img
              src={`/media/${item.derivatives.at(-1)!.key}`}
              alt="선택한 사진 미리보기"
            />
          )}
          <div className="media-fields">
            <Field
              label="대체 텍스트 (공개 필수)"
              value={photo.alt}
              onChange={(alt) => onChange({ ...photo, alt })}
            />
            <Field
              label="사진 설명·출처"
              value={photo.caption}
              onChange={(caption) => onChange({ ...photo, caption })}
            />
            <Field
              label="가로 초점 0~100"
              type="number"
              value={photo.focalX}
              onChange={(v) => onChange({ ...photo, focalX: Number(v) })}
            />
            <Field
              label="세로 초점 0~100"
              type="number"
              value={photo.focalY}
              onChange={(v) => onChange({ ...photo, focalY: Number(v) })}
            />
            <label className="field">
              모바일 별도 사진 (선택)
              <select
                value={photo.mobileId || ""}
                onChange={(e) =>
                  onChange({ ...photo, mobileId: e.target.value || undefined })
                }
              >
                <option value="">같은 사진</option>
                {media.map((m, i) => (
                  <option key={m.id} value={m.id}>
                    사진 {i + 1} · {m.width} × {m.height}
                  </option>
                ))}
              </select>
            </label>
            <Field
              label="모바일 가로 초점 0~100"
              type="number"
              value={photo.mobileFocalX}
              onChange={(v) => onChange({ ...photo, mobileFocalX: Number(v) })}
            />
            <Field
              label="모바일 세로 초점 0~100"
              type="number"
              value={photo.mobileFocalY}
              onChange={(v) => onChange({ ...photo, mobileFocalY: Number(v) })}
            />
          </div>
        </>
      )}
    </div>
  );
}
const blockNames = {
  image: "큰 사진",
  pair: "사진 두 장",
  text: "글",
  quote: "인용·핵심 문장",
  facts: "사실·크레딧",
};
function BlocksEditor({
  blocks,
  media,
  onChange,
}: {
  blocks: Block[];
  media: Media[];
  onChange: (b: Block[]) => void;
}) {
  function change(i: number, block: Block) {
    onChange(blocks.map((b, j) => (i === j ? block : b)));
  }
  function move(i: number, d: number) {
    if (i + d < 0 || i + d >= blocks.length) return;
    const b = [...blocks];
    [b[i], b[i + d]] = [b[i + d], b[i]];
    onChange(b);
  }
  function add(type: Block["type"]) {
    const b: Block =
      type === "image"
        ? { type, width: "wide" }
        : type === "pair"
          ? { type, ratio: "equal" }
          : type === "text"
            ? { type, heading: "", body: "" }
            : type === "quote"
              ? { type, text: "" }
              : { type, rows: [] };
    onChange([...blocks, b]);
  }
  return (
    <>
      {blocks.map((b, i) => (
        <div className="block-editor" key={i}>
          <div className="block-editor-head">
            <h3>
              {String(i + 1).padStart(2, "0")} / {blockNames[b.type]}
            </h3>
            <div className="block-controls">
              <button
                aria-label={`${i + 1}번 블록 위로`}
                disabled={i === 0}
                onClick={() => move(i, -1)}
              >
                ↑
              </button>
              <button
                aria-label={`${i + 1}번 블록 아래로`}
                disabled={i === blocks.length - 1}
                onClick={() => move(i, 1)}
              >
                ↓
              </button>
              <button
                aria-label={`${i + 1}번 블록 삭제`}
                onClick={() => onChange(blocks.filter((_, j) => i !== j))}
              >
                삭제
              </button>
            </div>
          </div>
          {b.type === "image" && (
            <>
              <label className="field">
                사진 폭
                <select
                  value={b.width}
                  onChange={(e) =>
                    change(i, {
                      ...b,
                      width: e.target.value as "wide" | "text",
                    })
                  }
                >
                  <option value="wide">전체 폭</option>
                  <option value="text">본문 폭</option>
                </select>
              </label>
              <PhotoEditor
                photo={b.image}
                media={media}
                onChange={(image) => change(i, { ...b, image })}
              />
            </>
          )}
          {b.type === "pair" && (
            <>
              <label className="field">
                비율
                <select
                  value={b.ratio}
                  onChange={(e) =>
                    change(i, {
                      ...b,
                      ratio: e.target.value as "equal" | "two-one",
                    })
                  }
                >
                  <option value="equal">1 : 1</option>
                  <option value="two-one">2 : 1</option>
                </select>
              </label>
              <PhotoEditor
                label="첫 번째 사진"
                photo={b.left}
                media={media}
                onChange={(left) => change(i, { ...b, left })}
              />
              <PhotoEditor
                label="두 번째 사진"
                photo={b.right}
                media={media}
                onChange={(right) => change(i, { ...b, right })}
              />
            </>
          )}
          {b.type === "text" && (
            <>
              <Field
                label="소제목"
                value={b.heading}
                onChange={(heading) => change(i, { ...b, heading })}
              />
              <Field
                label="본문 (문단: 빈 줄 / 목록: - / 링크: [텍스트](https://...))"
                rows={7}
                value={b.body}
                onChange={(body) => change(i, { ...b, body })}
              />
            </>
          )}
          {b.type === "quote" && (
            <Field
              label="인용·핵심 문장"
              rows={3}
              value={b.text}
              onChange={(text) => change(i, { ...b, text })}
            />
          )}{" "}
          {b.type === "facts" && (
            <>
              {b.rows.map((r, j) => (
                <div className="admin-form-grid" key={j}>
                  <Field
                    label="항목"
                    value={r.label}
                    onChange={(label) =>
                      change(i, {
                        ...b,
                        rows: b.rows.map((r, k) =>
                          k === j ? { ...r, label } : r,
                        ),
                      })
                    }
                  />
                  <Field
                    label="내용"
                    value={r.value}
                    onChange={(value) =>
                      change(i, {
                        ...b,
                        rows: b.rows.map((r, k) =>
                          k === j ? { ...r, value } : r,
                        ),
                      })
                    }
                  />
                  <button
                    className="admin-small"
                    onClick={() =>
                      change(i, {
                        ...b,
                        rows: b.rows.filter((_, k) => k !== j),
                      })
                    }
                  >
                    항목 삭제
                  </button>
                </div>
              ))}
              <button
                className="text-link"
                onClick={() =>
                  change(i, {
                    ...b,
                    rows: [...b.rows, { label: "", value: "" }],
                  })
                }
              >
                항목 추가 +
              </button>
            </>
          )}
        </div>
      ))}
      <div className="add-blocks">
        {Object.entries(blockNames).map(([type, label]) => (
          <button
            className="button"
            key={type}
            onClick={() => add(type as Block["type"])}
          >
            {label} +
          </button>
        ))}
      </div>
    </>
  );
}
export function Admin() {
  const [user, setUser] = useState<User | null>(null),
    [loading, setLoading] = useState(true),
    [tab, setTab] = useState("overview"),
    [documents, setDocuments] = useState<Doc[]>([]),
    [worker, setWorker] = useState<string | null>(null),
    [media, setMedia] = useState<Media[]>([]),
    [edit, setEdit] = useState<Doc | null>(null),
    [history, setHistory] = useState<Revision[]>([]),
    [dirty, setDirty] = useState(false),
    [busy, setBusy] = useState(false),
    [autosavePaused, setAutosavePaused] = useState(false),
    [flash, setFlash] = useState(""),
    [failed, setFailed] = useState(false),
    [inquiries, setInquiries] = useState<any[]>([]),
    [selectedInquiry, setSelectedInquiry] = useState<any>(null),
    [users, setUsers] = useState<User[]>([]),
    [events, setEvents] = useState<any[]>([]),
    [uploads, setUploads] = useState<
      { file: File; status: string; error?: boolean }[]
    >([]);
  const latestEdit = useRef(edit);
  const saving = useRef(false);
  latestEdit.current = edit;
  const message = useCallback((text: string, error = false) => {
    setFlash(text);
    setFailed(error);
  }, []);
  const reload = useCallback(async () => {
    const result = await api("dashboard");
    setUser(result.user);
    setDocuments(result.documents);
    setWorker(result.worker?.heartbeat || null);
  }, []);
  useEffect(() => {
    reload()
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
    const t = new URLSearchParams(location.search).get("tab");
    if (t) setTab(t);
  }, [reload]);
  useEffect(() => {
    const fn = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", fn);
    return () => window.removeEventListener("beforeunload", fn);
  }, [dirty]);
  useEffect(() => {
    if (!user || !dirty || busy || autosavePaused || !edit) return;
    const timer = setTimeout(() => {
      setBusy(true);
      save()
        .then(() => message("초안을 자동 저장했습니다."))
        .catch((e) => {
          setAutosavePaused(true);
          message(`자동 저장을 멈췄습니다. ${e.message}`, true);
        })
        .finally(() => setBusy(false));
    }, 2000);
    return () => clearTimeout(timer);
  }, [edit, dirty, busy, autosavePaused, user?.id]);
  useEffect(() => {
    if (!user) return;
    if (tab === "inquiries" && user.role === "owner")
      api("inquiries")
        .then((r) => setInquiries(r.inquiries))
        .catch((e) => message(e.message, true));
    if (tab === "users" && user.role === "owner")
      api("users")
        .then((r) => setUsers(r.users))
        .catch((e) => message(e.message, true));
    if (tab === "media")
      api("media")
        .then((r) => setMedia(r.media))
        .catch((e) => message(e.message, true));
  }, [user?.id, tab, message]);
  async function run(fn: () => Promise<void>) {
    setBusy(true);
    message("");
    try {
      await fn();
    } catch (e) {
      message((e as Error).message, true);
    } finally {
      setBusy(false);
    }
  }
  async function switchTab(t: string) {
    if (saving.current) {
      message("초안을 저장 중입니다. 저장이 끝난 뒤 이동해 주세요.");
      return;
    }
    if (
      dirty &&
      !confirm("저장하지 않은 변경사항이 있습니다. 화면을 이동할까요?")
    )
      return;
    setTab(t);
    setEdit(null);
    setDirty(false);
    setSelectedInquiry(null);
    message("");
    await run(async () => {
      await reload();
      if (t === "media") setMedia((await api("media")).media);
      if (t === "inquiries") setInquiries((await api("inquiries")).inquiries);
      if (t === "users") setUsers((await api("users")).users);
      if (t === "audit") setEvents((await api("audit")).events);
      if (t === "settings") {
        const result = await api("dashboard");
        const settings = result.documents.find(
          (d: Doc) => d.kind === "settings",
        );
        if (settings) await openEditor(settings.id);
      }
    });
  }
  async function openEditor(id: string) {
    const [r, m] = await Promise.all([api(`content/${id}`), api("media")]);
    setEdit(r.document);
    setHistory(r.history);
    setMedia(m.media);
    setDirty(false);
    setAutosavePaused(false);
  }
  async function create(kind: Doc["kind"]) {
    await run(async () => {
      const data =
        kind === "settings"
          ? settingsSchema.parse({})
          : documentSchema.parse({
              category: kind === "journal" ? "잡지 게재" : "",
              blocks:
                kind === "journal"
                  ? [{ type: "text", heading: "", body: "" }]
                  : [{ type: "image", width: "wide" }],
            });
      const r = await api("content", "POST", { kind, data });
      await reload();
      await openEditor(r.id);
    });
  }
  function update(field: string, value: unknown) {
    if (!edit) return;
    setEdit({ ...edit, data: { ...edit.data, [field]: value } });
    setDirty(true);
  }
  async function save() {
    const snapshot = latestEdit.current;
    if (!snapshot || saving.current) return snapshot;
    saving.current = true;
    try {
      const result = await api(`content/${snapshot.id}`, "PUT", {
        expectedVersion: snapshot.current_version,
        data: snapshot.data,
      });
      const changedWhileSaving = latestEdit.current?.data !== snapshot.data;
      setEdit((current) =>
        current?.id === snapshot.id
          ? {
              ...current,
              current_version: result.version,
              review_version: null,
            }
          : current,
      );
      setDirty(changedWhileSaving);
      setAutosavePaused(false);
      await reload();
      const refreshed = await api(`content/${snapshot.id}`);
      if (latestEdit.current?.id === snapshot.id) setHistory(refreshed.history);
      return {
        ...snapshot,
        current_version: result.version,
        review_version: null,
      };
    } finally {
      saving.current = false;
    }
  }
  async function act(action: string, version?: number) {
    if (!edit) return;
    if (
      action === "restore" &&
      !confirm(`미리보기에서 확인한 버전 ${version}을 새 발행으로 복구할까요?`)
    )
      return;
    if (
      action === "unpublish" &&
      !confirm("공개 페이지와 사진 접근을 비공개로 전환할까요?")
    )
      return;
    await run(async () => {
      if (dirty)
        throw new Error(
          "변경사항을 먼저 임시 저장하고 미리보기에서 확인하세요.",
        );
      await api(`content/${edit.id}/${action}`, "POST", {
        expectedVersion: edit.current_version,
        restoreVersion: version,
      });
      await openEditor(edit.id);
      await reload();
      message(
        action === "review"
          ? "대표에게 검토를 요청했습니다."
          : action === "reject"
            ? "보완이 필요한 초안으로 돌렸습니다."
            : action === "unpublish"
              ? "비공개로 전환했습니다."
              : "확인한 버전을 공개 화면에 적용했습니다.",
      );
    });
  }
  async function upload(file: File, index: number) {
    setUploads((prev) =>
      prev.map((u, i) => (i === index ? { file, status: "업로드 중…" } : u)),
    );
    try {
      const r = await fetch("/api/wovn/media", {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const v = await r.json();
      if (!r.ok) throw new Error(v.error);
      setUploads((prev) =>
        prev.map((u, i) => (i === index ? { file, status: "등록 완료" } : u)),
      );
      setMedia((await api("media")).media);
    } catch (e) {
      setUploads((prev) =>
        prev.map((u, i) =>
          i === index ? { file, status: (e as Error).message, error: true } : u,
        ),
      );
    }
  }
  const owner = user?.role === "owner",
    published = documents.filter(
      (d) => d.published_version && d.kind !== "settings",
    ),
    reviewing = documents.filter((d) => d.review_version);
  if (loading)
    return (
      <div className="error-page">
        <p>작업실을 불러오는 중…</p>
      </div>
    );
  if (!user)
    return (
      <div className="admin-shell">
        <header className="admin-header">
          <Link href="/">
            <img
              src="/brand/wovn-studio.svg"
              width="114"
              height="40"
              alt="WOVN STUDIO"
            />
          </Link>
          <Link className="eyebrow" href="/">
            사이트로 돌아가기 ↗
          </Link>
        </header>
        <div className="admin-login">
          <span className="eyebrow">THE EDITORIAL ROOM</span>
          <h1>우븐의 작업실</h1>
          <p>공간의 사진과 생각을 정리하는 곳.</p>
          <form
            method="post"
            action="/api/wovn/login"
            onSubmit={(e) => {
              e.preventDefault();
              const d = Object.fromEntries(new FormData(e.currentTarget));
              run(async () => {
                await api("login", "POST", d);
                await reload();
              });
            }}
          >
            <label className="field">
              이메일
              <input
                name="email"
                type="email"
                autoComplete="username"
                required
              />
            </label>
            <label className="field">
              비밀번호
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                required
              />
            </label>
            {flash && (
              <p className="form-error" role="alert">
                {flash}
              </p>
            )}
            <button className="button primary" disabled={busy}>
              {busy ? "확인 중…" : "로그인 ↗"}
            </button>
          </form>
          <p className="admin-small" style={{ marginTop: 28 }}>
            등록된 운영 계정으로 로그인하세요.
            <br />
            최초 대표 계정 생성 방법은 프로젝트 README에 안내되어 있습니다.
          </p>
        </div>
      </div>
    );
  const labels: Record<string, string> = {
    overview: "작업실",
    projects: "프로젝트",
    journal: "잡지 게재",
    media: "사진 보관함",
    settings: "홈·스튜디오·연락처",
    inquiries: "접수 문의",
    users: "계정 관리",
    audit: "활동 기록",
  };
  return (
    <div className="admin-shell">
      <header className="admin-header">
        <div className="admin-brand">
          <Link href="/">
            <img
              src="/brand/wovn-studio.svg"
              width="105"
              height="37"
              alt="WOVN STUDIO"
            />
          </Link>
          <span>THE EDITORIAL ROOM</span>
        </div>
        <div>
          <span>
            {user.name} · {owner ? "대표" : "직원"}
          </span>
          <Link href="/" target="_blank">
            사이트 보기 ↗
          </Link>
          <button
            onClick={() =>
              run(async () => {
                await api("logout", "POST");
                setUser(null);
                setEdit(null);
              })
            }
          >
            로그아웃
          </button>
        </div>
      </header>
      <div className="admin-layout">
        <aside className="admin-sidebar">
          <span className="eyebrow">CONTENT</span>
          {["overview", "projects", "journal", "media", "settings"].map((t) => (
            <button
              key={t}
              className={tab === t ? "active" : ""}
              onClick={() => switchTab(t)}
            >
              {labels[t]}
            </button>
          ))}
          {owner && (
            <>
              <span className="eyebrow">MANAGEMENT</span>
              {["inquiries", "users", "audit"].map((t) => (
                <button
                  key={t}
                  className={tab === t ? "active" : ""}
                  onClick={() => switchTab(t)}
                >
                  {labels[t]}
                </button>
              ))}
            </>
          )}
        </aside>
        <main className="admin-main">
          {flash && (
            <div
              className={`admin-flash ${failed ? "error" : ""}`}
              role={failed ? "alert" : "status"}
            >
              {flash}
            </div>
          )}
          {edit ? (
            <div className="admin-editor">
              <div className="admin-title">
                <div>
                  <p>
                    {edit.kind === "settings"
                      ? "사이트 공통 설정"
                      : edit.kind === "projects"
                        ? "프로젝트 편집"
                        : "잡지 게재 편집"}{" "}
                    / <Badge doc={edit} />
                  </p>
                  <h1>{edit.data.title || "제목 없는 초안"}</h1>
                </div>
              </div>
              <div className="admin-toolbar">
                <span className="save-status">
                  버전 {edit.current_version} ·{" "}
                  {dirty ? "저장하지 않은 변경 있음" : "저장됨"}
                </span>
                <button
                  className="button"
                  disabled={busy}
                  onClick={() =>
                    run(async () => {
                      await save();
                      message("초안을 저장했습니다. 기존 공개본은 유지됩니다.");
                    })
                  }
                >
                  임시 저장
                </button>
                <Link
                  className="button"
                  href={`/preview/${edit.id}?version=${edit.current_version}`}
                  target="_blank"
                >
                  저장본 미리보기 ↗
                </Link>
                <button
                  className="button"
                  disabled={busy || dirty}
                  onClick={() => act("review")}
                >
                  검토 요청
                </button>
                {owner && (
                  <>
                    <button
                      className="button primary"
                      disabled={busy || dirty}
                      onClick={() => act("publish")}
                    >
                      공개 적용
                    </button>
                    {edit.published_version && (
                      <button
                        className="button"
                        disabled={busy || dirty}
                        onClick={() => act("unpublish")}
                      >
                        비공개
                      </button>
                    )}
                    {edit.review_version && (
                      <button
                        className="button"
                        disabled={busy || dirty}
                        onClick={() => act("reject")}
                      >
                        보완 요청
                      </button>
                    )}
                  </>
                )}
                <button
                  className="admin-small"
                  onClick={() => {
                    if (
                      !dirty ||
                      confirm("저장하지 않은 변경을 버리고 다시 불러올까요?")
                    )
                      run(() => openEditor(edit.id));
                  }}
                >
                  최신 버전 불러오기
                </button>
              </div>
              {edit.kind === "settings" ? (
                <>
                  <div className="admin-card">
                    <h2>홈 대표작과 노출 순서</h2>
                    <label className="field">
                      대표 프로젝트
                      <select
                        value={edit.data.featuredProject || ""}
                        onChange={(e) =>
                          update("featuredProject", e.target.value || undefined)
                        }
                      >
                        <option value="">
                          선별작 또는 다음 공개 프로젝트로 자동 전환
                        </option>
                        {documents
                          .filter(
                            (d) => d.kind === "projects" && d.published_version,
                          )
                          .map((d) => (
                            <option value={d.id} key={d.id}>
                              {d.data.title}
                            </option>
                          ))}
                      </select>
                    </label>
                    <p className="admin-small">
                      체크한 순서로 노출됩니다. 순서를 바꾸려면 위·아래 버튼을
                      사용하세요.
                    </p>
                    {(edit.data.selectedProjects || []).map(
                      (id: string, i: number) => (
                        <div className="account-row" key={id}>
                          <span>
                            {i + 1}.{" "}
                            {documents.find((d) => d.id === id)?.data.title ||
                              "비공개 프로젝트"}
                          </span>
                          <button
                            aria-label="선별작 위로"
                            disabled={i === 0}
                            onClick={() => {
                              const ids = [...edit.data.selectedProjects];
                              [ids[i], ids[i - 1]] = [ids[i - 1], ids[i]];
                              update("selectedProjects", ids);
                            }}
                          >
                            ↑
                          </button>
                          <button
                            aria-label="선별작 아래로"
                            disabled={
                              i === edit.data.selectedProjects.length - 1
                            }
                            onClick={() => {
                              const ids = [...edit.data.selectedProjects];
                              [ids[i], ids[i + 1]] = [ids[i + 1], ids[i]];
                              update("selectedProjects", ids);
                            }}
                          >
                            ↓
                          </button>
                          <button
                            onClick={() =>
                              update(
                                "selectedProjects",
                                edit.data.selectedProjects.filter(
                                  (v: string) => v !== id,
                                ),
                              )
                            }
                          >
                            제거
                          </button>
                        </div>
                      ),
                    )}
                    <div className="settings-choices">
                      {documents
                        .filter(
                          (d) =>
                            d.kind === "projects" &&
                            d.published_version &&
                            !edit.data.selectedProjects?.includes(d.id),
                        )
                        .map((d) => (
                          <button
                            className="button"
                            disabled={edit.data.selectedProjects?.length >= 6}
                            key={d.id}
                            onClick={() =>
                              update("selectedProjects", [
                                ...edit.data.selectedProjects,
                                d.id,
                              ])
                            }
                          >
                            {d.data.title} +
                          </button>
                        ))}
                    </div>
                  </div>
                  <div className="admin-card">
                    <h2>스튜디오 소개</h2>
                    <div className="admin-form-grid">
                      <div className="full">
                        <Field
                          label="브랜드 소개"
                          value={edit.data.studioIntro}
                          rows={4}
                          onChange={(v) => update("studioIntro", v)}
                        />
                      </div>
                      <Field
                        label="서비스 (한 줄에 하나)"
                        value={edit.data.studioServices}
                        rows={4}
                        onChange={(v) => update("studioServices", v)}
                      />
                      <Field
                        label="업무 과정 (한 줄에 한 단계)"
                        value={edit.data.studioProcess}
                        rows={5}
                        onChange={(v) => update("studioProcess", v)}
                      />
                      <div className="full">
                        <Field
                          label="확인된 대표 경력·회사 이력"
                          value={edit.data.biography}
                          rows={5}
                          onChange={(v) => update("biography", v)}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="admin-card">
                    <h2>회사 정보와 개인정보 안내</h2>
                    <div className="admin-form-grid">
                      {[
                        ["companyName", "법인명"],
                        ["email", "수신이 확인된 업무 이메일"],
                        ["phone", "공개 전화 (선택)"],
                        ["address", "공개 주소 (선택)"],
                        ["instagram", "확인된 Instagram URL (선택)"],
                      ].map(([k, l]) => (
                        <Field
                          key={k}
                          label={l}
                          value={edit.data[k]}
                          onChange={(v) => update(k, v)}
                        />
                      ))}
                      <div className="full">
                        <Field
                          label="실제 처리 업체·보관 위치·위탁·국외 처리 해당 여부"
                          rows={6}
                          value={edit.data.privacyProcessors}
                          onChange={(v) => update("privacyProcessors", v)}
                        />
                      </div>
                    </div>
                    <label className="checkbox">
                      <input
                        type="checkbox"
                        checked={!!edit.data.logoApproved}
                        onChange={(e) =>
                          update("logoApproved", e.target.checked)
                        }
                      />
                      현재 로고가 승인된 최신 마스터임을 확인했습니다.
                    </label>
                    <label className="checkbox">
                      <input
                        type="checkbox"
                        checked={!!edit.data.privacyApproved}
                        onChange={(e) =>
                          update("privacyApproved", e.target.checked)
                        }
                      />
                      실제 운영 구성과 개인정보 안내의 일치를 확인했습니다.
                    </label>
                  </div>
                </>
              ) : (
                <>
                  <div className="admin-card">
                    <h2>기본 정보</h2>
                    <div className="admin-form-grid">
                      <Field
                        label="제목"
                        value={edit.data.title}
                        onChange={(v) => update("title", v)}
                      />
                      <Field
                        label="공개 주소 (영문 소문자·숫자·하이픈)"
                        value={edit.data.slug}
                        onChange={(v) => update("slug", v)}
                      />
                      <div className="full">
                        <Field
                          label="한 문장 요약"
                          value={edit.data.summary}
                          rows={3}
                          onChange={(v) => update("summary", v)}
                        />
                      </div>
                      <Field
                        label="분류"
                        value={edit.data.category}
                        options={
                          edit.kind === "projects"
                            ? categories
                            : journalCategories
                        }
                        onChange={(v) => update("category", v)}
                      />
                      {edit.kind === "projects" ? (
                        <>
                          <Field
                            label="작업 연도"
                            value={edit.data.year}
                            type="number"
                            onChange={(v) =>
                              update("year", v ? Number(v) : undefined)
                            }
                          />
                          <Field
                            label="작업 유형 (확인된 경우)"
                            value={edit.data.workType}
                            options={workTypes}
                            onChange={(v) => update("workType", v)}
                          />
                          <Field
                            label="실제 담당 범위"
                            value={edit.data.services}
                            onChange={(v) => update("services", v)}
                          />
                          <Field
                            label="수행 당시 회사명"
                            value={edit.data.company}
                            onChange={(v) => update("company", v)}
                          />
                          <Field
                            label="면적 (확인된 경우)"
                            value={edit.data.area}
                            onChange={(v) => update("area", v)}
                          />
                          <Field
                            label="목록 편집 순서 (작을수록 먼저)"
                            type="number"
                            value={edit.data.order}
                            onChange={(v) => update("order", Number(v))}
                          />
                        </>
                      ) : (
                        <>
                          <Field
                            label="잡지·매체명 (공개 표기)"
                            value={edit.data.publicationName}
                            onChange={(v) => update("publicationName", v)}
                          />
                          <Field
                            label="호수·발행월 (공개 표기)"
                            value={edit.data.publicationIssue}
                            onChange={(v) => update("publicationIssue", v)}
                          />
                          <Field
                            label="목록 편집 순서 (작을수록 먼저)"
                            type="number"
                            value={edit.data.order}
                            onChange={(v) => update("order", Number(v))}
                          />
                          <Field
                            label="원문·출처 URL"
                            value={edit.data.sourceUrl}
                            onChange={(v) => update("sourceUrl", v)}
                          />
                          <Field
                            label="작성자 표시"
                            value={edit.data.author}
                            onChange={(v) => update("author", v)}
                          />
                          <label className="checkbox">
                            <input
                              type="checkbox"
                              checked={!!edit.data.pinned}
                              onChange={(e) =>
                                update("pinned", e.target.checked)
                              }
                            />
                            잡지 게재 상단 고정
                          </label>
                          <div className="full">
                            <p className="admin-small">
                              실제로 관련된 프로젝트만 연결하세요.
                            </p>
                            <div className="settings-choices">
                              {documents
                                .filter(
                                  (d) =>
                                    d.kind === "projects" &&
                                    d.published_version,
                                )
                                .map((d) => (
                                  <label key={d.id}>
                                    <input
                                      type="checkbox"
                                      checked={edit.data.relatedProjects?.includes(
                                        d.id,
                                      )}
                                      onChange={(e) =>
                                        update(
                                          "relatedProjects",
                                          e.target.checked
                                            ? [
                                                ...edit.data.relatedProjects,
                                                d.id,
                                              ]
                                            : edit.data.relatedProjects.filter(
                                                (id: string) => id !== d.id,
                                              ),
                                        )
                                      }
                                    />
                                    {d.data.title}
                                  </label>
                                ))}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="admin-card">
                    <h2>대표 사진</h2>
                    <p className="admin-small">
                      사진은 사진 보관함에 먼저 업로드하세요. 이미지 교체는 새
                      자산으로 적용됩니다.
                    </p>
                    <PhotoEditor
                      photo={edit.data.hero}
                      media={media}
                      onChange={(v) => update("hero", v)}
                    />
                  </div>
                  <div className="admin-card">
                    <h2>본문 편집</h2>
                    <BlocksEditor
                      blocks={edit.data.blocks || []}
                      media={media}
                      onChange={(b) => update("blocks", b)}
                    />
                  </div>
                  <div className="admin-card">
                    <h2>크레딧과 검색 정보</h2>
                    <Field
                      label="실제 참여자·사진가·출처"
                      value={edit.data.credits}
                      rows={4}
                      onChange={(v) => update("credits", v)}
                    />
                    <label className="checkbox">
                      <input
                        type="checkbox"
                        checked={!!edit.data.creditConfirmed}
                        onChange={(e) =>
                          update("creditConfirmed", e.target.checked)
                        }
                      />
                      크레딧과 사진 사용 권리를 확인했습니다.
                    </label>
                    <div className="admin-form-grid">
                      <Field
                        label="검색 제목 (미입력 시 제목 사용)"
                        value={edit.data.seoTitle}
                        onChange={(v) => update("seoTitle", v)}
                      />
                      <Field
                        label="검색 설명 (미입력 시 요약 사용)"
                        value={edit.data.seoDescription}
                        onChange={(v) => update("seoDescription", v)}
                      />
                    </div>
                  </div>
                </>
              )}
              <div className="admin-card admin-checks">
                <h2>공개 검토</h2>
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={!!edit.data.publishReviewed}
                    onChange={(e) =>
                      update("publishReviewed", e.target.checked)
                    }
                  />
                  공개 정보·실제 역할·개인정보 포함 여부를 검토했습니다.
                </label>
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={!!edit.data.demo}
                    onChange={(e) => update("demo", e.target.checked)}
                  />
                  개발 시험 자료 (DEMO)입니다. 운영에서는 공개할 수 없습니다.
                </label>
                <p className="admin-small" style={{ marginTop: 16 }}>
                  직원의 저장과 검토 요청은 기존 공개본을 바꾸지 않습니다.
                  대표는 저장된 특정 버전을 확인한 뒤 공개합니다.
                </p>
              </div>
              <div className="admin-card">
                <h2>버전·게시 이력</h2>
                <ul className="history-list">
                  {history.map((v) => (
                    <li key={v.version}>
                      <strong>v{v.version}</strong>
                      <span>
                        {time(v.created_at)} · 작성자 #{v.created_by}
                      </span>
                      <span>
                        {v.publications?.length ? "발행 이력 있음" : "초안"}
                      </span>
                      <Link
                        href={`/preview/${edit.id}?version=${v.version}`}
                        target="_blank"
                      >
                        이 버전 보기 ↗
                      </Link>
                      {owner && (
                        <button
                          className="button"
                          disabled={dirty || busy}
                          onClick={() => act("restore", v.version)}
                        >
                          이전판 복구
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <>
              <div className="admin-title">
                <div>
                  <span className="eyebrow">WOVN STUDIO / WORKSPACE</span>
                  <h1>{labels[tab] || "작업실"}</h1>
                  <p>
                    {tab === "overview"
                      ? "사진을 고르고, 이야기를 다듬고, 함께 검토합니다."
                      : tab === "projects" || tab === "journal"
                        ? "초안부터 발행까지, 공개본을 안전하게 관리합니다."
                        : ""}
                  </p>
                </div>
                {["projects", "journal", "settings"].includes(tab) && (
                  <button
                    className="button primary"
                    disabled={busy}
                    onClick={() => create(tab as Doc["kind"])}
                  >
                    {tab === "settings" ? "설정 초안 만들기" : "새 초안 만들기"}{" "}
                    +
                  </button>
                )}
              </div>
              {tab === "overview" && (
                <>
                  <div className="admin-stats">
                    <div className="admin-stat">
                      <span>공개 콘텐츠</span>
                      <strong>
                        {published.length.toString().padStart(2, "0")}
                      </strong>
                    </div>
                    <div className="admin-stat">
                      <span>검토 대기</span>
                      <strong>
                        {reviewing.length.toString().padStart(2, "0")}
                      </strong>
                    </div>
                    <div className="admin-stat">
                      <span>작업 중 초안</span>
                      <strong>
                        {documents
                          .filter(
                            (d) => d.current_version !== d.published_version,
                          )
                          .length.toString()
                          .padStart(2, "0")}
                      </strong>
                    </div>
                  </div>
                  <div className="admin-card">
                    <h2>공개의 순서</h2>
                    <p>
                      01. 사진 보관함에 사진 등록 → 02. 프로젝트·잡지 게재 초안
                      작성 → 03. 미리보기·검토 요청 → 04. 대표의 공개 적용
                    </p>
                    <p className="admin-small" style={{ marginTop: 15 }}>
                      실제 사진과 역할·크레딧을 확인한 콘텐츠만 공개하세요. 기본
                      계정이나 가상 실적은 등록되어 있지 않습니다.
                    </p>
                  </div>
                  {owner && (
                    <div className="admin-card">
                      <h2>알림 작업자</h2>
                      <p>
                        {worker
                          ? `마지막 실행: ${time(worker)}${Date.now() - new Date(worker).getTime() > 60000 ? " · 작업자 실행 상태를 확인하세요." : " · 실행 중"}`
                          : "작업자 실행 기록이 없습니다. worker 명령을 실행하세요."}
                      </p>
                      <p className="admin-small">
                        테스트 어댑터는 알림을 ‘테스트 보관’으로 기록하며 실제
                        이메일 발송으로 표시하지 않습니다.
                      </p>
                    </div>
                  )}
                  <div className="admin-title">
                    <h2>최근 작업</h2>
                  </div>
                </>
              )}
              {["overview", "projects", "journal"].includes(tab) && (
                <>
                  {documents.filter((d) =>
                    tab === "overview" ? d.kind !== "settings" : d.kind === tab,
                  ).length ? (
                    <div className="table-scroll">
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>콘텐츠</th>
                            <th>상태</th>
                            <th>버전</th>
                            <th>최근 수정 (한국 시간)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {documents
                            .filter((d) =>
                              tab === "overview"
                                ? d.kind !== "settings"
                                : d.kind === tab,
                            )
                            .map((d) => (
                              <tr key={d.id}>
                                <td>
                                  <button
                                    onClick={() => run(() => openEditor(d.id))}
                                  >
                                    {d.data.title || "제목 없는 초안"}
                                  </button>
                                  <small>
                                    {d.kind === "projects"
                                      ? "프로젝트"
                                      : "잡지 게재"}{" "}
                                    / {d.data.slug || "주소 미입력"}
                                  </small>
                                </td>
                                <td>
                                  <Badge doc={d} />
                                </td>
                                <td>v{d.current_version}</td>
                                <td>{time(d.updated_at)}</td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="admin-empty">
                      <h2>첫 이야기를 준비해 볼까요?</h2>
                      <p>
                        실제 사진과 확인된 정보를 바탕으로 초안을 시작하세요.
                      </p>
                      <button
                        className="button"
                        onClick={() => {
                          const kind =
                            tab === "journal" ? "journal" : "projects";
                          setTab(kind);
                          create(kind);
                        }}
                      >
                        {tab === "journal" ? "잡지 게재" : "프로젝트"} 초안
                        만들기 +
                      </button>
                    </div>
                  )}
                </>
              )}
              {tab === "settings" && !edit && (
                <div className="admin-empty">
                  <h2>공통 설정도 검토 후 공개합니다.</h2>
                  <p>
                    홈 대표작, 스튜디오 소개, 연락처를 하나의 버전으로
                    관리합니다.
                  </p>
                </div>
              )}
              {tab === "media" && (
                <>
                  <div className="notice">
                    JPEG·PNG·WebP · 한 장당 최대 25MB · 한 번에 20개까지.
                    HEIC·TIFF·RAW는 먼저 변환하세요. 공개 캡션·대체 텍스트는
                    게시 버전에서 관리합니다.
                  </div>
                  <label className="upload-zone">
                    사진 등록　
                    <input
                      type="file"
                      multiple
                      accept="image/jpeg,image/png,image/webp"
                      onChange={async (e) => {
                        const files = Array.from(e.target.files || []);
                        if (files.length > 20) {
                          message("한 번에 20개까지 선택하세요.", true);
                          return;
                        }
                        setUploads(
                          files.map((file) => ({ file, status: "대기" })),
                        );
                        for (let i = 0; i < files.length; i++)
                          await upload(files[i], i);
                        e.target.value = "";
                      }}
                    />
                  </label>
                  {uploads.map((u, i) => (
                    <div key={i} className="upload-result">
                      {u.file.name} · {u.status}{" "}
                      {u.error && (
                        <button
                          className="button"
                          onClick={() => upload(u.file, i)}
                        >
                          이 파일 재시도
                        </button>
                      )}
                    </div>
                  ))}
                  <div className="media-grid">
                    {media.map((m, i) => (
                      <div className="media-card" key={m.id}>
                        <img
                          src={`/media/${m.derivatives.at(-1)!.key}`}
                          alt={`등록 사진 ${i + 1}`}
                          loading="lazy"
                        />
                        <p>
                          사진 {i + 1} / {m.width} × {m.height}
                          <br />
                          {m.id.slice(0, 8)} · {time(m.created_at)}
                        </p>
                        <button
                          className="button"
                          onClick={() => {
                            if (confirm("사용하지 않는 사진을 삭제할까요?"))
                              run(async () => {
                                await api(`media/${m.id}`, "DELETE");
                                setMedia((await api("media")).media);
                                message("사진을 삭제했습니다.");
                              });
                          }}
                        >
                          삭제
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}
              {tab === "inquiries" && owner && (
                <>
                  {selectedInquiry ? (
                    <div className="admin-card">
                      <button
                        className="text-link"
                        onClick={() => setSelectedInquiry(null)}
                      >
                        ← 문의 목록
                      </button>
                      <h2 style={{ marginTop: 25 }}>
                        {selectedInquiry.receipt}
                      </h2>
                      <div className="inquiry-detail">
                        <div>
                          <dl>
                            {Object.entries(selectedInquiry.data)
                              .filter(([k]) => k !== "consent")
                              .map(([k, v]) => (
                                <div key={k}>
                                  <dt>
                                    {(
                                      {
                                        name: "이름",
                                        replyMethod: "회신 방법",
                                        contact: "회신 연락처",
                                        message: "문의 내용",
                                        projectType: "프로젝트 유형",
                                        service: "희망 업무",
                                        region: "지역",
                                        area: "면적",
                                        budget: "예산",
                                        schedule: "일정",
                                        reference: "참고 프로젝트",
                                      } as Record<string, string>
                                    )[k] || k}
                                  </dt>
                                  <dd>{String(v) || "—"}</dd>
                                </div>
                              ))}
                          </dl>
                          <p className="admin-small">
                            접수 {time(selectedInquiry.created_at)}
                            <br />
                            삭제 예정 {time(selectedInquiry.expires_at)}
                            <br />
                            안내문 {selectedInquiry.privacy_version}
                          </p>
                        </div>
                        <div>
                          <label className="field">
                            처리 상태
                            <select
                              value={selectedInquiry.state}
                              onChange={(e) =>
                                setSelectedInquiry({
                                  ...selectedInquiry,
                                  state: e.target.value,
                                })
                              }
                            >
                              {[
                                ["new", "신규"],
                                ["reviewing", "확인 중"],
                                ["answered", "답변 완료"],
                                ["archived", "보관"],
                              ].map(([v, l]) => (
                                <option key={v} value={v}>
                                  {l}
                                </option>
                              ))}
                            </select>
                          </label>
                          <Field
                            label="내부 메모"
                            rows={6}
                            value={selectedInquiry.note}
                            onChange={(note) =>
                              setSelectedInquiry({ ...selectedInquiry, note })
                            }
                          />
                          <button
                            className="button primary"
                            style={{ marginTop: 20 }}
                            onClick={() =>
                              run(async () => {
                                await api(
                                  `inquiries/${selectedInquiry.id}`,
                                  "PUT",
                                  {
                                    state: selectedInquiry.state,
                                    note: selectedInquiry.note,
                                  },
                                );
                                setInquiries(
                                  (await api("inquiries")).inquiries,
                                );
                                message("처리 상태와 메모를 저장했습니다.");
                              })
                            }
                          >
                            저장
                          </button>
                          <p className="admin-small" style={{ marginTop: 25 }}>
                            알림:{" "}
                            {notificationLabel(
                              selectedInquiry.notification_state,
                            )}{" "}
                            · 시도 {selectedInquiry.attempts}회<br />
                            {selectedInquiry.error_code || ""}
                          </p>
                          {["failed", "test"].includes(
                            selectedInquiry.notification_state,
                          ) && (
                            <button
                              className="button"
                              onClick={() =>
                                run(async () => {
                                  await api(
                                    `inquiries/${selectedInquiry.id}/retry`,
                                    "POST",
                                  );
                                  const list = (await api("inquiries"))
                                    .inquiries;
                                  setInquiries(list);
                                  setSelectedInquiry(
                                    list.find(
                                      (i: any) => i.id === selectedInquiry.id,
                                    ),
                                  );
                                  message("알림 재시도를 예약했습니다.");
                                })
                              }
                            >
                              알림 재시도
                            </button>
                          )}
                          <button
                            className="button danger"
                            style={{ marginTop: 30 }}
                            onClick={() => {
                              if (confirm("문의와 개인정보를 영구 삭제할까요?"))
                                run(async () => {
                                  await api(
                                    `inquiries/${selectedInquiry.id}`,
                                    "DELETE",
                                  );
                                  setSelectedInquiry(null);
                                  setInquiries(
                                    (await api("inquiries")).inquiries,
                                  );
                                  message("문의를 삭제했습니다.");
                                });
                            }}
                          >
                            문의 영구 삭제
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : inquiries.length ? (
                    <div className="table-scroll">
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>접수</th>
                            <th>이름</th>
                            <th>처리</th>
                            <th>알림</th>
                          </tr>
                        </thead>
                        <tbody>
                          {inquiries.map((i) => (
                            <tr key={i.id}>
                              <td>
                                <button onClick={() => setSelectedInquiry(i)}>
                                  {i.receipt}
                                </button>
                                <small>{time(i.created_at)}</small>
                              </td>
                              <td>{i.data.name}</td>
                              <td>
                                {
                                  {
                                    new: "신규",
                                    reviewing: "확인 중",
                                    answered: "답변 완료",
                                    archived: "보관",
                                  }[i.state as string]
                                }
                              </td>
                              <td>{notificationLabel(i.notification_state)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="admin-empty">
                      <h2>접수된 문의가 없습니다.</h2>
                      <p>
                        새로운 공간의 이야기가 도착하면 이곳에서 확인합니다.
                      </p>
                    </div>
                  )}
                </>
              )}
              {tab === "users" && owner && (
                <>
                  <div className="admin-card">
                    <h2>운영 계정</h2>
                    {users.map((u) => (
                      <div className="account-row" key={u.id}>
                        <div>
                          {u.name}
                          <small>
                            {u.email} · {u.role === "owner" ? "대표" : "직원"} ·{" "}
                            {u.active ? "활성" : "중지"}
                          </small>
                        </div>
                        {u.id !== user.id && (
                          <>
                            <button
                              className="button"
                              onClick={() =>
                                run(async () => {
                                  await api(`users/${u.id}`, "PUT", {
                                    active: !u.active,
                                    role: u.role,
                                  });
                                  setUsers((await api("users")).users);
                                })
                              }
                            >
                              {u.active ? "계정 중지" : "활성화"}
                            </button>
                            <button
                              className="button"
                              onClick={() => {
                                if (
                                  confirm(
                                    `${u.name} 계정을 ${u.role === "owner" ? "직원" : "대표"}으로 변경할까요?`,
                                  )
                                )
                                  run(async () => {
                                    await api(`users/${u.id}`, "PUT", {
                                      active: u.active,
                                      role:
                                        u.role === "owner" ? "editor" : "owner",
                                    });
                                    setUsers((await api("users")).users);
                                  });
                              }}
                            >
                              역할 변경
                            </button>
                            <button
                              className="button"
                              onClick={() => {
                                const password = prompt(
                                  "새 임시 비밀번호 (12자 이상, 안전한 별도 경로로 전달)",
                                );
                                if (password)
                                  run(async () => {
                                    await api(`users/${u.id}`, "PUT", {
                                      active: u.active,
                                      role: u.role,
                                      password,
                                    });
                                    message(
                                      "비밀번호를 변경하고 기존 세션을 종료했습니다.",
                                    );
                                  });
                              }}
                            >
                              비밀번호 재설정
                            </button>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="admin-card">
                    <h2>개별 계정 생성</h2>
                    <form
                      method="post"
                      action="/api/wovn/users"
                      onSubmit={(e) => {
                        e.preventDefault();
                        const form = e.currentTarget,
                          d = Object.fromEntries(new FormData(form));
                        run(async () => {
                          await api("users", "POST", d);
                          form.reset();
                          setUsers((await api("users")).users);
                          message(
                            "계정을 생성했습니다. 로그인 정보는 안전한 별도 경로로 전달하세요.",
                          );
                        });
                      }}
                    >
                      <div className="admin-form-grid">
                        <label className="field">
                          이름
                          <input name="name" required />
                        </label>
                        <label className="field">
                          이메일
                          <input name="email" type="email" required />
                        </label>
                        <label className="field">
                          임시 비밀번호 (12자 이상)
                          <input
                            name="password"
                            type="password"
                            minLength={12}
                            autoComplete="new-password"
                            required
                          />
                        </label>
                        <label className="field">
                          역할
                          <select name="role">
                            <option value="editor">직원</option>
                            <option value="owner">대표</option>
                          </select>
                        </label>
                      </div>
                      <button
                        className="button primary"
                        style={{ marginTop: 25 }}
                        disabled={busy}
                      >
                        계정 생성
                      </button>
                    </form>
                  </div>
                </>
              )}
              {tab === "audit" && owner && (
                <div className="table-scroll">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>시각 (한국 시간)</th>
                        <th>작업</th>
                        <th>작업자</th>
                        <th>대상</th>
                      </tr>
                    </thead>
                    <tbody>
                      {events.map((e) => (
                        <tr key={e.id}>
                          <td>{time(e.created_at)}</td>
                          <td>{e.action}</td>
                          <td>{e.actor_id ? `#${e.actor_id}` : "시스템"}</td>
                          <td>{e.target}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
function notificationLabel(s: string) {
  return (
    (
      {
        pending: "발송 대기",
        processing: "처리 중",
        retry: "재시도 대기",
        failed: "발송 실패",
        sent: "발송 완료",
        test: "테스트 보관 · 실제 미발송",
      } as Record<string, string>
    )[s] || s
  );
}
