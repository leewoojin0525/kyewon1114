"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { restoreHomeReview, type HomeReviewDraft } from "@/lib/home-review";
import {
  editedPhotoOrder,
  moveReviewPhoto,
  newPhotoEdit,
  photoEditChanged,
  photoReviewRequest,
  restorePhotoReview,
  toggleReviewRemoval,
  type CatalogPhoto,
  type PhotoProjectEdit,
  type PhotoReviewDraft,
  type PhotoReviewSnapshot,
} from "@/lib/photo-review";
import styles from "./review.module.css";

const KEY = "wovn-project-photo-review-v1";
const HOME_KEY = "wovn-mobile-home-selection-v1";

function Position({
  value,
  max,
  label,
  onMove,
}: {
  value: number;
  max: number;
  label: string;
  onMove: (n: number) => void;
}) {
  const [input, setInput] = useState(String(value));
  useEffect(() => setInput(String(value)), [value]);
  function commit() {
    const number = Number(input);
    if (Number.isInteger(number) && number > 0 && number <= max) onMove(number);
    else setInput(String(value));
  }
  return (
    <label className={styles.position}>
      순서
      <input
        aria-label={label}
        type="number"
        inputMode="numeric"
        min={1}
        max={max}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
      />
      <span>/ {max}</span>
    </label>
  );
}

