import Link from "next/link";
import { publicSettings } from "@/lib/content";
import { Prose } from "@/components/prose";
export const metadata = {
  title: "Studio",
  description: "The people, ideas and practice behind WOVN STUDIO.",
  alternates: { canonical: "/studio" },
};
export default async function Studio() {
  const s = await publicSettings();
  return (
    <>
      <section className="studio-opening wrap">
        <span className="eyebrow">WOVN / WEAVING POSSIBILITIES</span>
        <h1>
          SPACE,
          <br />
          <span>WOVN.</span>
        </h1>
        <div className="studio-statement">
          <span className="eyebrow">OUR PHILOSOPHY</span>
          <div>
            <h2>
              Connecting people.
              <br />
              Shaping spaces.
            </h2>
            <p>{s.studioIntro}</p>
          </div>
        </div>
      </section>
      <section className="services section">
        <div className="wrap">
          <div className="section-heading">
            <h2>
              <span>01</span>WHAT WE DO
            </h2>
            <span className="eyebrow">DESIGN + PM</span>
          </div>
          <div className="service-list">
            {s.studioServices
              .split("\n")
              .filter(Boolean)
              .map((t, i) => (
                <article key={i}>
                  <span className="eyebrow">0{i + 1}</span>
                  <h3>{t}</h3>
                  <p>
                    {[
                      "We explore the possibilities of a place and shape its direction through the way people experience it.",
                      "We guide design decisions from the first idea through detailed review.",
                      "We coordinate scope, budget, programme and decisions throughout the project.",
                    ][i] || ""}
                  </p>
                </article>
              ))}
          </div>
          <p className="caption">
            Each appointment is tailored to the project.
          </p>
        </div>
      </section>
      <section className="section wrap">
        <div className="section-heading">
          <h2>
            <span>02</span>HOW WE WORK
          </h2>
        </div>
        <ol className="process-list">
          {s.studioProcess
            .split("\n")
            .filter(Boolean)
            .map((t, i) => (
              <li key={i}>
                <span>0{i + 1}</span>
                <h3>{t}</h3>
                <span aria-hidden>↗</span>
              </li>
            ))}
        </ol>
      </section>
      <section className="studio-about wrap">
        <span className="eyebrow">03 / PEOPLE & PRACTICE</span>
        <div>
          <h2>
            A continuing practice.
            <br />A new perspective.
          </h2>
          <Prose body={s.biography} />
          <p className="caption">Lee Woojin · Principal</p>
          <Link href="/contact" className="text-link">
            Discuss a project <span>↗</span>
          </Link>
        </div>
      </section>
    </>
  );
}
