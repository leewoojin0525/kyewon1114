import { IntentLink as Link } from "@/components/intent-link";
import { listPublic } from "@/lib/content";
import { EmptyState, ProjectCards } from "@/components/editorial";
export const metadata = {
  title: "Projects",
  description: "A selection of spatial design and architecture projects.",
  alternates: { canonical: "/projects" },
};
export default async function Projects({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page } = await searchParams,
    all = await listPublic("projects"),
    limit = Math.min(Math.max(Number(page) || 1, 1), 100) * 12,
    projects = all;
  return (
    <div className="section-first portfolio-index">
      <div className="page-title">
        <div>
          <h1>
            Projects
            <span className="count">
              ({String(all.length).padStart(2, "0")})
            </span>
          </h1>
        </div>
      </div>
      {projects.length ? (
        <ProjectCards
          documents={projects.slice(0, limit)}
          className="project-grid photo-grid"
          priorityCount={2}
        />
      ) : (
        <EmptyState />
      )}
      {projects.length > limit && (
        <Link
          className="button load-more"
          scroll={false}
          href={`/projects?page=${limit / 12 + 1}`}
        >
          View more ({Math.min(limit, projects.length)}/{projects.length}) +
        </Link>
      )}
    </div>
  );
}
