import test from "node:test";
import assert from "node:assert/strict";
import {
  publicCopyReview,
  type CopyTranslations,
} from "../src/lib/copy-review-public";
import {
  newCopyEdit,
  restoreCopyDraft,
  copyReviewRequest,
  copyEditStale,
  exportCopyReview,
  importCopyReview,
  type CopyDraft,
} from "../src/lib/copy-review";
import {
  documentSchema,
  settingsSchema,
  type Publication,
} from "../src/lib/model";

const id = "00000000-0000-4000-8000-000000000001";
const project: Publication = {
  id,
  kind: "projects",
  version: 5,
  published_at: "2026-11-20",
  data: documentSchema.parse({
    title: "Example",
    slug: "example",
    credits: "PRIVATE SOURCE",
    blocks: [{ type: "text", body: "Current public copy." }],
  }),
};
const translations: CopyTranslations = {
  schemaVersion: 1,
  records: [
    {
      id: `project:${id}`,
      english: { titleEn: "Example", en: "Current public copy." },
      ko: "현재 한글 원고입니다.",
    },
    {
      id: "project:unpublished",
      english: { titleEn: "Hidden", en: "PRIVATE DRAFT" },
      ko: "비공개 번역",
    },
    { id: "studio:motto", english: { en: "Current motto" }, ko: "현재 모토" },
  ],
};
const records = publicCopyReview([project], undefined, translations);

test("cross-device copy files preserve reviewed sources, hidden requests and Unicode", () => {
  const edit = newCopyEdit(records[0]);
  edit.values.ko = "공간과 일상 — 모바일 수정 문장";
  edit.note = "영문도 함께 다듬어주세요.";
  edit.hide = true;
  const draft: CopyDraft = { schemaVersion: 1, edits: [edit] };
  const imported = importCopyReview(exportCopyReview(draft), {
    schemaVersion: 1,
    edits: [],
  });
  assert.deepEqual(imported.draft, draft);
  assert.equal(imported.added, 1);
  assert.equal(imported.conflicts, 0);
  assert.equal(imported.draft.edits[0].expectedVersion, 5);
  assert.match(
    copyReviewRequest(imported.draft, [{ ...records[0], version: 6 }]),
    /기준 공개 버전: 5 \/ 현재 확인한 버전: 6/,
  );
});

test("cross-device copy import rejects unrelated or malformed files without altering local work", () => {
  const local: CopyDraft = {
    schemaVersion: 1,
    edits: [{ ...newCopyEdit(records[0]), note: "기존 메모" }],
  };
  const before = structuredClone(local);
  for (const raw of [
    "invalid",
    "null",
    JSON.stringify({
      type: "wovn-photo-review",
      schemaVersion: 1,
      draft: local,
    }),
    JSON.stringify({
      type: "wovn-copy-review",
      schemaVersion: 1,
      draft: {
        schemaVersion: 1,
        edits: [{ ...local.edits[0], expectedVersion: 0 }],
      },
    }),
  ]) {
    assert.throws(() => importCopyReview(raw, local));
    assert.deepEqual(local, before);
  }
  assert.throws(() => importCopyReview(" ".repeat(8_000_001), local));
});

test("copy import merges new items while preserving conflicting local edits", () => {
  const saved = { ...newCopyEdit(records[0]), note: "다른 기기의 메모" };
  const local = { ...saved, note: "현재 기기의 메모" };
  const other = { ...saved, id: "studio:motto", code: "S01" };
  const result = importCopyReview(
    exportCopyReview({ schemaVersion: 1, edits: [saved, other] }),
    { schemaVersion: 1, edits: [local] },
  );
  assert.equal(result.added, 1);
  assert.equal(result.conflicts, 1);
  assert.deepEqual(result.draft.edits, [local, other]);
  assert.equal(
    importCopyReview(exportCopyReview(result.draft), result.draft).conflicts,
    0,
  );
});

test("mobile copy projects only current publications and matching Korean counterparts", () => {
  assert.equal(records.length, 1);
  assert.equal(records[0].original.ko, "현재 한글 원고입니다.");
  assert.equal(records[0].translationCurrent, true);
  assert.equal(records[0].version, 5);
  assert(!JSON.stringify(records).includes("PRIVATE"));
  assert.deepEqual(publicCopyReview([], undefined, translations), []);
  const updated = publicCopyReview(
    [
      {
        ...project,
        version: 6,
        data: documentSchema.parse({
          ...project.data,
          blocks: [{ type: "text", body: "New approved text" }],
        }),
      },
    ],
    undefined,
    translations,
  );
  assert.equal(updated[0].original.en, "New approved text");
  assert.equal(updated[0].original.ko, "");
  assert.equal(updated[0].translationCurrent, false);
  assert.notEqual(updated[0].sourceHash, records[0].sourceHash);
  const settings = {
    ...project,
    kind: "settings",
    data: settingsSchema.parse({
      studioMotto: "Current motto",
      email: "secret@example.com",
      privacyProcessors: "PRIVATE PROCESSORS",
    }),
  } as unknown as Publication;
  const studio = publicCopyReview([], settings, translations);
  assert.equal(studio[0].original.ko, "현재 모토");
  assert(!JSON.stringify(studio).includes("secret@example.com"));
  assert(!JSON.stringify(studio).includes("PRIVATE PROCESSORS"));
});

