/** Ship only reviewed counterparts of public copy, never the private review HTML. */
import fs from "node:fs/promises";
import type { CopyTranslations } from "../src/lib/copy-review-public";

const source = "output/editorial-20261120";
const projects = JSON.parse(
  await fs.readFile(`${source}/WOVN-Project-Copy-KO-EN.json`, "utf8"),
);
const studio = JSON.parse(
  await fs.readFile(`${source}/WOVN-Studio-Copy-KO-EN.json`, "utf8"),
);
const verified = JSON.parse(
  await fs.readFile(".data/current-copy-review-baseline.json", "utf8"),
);
if (verified.projects.length !== projects.projects.length)
  throw new Error("Refresh the verified bilingual copy first");
const records: CopyTranslations["records"] = projects.projects.map(
  (p: { id: string; title: string; ko: string; en: string }) => {
    if (!verified.projects.some((v: { id: string }) => v.id === p.id))
      throw new Error("Unverified project");
    return {
      id: `project:${p.id}`,
      english: { titleEn: p.title, en: p.en },
      ko: p.ko,
    };
  },
);
function add(
  key: string,
  item: { ko: string; en: string; headingKo?: string; headingEn?: string },
) {
  records.push({
    id: `studio:${key}`,
    english: {
      en: item.en,
      ...(item.headingEn !== undefined ? { headingEn: item.headingEn } : {}),
    },
    ko: item.ko,
    ...(item.headingKo !== undefined ? { headingKo: item.headingKo } : {}),
  });
}
add("motto", studio.motto);
add("intro", studio.intro);
studio.statements.forEach(
  (
    s: { ko: string; en: string; headingKo: string; headingEn: string },
    i: number,
  ) => add(`philosophy-${i + 1}`, s),
);
add("services-intro", studio.servicesIntro);
studio.services.forEach(
  (
    s: { ko: string; en: string; descriptionKo: string; descriptionEn: string },
    i: number,
  ) =>
    add(`service-${i + 1}`, {
      headingKo: s.ko,
      headingEn: s.en,
      ko: s.descriptionKo,
      en: s.descriptionEn,
    }),
);
add("process-intro", studio.processIntro);
studio.process.forEach((s: { ko: string; en: string }, i: number) =>
  add(`process-${i + 1}`, s),
);
add("biography", studio.biography);
if (new Set(records.map((r) => r.id)).size !== records.length)
  throw new Error("Duplicate copy record");
await fs.mkdir(".site-copy", { recursive: true });
await fs.writeFile(
  ".site-copy/review.json",
  JSON.stringify({ schemaVersion: 1, records } satisfies CopyTranslations),
  { mode: 0o600 },
);
console.log({ records: records.length, output: ".site-copy/review.json" });
