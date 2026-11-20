import test from "node:test";
import assert from "node:assert/strict";
import {
  homeReviewSnapshot,
  restoreHomeReview,
  homeReviewRequest,
} from "../src/lib/home-review";
import {
  documentSchema,
  settingsSchema,
  type Publication,
} from "../src/lib/model";
import type { MediaInfo } from "../src/lib/media";

const projectId = "00000000-0000-4000-8000-000000000001";
const photoId = "00000000-0000-4000-8000-000000000002";
const deletedId = "00000000-0000-4000-8000-000000000003";
const project: Publication = {
  id: projectId,
  kind: "projects",
  version: 9,
  published_at: "2026-11-20",
  data: documentSchema.parse({
    title: "Example",
    slug: "example",
    credits: "Private provenance",
    hero: { id: photoId, alt: "Public photo" },
  }),
};
const settings = settingsSchema.parse({
  homeSlides: [
    { projectId, photoId },
    { projectId, photoId: deletedId },
  ],
});
const media: MediaInfo[] = [photoId, deletedId].map((id) => ({
  id,
  width: 2400,
  height: 1600,
  created_at: new Date(),
  derivatives: [
    { key: `${id}/960.webp`, width: 960, height: 640 },
    { key: `${id}/2400.webp`, width: 2400, height: 1600 },
  ],
}));
const snapshot = homeReviewSnapshot([project], settings, 7, media, {
  [photoId]: "Example-001",
  [deletedId]: "Example-002",
});
test("mobile picker exposes only current public derivatives and explicit selection fields", () => {
  assert.equal(snapshot.photos.length, 1);
  assert.deepEqual(snapshot.selected, [`${projectId}:${photoId}`]);
  assert.deepEqual(
    Object.keys(snapshot.photos[0]).sort(),
    [
      "key",
      "projectId",
      "photoId",
      "projectVersion",
      "title",
      "reference",
      "order",
      "src",
      "largeSrc",
      "alt",
      "width",
      "height",
    ].sort(),
  );
  assert.ok(!JSON.stringify(snapshot).includes("Private provenance"));
  assert.ok(!JSON.stringify(snapshot).includes(deletedId));
  assert.equal(snapshot.photos[0].src, `/media/${photoId}/960.webp`);
  assert.equal(homeReviewSnapshot([], settings, 7, media, {}).photos.length, 0);
  assert.equal(
    homeReviewSnapshot([project], settings, 7, [], {}).selected.length,
    0,
  );
});
test("saved picks retain reviewed version and exclude photos no longer public", () => {
  const draft = restoreHomeReview(null, snapshot).draft;
  draft.settingsVersion = 6;
  draft.selected.push(`${projectId}:${deletedId}`);
  draft.note = "Keep this note";
  const restored = restoreHomeReview(JSON.stringify(draft), snapshot);
  assert.deepEqual(restored.draft.selected, snapshot.selected);
  assert.equal(restored.draft.settingsVersion, 6);
  assert.equal(restored.draft.note, "Keep this note");
  assert.match(restored.warning, /제외/);
  assert.match(
    restoreHomeReview(
      JSON.stringify({ ...restored.draft, selected: [] }),
      snapshot,
    ).warning,
    /이전 메인/,
  );
  assert.deepEqual(
    restoreHomeReview("not-json", snapshot).draft.selected,
    snapshot.selected,
  );
  assert.deepEqual(
    restoreHomeReview(
      JSON.stringify({ ...draft, selected: Array(9).fill(draft.selected[0]) }),
      snapshot,
    ).draft.selected,
    snapshot.selected,
  );
});
test("mobile requests carry ordered stable IDs and both reviewed and current versions", () => {
  const draft = restoreHomeReview(null, snapshot).draft;
  draft.settingsVersion = 6;
  draft.note = "첫 사진 유지";
  const text = homeReviewRequest(draft, snapshot);
  assert.match(text, /기준 설정 버전: 6/);
  assert.match(text, /현재 확인한 설정 버전: 7/);
  assert.match(text, /1\. Example-001/);
  assert.ok(text.includes(photoId));
  assert.match(text, /공개 버전: 9/);
  assert.match(text, /첫 사진 유지/);
  assert.match(text, /프로젝트 안의 사진 순서는 유지/);
  assert.throws(() => homeReviewRequest({ ...draft, selected: [] }, snapshot));
  assert.throws(() =>
    homeReviewRequest(
      { ...draft, selected: [`${projectId}:${deletedId}`] },
      snapshot,
    ),
  );
  assert.throws(() =>
    homeReviewRequest(
      { ...draft, selected: [...draft.selected, ...draft.selected] },
      snapshot,
    ),
  );
});
