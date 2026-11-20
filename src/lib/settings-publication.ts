import { isDeepStrictEqual } from "node:util";
import { settingsSchema } from "./model";

const editorialFields = new Set([
  "homeSlides",
  "studioIntro",
  "studioMotto",
  "studioStatements",
  "studioServices",
  "studioServiceDescriptions",
  "studioServicesIntro",
  "studioProcessIntro",
  "studioProcess",
  "biography",
]);

/** Existing public copy can be revised without enabling an unconfigured inquiry service. */
export function settingsPublicationAllowed(raw: unknown, previous?: unknown) {
  const next = settingsSchema.parse(raw);
  if (
    next.logoApproved &&
    next.privacyApproved &&
    next.email &&
    next.privacyProcessors
  )
    return true;
  if (!previous) return false;
  const published = settingsSchema.parse(previous);
  if (!published.publishReviewed || published.demo) return false;
  const operational = (value: typeof next) =>
    Object.fromEntries(
      Object.entries(value).filter(([key]) => !editorialFields.has(key)),
    );
  return isDeepStrictEqual(operational(next), operational(published));
}
