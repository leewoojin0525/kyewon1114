import test from "node:test";
import assert from "node:assert/strict";
import { homePhotographs } from "../src/lib/home-selection";
import {
  documentSchema,
  settingsSchema,
  type Publication,
} from "../src/lib/model";

const projectId = "00000000-0000-4000-8000-000000000001";
const first = "00000000-0000-4000-8000-000000000002";
const second = "00000000-0000-4000-8000-000000000003";
const removed = "00000000-0000-4000-8000-000000000004";
const project: Publication = {
  id: projectId,
  kind: "projects",
  version: 1,
  published_at: "2026-11-20",
  data: documentSchema.parse({
    title: "Example",
    slug: "example",
    hero: { id: first },
    blocks: [{ type: "image", image: { id: second } }],
  }),
};
test("home selections preserve the chosen photo order without changing gallery covers", () => {
  const settings = settingsSchema.parse({
    homeSlides: [
      { projectId, photoId: second },
      { projectId, photoId: first },
    ],
  });
  assert.deepEqual(
    homePhotographs([project], settings).map(({ photo }) => photo.id),
    [second, first],
  );
  assert.equal(project.data.hero?.id, first);
});
test("home drops withdrawn photos and unpublished projects even when settings still reference them", () => {
  const settings = settingsSchema.parse({
    homeSlides: [
      { projectId, photoId: removed },
      { projectId, photoId: second },
    ],
  });
  assert.deepEqual(
    homePhotographs([project], settings).map(({ photo }) => photo.id),
    [second],
  );
  assert.deepEqual(homePhotographs([], settings), []);
  assert.throws(() =>
    settingsSchema.parse({
      homeSlides: [
        { projectId, photoId: first },
        { projectId, photoId: first },
      ],
    }),
  );
});
