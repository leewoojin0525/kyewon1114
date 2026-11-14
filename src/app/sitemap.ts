import { listPublic } from "@/lib/content";
import { appURL, isLive } from "@/lib/env";
export const dynamic = "force-dynamic";
export default async function sitemap() {
  if (!isLive) return [];
  const docs = [
    ...(await listPublic("projects")),
    ...(await listPublic("journal")),
  ];
  return [
    ...["", "/projects", "/studio", "/press", "/contact", "/privacy"].map(
      (path) => ({ url: appURL + path }),
    ),
    ...docs.map((d) => ({
      url: `${appURL}/${d.kind === "journal" ? "press" : "projects"}/${d.data.slug}`,
      lastModified: new Date(d.published_at),
    })),
  ];
}
