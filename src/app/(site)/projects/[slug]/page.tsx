import { imagesIn } from "@/lib/model";
import { notFound, permanentRedirect } from "next/navigation";
import { Detail, SectionTitle, ProjectCard } from "@/components/editorial";
import { listPublic, publicBySlug } from "@/lib/content";
import { mediaInfo } from "@/lib/media";
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props) {
  const { doc } = await publicBySlug("projects", (await params).slug);
  if (!doc) return {};
  const [m] = await mediaInfo([imagesIn(doc.data)[0].id]);
  return {
    title: doc.data.seoTitle || doc.data.title,
    description: doc.data.seoDescription || doc.data.summary,
    alternates: { canonical: `/projects/${doc.data.slug}` },
    openGraph: {
      title: doc.data.title,
      description: doc.data.summary,
      images: m ? [`/media/${m.derivatives.at(-1).key}`] : [],
    },
  };
}
export default async function Page({ params }: Props) {
  const { doc, redirect } = await publicBySlug("projects", (await params).slug);
  if (redirect) permanentRedirect(`/projects/${redirect}`);
  if (!doc) notFound();
  const related = (await listPublic("projects"))
    .filter((p) => p.id !== doc.id && p.data.category === doc.data.category)
    .slice(0, 2);
  return (
    <>
      <Detail doc={doc} />
      {related.length > 0 && (
        <section className="section portfolio-selection">
          <SectionTitle number="+" title="RELATED PROJECTS" />
          <div className="project-grid photo-grid">
            {related.map((p) => (
              <ProjectCard doc={p} key={p.id} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
