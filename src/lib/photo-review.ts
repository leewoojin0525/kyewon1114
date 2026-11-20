import { z } from "zod";
import {
  homeReviewRequest,
  type HomeReviewDraft,
  type HomeReviewSnapshot,
  type ReviewPhoto,
} from "./home-review";

export type CatalogPhoto = ReviewPhoto & {
  deleted: boolean;
  sourceStatus: string;
  lowResolution: boolean;
};
export type PhotoReviewSnapshot = {
  home: HomeReviewSnapshot;
  photos: CatalogPhoto[];
  projects: { id: string; title: string; version: number }[];
  privateHistory: boolean;
  deletedCount: number;
};
const reference = z.string().min(1).max(160);
const editSchema = z.object({
  projectId: z.uuid(),
  title: z.string().max(300),
  expectedVersion: z.number().int().positive(),
  base: z.array(z.object({ reference, photoId: z.uuid() })).max(2000),
  order: z.array(reference).max(2000),
  remove: z.array(reference).max(2000),
  restore: z.array(z.object({ reference, photoId: z.uuid() })).max(2000),
  notes: z.record(reference, z.string().max(4000)),
});
const draftSchema = z.object({
  schemaVersion: z.literal(1),
  edits: z.array(editSchema).max(200),
});
export type PhotoProjectEdit = z.infer<typeof editSchema>;
export type PhotoReviewDraft = z.infer<typeof draftSchema>;

export function restorePhotoReview(raw: string | null): PhotoReviewDraft {
  if (!raw) return { schemaVersion: 1, edits: [] };
  if (raw.length > 2_000_000) throw new Error("저장 파일이 너무 큽니다.");
  const result = draftSchema.parse(JSON.parse(raw));
  if (
    new Set(result.edits.map((e) => e.projectId)).size !== result.edits.length
  )
    throw new Error("중복 프로젝트가 있습니다.");
  for (const edit of result.edits) {
    const all = [...edit.base, ...edit.restore].map((p) => p.reference);
    if (
      new Set(all).size !== all.length ||
      new Set(edit.order).size !== edit.order.length ||
      edit.order.length !== all.length ||
      edit.order.some((ref) => !all.includes(ref)) ||
      new Set(edit.remove).size !== edit.remove.length ||
      edit.remove.some((ref) => !edit.base.some((p) => p.reference === ref))
    )
      throw new Error("사진 순서나 삭제 요청이 올바르지 않습니다.");
  }
  return result;
}

export function newPhotoEdit(
  snapshot: PhotoReviewSnapshot,
  projectId: string,
): PhotoProjectEdit {
  const project = snapshot.projects.find((p) => p.id === projectId);
  if (!project) throw new Error("현재 프로젝트를 찾을 수 없습니다.");
  const base = snapshot.photos
    .filter((p) => p.projectId === projectId && !p.deleted)
    .map((p) => ({ reference: p.reference, photoId: p.photoId }));
  return {
    projectId,
    title: project.title,
    expectedVersion: project.version,
    base,
    order: base.map((p) => p.reference),
    remove: [],
    restore: [],
    notes: {},
  };
}

export function photoEditChanged(edit: PhotoProjectEdit) {
  return (
    edit.remove.length > 0 ||
    edit.restore.length > 0 ||
    edit.order.join("|") !== edit.base.map((p) => p.reference).join("|") ||
    Object.values(edit.notes).some((note) => note.trim())
  );
}

export function editedPhotoOrder(edit: PhotoProjectEdit) {
  return edit.order.filter((ref) => !edit.remove.includes(ref));
}

export function moveReviewPhoto(
  edit: PhotoProjectEdit,
  ref: string,
  position: number,
): PhotoProjectEdit {
  const order = editedPhotoOrder(edit);
  if (!order.includes(ref)) return edit;
  order.splice(order.indexOf(ref), 1);
  order.splice(
    Math.max(0, Math.min(order.length, Math.round(position) - 1)),
    0,
    ref,
  );
  return { ...edit, order: [...order, ...edit.remove] };
}

export function toggleReviewRemoval(
  edit: PhotoProjectEdit,
  photo: CatalogPhoto,
): PhotoProjectEdit {
  if (photo.projectId !== edit.projectId)
    throw new Error("다른 프로젝트 사진입니다.");
  if (photo.deleted) {
    const exists = edit.restore.some((p) => p.reference === photo.reference);
    return {
      ...edit,
      restore: exists
        ? edit.restore.filter((p) => p.reference !== photo.reference)
        : [
            ...edit.restore,
            { reference: photo.reference, photoId: photo.photoId },
          ],
      order: exists
        ? edit.order.filter((ref) => ref !== photo.reference)
        : [...edit.order, photo.reference],
    };
  }
  return {
    ...edit,
    remove: edit.remove.includes(photo.reference)
      ? edit.remove.filter((ref) => ref !== photo.reference)
      : [...edit.remove, photo.reference],
  };
}

export function photoReviewRequest(
  draft: PhotoReviewDraft,
  snapshot: PhotoReviewSnapshot,
  home: HomeReviewDraft,
  includeHome: boolean,
) {
  // Validate imported/browser data again at export. This creates a request only.
  const checked = restorePhotoReview(JSON.stringify(draft));
  const edits = checked.edits.filter(photoEditChanged);
  if (!edits.length && !includeHome)
    throw new Error("먼저 사진 순서·삭제·메모 또는 메인 사진을 변경해주세요.");
  const lines = ["WOVN · 프로젝트 사진 변경 요청", ""];
  for (const edit of edits) {
    const current = snapshot.projects.find((p) => p.id === edit.projectId);
    const order = editedPhotoOrder(edit);
    lines.push(
      `${edit.title}`,
      `프로젝트 ID: ${edit.projectId}`,
      `기준 공개 버전: ${edit.expectedVersion} / 현재 확인한 버전: ${current?.version ?? "공개 목록에 없음"}`,
    );
    if (current?.version !== edit.expectedVersion)
      lines.push(
        "주의: 기준 이후 프로젝트가 변경되었습니다. 차이를 검토한 후 반영해주세요.",
      );
    lines.push(
      "기준 사진 (파일번호 / 사진 ID):",
      ...edit.base.map((p) => `${p.reference} / ${p.photoId}`),
    );
    if (edit.remove.length) lines.push(`삭제 요청: ${edit.remove.join(", ")}`);
    if (edit.restore.length)
      lines.push(
        "복원 요청:",
        ...edit.restore.map((p) => `${p.reference} / ${p.photoId}`),
      );
    lines.push(
      `변경 후 전체 순서 (${order.length}장):`,
      ...order.map((ref, i) => `${i + 1}. ${ref}`),
    );
    for (const [ref, note] of Object.entries(edit.notes))
      if (note.trim()) lines.push(`${ref} 메모: ${note.trim()}`);
    lines.push("");
  }
  if (includeHome) {
    const removed = new Set(edits.flatMap((e) => e.remove));
    const conflict = snapshot.home.photos.find(
      (p) => home.selected.includes(p.key) && removed.has(p.reference),
    );
    if (conflict)
      throw new Error(
        `${conflict.reference}은 삭제 요청과 메인 선택이 겹칩니다. 메인 선택을 해제해주세요.`,
      );
    lines.push(homeReviewRequest(home, snapshot.home), "");
  }
  lines.push(
    "이 내용은 변경 요청입니다. 자동 게시되지 않습니다.",
    "기준 공개 버전을 검토한 뒤 대표 승인 절차로 반영하며, 삭제 사진은 비공개 목록에 보존합니다.",
  );
  return lines.join("\n");
}
