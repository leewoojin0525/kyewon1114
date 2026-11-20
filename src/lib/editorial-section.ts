import type { Publication } from "./model";

export const pressCategories = ["잡지 게재", "단행본 게재", "온라인 게재"];
export const observationCategories = [
  "공간 관찰",
  "재료와 디테일",
  "작업 기록",
];

export function isJournalEntry(doc: Pick<Publication, "kind" | "data">) {
  return (
    doc.kind === "journal" && observationCategories.includes(doc.data.category)
  );
}

export function publicContentPath(doc: Pick<Publication, "kind" | "data">) {
  const section =
    doc.kind === "projects"
      ? "projects"
      : isJournalEntry(doc)
        ? "journal"
        : "press";
  return `/${section}/${doc.data.slug}`;
}
