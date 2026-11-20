import test from "node:test";
import assert from "node:assert/strict";
import {
  projectPhotoSnapshot,
  type ReviewCatalog,
} from "../src/lib/photo-review-catalog";
import {
  newPhotoEdit,
  moveReviewPhoto,
  toggleReviewRemoval,
  editedPhotoOrder,
  photoReviewRequest,
  restorePhotoReview,
} from "../src/lib/photo-review";
import type {
  HomeReviewSnapshot,
  HomeReviewDraft,
} from "../src/lib/home-review";

const projectId = "00000000-0000-4000-8000-000000000001";
const ids = [2, 3, 4].map(
  (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`,
);
const catalog: ReviewCatalog = {
  schemaVersion: 1,
  photos: ids.map((photoId, i) => ({
    reference: `Photo-00${i + 1}`,
    projectId,
    photoId,
    slug: "example",
    order: i + 1,
    width: 2400,
    height: 1600,
    sourceStatus: "고용량 원본 · 웹용 변환",
    lowResolution: false,
    thumbnail: i === 2,
  })),
};
const home: HomeReviewSnapshot = {
  settingsVersion: 8,
  selected: [`${projectId}:${ids[0]}`],
  photos: catalog.photos.slice(0, 2).map((p) => ({
    ...p,
    key: `${projectId}:${p.photoId}`,
    title: "EXAMPLE",
    projectVersion: 7,
    src: `/media/${p.photoId}/640.webp`,
    largeSrc: `/media/${p.photoId}/2400.webp`,
    alt: "Example photo",
  })),
};
const projects = [{ id: projectId, title: "EXAMPLE", version: 7 }];
const snapshot = projectPhotoSnapshot(home, projects, catalog, true);
const homeDraft: HomeReviewDraft = {
  schemaVersion: 1,
  settingsVersion: 8,
  selected: home.selected,
  note: "",
};

test("anonymous photo review excludes historical IDs and private images; Owner gets restoration cards", () => {
  const anonymous = projectPhotoSnapshot(home, projects, catalog, false);
  assert.equal(anonymous.photos.length, 2);
  assert.equal(anonymous.deletedCount, 1);
  assert(!JSON.stringify(anonymous).includes(ids[2]));
  assert(!JSON.stringify(anonymous).includes("Photo-003"));
  assert.equal(snapshot.photos[2].deleted, true);
  assert.equal(snapshot.photos[2].src, "/api/review/photos/Photo-003");
  assert.equal(
    projectPhotoSnapshot({ ...home, photos: [] }, [], catalog, true).photos
      .length,
    0,
  );
  const restored = projectPhotoSnapshot(
    {
      ...home,
      photos: [
        ...home.photos,
        {
          ...home.photos[0],
          ...catalog.photos[2],
          key: `${projectId}:${ids[2]}`,
        },
      ],
    },
    projects,
    catalog,
    true,
  );
  assert.equal(
    restored.photos.filter((p) => p.reference === "Photo-003").length,
    1,
  );
  assert.equal(restored.deletedCount, 0);
});

test("touch ordering, deletion and explicit restoration export a complete stable-ID order", () => {
  let edit = newPhotoEdit(snapshot, projectId);
  edit = moveReviewPhoto(edit, "Photo-002", 1);
  edit = toggleReviewRemoval(edit, snapshot.photos[0]);
  edit = toggleReviewRemoval(edit, snapshot.photos[2]);
  edit = moveReviewPhoto(edit, "Photo-003", 1);
  edit.notes["Photo-003"] = "자연스럽게 보정";
  assert.deepEqual(editedPhotoOrder(edit), ["Photo-003", "Photo-002"]);
  const draft = { schemaVersion: 1 as const, edits: [edit] };
  assert.deepEqual(restorePhotoReview(JSON.stringify(draft)), draft);
  const request = photoReviewRequest(draft, snapshot, homeDraft, false);
  assert.match(request, /삭제 요청: Photo-001/);
  assert.match(request, /복원 요청:\nPhoto-003/);
  assert.match(request, /1\. Photo-003\n2\. Photo-002/);
  assert(request.includes(ids[2]));
  assert.match(request, /자연스럽게 보정/);
  assert.throws(
    () => photoReviewRequest(draft, snapshot, homeDraft, true),
    /겹칩니다/,
  );
  assert.equal(toggleReviewRemoval(edit, snapshot.photos[2]).restore.length, 0);
});

test("cross-device import preserves reviewed version and export warns instead of silently rebasing", () => {
  const edit = newPhotoEdit(snapshot, projectId);
  edit.expectedVersion = 6;
  edit.notes["Photo-001"] = "메모 보존";
  const draft = restorePhotoReview(
    JSON.stringify({ schemaVersion: 1, edits: [edit] }),
  );
  const request = photoReviewRequest(draft, snapshot, homeDraft, false);
  assert.match(request, /기준 공개 버전: 6 \/ 현재 확인한 버전: 7/);
  assert.match(request, /기준 이후 프로젝트가 변경/);
  assert.match(request, /메모 보존/);
  assert.match(
    photoReviewRequest(draft, { ...snapshot, projects: [] }, homeDraft, false),
    /공개 목록에 없음/,
  );
  assert.throws(() =>
    restorePhotoReview(
      JSON.stringify({
        schemaVersion: 1,
        edits: [{ ...edit, order: ["Photo-001", "Photo-001"] }],
      }),
    ),
  );
  assert.throws(() =>
    restorePhotoReview(
      JSON.stringify({
        schemaVersion: 1,
        edits: [{ ...edit, remove: ["Photo-999"] }],
      }),
    ),
  );
  assert.throws(() =>
    restorePhotoReview(
      JSON.stringify({ schemaVersion: 1, edits: [edit, edit] }),
    ),
  );
});
