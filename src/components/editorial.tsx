import Link from "next/link";
import { PhotoImage } from "./photos";
import { GallerySurface } from "./gallery";
import { ProjectSlideshow } from "./project-slideshow";
import { Prose } from "./prose";
import { mediaInfo } from "@/lib/media";
import { imagesIn, type Content, type Publication } from "@/lib/model";
export function SectionTitle({
  number,
  title,
  href,
  label = "VIEW ALL",
}: {
  number: string;
  title: string;
  href?: string;
  label?: string;
}) {
  return (
    <div className="section-heading">
      <h2>
        <span>{number}</span>
        {title}
      </h2>
      {href && (
        <Link href={href}>
          {label} <span>↗</span>
        </Link>
      )}
    </div>
  );
}
export function EmptyState({
  type = "projects",
}: {
  type?: "projects" | "journal";
}) {
  return (
    <div className="empty-state">
      <span className="eyebrow">
        {type === "projects" ? "A PORTFOLIO IN THE MAKING" : "PRESS ARCHIVE"}
      </span>
      <h3>
        {type === "projects"
          ? "A new chapter is taking shape."
          : "Selected publications, coming soon."}
      </h3>
      <p>
        {type === "projects"
          ? "Our projects will appear here."
          : "Magazine features and published project pages."}
      </p>
      <Link
        className="text-link"
        href={type === "projects" ? "/studio" : "/contact"}
      >
        {type === "projects" ? "About the studio" : "Get in touch"}{" "}
        <span>↗</span>
      </Link>
    </div>
  );
}
export async function ProjectCard({
  doc,
  index = 0,
}: {
  doc: Publication;
  index?: number;
}) {
  const d = doc.data;
  return (
    <article
      className={`project-card ${doc.kind === "projects" ? "project-tile" : "press-card"}`}
    >
      <Link
        href={`/${doc.kind === "journal" ? "press" : "projects"}/${d.slug}`}
      >
        {d.hero && (
          <PhotoImage
            photo={d.hero}
            className="card-image"
            sizes="(max-width:767px) 100vw, 50vw"
          />
        )}
        <div className="card-info">
          <span className="card-number">
            {String(index + 1).padStart(2, "0")}
          </span>
          <div>
            <h3>{d.title}</h3>
            {doc.kind === "journal" && (
              <p>
                {[d.publicationName, d.publicationIssue]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            )}
          </div>
          <span className="card-arrow" aria-hidden>
            ↗
          </span>
        </div>
      </Link>
    </article>
  );
}
export async function BodyBlocks({
  data,
  photosOnly = false,
}: {
  data: Content;
  photosOnly?: boolean;
}) {
  return (
    <div className="editorial-body">
      {data.blocks
        .filter((b) => !photosOnly || b.type === "image" || b.type === "pair")
        .map((b, i) => (
          <section
            key={i}
            className={`block block-${b.type} ${b.type === "image" ? b.width : ""}`}
          >
            {b.type === "image" && b.image && (
              <figure>
                <PhotoImage photo={b.image} />
                {b.image.caption && <figcaption>{b.image.caption}</figcaption>}
              </figure>
            )}
            {b.type === "pair" && (
              <div className={`photo-pair ${b.ratio}`}>
                {[b.left, b.right].map(
                  (p, j) =>
                    p && (
                      <figure key={j}>
                        <PhotoImage photo={p} />
                        {p.caption && <figcaption>{p.caption}</figcaption>}
                      </figure>
                    ),
                )}
              </div>
            )}
            {b.type === "text" && (
              <>
                <h2>{b.heading}</h2>
                <Prose body={b.body} />
              </>
            )}
            {b.type === "quote" && <blockquote>{b.text}</blockquote>}
            {b.type === "facts" && (
              <dl className="facts">
                {b.rows.map((r, j) => (
                  <div key={j}>
                    <dt>{r.label}</dt>
                    <dd>{r.value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </section>
        ))}
    </div>
  );
}
export async function Detail({
  doc,
  preview = false,
}: {
  doc: Publication;
  preview?: boolean;
}) {
  const d = doc.data;
  const photos = imagesIn(d);
  const slideshow = doc.kind === "projects";
  const media = await mediaInfo(photos.map((p) => p.id));
  const items = photos.flatMap((p) => {
    const m = media.find((m) => m.id === p.id);
    return m
      ? [
          {
            ...p,
            src: `/media/${m.derivatives.at(-1).key}`,
            width: m.width,
            height: m.height,
          },
        ]
      : [];
  });
  return (
    <GallerySurface items={items}>
      <article
        className={`wrap detail ${doc.kind === "projects" ? "project-spread" : ""}`}
      >
        {preview && (
          <div className="notice">
            Private draft preview · Not publicly visible.
          </div>
        )}
        <div className="detail-top">
          <Link
            href={doc.kind === "journal" ? "/press" : "/projects"}
            className="eyebrow"
          >
            ← {doc.kind === "journal" ? "PRESS" : "PROJECTS"}
          </Link>
          {doc.kind === "journal" && (
            <span className="eyebrow">
              {[d.publicationName, d.publicationIssue]
                .filter(Boolean)
                .join(" · ")}
            </span>
          )}
        </div>
        <h1>{d.title}</h1>
        {slideshow ? <ProjectSlideshow key={`${doc.id}:${doc.version}`} items={items} /> : d.hero && (
          <PhotoImage photo={d.hero} priority className="detail-hero" />
        )}
        {doc.kind === "journal" && (
          <div className="detail-intro">
            <p className="lead">{d.summary}</p>
            {d.sourceUrl && (
              <a
                className="text-link"
                href={d.sourceUrl}
                target="_blank"
                rel="noreferrer"
              >
                Source archive ↗
              </a>
            )}
          </div>
        )}
        {!slideshow && <BodyBlocks data={d} photosOnly={doc.kind === "projects"} />}
        <div className="detail-cta">
          <h2>
            Your next space
            <br />
            begins here.
          </h2>
          <Link
            className="text-link"
            href={`/contact?project=${encodeURIComponent(d.title)}`}
          >
            Discuss a project <span>↗</span>
          </Link>
        </div>
      </article>
    </GallerySurface>
  );
}
