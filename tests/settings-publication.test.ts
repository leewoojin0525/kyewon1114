import { test } from "node:test";
import assert from "node:assert/strict";
import { settingsSchema } from "../src/lib/model";
import { settingsPublicationAllowed } from "../src/lib/settings-publication";

test("editorial revisions preserve the exact operational state of an existing publication", () => {
  const previous = settingsSchema.parse({ publishReviewed: true });
  const copy = {
    ...previous,
    studioIntro: "Revised introduction",
    studioStatements: [{ heading: "People", body: "Everyday life." }],
  };
  assert.equal(settingsPublicationAllowed(copy, previous), true);
  assert.equal(settingsPublicationAllowed(copy), false);
  for (const change of [
    { email: "new@example.com" },
    { privacyApproved: true },
    { logoApproved: true },
    { phone: "123" },
    { instagram: "https://example.com" },
    { companyName: "Another company" },
    { privacyProcessors: "New provider" },
    { demo: true },
    { publishReviewed: false },
    { selectedProjects: ["550e8400-e29b-41d4-a716-446655440000"] },
  ])
    assert.equal(
      settingsPublicationAllowed({ ...copy, ...change }, previous),
      false,
    );
  assert.equal(
    settingsPublicationAllowed(copy, { ...previous, publishReviewed: false }),
    false,
  );
  assert.equal(
    settingsPublicationAllowed(copy, { ...previous, demo: true }),
    false,
  );
});

test("initial settings publication still requires all operational checks", () => {
  const complete = settingsSchema.parse({
    publishReviewed: true,
    logoApproved: true,
    privacyApproved: true,
    email: "studio@example.com",
    privacyProcessors: "Verified processor",
  });
  assert.equal(settingsPublicationAllowed(complete), true);
  for (const change of [
    { logoApproved: false },
    { privacyApproved: false },
    { email: "" },
    { privacyProcessors: "" },
  ]) {
    assert.equal(settingsPublicationAllowed({ ...complete, ...change }), false);
  }
});
