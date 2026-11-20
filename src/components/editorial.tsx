import { DiagonalArrow } from "@/components/diagonal-arrow";
import { IntentLink as Link } from "./intent-link";
import { PhotoImage } from "./photos";
import { GallerySurface } from "./gallery";
import { ProjectSlideshow } from "./project-slideshow";
import { Prose } from "./prose";
import { mediaInfo, type MediaInfo } from "@/lib/media";
import { imagesIn, type Content, type Publication } from "@/lib/model";
import { isJournalEntry, publicContentPath } from "@/lib/editorial-section";
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
          {label}{" "}
          <span>
            <DiagonalArrow />
          </span>
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
        <span>
          <DiagonalArrow />
        </span>
      </Link>
    </div>
  );
}
export async function ProjectCard({
  doc,
  index = 0,
  preloaded,
  priority = false,
}: {
  doc: Publication;
  index?: number;
  preloaded?: ReadonlyMap<string, MediaInfo>;
  priority?: boolean;
}) {
  const d = doc.data;
  const cover = doc.kind === "projects" ? imagesIn(d)[0] : d.hero;
  return (
    <article
      className={`project-card ${doc.kind === "projects" ? "project-tile" : "press-card"}`}
    >
      <Link href={publicContentPath(doc)}>
        {cover && (
          <PhotoImage
            photo={cover}
            priority={priority}
            preloaded={preloaded}
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
            <DiagonalArrow />
          </span>
        </div>
      </Link>
    </article>
  );
}
export async function ProjectCards({
  documents,
  className,
  priorityCount = 0,
}: {
  documents: Publication[];
  className: string;
  priorityCount?: number;
}) {
  const ids = documents.flatMap((doc) => {
    const cover =
      doc.kind === "projects" ? imagesIn(doc.data)[0] : doc.data.hero;
    return cover ? [cover.id, ...(cover.mobileId ? [cover.mobileId] : [])] : [];
  });
  const media = await mediaInfo([...new Set(ids)]);
  const preloaded = new Map(media.map((item) => [item.id, item]));
  return (
    <div className={className}>
      {documents.map((doc, index) => (
        <ProjectCard
          key={doc.id}
          doc={doc}
          index={index}
          preloaded={preloaded}
          priority={index < priorityCount}
        />
      ))}
    </div>
  );
}
export async function BodyBlocks({
  data,
  photosOnly = false,
  preloaded,
}: {
  data: Content;
  photosOnly?: boolean;
  preloaded?: ReadonlyMap<string, MediaInfo>;
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
                <PhotoImage photo={b.image} preloaded={preloaded} />
                {b.image.caption && <figcaption>{b.image.caption}</figcaption>}
              </figure>
            )}
            {b.type === "pair" && (
              <div className={`photo-pair ${b.ratio}`}>
                {[b.left, b.right].map(
                  (p, j) =>
                    p && (
                      <figure key={j}>
                        <PhotoImage photo={p} preloaded={preloaded} />
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
  if (isJournalEntry(doc)) return <JournalDetail doc={doc} preview={preview} />;
  const d = doc.data;
  const photos = imagesIn(d);
  const slideshow = doc.kind === "projects";
  const media = await mediaInfo(
    photos.flatMap((p) => [p.id, ...(p.mobileId ? [p.mobileId] : [])]),
  );
  const preloaded = new Map(media.map((m) => [m.id, m]));
  const items = photos.flatMap((p) => {
    const m = preloaded.get(p.id);
    const image = m?.derivatives.at(-1);
    return m && image
      ? [
          {
            ...p,
            src: `/media/${image.key}`,
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
        {slideshow ? (
          <ProjectSlideshow key={`${doc.id}:${doc.version}`} items={items} />
        ) : (
          d.hero && (
            <PhotoImage
              photo={d.hero}
              priority
              className="detail-hero"
              preloaded={preloaded}
            />
          )
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
                Source archive <DiagonalArrow />
              </a>
            )}
          </div>
        )}
        {!slideshow && (
          <BodyBlocks
            data={d}
            photosOnly={doc.kind === "projects"}
            preloaded={preloaded}
          />
        )}
        {slideshow && d.blocks.some((b) => b.type === "text") && (
          <div className="project-description wrap">
            {d.blocks
              .filter((b) => b.type === "text")
              .map((b, i) => (
                <section key={i} data-reveal>
                  {b.heading && <h2>{b.heading}</h2>}
                  <Prose body={b.body} />
                </section>
              ))}
          </div>
        )}
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
            Discuss a project{" "}
            <span>
              <DiagonalArrow />
            </span>
          </Link>
        </div>
      </article>
    </GallerySurface>
  );
}

export async function JournalCards({
  documents,
}: {
  documents: Publication[];
}) {
  const media = await mediaInfo(
    documents.flatMap((doc) => (doc.data.hero ? [doc.data.hero.id] : [])),
  );
  const preloaded = new Map(media.map((item) => [item.id, item]));
  return (
    <div className="observation-grid">
      {documents.map((doc, index) => (
        <article className="observation-card" key={doc.id} data-reveal>
          <Link href={publicContentPath(doc)}>
            {doc.data.hero && (
              <PhotoImage
                photo={doc.data.hero}
                preloaded={preloaded}
                priority={index < 2}
                sizes="(max-width:767px) 100vw, 50vw"
                className="observation-cover"
              />
            )}
            <h2>{doc.data.title}</h2>
            <p>{doc.data.summary}</p>
          </Link>
        </article>
      ))}
    </div>
  );
}

async function JournalDetail({
  doc,
  preview,
}: {
  doc: Publication;
  preview: boolean;
}) {
  const d = doc.data;
  const photos = imagesIn(d);
  const media = await mediaInfo(photos.map((photo) => photo.id));
  const preloaded = new Map(media.map((item) => [item.id, item]));
  const items = photos.flatMap((photo) => {
    const m = preloaded.get(photo.id),
      derivative = m?.derivatives.at(-1);
    return m && derivative
      ? [
          {
            ...photo,
            src: `/media/${derivative.key}`,
            width: m.width,
            height: m.height,
          },
        ]
      : [];
  });
  return (
    <GallerySurface items={items}>
      <article className="wrap observation-detail">
        {preview && (
          <div className="notice">
            Private draft preview · Not publicly visible.
          </div>
        )}
        <Link href="/journal" className="eyebrow">
          ← JOURNAL
        </Link>
        <div className="observation-layout">
          {d.hero && (
            <figure className="observation-photo">
              <PhotoImage
                photo={d.hero}
                preloaded={preloaded}
                priority
                sizes="(max-width:767px) 100vw, 58vw"
              />
              {d.hero.caption && <figcaption>{d.hero.caption}</figcaption>}
            </figure>
          )}
          <div className="observation-writing" data-reveal>
            <h1>{d.title}</h1>
            {d.author && <p className="observation-author">{d.author}</p>}
            {d.blocks.length ? (
              <BodyBlocks data={d} preloaded={preloaded} />
            ) : (
              <Prose body={d.summary} />
            )}
            {d.sourceUrl && (
              <a
                href={d.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="text-link observation-source"
              >
                Original on Instagram <DiagonalArrow />
              </a>
            )}
          </div>
        </div>
      </article>
    </GallerySurface>
  );
}
