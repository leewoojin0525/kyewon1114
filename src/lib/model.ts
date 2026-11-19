import { z } from "zod";
z.config(z.locales.ko());
export const categories = [
  "업무",
  "상업",
  "숙박",
  "주거",
  "복합·기타",
] as const;
export const journalCategories = [
  "잡지 게재",
  "단행본 게재",
  "온라인 게재",
  "공간 관찰",
  "재료와 디테일",
  "작업 기록",
] as const;
export const workTypes = ["신축", "리모델링", "인테리어", "기타·상담"] as const;
export const photoSchema = z.object({
  id: z.string().uuid(),
  alt: z.string().max(300).default(""),
  caption: z.string().max(600).default(""),
  focalX: z.number().min(0).max(100).default(50),
  focalY: z.number().min(0).max(100).default(50),
  mobileId: z.string().uuid().optional(),
  mobileFocalX: z.number().min(0).max(100).default(50),
  mobileFocalY: z.number().min(0).max(100).default(50),
});
export const blockSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("image"),
    image: photoSchema.optional(),
    width: z.enum(["wide", "text"]).default("wide"),
  }),
  z.object({
    type: z.literal("pair"),
    left: photoSchema.optional(),
    right: photoSchema.optional(),
    ratio: z.enum(["equal", "two-one"]).default("equal"),
  }),
  z.object({
    type: z.literal("text"),
    heading: z.string().max(150).default(""),
    body: z.string().max(15000).default(""),
  }),
  z.object({ type: z.literal("quote"), text: z.string().max(600).default("") }),
  z.object({
    type: z.literal("facts"),
    rows: z
      .array(
        z.object({ label: z.string().max(100), value: z.string().max(1000) }),
      )
      .max(30)
      .default([]),
  }),
]);
export const documentSchema = z.object({
  title: z.string().max(180).default(""),
  slug: z
    .string()
    .max(160)
    .regex(/^[a-z0-9-]*$/, "주소는 영문 소문자·숫자·하이픈으로 입력하세요.")
    .default(""),
  summary: z.string().max(1000).default(""),
  year: z.number().int().min(1900).max(2200).optional(),
  category: z.string().max(40).default(""),
  workType: z.string().max(40).default(""),
  region: z.string().max(120).default(""),
  area: z.string().max(100).default(""),
  services: z.string().max(1000).default(""),
  company: z.string().max(200).default(""),
  credits: z.string().max(2000).default(""),
  creditConfirmed: z.boolean().default(false),
  publishReviewed: z.boolean().default(false),
  hero: photoSchema.optional(),
  galleryOrder: z.array(z.string().uuid()).max(601).optional(),
  blocks: z.array(blockSchema).max(300).default([]),
  order: z.number().int().min(0).max(9999).default(9999),
  pinned: z.boolean().default(false),
  author: z.string().max(100).default(""),
  publicationName: z.string().max(150).default(""),
  publicationIssue: z.string().max(100).default(""),
  sourceUrl: z
    .union([z.url().regex(/^https?:\/\//), z.literal("")])
    .default(""),
  relatedProjects: z.array(z.string().uuid()).max(6).default([]),
  seoTitle: z.string().max(120).default(""),
  seoDescription: z.string().max(300).default(""),
  demo: z.boolean().default(false),
});
export const settingsSchema = z.object({
  title: z.string().default("사이트 설정"),
  slug: z.literal("site").default("site"),
  featuredProject: z.string().uuid().optional(),
  selectedProjects: z.array(z.string().uuid()).max(6).default([]),
  companyName: z.string().max(150).default("(주)우븐디자인스튜디오"),
  email: z.union([z.email(), z.literal("")]).default(""),
  phone: z.string().max(50).default(""),
  address: z.string().max(300).default(""),
  instagram: z
    .union([z.url().startsWith("https://"), z.literal("")])
    .default(""),
  logoApproved: z.boolean().default(false),
  privacyApproved: z.boolean().default(false),
  privacyProcessors: z.string().max(5000).default(""),
  studioIntro: z
    .string()
    .max(4000)
    .default(
      "사람과 장소, 재료와 시간. 서로 다른 조건을 세심하게 엮어 공간의 가능성을 찾습니다.",
    ),
  studioServices: z
    .string()
    .max(4000)
    .default("공간 기획·디자인\n디자인 과정 관리\n프로젝트 관리"),
  studioProcess: z
    .string()
    .max(4000)
    .default(
      "의뢰 이해\n범위·조건 정리\n디자인과 검토\n실행 과정 관리\n결과 확인",
    ),
  biography: z
    .string()
    .max(4000)
    .default(
      "이우진어소시에이트에서 이어온 공간에 대한 경험을 바탕으로, 우븐디자인스튜디오는 디자인과 프로젝트 관리를 함께 생각합니다.",
    ),
  publishReviewed: z.boolean().default(false),
  demo: z.boolean().default(false),
});
export type Photo = z.infer<typeof photoSchema>;
export type Block = z.infer<typeof blockSchema>;
export type Content = z.infer<typeof documentSchema>;
export type Settings = z.infer<typeof settingsSchema>;
export type Kind = "projects" | "journal" | "settings";
export type Publication = {
  id: string;
  kind: Kind;
  version: number;
  published_at: string;
  data: Content;
};
export function imagesIn(data: Record<string, unknown>): Photo[] {
  const d = data as unknown as Content;
  const photos = [
    d.hero,
    ...(d.blocks || []).flatMap((b) =>
      b.type === "image"
        ? [b.image]
        : b.type === "pair"
          ? [b.left, b.right]
          : [],
    ),
  ].filter(Boolean) as Photo[];
  if (!d.galleryOrder?.length) return photos;
  const rank = new Map(d.galleryOrder.map((id, index) => [id, index]));
  return photos.sort((a, b) => (rank.get(a.id) ?? Infinity) - (rank.get(b.id) ?? Infinity));
}
export function mediaIds(data: Record<string, unknown>) {
  return [
    ...new Set(
      imagesIn(data).flatMap(
        (p) => [p.id, p.mobileId].filter(Boolean) as string[],
      ),
    ),
  ];
}
export function parseContent(kind: Kind, data: unknown) {
  return kind === "settings"
    ? settingsSchema.parse(data)
    : documentSchema.parse(data);
}
