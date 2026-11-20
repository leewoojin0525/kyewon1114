import { DiagonalArrow } from "@/components/diagonal-arrow";
import { IntentLink as Link } from "@/components/intent-link";
import { Navigation } from "@/components/navigation";
import { publicSettings, listPublic } from "@/lib/content";
import { mediaInfo } from "@/lib/media";
import { imagesIn } from "@/lib/model";
import { isLive } from "@/lib/env";
import { SiteMotion } from "@/components/site-motion";
import { RouteTransition } from "@/components/route-transition";
import "@fontsource/jost/latin-400.css";
import "@fontsource/jost/latin-500.css";
import "@fontsource/cormorant-garamond/latin-400.css";
import "./public-site.css";
export const dynamic = "force-dynamic";
export async function generateMetadata() {
  const [settings, projects] = await Promise.all([
    publicSettings(),
    listPublic("projects"),
  ]);
  const hero =
    projects.find((p) => p.id === settings.featuredProject) || projects[0];
  const cover = hero && imagesIn(hero.data)[0];
  const [media] = cover ? await mediaInfo([cover.id]) : [];
  const image = media?.derivatives.at(-1);
  return {
    openGraph: {
      siteName: "WOVN STUDIO",
      title: "WOVN STUDIO — Spaces, woven.",
      description:
        "Spatial design and project management. Connecting people, places and possibilities.",
      locale: "en_US",
      images: image ? [`/media/${image.key}`] : [],
    },
  };
}
export default async function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [settings, projects] = await Promise.all([
    publicSettings(),
    listPublic("projects"),
  ]);
  return (
    <div className="public-site">
      <link
        rel="preconnect"
        href="https://use.typekit.net"
        crossOrigin="anonymous"
      />
      <link
        rel="stylesheet"
        href="https://use.typekit.net/mgk4otd.css"
        precedence="default"
      />
      <a className="skip" href="#main">
        Skip to content
      </a>
      {!isLive && (
        <div className="preview-bar">
          <span>WOVN STUDIO / PRIVATE PREVIEW</span>
          <span>
            Private preview ·{" "}
            <Link href="/admin">
              Manage content <DiagonalArrow />
            </Link>
          </span>
        </div>
      )}
      <Navigation
        projects={projects.map((project) => ({
          title: project.data.title,
          href: `/projects/${project.data.slug}`,
        }))}
      />
      <SiteMotion />
      <main id="main">
        <RouteTransition>{children}</RouteTransition>
      </main>
      <footer className="site-footer">
        <div className="wrap">
          <div className="footer-top">
            <p className="footer-slogan">
              SPACE,
              <br />
              WOVN.
            </p>
            <div>
              <p>
                {settings.studioMotto.split("\n").map((line, index) => (
                  <span key={index} style={{ display: "block" }}>
                    {line}
                  </span>
                ))}
              </p>
              <Link className="text-link" href="/contact">
                Start a conversation{" "}
                <span>
                  <DiagonalArrow />
                </span>
              </Link>
            </div>
          </div>
          <div className="footer-bottom">
            <Link href="/" aria-label="WOVN STUDIO home">
              <img
                src="/brand/wovn-studio.svg"
                width="114"
                height="40"
                alt="WOVN STUDIO"
              />
            </Link>
            <p>
              {settings.companyName}
              <br />
              <span>© {new Date().getFullYear()} WOVN STUDIO</span>
            </p>
            <div>
              {settings.email && (
                <a href={`mailto:${settings.email}`}>{settings.email}</a>
              )}
              {settings.phone && (
                <a href={`tel:${settings.phone}`}>{settings.phone}</a>
              )}
              {settings.address && <span>{settings.address}</span>}
              <Link href="/privacy">Privacy</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
