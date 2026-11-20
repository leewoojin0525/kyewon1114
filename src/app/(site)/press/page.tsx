import { IntentLink as Link } from "@/components/intent-link";
import { publicPressPage } from "@/lib/content";
import { EmptyState, ProjectCards } from "@/components/editorial";
export const metadata = {
  title: "Press",
  description: "Selected magazine features and published projects.",
  alternates: { canonical: "/press" },
};
export default async function Press({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const requested = Number((await searchParams).page || 1);
  const {
    documents: articles,
    total,
    page,
    pages,
  } = await publicPressPage(requested);
  return (
    <div className="wrap section-first press-index">
      <div className="page-title">
        <h1>
          Press{" "}
          <span className="count">({String(total).padStart(2, "0")})</span>
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
      {pages > 1 && (
        <nav className="press-pagination" aria-label="Press pages">
          {page > 1 ? (
            <Link
              href={page === 2 ? "/press" : `/press?page=${page - 1}`}
              prefetch={true}
              rel="prev"
            >
              ← Previous
            </Link>
          ) : (
            <span aria-disabled="true">← Previous</span>
          )}
          <span aria-live="polite">
            {page} / {pages}
          </span>
          {page < pages ? (
            <Link href={`/press?page=${page + 1}`} prefetch={true} rel="next">
              Next →
            </Link>
          ) : (
            <span aria-disabled="true">Next →</span>
          )}
        </nav>
      )}
    </div>
  );
}
