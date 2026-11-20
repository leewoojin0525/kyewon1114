import { appURL, isLive } from "@/lib/env";
export const dynamic = "force-dynamic";
export default function robots() {
  return {
    rules: isLive
      ? [
          {
            userAgent: "*",
            allow: "/",
            disallow: ["/admin", "/cms", "/preview", "/api", "/review"],
          },
        ]
      : [{ userAgent: "*", disallow: "/" }],
    sitemap: isLive ? `${appURL}/sitemap.xml` : undefined,
  };
}
