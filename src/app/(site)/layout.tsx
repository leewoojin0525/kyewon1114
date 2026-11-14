import Link from "next/link";
import { Navigation } from "@/components/navigation";
import { publicSettings, listPublic } from "@/lib/content";
import { mediaInfo } from "@/lib/media";
import { isLive } from "@/lib/env";
export const dynamic = "force-dynamic";
export async function generateMetadata() {
  const [settings, projects] = await Promise.all([
    publicSettings(),
    listPublic("projects"),
  ]);
  const hero =
    projects.find((p) => p.id === settings.featuredProject) || projects[0];
  const [media] = hero?.data.hero ? await mediaInfo([hero.data.hero.id]) : [];
  return {
    openGraph: {
      siteName: "WOVN STUDIO",
      title: "WOVN STUDIO — Spaces, woven.",
      description:
        "Spatial design and project management. Connecting people, places and possibilities.",
      locale: "en_US",
      images: media ? [`/media/${media.derivatives.at(-1).key}`] : [],
    },
  };
}
export default async function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = await publicSettings();
  return (
    <>
      <a className="skip" href="#main">
        Skip to content
      </a>
      {!isLive && (
        <div className="preview-bar">
          <span>WOVN STUDIO / PRIVATE PREVIEW</span>
          <span>
            Private preview · <Link href="/admin">Manage content ↗</Link>
          </span>
        </div>
      )}
      <Navigation />
      <main id="main">{children}</main>
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
                Connecting people.
                <br />
                Shaping spaces.
              </p>
              <Link className="text-link" href="/contact">
                Start a conversation <span>↗</span>
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
    </>
  );
}
