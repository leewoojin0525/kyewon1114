import { notFound, permanentRedirect } from "next/navigation";
import { Detail, ProjectCard, SectionTitle } from "@/components/editorial";
import { listPublic, publicBySlug } from "@/lib/content";
import { mediaInfo } from "@/lib/media";
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props) {
  const { doc } = await publicBySlug("journal", (await params).slug);
  if (!doc) return {};
  const [m] = await mediaInfo([doc.data.hero!.id]);
  return {
    title: doc.data.seoTitle || doc.data.title,
    description: doc.data.seoDescription || doc.data.summary,
    alternates: { canonical: `/press/${doc.data.slug}` },
    openGraph: {
      title: doc.data.title,
      images: m ? [`/media/${m.derivatives.at(-1).key}`] : [],
    },
  };
}
export default async function Page({ params }: Props) {
  const { doc, redirect } = await publicBySlug("journal", (await params).slug);
  if (redirect) permanentRedirect(`/press/${redirect}`);
  if (!doc) notFound();
  const related = (await listPublic("projects")).filter((p) =>
    doc.data.relatedProjects.includes(p.id),
  );
  return (
    <>
      <Detail doc={doc} />
      {related.length > 0 && (
        <section className="section wrap">
          <SectionTitle number="+" title="RELATED PROJECTS" />
          <div className="project-grid">
            {related.map((p) => (
              <ProjectCard key={p.id} doc={p} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
