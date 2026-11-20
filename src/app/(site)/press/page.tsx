import { publicPressIndex } from "@/lib/content";
import { EmptyState, ProjectCards } from "@/components/editorial";
export const metadata = {
  title: "Press",
  description: "Selected magazine features and published projects.",
  alternates: { canonical: "/press" },
};
export default async function Press() {
  const articles = await publicPressIndex();
  return (
    <div className="wrap section-first press-index">
      <div className="page-title">
        <h1>
          Press{" "}
          <span className="count">
            ({String(articles.length).padStart(2, "0")})
          </span>
        </h1>
        <p>Selected publications.</p>
      </div>
      {articles.length ? (
        <ProjectCards
          documents={articles}
          className="project-grid press-grid"
          priorityCount={2}
        />
      ) : (
        <EmptyState type="journal" />
      )}
    </div>
  );
}
