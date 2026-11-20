"use client";

import { useEffect, useRef, useState } from "react";
import {
  copyFieldLabels,
  copyEditChanged,
  copyEditStale,
  copyReviewRequest,
  newCopyEdit,
  restoreCopyDraft,
  type CopyDraft,
  type CopyEdit,
  type CopyField,
  type CopyRecord,
} from "@/lib/copy-review";
import styles from "./review.module.css";

const STORAGE_KEY = "wovn-mobile-copy-review-v1";

export function CopyReview({ records }: { records: CopyRecord[] }) {
  const [draft, setDraft] = useState<CopyDraft>({
    schemaVersion: 1,
    edits: [],
  });
  const [ready, setReady] = useState(false);
  const [kind, setKind] = useState("all");
  const [language, setLanguage] = useState("ko");
  const [query, setQuery] = useState("");
  const [changedOnly, setChangedOnly] = useState(false);
  const [message, setMessage] = useState("");
  const [result, setResult] = useState(false);
  const [copied, setCopied] = useState(false);
  const [undo, setUndo] = useState<CopyEdit | null>(null);
  const resultSection = useRef<HTMLElement>(null);
  const resultBox = useRef<HTMLTextAreaElement>(null);
  const edits = new Map(draft.edits.map((edit) => [edit.id, edit]));
  const current = new Map(records.map((record) => [record.id, record]));
  const orphanCount = draft.edits.filter(
    (edit) => !current.has(edit.id),
  ).length;
  const shown = records.filter(
    (record) =>
      (kind === "all" || record.kind === kind) &&
      (!changedOnly || edits.has(record.id)) &&
      `${record.code} ${record.title} ${record.original.headingKo || ""} ${record.original.ko} ${record.original.en}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  );
  const request =
    result && draft.edits.length ? copyReviewRequest(draft, records) : "";

  useEffect(() => {
    try {
      const saved = restoreCopyDraft(localStorage.getItem(STORAGE_KEY));
      setDraft(saved.draft);
      setMessage(
        saved.warning ||
          "한글만 고치거나 메모를 남겨도 됩니다. 영문은 함께 다듬어 반영합니다.",
      );
    } catch {
      setMessage(
        "자동 저장이 제한된 브라우저입니다. 요청 내용을 복사해 보관해주세요.",
      );
    }
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    } catch {
      setMessage(
        "자동 저장을 사용할 수 없습니다. 완료 후 요청 내용을 복사해주세요.",
      );
    }
  }, [draft, ready]);
  useEffect(() => {
    if (result) resultSection.current?.scrollIntoView({ block: "start" });
  }, [result]);

  function update(
    record: CopyRecord,
    patch: Partial<Pick<CopyEdit, "values" | "note" | "hide">>,
  ) {
    if (!ready) return;
    const edit = { ...(edits.get(record.id) || newCopyEdit(record)), ...patch };
    setDraft({
      schemaVersion: 1,
      edits: [
        ...draft.edits.filter((item) => item.id !== record.id),
        ...(copyEditChanged(edit) ? [edit] : []),
      ],
    });
    setResult(false);
    setCopied(false);
  }
  function cancel(record: CopyRecord) {
    const edit = edits.get(record.id);
    if (!edit) return;
    setUndo(edit);
    setDraft({
      ...draft,
      edits: draft.edits.filter((item) => item.id !== record.id),
    });
    setMessage(
      `${record.code} 수정 요청을 취소했습니다. 위의 ‘취소 되돌리기’로 복원할 수 있습니다.`,
    );
    setResult(false);
  }
  function finish() {
    if (!draft.edits.length) return;
    setResult(true);
    if (result) resultSection.current?.scrollIntoView({ block: "start" });
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(request);
      setCopied(true);
      setMessage("요청 내용을 복사했습니다. 이 대화에 붙여넣어 보내주세요.");
    } catch {
      resultBox.current?.focus();
      resultBox.current?.select();
      setMessage("요청 내용을 길게 눌러 복사한 뒤 이 대화에 보내주세요.");
    }
  }
  async function share() {
    if (!navigator.share) {
      await copy();
      return;
    }
    try {
      await navigator.share({ title: "WOVN 글 변경 요청", text: request });
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
        <h1>글 읽기·수정 요청</h1>
        <p>
          프로젝트·Studio·Journal 원고를 한글·영문으로 읽고,
          <br />
          고칠 문장이나 의견을 남겨주세요.
        </p>
        <p className={styles.hint}>
          수정 내용은 이 브라우저에 저장됩니다. 요청을 보내주시면 확인한 뒤
          홈페이지에 반영합니다.
        </p>
        <a className={styles.photoLink} href="/review/photos">
          프로젝트 사진목록 · 메인 사진 선택
        </a>
      </header>
      <div className={styles.toolbar}>
        <div className={styles.tabs} role="group" aria-label="글 종류">
          <button aria-pressed={kind === "all"} onClick={() => setKind("all")}>
            전체 글 <b>{records.length}</b>
          </button>
          <button
            aria-pressed={kind === "project"}
            onClick={() => setKind("project")}
          >
            프로젝트 <b>{records.filter((r) => r.kind === "project").length}</b>
          </button>
          <button
            aria-pressed={kind === "studio"}
            onClick={() => setKind("studio")}
          >
            Studio <b>{records.filter((r) => r.kind === "studio").length}</b>
          </button>
          <button
            aria-pressed={kind === "journal"}
            onClick={() => setKind("journal")}
          >
            Journal <b>{records.filter((r) => r.kind === "journal").length}</b>
          </button>
        </div>
        <div className={styles.filters}>
          <input
            type="search"
            aria-label="글 번호·작품명·내용 검색"
            placeholder="작품명·내용 검색"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <select
            aria-label="원고 언어"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
          >
            <option value="ko">한글</option>
            <option value="both">한글 + 영문</option>
            <option value="en">영문</option>
          </select>
        </div>
        <label className={styles.only}>
          <input
            type="checkbox"
            checked={changedOnly}
            onChange={(e) => setChangedOnly(e.target.checked)}
          />
          수정 요청만 보기 ({draft.edits.length})
        </label>
      </div>
      <p role="status" aria-live="polite" className={styles.status}>
        {ready ? message : "원고를 불러오고 있습니다."}
      </p>
      {undo && !edits.has(undo.id) && (
        <button
          className={styles.undo}
          onClick={() => {
            setDraft({ ...draft, edits: [...draft.edits, undo] });
            setUndo(null);
            setMessage("취소한 수정 요청을 복원했습니다.");
          }}
        >
          취소 되돌리기 — {undo.code}
        </button>
      )}
      {orphanCount > 0 && (
        <p className={styles.warning}>
          공개 목록에서 빠진 {orphanCount}개 항목의 기존 메모도 보관하고
          있습니다. 요청서에 함께 포함됩니다.
        </p>
      )}
      {result && (
        <section
          ref={resultSection}
          className={styles.result}
          aria-labelledby="copy-result-heading"
        >
          <h2 id="copy-result-heading">글 변경 요청 보내기</h2>
          <p>아래 내용을 복사해 이 대화에 붙여넣어 보내주세요.</p>
          <div className={styles.actions}>
            <button onClick={copy}>
              {copied ? "복사 완료 ✓" : "요청 내용 복사"}
            </button>
            <button onClick={share}>휴대폰으로 공유</button>
          </div>
          {copied && <p>복사했습니다. ChatGPT 대화에 붙여넣어 주세요.</p>}
          <textarea
            ref={resultBox}
            aria-label="글 변경 요청 내용"
            readOnly
            value={request}
            rows={9}
          />
        </section>
      )}
      <div className={styles.cards}>
        {shown.map((record) => {
          const edit = edits.get(record.id);
          const values = edit?.values || record.original;
          const base = edit?.original || record.original;
          const fields = Object.keys(base) as CopyField[];
          return (
            <article
              key={record.id}
              className={styles.card}
              aria-label={`${record.code} ${record.title}`}
            >
              <header className={styles.cardHeader}>
                {record.cover && (
                  <img
                    src={record.cover.src}
                    alt={record.cover.alt}
                    loading="lazy"
                    decoding="async"
                    width="132"
                    height="88"
                  />
                )}
                <div>
                  <span className={styles.code}>
                    {record.code} · {record.kind.toUpperCase()}
                  </span>
                  <h2>{record.title}</h2>
                  {edit && (
                    <span className={styles.badge}>
                      {edit.hide ? "글 숨김 요청" : "수정 요청 있음"}
                    </span>
                  )}
                </div>
              </header>
              {edit && copyEditStale(edit, record) && (
                <p className={styles.warning}>
                  원고의 공개 버전이 변경되었습니다. 작성했던 수정 내용은
                  보존했으니 원문을 비교해주세요.
                </p>
              )}
              {!record.translationCurrent && (
                <p className={styles.warning}>
                  한글 원고를 다시 확인할 항목입니다. 현재 영문을 참고해 메모를
                  남겨주세요.
                </p>
              )}
              <div
                className={
                  language === "both" ? styles.bilingual : styles.reading
                }
              >
                {language !== "en" && (
                  <section lang="ko">
                    <span className={styles.language}>한글</span>
                    {values.headingKo && <h3>{values.headingKo}</h3>}
                    <p>{values.ko || "한글 원고 확인 중"}</p>
                  </section>
                )}
                {language !== "ko" && (
                  <section lang="en">
                    <span className={styles.language}>ENGLISH</span>
                    {values.headingEn && <h3>{values.headingEn}</h3>}
                    <p>{values.en || "등록된 영문이 없습니다."}</p>
                  </section>
                )}
              </div>
              <details className={styles.editor}>
                <summary>{record.code} 수정 요청 남기기</summary>
                <fieldset disabled={!ready}>
                  <legend className={styles.srOnly}>
                    {record.code} 원고 편집
                  </legend>
                  <p className={styles.hint}>
                    한글만 고쳐도 됩니다. 문장을 직접 고치기 어려우면 아래
                    메모만 남겨주세요.
                  </p>
                  {fields
                    .filter((key) => !key.endsWith("En") && key !== "en")
                    .map((key) => (
                      <label key={key}>
                        {copyFieldLabels[key]}
                        <textarea
                          aria-label={`${record.code} ${copyFieldLabels[key]} 수정`}
                          rows={key === "ko" ? 7 : 2}
                          maxLength={15000}
                          value={values[key] || ""}
                          onChange={(e) =>
                            update(record, {
                              values: { ...values, [key]: e.target.value },
                            })
                          }
                        />
                      </label>
                    ))}
                  <details className={styles.englishEditor}>
                    <summary>영문·프로젝트 이름도 직접 수정</summary>
                    {fields
                      .filter((key) => key.endsWith("En") || key === "en")
                      .map((key) => (
                        <label key={key}>
                          {copyFieldLabels[key]}
                          <textarea
                            lang="en"
                            aria-label={`${record.code} ${copyFieldLabels[key]} 수정`}
                            rows={key === "en" ? 7 : 2}
                            maxLength={15000}
                            value={values[key] || ""}
                            onChange={(e) =>
                              update(record, {
                                values: { ...values, [key]: e.target.value },
                              })
                            }
                          />
                        </label>
                      ))}
                  </details>
                  <label>
                    수정 메모
                    <textarea
                      aria-label={`${record.code} 수정 메모`}
                      placeholder="예: 좀 더 간결하게 / 재료에 관한 설명을 추가 / 이 문장은 빼주세요"
                      rows={3}
                      maxLength={4000}
                      value={edit?.note || ""}
                      onChange={(e) => update(record, { note: e.target.value })}
                    />
                  </label>
                  <label className={styles.hide}>
                    <input
                      type="checkbox"
                      checked={edit?.hide || false}
                      onChange={(e) =>
                        update(record, { hide: e.target.checked })
                      }
                    />
                    이 글을 홈페이지에서 숨기도록 요청
                  </label>
                  {edit && (
                    <button type="button" onClick={() => cancel(record)}>
                      이 항목 수정 취소
                    </button>
                  )}
                </fieldset>
              </details>
              {edit && (
                <details className={styles.original}>
                  <summary>수정 전 원문 보기</summary>
                  <h3>작성 당시 한글</h3>
                  <p>
                    {edit.original.headingKo}
                    {edit.original.headingKo ? "\n" : ""}
                    {edit.original.ko}
                  </p>
                  <h3>작성 당시 영문</h3>
                  <p lang="en">
                    {edit.original.headingEn}
                    {edit.original.headingEn ? "\n" : ""}
                    {edit.original.en}
                  </p>
                  {copyEditStale(edit, record) && (
                    <>
                      <h3>현재 공개 영문</h3>
                      <p lang="en">{record.original.en}</p>
                    </>
                  )}
                </details>
              )}
            </article>
          );
        })}
        {!shown.length && (
          <p className={styles.empty}>
            표시할 글이 없습니다. 검색어나 필터를 바꿔주세요.
          </p>
        )}
      </div>
      <footer className={styles.bottom}>
        <span>
          수정 요청 <b>{draft.edits.length}</b>건
        </span>
        <button disabled={!ready || !draft.edits.length} onClick={finish}>
          요청서 만들기
        </button>
      </footer>
    </main>
  );
}
