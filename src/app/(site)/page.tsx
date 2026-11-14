import Link from "next/link";
import { listPublic, publicSettings } from "@/lib/content";
import { PhotoImage } from "@/components/photos";
import { SectionTitle, ProjectCard, EmptyState } from "@/components/editorial";
export const metadata = { alternates: { canonical: "/" } };
export default async function Home() {
  const [projects, journals, settings] = await Promise.all([
    listPublic("projects"),
    listPublic("journal"),
    publicSettings(),
  ]);
  const selected = settings.selectedProjects
    .map((id) => projects.find((p) => p.id === id))
    .filter(Boolean) as typeof projects;
  const hero =
    projects.find((p) => p.id === settings.featuredProject) ||
    selected[0] ||
    projects[0];
  const picks = (selected.length ? selected : projects).slice(0, 6);
  return (
    <>
      <section className={`cover ${hero ? "magazine-cover" : "wrap"}`}>
        {hero ? (
          <>
            <Link
              href={`/projects/${hero.data.slug}`}
              aria-label={`View ${hero.data.title}`}
            >
              <PhotoImage
                photo={hero.data.hero!}
                priority
                className="cover-image"
              />
            </Link>
            <div className="cover-caption">
              <div>
                <span className="eyebrow">FEATURED PROJECT</span>
                <h1>
                  <Link href={`/projects/${hero.data.slug}`}>
                    {hero.data.title}
                  </Link>
                </h1>
              </div>
              <Link
                href={`/projects/${hero.data.slug}`}
                className="circle-link"
                aria-label="View featured project"
              >
                ↗
              </Link>
            </div>
          </>
        ) : (
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
        )}
      </section>
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
