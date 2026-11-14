import { listPublic } from "@/lib/content";
import { EmptyState, ProjectCard } from "@/components/editorial";
export const metadata = {
  title: "Press",
  description: "Selected magazine features and published projects.",
  alternates: { canonical: "/press" },
};
export default async function Press() {
  const articles = await listPublic("journal");
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
        <div className="project-grid press-grid">
          {articles.map((a, i) => (
            <ProjectCard key={a.id} doc={a} index={i} />
          ))}
        </div>
      ) : (
        <EmptyState type="journal" />
      )}
    </div>
  );
}
