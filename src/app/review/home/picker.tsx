"use client";

import { useEffect, useRef, useState } from "react";
import {
  homeReviewRequest,
  MAX_HOME_PHOTOS,
  restoreHomeReview,
  type HomeReviewDraft,
  type HomeReviewSnapshot,
  type ReviewPhoto,
} from "@/lib/home-review";
import styles from "./picker.module.css";

const STORAGE_KEY = "wovn-mobile-home-selection-v1";

export function HomePhotoPicker({
  snapshot,
}: {
  snapshot: HomeReviewSnapshot;
}) {
  const [draft, setDraft] = useState<HomeReviewDraft>(
    () => restoreHomeReview(null, snapshot).draft,
  );
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState("");
  const [view, setView] = useState<"photos" | "selected">("photos");
  const [project, setProject] = useState("");
  const [query, setQuery] = useState("");
  const [zoom, setZoom] = useState<ReviewPhoto | null>(null);
  const [result, setResult] = useState(false);
  const [undo, setUndo] = useState<HomeReviewDraft | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const resultBox = useRef<HTMLTextAreaElement>(null);
  const resultSection = useRef<HTMLElement>(null);
  const byKey = new Map(snapshot.photos.map((photo) => [photo.key, photo]));
  const selected = draft.selected.flatMap((key) => byKey.get(key) || []);
  const projects = [
    ...new Map(snapshot.photos.map((p) => [p.projectId, p.title])).entries(),
  ];
  const matching =
    view === "selected"
      ? selected
      : snapshot.photos.filter(
          (photo) =>
            (!project || photo.projectId === project) &&
            `${photo.reference} ${photo.title}`
              .toLowerCase()
              .includes(query.trim().toLowerCase()),
        );
  const request = draft.selected.length
    ? homeReviewRequest(draft, snapshot)
    : "";

  useEffect(() => {
    try {
      const restored = restoreHomeReview(
        localStorage.getItem(STORAGE_KEY),
        snapshot,
      );
      setDraft(restored.draft);
      setMessage(
        restored.warning ||
          `현재 메인 사진 ${snapshot.selected.length}장을 기본으로 불러왔습니다.`,
      );
    } catch {
      setMessage(
        "자동 저장이 제한된 브라우저입니다. 완료 후 요청 내용을 복사해주세요.",
      );
    }
    setReady(true);
  }, [snapshot]);
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    } catch {
      setMessage(
        "자동 저장을 사용할 수 없습니다. 요청 내용을 복사해서 보관해주세요.",
      );
    }
  }, [draft, ready]);
  useEffect(() => {
    if (zoom && !dialog.current?.open) dialog.current?.showModal();
    if (!zoom && dialog.current?.open) dialog.current.close();
  }, [zoom]);
  useEffect(() => {
    if (result) resultSection.current?.scrollIntoView({ block: "start" });
  }, [result]);

  function toggle(photo: ReviewPhoto) {
    if (!ready) return;
    const exists = draft.selected.includes(photo.key);
    if (!exists && draft.selected.length >= MAX_HOME_PHOTOS) {
      setMessage(
        "최대 8장입니다. ‘선택·순서’에서 한 장을 해제한 뒤 골라주세요.",
      );
      return;
    }
    setDraft({
      ...draft,
      selected: exists
        ? draft.selected.filter((key) => key !== photo.key)
        : [...draft.selected, photo.key],
    });
    setMessage(
      `${photo.reference} ${exists ? "선택을 해제했습니다." : "메인 사진으로 골랐습니다."}`,
    );
    setResult(false);
  }
  function move(key: string, direction: number) {
    const index = draft.selected.indexOf(key),
      next = index + direction;
    if (index < 0 || next < 0 || next >= draft.selected.length) return;
    const order = [...draft.selected];
    [order[index], order[next]] = [order[next], order[index]];
    setDraft({ ...draft, selected: order });
    setMessage(
      `${byKey.get(key)?.reference}을 메인 ${next + 1}번으로 옮겼습니다.`,
    );
  }
  function reset(empty = false) {
    setUndo(draft);
    setDraft({
      ...restoreHomeReview(null, snapshot).draft,
      selected: empty ? [] : snapshot.selected,
    });
    setMessage(
      empty
        ? "선택을 비웠습니다. 원하는 사진을 새로 골라주세요."
        : "현재 홈페이지의 메인 구성으로 되돌렸습니다.",
    );
    setResult(false);
  }
  function finish() {
    if (!selected.length) {
      setMessage("사진을 1장 이상 골라주세요.");
      return;
    }
    setResult(true);
    setView("selected");
    if (result) resultSection.current?.scrollIntoView({ block: "start" });
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(request);
      setMessage(
        "요청 내용을 복사했습니다. ChatGPT 대화에 붙여넣어 보내주세요.",
      );
    } catch {
      resultBox.current?.focus();
      resultBox.current?.select();
      setMessage("아래 요청 내용을 길게 눌러 복사한 뒤 이 대화에 보내주세요.");
    }
  }
  async function share() {
    if (!navigator.share) {
      await copy();
      return;
    }
    try {
      await navigator.share({ title: "WOVN 메인 사진 선택", text: request });
    } catch (error) {
      if (!(error instanceof Error && error.name === "AbortError"))
        setMessage("공유를 열 수 없습니다. ‘요청 내용 복사’를 이용해주세요.");
    }
  }

  return (
    <main lang="ko" className={styles.page}>
      <header className={styles.header}>
        <a href="/" aria-label="WOVN 홈페이지">
          <img
            src="/brand/wovn-studio.svg"
            width="112"
            height="40"
            alt="WOVN STUDIO"
          />
        </a>
        <h1>메인 사진 고르기</h1>
        <p>
          마음에 드는 사진을 최대 8장 골라주세요.
          <br />
          순서를 정한 후 요청 내용을 이 대화에 보내면 됩니다.
        </p>
        <p className={styles.hint}>
          선택은 이 브라우저에 저장됩니다. 홈페이지 반영은 요청을 확인한 뒤
          진행합니다.
        </p>
      </header>
      <div className={styles.toolbar}>
        <div className={styles.tabs} role="group" aria-label="사진 보기 방식">
          <button
            type="button"
            aria-pressed={view === "photos"}
            onClick={() => {
              setView("photos");
              setResult(false);
            }}
          >
            사진 고르기
          </button>
          <button
            type="button"
            aria-pressed={view === "selected"}
            onClick={() => setView("selected")}
          >
            선택·순서 <b>{selected.length}/8</b>
          </button>
        </div>
        {view === "photos" && (
          <div className={styles.filters}>
            <select
              aria-label="프로젝트 선택"
              value={project}
              onChange={(e) => setProject(e.target.value)}
            >
              <option value="">모든 프로젝트 ({projects.length})</option>
              {projects.map(([id, title]) => (
                <option key={id} value={id}>
                  {title}
                </option>
              ))}
            </select>
            <input
              type="search"
              aria-label="사진 번호 또는 작품명 검색"
              placeholder="사진 번호·작품명"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        )}
      </div>
      <p className={styles.status} role="status" aria-live="polite">
        {ready ? message : "선택 내용을 불러오고 있습니다."}
      </p>
      {view === "selected" && (
        <section className={styles.selectionTools} aria-label="선택 정리">
          <p>위에서 아래 순서대로 메인 사진이 전환됩니다.</p>
          <div>
            <button disabled={!ready} onClick={() => reset(false)}>
              현재 메인으로
            </button>
            <button disabled={!ready} onClick={() => reset(true)}>
              비우고 새로 고르기
            </button>
            {undo && (
              <button
                onClick={() => {
                  setDraft(undo);
                  setUndo(null);
                  setMessage("이전 선택을 복원했습니다.");
                }}
              >
                되돌리기 취소
              </button>
            )}
          </div>
        </section>
      )}
      {result && (
        <section
          ref={resultSection}
          className={styles.result}
          aria-labelledby="result-heading"
        >
          <h2 id="result-heading">이대로 변경 요청하기</h2>
          <p>아래 내용을 복사해 ChatGPT 대화에 붙여넣어 보내주세요.</p>
          <div className={styles.resultActions}>
            <button onClick={copy}>요청 내용 복사</button>
            <button onClick={share}>휴대폰으로 공유</button>
          </div>
          <textarea
            ref={resultBox}
            aria-label="메인 사진 변경 요청 내용"
            readOnly
            value={request}
            rows={7}
            onFocus={(e) => e.currentTarget.select()}
          />
        </section>
      )}
      {view === "photos" && (
        <p className={styles.total}>
          {matching.length}장의 사진 · 사진을 누르면 크게 볼 수 있습니다.
        </p>
      )}
      <div
        className={view === "selected" ? styles.selectedGrid : styles.photoGrid}
      >
        {matching.map((photo) => {
          const index = draft.selected.indexOf(photo.key);
          return (
            <article
              key={photo.key}
              className={styles.card}
              data-selected={index >= 0}
            >
              <button
                className={styles.imageButton}
                aria-label={`${photo.reference} 크게 보기`}
                onClick={() => setZoom(photo)}
              >
                <img
                  src={photo.src}
                  width={photo.width}
                  height={photo.height}
                  alt={photo.alt}
                  loading="lazy"
                  decoding="async"
                />
                {index >= 0 && (
                  <span className={styles.rank}>메인 {index + 1}</span>
                )}
              </button>
              <div className={styles.cardBody}>
                <h2>{photo.reference}</h2>
                <p>{photo.title}</p>
                <button
                  className={styles.selectButton}
                  disabled={!ready}
                  aria-pressed={index >= 0}
                  aria-label={`${photo.reference} ${index >= 0 ? "선택 해제" : "메인 선택"}`}
                  onClick={() => toggle(photo)}
                >
                  {index >= 0 ? `✓ 메인 ${index + 1} · 해제` : "+ 메인 선택"}
                </button>
                {view === "selected" && (
                  <div className={styles.orderButtons}>
                    <button
                      disabled={index === 0}
                      aria-label={`${photo.reference} 앞으로`}
                      onClick={() => move(photo.key, -1)}
                    >
                      ← 앞으로
                    </button>
                    <button
                      disabled={index === selected.length - 1}
                      aria-label={`${photo.reference} 뒤로`}
                      onClick={() => move(photo.key, 1)}
                    >
                      뒤로 →
                    </button>
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>
      {!matching.length && (
        <p className={styles.empty}>
          {view === "selected"
            ? "아직 선택한 사진이 없습니다. ‘사진 고르기’에서 골라주세요."
            : "검색 결과가 없습니다. 프로젝트나 검색어를 바꿔보세요."}
        </p>
      )}
      {view === "selected" && (
        <label className={styles.note}>
          추가 요청 메모
          <textarea
            maxLength={4000}
            rows={3}
            value={draft.note}
            onChange={(e) => setDraft({ ...draft, note: e.target.value })}
            placeholder="예: 첫 사진은 조금 더 밝게 보여주세요."
          />
        </label>
      )}
      <div className={styles.bottom}>
        <span>
          <b>{selected.length}</b> / 8장
        </span>
        <button disabled={!ready || !selected.length} onClick={finish}>
          선택 완료 · 요청 만들기
        </button>
      </div>
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
            <div className={styles.zoomHeader}>
              <span>{zoom.reference}</span>
              <button
                onClick={() => setZoom(null)}
                aria-label="사진 크게 보기 닫기"
              >
                닫기 ×
              </button>
            </div>
            <img
              src={zoom.largeSrc}
              width={zoom.width}
              height={zoom.height}
              alt={zoom.alt}
            />
            <button
              className={styles.selectButton}
              disabled={!ready}
              onClick={() => toggle(zoom)}
            >
              {draft.selected.includes(zoom.key) ? "선택 해제" : "+ 메인 선택"}
            </button>
            <p role="status">{message}</p>
          </>
        )}
      </dialog>
    </main>
  );
}
