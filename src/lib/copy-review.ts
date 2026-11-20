export const copyFieldLabels = {
  titleEn: "프로젝트 이름 (영문)",
  headingKo: "한글 소제목",
  headingEn: "영문 소제목",
  ko: "한글 원고",
  en: "영문 원고",
} as const;
export type CopyField = keyof typeof copyFieldLabels;
export type CopyValues = Partial<Record<CopyField, string>> & {
  ko: string;
  en: string;
};
export type CopyRecord = {
  id: string;
  code: string;
  kind: "project" | "studio";
  title: string;
  contentId: string;
  version: number;
  sourcePath: string;
  sourceHash: string;
  original: CopyValues;
  translationCurrent: boolean;
  cover?: { src: string; alt: string };
};
export type CopyEdit = {
  id: string;
  code: string;
  title: string;
  contentId: string;
  expectedVersion: number;
  sourcePath: string;
  sourceHash: string;
  original: CopyValues;
  values: CopyValues;
  note: string;
  hide: boolean;
};
export type CopyDraft = { schemaVersion: 1; edits: CopyEdit[] };

export function newCopyEdit(record: CopyRecord): CopyEdit {
  return {
    id: record.id,
    code: record.code,
    title: record.title,
    contentId: record.contentId,
    expectedVersion: record.version,
    sourcePath: record.sourcePath,
    sourceHash: record.sourceHash,
    original: { ...record.original },
    values: { ...record.original },
    note: "",
    hide: false,
  };
}

export function copyEditChanged(edit: CopyEdit) {
  return (
    edit.hide ||
    Boolean(edit.note.trim()) ||
    (Object.keys(edit.original) as CopyField[]).some(
      (key) => edit.values[key] !== edit.original[key],
    )
  );
}

export function copyEditStale(edit: CopyEdit, record?: CopyRecord) {
  return (
    !record ||
    edit.sourceHash !== record.sourceHash ||
    edit.expectedVersion !== record.version
  );
}

function validValues(value: unknown): value is CopyValues {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const fields = value as Record<string, unknown>;
  return (
    typeof fields.ko === "string" &&
    typeof fields.en === "string" &&
    Object.entries(fields).every(
      ([key, text]) =>
        Object.hasOwn(copyFieldLabels, key) &&
        typeof text === "string" &&
        text.length <= 15000,
    )
  );
}

export function restoreCopyDraft(raw: string | null): {
  draft: CopyDraft;
  warning: string;
} {
  const empty: CopyDraft = { schemaVersion: 1, edits: [] };
  if (!raw) return { draft: empty, warning: "" };
  try {
    const parsed = JSON.parse(raw);
    if (
      parsed?.schemaVersion !== 1 ||
      !Array.isArray(parsed.edits) ||
      parsed.edits.length > 200
    )
      throw new Error();
    const ids = new Set<string>();
    const edits: CopyEdit[] = parsed.edits.map((value: CopyEdit) => {
      if (
        !value ||
        typeof value.id !== "string" ||
        !/^(project|studio):[a-z0-9-]+$/.test(value.id) ||
        ids.has(value.id) ||
        !Number.isInteger(value.expectedVersion) ||
        value.expectedVersion < 1 ||
        typeof value.sourceHash !== "string" ||
        !/^[a-f0-9]{64}$/.test(value.sourceHash) ||
        !validValues(value.original) ||
        !validValues(value.values) ||
        Object.keys(value.original).sort().join() !==
          Object.keys(value.values).sort().join() ||
        typeof value.note !== "string" ||
        value.note.length > 4000 ||
        typeof value.hide !== "boolean" ||
        ![value.code, value.title, value.contentId, value.sourcePath].every(
          (text) =>
            typeof text === "string" && text.length > 0 && text.length <= 300,
        )
      )
        throw new Error();
      ids.add(value.id);
      // Select explicit fields; saved browser data is never trusted as a publication.
      return {
        id: value.id,
        code: value.code,
        title: value.title,
        contentId: value.contentId,
        expectedVersion: value.expectedVersion,
        sourcePath: value.sourcePath,
        sourceHash: value.sourceHash,
        original: value.original,
        values: value.values,
        note: value.note,
        hide: value.hide,
      };
    });
    return {
      draft: { schemaVersion: 1, edits: edits.filter(copyEditChanged) },
      warning: edits.length
        ? "이 브라우저에 저장한 수정 요청을 불러왔습니다."
        : "",
    };
  } catch {
    return {
      draft: empty,
      warning: "저장 내용을 읽지 못했습니다. 현재 원고를 표시합니다.",
    };
  }
}

export function copyReviewRequest(draft: CopyDraft, records: CopyRecord[]) {
  const edits = draft.edits.filter(copyEditChanged);
  if (!edits.length) throw new Error("수정할 문장이나 메모를 먼저 남겨주세요.");
  const current = new Map(records.map((record) => [record.id, record]));
  const ranks = new Map(records.map((record, index) => [record.id, index]));
  const ordered = edits.toSorted(
    (a, b) => (ranks.get(a.id) ?? Infinity) - (ranks.get(b.id) ?? Infinity),
  );
  const lines = [
    "WOVN · 글 변경 요청",
    `수정 요청: ${edits.length}개 항목`,
    "",
  ];
  for (const edit of ordered) {
    const record = current.get(edit.id);
    lines.push(
      `[${edit.code}] ${edit.title}`,
      `항목 ID: ${edit.id}`,
      `콘텐츠 ID: ${edit.contentId} / 항목: ${edit.sourcePath}`,
      `기준 공개 버전: ${edit.expectedVersion} / 현재 확인한 버전: ${record?.version ?? "현재 공개 목록에 없음"}`,
      `기준 원고 SHA-256: ${edit.sourceHash}`,
    );
    if (copyEditStale(edit, record))
      lines.push(
        "주의: 작성 당시 원고와 현재 공개 상태를 비교한 뒤 반영해주세요.",
      );
    if (edit.hide)
      lines.push("요청: 이 글을 홈페이지에서 숨기기 (프로젝트·사진은 유지)");
    for (const key of Object.keys(edit.original) as CopyField[]) {
      if (edit.values[key] === edit.original[key]) continue;
      lines.push(
        `${copyFieldLabels[key]} — 수정 전`,
        edit.original[key] || "(비어 있음)",
        `${copyFieldLabels[key]} — 수정 요청`,
        edit.values[key] || "(비우기)",
      );
      if (record && record.original[key] !== edit.original[key])
        lines.push(
          "현재 공개 원고 / 검토 번역",
          record.original[key] || "(비어 있음)",
        );
    }
    if (edit.note.trim()) lines.push("수정 메모", edit.note.trim());
    const koChanged =
      edit.values.ko !== edit.original.ko ||
      edit.values.headingKo !== edit.original.headingKo;
    const enChanged =
      edit.values.en !== edit.original.en ||
      edit.values.headingEn !== edit.original.headingEn;
    if (koChanged && !enChanged)
      lines.push("한글 수정 내용을 바탕으로 영문도 자연스럽게 다듬어주세요.");
    lines.push("");
  }
  lines.push(
    "원고와 기준 버전을 확인한 뒤 반영해주세요. 이 요청은 홈페이지에 자동으로 발행되지 않습니다.",
  );
  return lines.join("\n");
}