export function PhotoReview({ snapshot }: { snapshot: PhotoReviewSnapshot }) {
  const [draft, setDraft] = useState<PhotoReviewDraft>({
    schemaVersion: 1,
    edits: [],
  });
  const [home, setHome] = useState<HomeReviewDraft>(
    restoreHomeReview(null, snapshot.home).draft,
  );
  const [includeHome, setIncludeHome] = useState(false);
  const [view, setView] = useState<"projects" | "home">("projects");
  const [project, setProject] = useState(snapshot.projects[0]?.id || "all");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState("");
  const [zoom, setZoom] = useState<CatalogPhoto | null>(null);
  const [request, setRequest] = useState("");
  const [showLogin, setShowLogin] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);
  const [undo, setUndo] = useState<PhotoReviewDraft | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const result = useRef<HTMLElement>(null);
  const textBox = useRef<HTMLTextAreaElement>(null);
  const upload = useRef<HTMLInputElement>(null);
  const byKey = new Map(snapshot.photos.map((p) => [p.key, p]));
  const edits = new Map(draft.edits.map((e) => [e.projectId, e]));
  const changedCount = draft.edits.filter(photoEditChanged).length;
  const selected = home.selected
    .map((key) => byKey.get(key))
    .filter((p): p is CatalogPhoto => Boolean(p));

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        setDraft(restorePhotoReview(JSON.stringify(saved.draft)));
        setIncludeHome(saved.includeHome === true);
      }
      const restored = restoreHomeReview(
        localStorage.getItem(HOME_KEY),
        snapshot.home,
      );
      setHome(restored.draft);
      setMessage(
        restored.warning ||
          "사진 순서를 바꾸거나 메모를 남긴 뒤 아래에서 요청을 만들어주세요.",
      );
    } catch {
      setMessage(
        "이전 저장 내용을 읽지 못했습니다. 저장 파일이 있다면 ‘이어하기 파일 불러오기’를 이용해주세요.",
      );
      try {
        const raw = localStorage.getItem(KEY);
        if (raw) localStorage.setItem(`${KEY}-recovery`, raw);
      } catch {
        /* Storage unavailable. */
      }
    }
    if (new URLSearchParams(location.search).get("view") === "home")
      setView("home");
    setReady(true);
  }, [snapshot.home]);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(KEY, JSON.stringify({ draft, includeHome }));
      localStorage.setItem(HOME_KEY, JSON.stringify(home));
    } catch {
      setMessage(
        "이 브라우저는 자동 저장을 제한합니다. 요청 내용이나 이어하기 파일을 저장해주세요.",
      );
    }
  }, [draft, home, includeHome, ready]);
  useEffect(() => {
    if (zoom) dialog.current?.showModal();
    else dialog.current?.close();
  }, [zoom]);
  useEffect(() => {
    if (request) result.current?.scrollIntoView({ block: "start" });
  }, [request]);

  function update(
    photo: CatalogPhoto,
    action: (edit: PhotoProjectEdit) => PhotoProjectEdit,
  ) {
    if (!ready) return;
    const edit = action(
      edits.get(photo.projectId) || newPhotoEdit(snapshot, photo.projectId),
    );
    setDraft({
      schemaVersion: 1,
      edits: [
        ...draft.edits.filter((e) => e.projectId !== photo.projectId),
        edit,
      ].filter(photoEditChanged),
    });
    setRequest("");
  }
  function move(photo: CatalogPhoto, position: number) {
    update(photo, (edit) => moveReviewPhoto(edit, photo.reference, position));
    setMessage(`${photo.reference}을 ${position}번 위치로 이동했습니다.`);
  }
  function toggleHome(photo: CatalogPhoto) {
    if (!ready || photo.deleted) return;
    if (!home.selected.includes(photo.key) && home.selected.length >= 8) {
      setMessage(
        "메인 사진은 최대 8장입니다. 선택한 사진 한 장을 해제한 뒤 골라주세요.",
      );
      return;
    }
    setHome({
      ...home,
      selected: home.selected.includes(photo.key)
        ? home.selected.filter((key) => key !== photo.key)
        : [...home.selected, photo.key],
    });
    setIncludeHome(true);
    setRequest("");
    setMessage(`${photo.reference} 메인 선택을 변경했습니다.`);
  }
  function moveHome(key: string, position: number) {
    const order = home.selected.filter((id) => id !== key);
    order.splice(Math.max(0, Math.min(order.length, position - 1)), 0, key);
    setHome({ ...home, selected: order });
    setIncludeHome(true);
    setRequest("");
  }
  function makeRequest() {
    try {
      const withHome = includeHome || view === "home";
      setRequest(photoReviewRequest(draft, snapshot, home, withHome));
      setMessage(
        "요청 내용을 복사하거나 공유해서 이 대화에 보내주세요. 아직 홈페이지에 반영되지 않았습니다.",
      );
    } catch (e) {
      setMessage((e as Error).message);
    }
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(request);
      setMessage("복사했습니다. 이 대화에 붙여넣어 보내주세요.");
    } catch {
      textBox.current?.focus();
      textBox.current?.select();
      setMessage("아래 요청 내용을 길게 눌러 복사해주세요.");
    }
  }
  async function share() {
    if (!navigator.share) return copy();
    try {
      await navigator.share({ title: "WOVN 사진 변경 요청", text: request });
    } catch (e) {
      if ((e as Error).name !== "AbortError") await copy();
    }
  }
  function download(
    text: string,
    name: string,
    type = "text/plain;charset=utf-8",
  ) {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
  }
  async function importFile(file?: File) {
    if (!file) return;
    try {
      if (file.size > 2_000_000)
        throw new Error("이어하기 파일 크기를 확인해주세요.");
      const value = JSON.parse(await file.text());
      if (value.type !== "wovn-photo-review" || value.version !== 1)
        throw new Error(
          "WOVN 사진목록에서 저장한 이어하기 파일을 선택해주세요.",
        );
      const next = restorePhotoReview(JSON.stringify(value.draft));
      const restored = restoreHomeReview(
        JSON.stringify(value.home),
        snapshot.home,
      );
      setUndo(draft);
      setDraft(next);
      setHome(restored.draft);
      setIncludeHome(value.includeHome === true);
      setRequest("");
      setMessage(`이어하기 파일을 불러왔습니다. ${restored.warning}`);
    } catch (e) {
      setMessage(`불러오지 못했습니다. ${(e as Error).message}`);
    }
    if (upload.current) upload.current.value = "";
  }
  async function login(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoggingIn(true);
    const form = new FormData(e.currentTarget);
    try {
      const response = await fetch("/api/wovn/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.get("email"),
          password: form.get("password"),
        }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "로그인 정보를 확인해주세요.");
      }
      location.reload();
    } catch (error) {
      setMessage((error as Error).message);
      setLoggingIn(false);
    }
  }

  let matching: CatalogPhoto[];
  if (view === "home") matching = selected;
  else
    matching = snapshot.projects
      .flatMap((group) => {
        if (project !== "all" && project !== group.id) return [];
        const edit = edits.get(group.id) || newPhotoEdit(snapshot, group.id);
        const order = editedPhotoOrder(edit);
        return snapshot.photos
          .filter((p) => p.projectId === group.id)
          .sort((a, b) => {
            const ai = order.indexOf(a.reference),
              bi = order.indexOf(b.reference);
            return (
              (ai < 0 ? 10000 + a.order : ai) - (bi < 0 ? 10000 + b.order : bi)
            );
          });
      })
      .filter(
        (p) =>
          (filter === "all" ||
            (filter === "deleted" ? p.deleted : !p.deleted)) &&
          `${p.reference} ${p.title}`
            .toLowerCase()
            .includes(query.trim().toLowerCase()),
      );

  return (
    <main lang="ko" className={styles.page}>
      <header className={styles.header}>
        <a href="/" aria-label="WOVN 홈페이지">
          <img
            src="/brand/wovn-studio.svg"
            width={120}
            height={44}
            alt="WOVN STUDIO"
          />
        </a>
        <a href="/review/copy">글 목록 · 수정 요청</a>
        <h1>프로젝트 사진목록</h1>
        <p>
          {snapshot.projects.length}개 프로젝트 · 게시 중{" "}
          {snapshot.home.photos.length}장 · 삭제 보관 {snapshot.deletedCount}장
        </p>
        <p className={styles.hint}>
          휴대폰과 컴퓨터에서 이 주소로 열어주세요. 편집은 현재 브라우저에
          저장되며, 요청을 보내야 홈페이지에 반영됩니다.
        </p>
      </header>
      <nav className={styles.toolbar} aria-label="사진목록 보기">
        <div className={styles.tabs}>
          <button
            aria-pressed={view === "projects"}
            onClick={() => setView("projects")}
          >
            프로젝트 사진
          </button>
          <button
            aria-pressed={view === "home"}
            onClick={() => setView("home")}
          >
            메인 사진 <b>{home.selected.length} / 8</b>
          </button>
        </div>
        {view === "projects" && (
          <div className={styles.filters}>
            <select
              aria-label="프로젝트 선택"
              value={project}
              onChange={(e) => {
                setProject(e.target.value);
                setQuery("");
              }}
            >
              <option value="all">전체 프로젝트</option>
              {snapshot.projects.map((p, i) => (
                <option key={p.id} value={p.id}>
                  {String(i + 1).padStart(2, "0")} · {p.title}
                </option>
              ))}
            </select>
            <input
              type="search"
              aria-label="사진 검색"
              placeholder="사진 번호·작품명 검색"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                if (e.target.value) setProject("all");
              }}
            />
            <select
              aria-label="게시 상태"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="all">전체 상태</option>
              <option value="published">게시 중</option>
              <option value="deleted">삭제됨</option>
            </select>
          </div>
        )}
      </nav>
      <p className={styles.message} role="status" aria-live="polite">
        {ready ? message : "저장한 선택을 불러오고 있습니다."}
      </p>
      <details className={styles.help}>
        <summary>편집 방법 · 다른 기기에서 이어하기</summary>
        <p>
          사진을 누르면 크게 볼 수 있습니다. ‘맨 앞으로·앞으로·뒤로’ 버튼이나
          순서 숫자로 옮기세요. 1번이 해당 프로젝트의 표지가 됩니다.
        </p>
        <p>
          다른 기기에서는 이 주소를 그대로 열면 됩니다. 아직 보내지 않은 편집
          내용은 자동 동기화되지 않습니다. 이어하기 파일을 저장해 다른 기기에서
          불러올 수 있습니다.
        </p>
        <div className={styles.actions}>
          <button
            disabled={!ready}
            onClick={() =>
              download(
                JSON.stringify({
                  type: "wovn-photo-review",
                  version: 1,
                  draft,
                  home,
                  includeHome,
                }),
                "WOVN-사진목록-이어하기.json",
                "application/json",
              )
            }
          >
            이어하기 파일 저장
          </button>
          <button disabled={!ready} onClick={() => upload.current?.click()}>
            이어하기 파일 불러오기
          </button>
        </div>
        <input
          ref={upload}
          type="file"
          accept=".json,application/json"
          hidden
          onChange={(e) => void importFile(e.target.files?.[0])}
        />
      </details>
      {!snapshot.privateHistory && (
        <section className={styles.private}>
          <p>
            삭제했던 {snapshot.deletedCount}장은 비공개로 보관 중입니다. 대표
            계정으로 로그인하면 같은 목록에서 확인하고 복원 요청할 수 있습니다.
          </p>
          <button onClick={() => setShowLogin(!showLogin)}>
            {showLogin ? "로그인 접기" : "삭제 사진 보기 · 대표 로그인"}
          </button>
          {showLogin && (
            <form onSubmit={login} className={styles.login}>
              <label>
                대표 계정 이메일
                <input
                  name="email"
                  type="email"
                  autoComplete="username"
                  required
                />
              </label>
              <label>
                비밀번호
                <input
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                />
              </label>
              <button disabled={loggingIn}>
                {loggingIn ? "확인 중…" : "로그인하고 사진 보기"}
              </button>
            </form>
          )}
        </section>
      )}
      {snapshot.privateHistory && (
        <p className={styles.hint}>대표 계정 · 삭제된 사진까지 표시합니다.</p>
      )}
      {draft.edits.some(
        (e) =>
          snapshot.projects.find((p) => p.id === e.projectId)?.version !==
          e.expectedVersion,
      ) && (
        <p className={styles.warning}>
          편집을 시작한 뒤 홈페이지 내용이 바뀐 프로젝트가 있습니다. 기존 요청은
          보존했으며, 요청서에 기준 버전을 함께 표시합니다.
        </p>
      )}
      {view === "home" && (
        <section className={styles.homeIntro}>
          <h2>메인페이지에 보여줄 사진</h2>
          <p>
            아래 순서로 메인 사진이 전환됩니다. 다른 사진은 ‘프로젝트 사진’에서
            골라주세요.
          </p>
          <div className={styles.actions}>
            <button onClick={() => setView("projects")}>사진 더 고르기</button>
            <button
              disabled={!ready}
              onClick={() => {
                setHome({ ...home, selected: [] });
                setIncludeHome(true);
                setRequest("");
              }}
            >
              선택 비우기
            </button>
            <button
              disabled={!ready}
              onClick={() => {
                setHome(restoreHomeReview(null, snapshot.home).draft);
                setIncludeHome(false);
                setRequest("");
              }}
            >
              현재 메인으로 되돌리기
            </button>
          </div>
        </section>
      )}
      <p className={styles.total}>
        {matching.length}장 표시 · 사진을 누르면 크게 보기
      </p>
      <div className={styles.grid}>
        {matching.map((photo) => {
          const edit =
            edits.get(photo.projectId) ||
            newPhotoEdit(snapshot, photo.projectId);
          const order = editedPhotoOrder(edit);
          const position =
            view === "home"
              ? home.selected.indexOf(photo.key) + 1
              : order.indexOf(photo.reference) + 1;
          const count = view === "home" ? home.selected.length : order.length;
          const deleting = edit.remove.includes(photo.reference),
            restoring = edit.restore.some(
              (p) => p.reference === photo.reference,
            );
          const main = home.selected.indexOf(photo.key);
          const onMove = (n: number) =>
            view === "home" ? moveHome(photo.key, n) : move(photo, n);
          return (
            <article
              key={photo.key}
              className={styles.card}
              data-deleted={photo.deleted}
              data-reference={photo.reference}
            >
              <button
                className={styles.image}
                aria-label={`${photo.reference} 크게 보기`}
                onClick={() => setZoom(photo)}
              >
                <img
                  src={photo.src}
                  alt={photo.alt}
                  width={photo.width}
                  height={photo.height}
                  loading="lazy"
                  decoding="async"
                />
                {main >= 0 && (
                  <span className={styles.badge}>메인 {main + 1}</span>
                )}
              </button>
              <div className={styles.body}>
                <h2>{photo.reference}</h2>
                <p className={styles.title}>{photo.title}</p>
                <p className={photo.deleted ? styles.deleted : styles.hint}>
                  {photo.deleted
                    ? `삭제됨 · 이전 순서 ${photo.order}`
                    : `현재 게시 순서 ${photo.order}${photo.order === 1 ? " · 표지" : ""}`}
                </p>
                <p
                  className={styles.source}
                  data-quality={
                    photo.lowResolution
                      ? "low"
                      : photo.sourceStatus.includes("고용량")
                        ? "high"
                        : "unknown"
                  }
                >
                  {photo.sourceStatus}
                </p>
                {position > 0 && (
                  <>
                    <Position
                      value={position}
                      max={count}
                      label={`${photo.reference} ${view === "home" ? "메인 " : ""}변경 순서`}
                      onMove={onMove}
                    />
                    <div className={styles.moves}>
                      <button
                        disabled={!ready || position === 1}
                        aria-label={`${photo.reference} 맨 앞으로`}
                        onClick={() => onMove(1)}
                      >
                        맨 앞으로
                      </button>
                      <button
                        disabled={!ready || position === 1}
                        aria-label={`${photo.reference} 앞으로`}
                        onClick={() => onMove(position - 1)}
                      >
                        앞으로
                      </button>
                      <button
                        disabled={!ready || position === count}
                        aria-label={`${photo.reference} 뒤로`}
                        onClick={() => onMove(position + 1)}
                      >
                        뒤로
                      </button>
                    </div>
                  </>
                )}
                {view === "projects" && (
                  <>
                    <label className={styles.check}>
                      <input
                        type="checkbox"
                        checked={photo.deleted ? restoring : deleting}
                        disabled={!ready}
                        onChange={() => {
                          update(photo, (e) => toggleReviewRemoval(e, photo));
                          setMessage(
                            `${photo.reference} ${photo.deleted ? "복원" : "삭제"} 요청을 변경했습니다.`,
                          );
                        }}
                      />
                      {photo.deleted ? "복원 요청" : "삭제 요청"}
                    </label>
                    <label className={styles.note}>
                      보정·변경 메모
                      <textarea
                        aria-label={`${photo.reference} 메모`}
                        rows={2}
                        maxLength={4000}
                        placeholder="예: 밝기 조정, 가장자리 정리"
                        value={edit.notes[photo.reference] || ""}
                        onChange={(e) =>
                          update(photo, (value) => ({
                            ...value,
                            notes: {
                              ...value.notes,
                              [photo.reference]: e.target.value,
                            },
                          }))
                        }
                      />
                    </label>
                  </>
                )}
                {!photo.deleted && (
                  <button
                    className={styles.pick}
                    aria-pressed={main >= 0}
                    disabled={!ready}
                    aria-label={`${photo.reference} ${main >= 0 ? "메인 선택 해제" : "메인 선택"}`}
                    onClick={() => toggleHome(photo)}
                  >
                    {main >= 0
                      ? `메인 ${main + 1} · 선택 해제`
                      : "메인 사진으로 선택"}
                  </button>
                )}
                {photo.deleted && (
                  <p className={styles.hint}>
                    복원 반영 후 메인 사진으로 고를 수 있습니다.
                  </p>
                )}
              </div>
            </article>
          );
        })}
      </div>
      {!matching.length && (
        <p className={styles.empty}>
          {filter === "deleted" && !snapshot.privateHistory
            ? "위에서 대표 계정으로 로그인하면 삭제된 사진을 볼 수 있습니다."
            : "해당하는 사진이 없습니다. 프로젝트나 검색어를 바꿔주세요."}
        </p>
      )}
      {view === "home" && (
        <label className={styles.note}>
          메인페이지 요청 메모
          <textarea
            rows={3}
            maxLength={4000}
            value={home.note}
            onChange={(e) => {
              setHome({ ...home, note: e.target.value });
              setIncludeHome(true);
              setRequest("");
            }}
          />
        </label>
      )}
      {changedCount > 0 && (
        <div className={styles.actions}>
          <button
            onClick={() => {
              setUndo(draft);
              setDraft({ schemaVersion: 1, edits: [] });
              setRequest("");
            }}
          >
            사진 편집을 현재 게시 상태로 되돌리기
          </button>
        </div>
      )}
      {undo && (
        <button
          onClick={() => {
            setDraft(undo);
            setUndo(null);
            setRequest("");
          }}
        >
          되돌리기 취소
        </button>
      )}
      {request && (
        <section ref={result} className={styles.result}>
          <h2>사진 변경 요청서</h2>
          <p>아래 내용을 복사하거나 공유해서 이 대화에 보내주세요.</p>
          <div className={styles.actions}>
            <button onClick={copy}>요청 복사</button>
            <button onClick={share}>공유</button>
            <button onClick={() => download(request, "WOVN-사진변경요청.txt")}>
              요청 파일 저장
            </button>
          </div>
          <textarea
            ref={textBox}
            aria-label="사진 변경 요청 내용"
            value={request}
            readOnly
            rows={10}
            onFocus={(e) => e.currentTarget.select()}
          />
        </section>
      )}
      <footer className={styles.bottom}>
        <span>
          프로젝트 <b>{changedCount}</b>개 수정 · 메인{" "}
          <b>{home.selected.length}</b> / 8
        </span>
        <button disabled={!ready} onClick={makeRequest}>
          변경 요청 만들기
        </button>
      </footer>
      <dialog
        ref={dialog}
        className={styles.zoom}
        onClose={() => setZoom(null)}
        onClick={(e) => {
          if (e.target === e.currentTarget) setZoom(null);
        }}
      >
        {zoom && (
          <>
            <div>
              <strong>{zoom.reference}</strong>
              <button onClick={() => setZoom(null)}>닫기</button>
            </div>
            <img
              src={zoom.largeSrc}
              width={zoom.width}
              height={zoom.height}
              alt={zoom.alt}
            />
            <p>
              {zoom.title}
              {zoom.deleted ? " · 삭제된 사진 (보관 미리보기)" : ""}
            </p>
          </>
        )}
      </dialog>
    </main>
  );
}
