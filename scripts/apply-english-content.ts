import { readFile, writeFile } from "node:fs/promises";
import { pool, type Actor } from "../src/lib/db";
import {
  createContent,
  getDraft,
  listPublic,
  saveDraft,
  workflow,
} from "../src/lib/content";
import { settingsSchema, type Photo } from "../src/lib/model";
import { appEnv } from "../src/lib/env";
if (appEnv !== "development") throw new Error("로컬 콘텐츠 변경 전용입니다.");
const {
  rows: [account],
} = await pool.query(
  "SELECT id FROM cms.users WHERE role='owner' AND active=true ORDER BY id LIMIT 1",
);
const actor: Actor = { id: account.id, role: "owner" };
const titleMap: Record<string, string> = {
  "kyobo-hottracks-2015": "KYOBO HOTTRACKS / Manual Design",
  "hab-house-7": "HAB House 7",
  "yeonhui-seed": "Yeonhui Seed",
  "gwangjang-apartment": "Gwangjang Apartment",
};
const biography = [
  "Lee Woojin · Principal",
  "Education\n- B.A. in Architecture, Seoul National University of Technology\n- M.A. in Interior Design, Hongik University Graduate School of Architecture & Urban Design",
  "Practice\n- 2002 — Lee Woojin Associates Ltd.\n- 2009–2010 — Consultant, LG Hausys\n- 2011–2012 — Consultant, INTERNI & DECOR",
  "Awards\n- 2010 — Korea Golden Scale Best Design Award, Cross-stitch\n- 2009 — Golden Scale Award, Soyo\n- 2008 — Korea Design Association Head Award, Tolerance & Harmonization",
  "Selected exhibitions\n- 2013 — Tied, Craft Trend Fair, COEX\n- 2013 — My Favorite Gwangju, Gwangju Design Biennale\n- 2010 — Coexistence Is Imagination, Seoul Design Festival\n- 2010 — C.I.Y., D Square\n- 2010 — O-Bang, Milan Design Week\n- 2010 — Consilience, Living Design Fair\n- 2009–2010 — Alberobello, Gallery Seomi and Seoul Auction\n- 2009 — Furniture exhibition, Seoul Design Olympiad",
  "Professional affiliations listed in the original profile: KOSID, KIID, IFI and APSDA.",
].join("\n\n");
try {
  const report = [];
  for (const doc of await listPublic("projects")) {
    const current = await getDraft(doc.id);
    if (current.current_version !== current.published_version)
      throw new Error(`${doc.data.title}: 편집 중인 초안이 있습니다.`);
    const d = current.data;
    const title = titleMap[d.slug] || d.title;
    let n = 0;
    const translatePhoto = (p?: Photo) =>
      p
        ? { ...p, alt: `${title} — photograph ${++n}`, caption: "" }
        : undefined;
    const hero = translatePhoto(d.hero);
    const blocks = d.blocks.map((b: any) =>
      b.type === "image"
        ? { ...b, image: translatePhoto(b.image) }
        : b.type === "pair"
          ? {
              ...b,
              left: translatePhoto(b.left),
              right: translatePhoto(b.right),
            }
          : b,
    );
    const data = {
      ...d,
      title,
      hero,
      blocks,
      summary: `${title}. A spatial design project by Lee Woojin.`,
      seoTitle: title,
      seoDescription: `${title}. A project from the WOVN STUDIO portfolio.`,
    };
    if (JSON.stringify(d) === JSON.stringify(data)) continue;
    const saved = await saveDraft(actor, doc.id, current.current_version, data);
    await workflow(actor, doc.id, "publish", saved.version);
    report.push({ title, version: saved.version });
  }
  // The observational article is retained as a draft; Press uses actual publication sources.
  for (const doc of await listPublic("journal")) {
    if (doc.data.slug === "kyobo-space-archive") {
      const current = await getDraft(doc.id);
      await workflow(actor, doc.id, "unpublish", current.current_version);
    }
  }
  const settings = (await listPublic("settings"))[0];
  const current = settings
    ? await getDraft(settings.id)
    : {
        current_version: 0,
        published_version: 0,
        data: settingsSchema.parse({}),
      };
  if (current.current_version !== current.published_version)
    throw new Error("사이트 설정이 별도 편집 중입니다.");
  const data = {
    ...current.data,
    companyName: "WOVN Design Studio",
    studioIntro:
      "People and place. Materials and time. We bring different conditions together to discover what a space can become.",
    studioServices: "Spatial design\nDesign coordination\nProject management",
    studioProcess:
      "Understanding the brief\nDefining scope and conditions\nDesign and review\nCoordinating delivery\nReviewing the outcome",
    biography,
    publishReviewed: true,
  };
  if (JSON.stringify(current.data) !== JSON.stringify(data)) {
    const saved = settings
      ? await saveDraft(actor, settings.id, current.current_version, data)
      : await createContent(actor, "settings", data);
    await workflow(actor, saved.id, "publish", saved.version);
  }
  await writeFile(
    "docs/english-content-result.json",
    JSON.stringify(
      {
        date: new Date().toISOString(),
        projects: report,
        profileSource: "http://www.lwj.co.kr/m/img/trend9/about.png",
        publicLanguage: "en",
        adminLanguage: "ko",
      },
      null,
      2,
    ),
  );
  console.log(
    `공개 프로젝트 ${report.length}개 영어 표기, 대표자 약력 및 사이트 문구 적용`,
  );
} finally {
  await pool.end();
}
