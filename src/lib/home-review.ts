import { homePhotographs } from "./home-selection";
import { imagesIn, type Publication, type Settings } from "./model";
import type { MediaInfo } from "./media";

export type ReviewPhoto = {
  key: string;
  projectId: string;
  photoId: string;
  projectVersion: number;
  title: string;
  reference: string;
  order: number;
  src: string;
  largeSrc: string;
  alt: string;
  width: number;
  height: number;
};
export type HomeReviewSnapshot = {
  settingsVersion: number;
  photos: ReviewPhoto[];
  selected: string[];
};
export type HomeReviewDraft = {
  schemaVersion: 1;
  settingsVersion: number;
  selected: string[];
  note: string;
};
export const MAX_HOME_PHOTOS = 8;

/** Explicit read-only projection: never serialize settings, originals or draft history. */
export function homeReviewSnapshot(
  projects: Publication[],
  settings: Settings,
  settingsVersion: number,
  media: MediaInfo[],
  references: Record<string, string>,
): HomeReviewSnapshot {
  const assets = new Map(media.map((item) => [item.id, item]));
  const photos = projects.flatMap((project) =>
    imagesIn(project.data).flatMap((photo, index) => {
      const asset = assets.get(photo.id);
      const derivatives = asset?.derivatives.toSorted(
        (a, b) => a.width - b.width,
      );
      const small = derivatives?.[0],
        large = derivatives?.at(-1);
      if (!asset || !small || !large) return [];
      return [
        {
          key: `${project.id}:${photo.id}`,
          projectId: project.id,
          photoId: photo.id,
          projectVersion: project.version,
          title: project.data.title.toUpperCase(),
          reference:
            references[photo.id] || `${project.data.title} · ${index + 1}`,
          order: index + 1,
          src: `/media/${small.key}`,
          largeSrc: `/media/${large.key}`,
          alt: photo.alt,
          width: asset.width,
          height: asset.height,
        },
      ];
    }),
  );
  const available = new Set(photos.map((photo) => photo.key));
  const selected = homePhotographs(projects, settings)
    .map(({ project, photo }) => `${project.id}:${photo.id}`)
    .filter((key) => available.has(key))
    .slice(0, MAX_HOME_PHOTOS);
  return { settingsVersion, photos, selected };
}

export function restoreHomeReview(
  raw: string | null,
  snapshot: HomeReviewSnapshot,
) {
  const fresh: HomeReviewDraft = {
    schemaVersion: 1,
    settingsVersion: snapshot.settingsVersion,
    selected: [...snapshot.selected],
    note: "",
  };
  if (!raw) return { draft: fresh, warning: "" };
  try {
    const value = JSON.parse(raw);
    if (
      value.schemaVersion !== 1 ||
      !Number.isInteger(value.settingsVersion) ||
      value.settingsVersion < 0 ||
      !Array.isArray(value.selected) ||
      value.selected.length > MAX_HOME_PHOTOS ||
      !value.selected.every((key: unknown) => typeof key === "string") ||
      new Set(value.selected).size !== value.selected.length ||
      typeof value.note !== "string" ||
      value.note.length > 4000
    )
      throw new Error();
    const available = new Set(snapshot.photos.map((photo) => photo.key));
    const selected = value.selected.filter((key: string) => available.has(key));
    const warning =
      selected.length !== value.selected.length
        ? "현재 홈페이지에서 빠진 사진은 선택에서 제외했습니다. 순서를 확인해주세요."
        : value.settingsVersion !== snapshot.settingsVersion
          ? "이전 메인 구성을 기준으로 고른 사진입니다. 선택 내용은 보존했으니 현재 메인과 비교해주세요."
          : "이 휴대폰에 저장한 선택을 불러왔습니다.";
    return {
      draft: {
        ...fresh,
        settingsVersion: value.settingsVersion,
        selected,
        note: value.note,
      },
      warning,
    };
  } catch {
    return {
      draft: fresh,
      warning: "저장 내용을 읽지 못해 현재 메인 사진을 불러왔습니다.",
    };
  }
}

export function homeReviewRequest(
  draft: HomeReviewDraft,
  snapshot: HomeReviewSnapshot,
) {
  const available = new Map(snapshot.photos.map((photo) => [photo.key, photo]));
  if (
    !draft.selected.length ||
    draft.selected.length > MAX_HOME_PHOTOS ||
    new Set(draft.selected).size !== draft.selected.length ||
    draft.selected.some((key) => !available.has(key))
  ) {
    throw new Error("현재 공개된 사진을 1~8장 선택해주세요.");
  }
  const lines = [
    "WOVN · 메인페이지 사진 변경 요청",
    `기준 설정 버전: ${draft.settingsVersion}`,
    `현재 확인한 설정 버전: ${snapshot.settingsVersion}`,
    `선택: ${draft.selected.length}장`,
    "",
  ];
  draft.selected.forEach((key, index) => {
    const photo = available.get(key)!;
    lines.push(
      `${index + 1}. ${photo.reference} — ${photo.title}`,
      `프로젝트 ID: ${photo.projectId} / 공개 버전: ${photo.projectVersion}`,
      `사진 ID: ${photo.photoId}`,
      "",
    );
  });
  if (draft.note.trim()) lines.push("추가 요청", draft.note.trim(), "");
  lines.push(
    "메인 사진 선택과 순서만 변경 요청. 프로젝트 안의 사진 순서는 유지.",
    "자동 반영되지 않으며, 기준 버전과 현재 공개 사진을 검토한 후 반영합니다.",
  );
  return lines.join("\n");
}
