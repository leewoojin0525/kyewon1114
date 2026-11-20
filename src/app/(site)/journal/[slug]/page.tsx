import { notFound, permanentRedirect } from "next/navigation";
import { Detail } from "@/components/editorial";
import { IntentLink as Link } from "@/components/intent-link";
import { listPublic, publicBySlug } from "@/lib/content";
import { isJournalEntry, publicContentPath } from "@/lib/editorial-section";
import { mediaInfo } from "@/lib/media";

type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props) {
  const { doc } = await publicBySlug("journal", (await params).slug);
  if (!doc) return {};
  const [media] = await mediaInfo(doc.data.hero ? [doc.data.hero.id] : []);
  const image = media?.derivatives.at(-1);
  return {
    title: doc.data.seoTitle || doc.data.title,
    description: doc.data.seoDescription || doc.data.summary,
    alternates: { canonical: publicContentPath(doc) },
    openGraph: {
      title: doc.data.title,
      images: image ? [`/media/${image.key}`] : [],
    },
  };
}
export default async function JournalEntry({ params }: Props) {
  const { doc, redirect } = await publicBySlug("journal", (await params).slug);
  if (redirect) permanentRedirect(`/journal/${redirect}`);
  if (!doc) notFound();
  if (!isJournalEntry(doc)) permanentRedirect(publicContentPath(doc));
  const related = doc.data.relatedProjects.length
    ? (await listPublic("projects")).filter((project) =>
        doc.data.relatedProjects.includes(project.id),
      )
    : [];
  return (
    <>
      <Detail doc={doc} />
      {related.length > 0 && (
        <aside className="wrap observation-related">
          <span className="eyebrow">RELATED PROJECT</span>
          {related.map((project) => (
            <Link
              className="text-link"
              href={publicContentPath(project)}
              key={project.id}
            >
              {project.data.title}
            </Link>
          ))}
        </aside>
      )}
    </>
  );
}
