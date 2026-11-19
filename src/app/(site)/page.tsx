import Link from "next/link";
import { imagesIn } from "@/lib/model";
import { listPublic, publicSettings } from "@/lib/content";
import { HomeHero, type HomeSlide } from "@/components/home-hero";
import { mediaInfo } from "@/lib/media";
import { SectionTitle, ProjectCard, EmptyState } from "@/components/editorial";
export const metadata = { alternates: { canonical: "/" } };
export default async function Home() {
  const [projects, journals, settings] = await Promise.all([
    listPublic("projects"),
    listPublic("journal"),
    publicSettings(),
  ]);
  const selected = projects.filter((project) =>
    settings.selectedProjects.includes(project.id),
  );
  const hero =
    projects.find((p) => p.id === settings.featuredProject) ||
    selected[0] ||
    projects[0];
  const picks = (selected.length ? selected : projects).slice(0, 6);
  const heroProjects = [
    "kyobo-hottracks-2015",
    "samjeon-165-18",
    "gwangjang-apartment",
  ].flatMap(
    (slug) => projects.find((project) => project.data.slug === slug) ?? [],
  );
  if (!heroProjects.length && hero) heroProjects.push(hero);
  const heroMedia = await mediaInfo(
    heroProjects.flatMap((project) => imagesIn(project.data)[0]?.id ?? []),
  );
  const slides: HomeSlide[] = heroProjects.flatMap((project) => {
    const photo = imagesIn(project.data)[0];
    const media = heroMedia.find((item) => item.id === photo?.id);
    if (!photo || !media) return [];
    const mobileCenters: Record<string, number> = {
      "kyobo-hottracks-2015": 50,
      "samjeon-165-18": 53,
      "gwangjang-apartment": 62,
    };
    return [
      {
        id: photo.id,
        title: project.data.title,
        href: `/projects/${project.data.slug}`,
        src: `/media/${media.derivatives.at(-1).key}`,
        srcSet: media.derivatives
          .map(
            (item: { key: string; width: number }) =>
              `/media/${item.key} ${item.width}w`,
          )
          .join(", "),
        sizes: "100vw",
        alt: photo.alt,
        width: media.width,
        height: media.height,
        focal: `${photo.focalX}% ${photo.focalY}%`,
        mobileFocal: `${photo.mobileFocalX === 50 ? (mobileCenters[project.data.slug] ?? 50) : photo.mobileFocalX}% ${photo.mobileFocalY}%`,
      },
    ];
  });
  return (
    <>
      {slides.length ? (
        <HomeHero
          key={slides.map((slide) => slide.id).join(":")}
          slides={slides}
        />
      ) : (
        <section className="cover wrap">
          <>
            <div className="cover-placeholder">
              <div className="proof-top">
                <span>WOVN STUDIO</span>
                <span>SPATIAL DESIGN & PROJECT MANAGEMENT</span>
              </div>
              <div className="paper-sculpture" aria-hidden>
                <div />
                <div />
                <div />
                <div />
              </div>
              <div className="proof-bottom">
                <span>A new chapter in spatial design.</span>
                <span>01 — OPENING SOON</span>
              </div>
            </div>
            <div className="cover-caption">
              <div>
                <span className="eyebrow">A NEW CHAPTER</span>
                <h1>
                  Reading spaces.
                  <br className="mobile-break" /> Weaving connections.
                </h1>
                <p>
                  Spatial design and project management, through the lens of
                  WOVN.
                </p>
              </div>
              <Link
                href="/studio"
                className="circle-link"
                aria-label="About the studio"
              >
                ↗
              </Link>
            </div>
          </>
        </section>
      )}
      <section className="section portfolio-selection">
        <SectionTitle number="01" title="SELECTED PROJECTS" href="/projects" />
        {picks.length ? (
          <div className="project-grid selected-grid photo-grid">
            {picks.map((p, i) => (
              <ProjectCard key={p.id} doc={p} index={i} />
            ))}
          </div>
        ) : (
          <EmptyState />
        )}
      </section>
      <section className="studio-teaser">
        <div className="wrap studio-teaser-grid">
          <span className="eyebrow">02 / THE STUDIO</span>
          <div>
            <h2>
              Connecting people.
              <br />
              Shaping spaces.
            </h2>
            <p>{settings.studioIntro}</p>
            <Link className="text-link" href="/studio">
              Our approach <span>↗</span>
            </Link>
          </div>
          <span className="weave-mark" aria-hidden>
            W.
          </span>
        </div>
      </section>
      <section className="section wrap">
        <SectionTitle number="03" title="PRESS" href="/press" />
        {journals.length ? (
          <div className="journal-grid">
            {journals.slice(0, 3).map((p) => (
              <ProjectCard key={p.id} doc={p} />
            ))}
          </div>
        ) : (
          <EmptyState type="journal" />
        )}
      </section>
    </>
  );
}
