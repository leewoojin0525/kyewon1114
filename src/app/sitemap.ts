import { listPublic } from "@/lib/content";
import { appURL, isLive } from "@/lib/env";
import { publicContentPath } from "@/lib/editorial-section";
export const dynamic = "force-dynamic";
export default async function sitemap() {
  if (!isLive) return [];
  const docs = [
    ...(await listPublic("projects")),
    ...(await listPublic("journal")),
  ];
  return [
    ...[
      "",
      "/projects",
      "/studio",
      "/press",
      "/journal",
      "/contact",
      "/privacy",
    ].map((path) => ({ url: appURL + path })),
    ...docs.map((d) => ({
      url: appURL + publicContentPath(d),
      lastModified: new Date(d.published_at),
    })),
  ];
}
