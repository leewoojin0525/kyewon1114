import { createHash } from "node:crypto";
import { settingsSchema, imagesIn, type Publication } from "./model";
import type { MediaInfo } from "./media";
import type { CopyRecord, CopyValues } from "./copy-review";
import { isJournalEntry } from "./editorial-section";

export type CopyTranslations = {
  schemaVersion: 1;
  records: {
    id: string;
    english: Partial<CopyValues> & { en: string };
    ko: string;
    headingKo?: string;
    code?: string;
  }[];
};

/** Public snapshots only. Private drafts, evidence, accounts and settings stay out. */
export function publicCopyReview(
  projects: Publication[],
  publishedSettings: Publication | undefined,
  bundle: CopyTranslations,
  media: MediaInfo[] = [],
  journals: Publication[] = [],
): CopyRecord[] {
  const translations = new Map(
    bundle.records.map((record) => [record.id, record]),
  );
  const assets = new Map(media.map((asset) => [asset.id, asset]));
  const records: CopyRecord[] = [];
  function add(
    record: Omit<CopyRecord, "original" | "sourceHash" | "translationCurrent">,
    english: Partial<CopyValues> & { en: string },
  ) {
    const translation = translations.get(record.id);
    const matches = Boolean(
      translation &&
        Object.keys(english).length ===
          Object.keys(translation.english).length &&
        Object.entries(english).every(
          ([key, value]) =>
            translation.english[key as keyof CopyValues] === value,
        ),
    );
    const original: CopyValues = {
      ...english,
      ko: matches ? translation!.ko : "",
    };
    if (english.headingEn !== undefined)
      original.headingKo = matches ? translation!.headingKo || "" : "";
    const sourceHash = createHash("sha256")
      .update(
        JSON.stringify(
          Object.keys(original)
            .sort()
            .map((key) => [key, original[key as keyof CopyValues]]),
        ),
      )
      .digest("hex");
    records.push({
      ...record,
      original,
      sourceHash,
      translationCurrent: matches,
    });
  }
  projects.forEach((project, index) => {
    const photo = imagesIn(project.data)[0];
    const derivative = assets
      .get(photo?.id || "")
      ?.derivatives.toSorted((a, b) => a.width - b.width)[0];
    const body = project.data.blocks
      .filter((block) => block.type === "text")
      .map((block) => [block.heading, block.body].filter(Boolean).join("\n"))
      .join("\n\n");
    add(
      {
        id: `project:${project.id}`,
        code: `P${String(index + 1).padStart(2, "0")}`,
        kind: "project",
        title: project.data.title.toUpperCase(),
        contentId: project.id,
        version: project.version,
        sourcePath: "project.description",
        ...(derivative
          ? { cover: { src: `/media/${derivative.key}`, alt: photo.alt } }
          : {}),
      },
      { titleEn: project.data.title, en: body },
    );
  });
  journals.filter(isJournalEntry).forEach((journal, index) => {
    const photo = journal.data.hero;
    const derivative = assets
      .get(photo?.id || "")
      ?.derivatives.toSorted((a, b) => a.width - b.width)[0];
    const body =
      journal.data.blocks
        .filter((block) => block.type === "text")
        .map((block) => [block.heading, block.body].filter(Boolean).join("\n"))
        .join("\n\n") || journal.data.summary;
    const id = `journal:${journal.id}`;
    add(
      {
        id,
        code:
          translations.get(id)?.code ||
          `J${String(index + 1).padStart(2, "0")}`,
        kind: "journal",
        title: journal.data.title,
        contentId: journal.id,
        version: journal.version,
        sourcePath: "journal.body",
        ...(derivative && photo
          ? { cover: { src: `/media/${derivative.key}`, alt: photo.alt } }
          : {}),
      },
      { titleEn: journal.data.title, en: body },
    );
  });
  if (!publishedSettings) return records;
  const settings = settingsSchema.parse(publishedSettings.data);
  let number = 0;
  function studio(
    key: string,
    title: string,
    sourcePath: string,
    english: Partial<CopyValues> & { en: string },
  ) {
    add(
      {
        id: `studio:${key}`,
        code: `S${String(++number).padStart(2, "0")}`,
        kind: "studio",
        title,
        sourcePath,
        contentId: publishedSettings!.id,
        version: publishedSettings!.version,
      },
      english,
    );
  }
  studio("motto", "모토", "studioMotto", { en: settings.studioMotto });
  studio("intro", "회사 소개", "studioIntro", { en: settings.studioIntro });
  settings.studioStatements.forEach((item, i) => {
    studio(
      `philosophy-${i + 1}`,
      `디자인 철학 ${i + 1}`,
      `studioStatements.${i}`,
      { headingEn: item.heading, en: item.body },
    );
  });
  studio("services-intro", "WHAT WE DO — 소개", "studioServicesIntro", {
    en: settings.studioServicesIntro,
  });
  settings.studioServices
    .split("\n")
    .filter(Boolean)
    .forEach((heading, i) => {
      studio(
        `service-${i + 1}`,
        `WHAT WE DO — 서비스 ${i + 1}`,
        `studioServices.${i}`,
        { headingEn: heading, en: settings.studioServiceDescriptions[i] || "" },
      );
    });
  studio("process-intro", "HOW WE WORK — 소개", "studioProcessIntro", {
    en: settings.studioProcessIntro,
  });
  settings.studioProcess
    .split("\n")
    .filter(Boolean)
    .forEach((body, i) => {
      studio(
        `process-${i + 1}`,
        `HOW WE WORK — ${i + 1}단계`,
        `studioProcess.${i}`,
        { en: body },
      );
    });
  studio("biography", "대표 이력·학력·수상·전시", "biography", {
    en: settings.biography,
  });
  return records;
}