test("saved text edits preserve their original source and version across publication changes", () => {
  const edit = newCopyEdit(records[0]);
  edit.values.ko = "더 간결한 수정 문장입니다.";
  edit.note = "자연스럽게 정리해주세요.";
  const draft: CopyDraft = { schemaVersion: 1, edits: [edit] };
  const restored = restoreCopyDraft(JSON.stringify(draft));
  assert.deepEqual(restored.draft, draft);
  assert.equal(restored.draft.edits[0].original.ko, "현재 한글 원고입니다.");
  assert.equal(restored.draft.edits[0].expectedVersion, 5);
  assert.equal(copyEditStale(edit, records[0]), false);
  assert.equal(copyEditStale(edit, { ...records[0], version: 6 }), true);
  assert.equal(copyEditStale(edit), true);
  assert.match(
    restoreCopyDraft(JSON.stringify({ schemaVersion: 1, edits: [edit, edit] }))
      .warning,
    /읽지 못/,
  );
  assert.equal(
    restoreCopyDraft(
      JSON.stringify({
        schemaVersion: 1,
        edits: [{ ...edit, values: { ...edit.values, unexpected: "bad" } }],
      }),
    ).draft.edits.length,
    0,
  );
  assert.equal(
    restoreCopyDraft(
      JSON.stringify({
        schemaVersion: 1,
        edits: [{ ...edit, note: "x".repeat(4001) }],
      }),
    ).draft.edits.length,
    0,
  );
  assert.equal(restoreCopyDraft("broken").draft.edits.length, 0);
});

test("text requests export only changes with IDs and both old and current review versions", () => {
  const edit = newCopyEdit(records[0]);
  assert.throws(() =>
    copyReviewRequest({ schemaVersion: 1, edits: [edit] }, records),
  );
  edit.values.ko = "새 한글";
  edit.hide = true;
  edit.note = "검토 메모";
  const draft: CopyDraft = { schemaVersion: 1, edits: [edit] };
  const text = copyReviewRequest(draft, [{ ...records[0], version: 6 }]);
  assert.match(text, /기준 공개 버전: 5 \/ 현재 확인한 버전: 6/);
  assert(text.includes(`기준 원고 SHA-256: ${records[0].sourceHash}`));
  assert.match(text, /현재 한글 원고입니다/);
  assert.match(text, /새 한글/);
  assert.match(text, /영문도 자연스럽게/);
  assert.match(text, /프로젝트·사진은 유지/);
  assert.match(text, /검토 메모/);
  assert(!text.includes("영문 원고 — 수정 요청"));
  const withdrawn = copyReviewRequest(draft, []);
  assert.match(withdrawn, /현재 공개 목록에 없음/);
  assert.match(withdrawn, /새 한글/);
});

test("Journal review preserves shortlist codes, versions and matching translations without exposing Press or private evidence", () => {
  const journal = {
    ...project,
    kind: "journal",
    data: documentSchema.parse({
      ...project.data,
      category: "공간 관찰",
      title: "SEASONS IN THE CITY",
      summary: "Even in the city, the seasons linger.",
      blocks: [{ type: "text", body: "Even in the city, the seasons linger." }],
    }),
  } as Publication;
  const bundle: CopyTranslations = {
    schemaVersion: 1,
    records: [
      {
        id: `journal:${id}`,
        code: "J02",
        english: { titleEn: journal.data.title, en: journal.data.summary },
        ko: "도심에도 계절은 머뭅니다.",
      },
    ],
  };
  const review = publicCopyReview(
    [],
    undefined,
    bundle,
    [],
    [
      journal,
      {
        ...journal,
        id: "press",
        data: { ...journal.data, category: "잡지 게재" },
      },
    ],
  );
  assert.equal(review.length, 1);
  assert.equal(review[0].code, "J02");
  assert.equal(review[0].original.ko, "도심에도 계절은 머뭅니다.");
  assert.equal(review[0].kind, "journal");
  assert(!JSON.stringify(review).includes("PRIVATE SOURCE"));
  const edit = newCopyEdit(review[0]);
  edit.note = "문장을 더 간결하게";
  assert.equal(
    restoreCopyDraft(JSON.stringify({ schemaVersion: 1, edits: [edit] })).draft
      .edits[0].code,
    "J02",
  );
  assert.match(
    copyReviewRequest({ schemaVersion: 1, edits: [edit] }, review),
    /J02/,
  );
  const changed = {
    ...journal,
    data: {
      ...journal.data,
      blocks: [
        { type: "text" as const, heading: "", body: "New public wording" },
      ],
    },
  };
  assert.equal(
    publicCopyReview([], undefined, bundle, [], [changed])[0]
      .translationCurrent,
    false,
  );
});
