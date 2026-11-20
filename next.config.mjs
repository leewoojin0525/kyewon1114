import { existsSync } from "node:fs";
import { withPayload } from "@payloadcms/next/withPayload";
if (
  process.env.VERCEL_ENV === "production" &&
  !existsSync(".site-media/manifest.json")
) {
  throw new Error(
    "Private deployment photo bundle is missing. Run the verified media preparation before deploying.",
  );
}
if (
  process.env.VERCEL_ENV === "production" &&
  !existsSync(".site-copy/review.json")
) {
  throw new Error(
    "Verified bilingual review copy is missing. Run the mobile copy preparation before deploying.",
  );
}
if (
  process.env.VERCEL_ENV === "production" &&
  !existsSync(".site-review/catalog.json")
) {
  throw new Error(
    "Photo review catalogue is missing. Run scripts/prepare-photo-review.ts before deployment.",
  );
}
export default withPayload({
  output: "standalone",
  outputFileTracingIncludes: {
    "/media/**": ["./.site-media/**/*"],
    "/review/copy": ["./.site-copy/review.json"],
    "/review/photos": ["./.site-review/catalog.json"],
    "/api/review/photos/**": ["./.site-review/**/*"],
  },
  poweredByHeader: false,
  devIndicators: false,
  serverExternalPackages: ["pg", "sharp", "@aws-sdk/client-s3"],
  experimental: { serverActions: { bodySizeLimit: "2mb" } },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
      ...[
        "/admin/:path*",
        "/preview/:path*",
        "/api/:path*",
        "/review/:path*",
      ].map((source) => ({
        source,
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
          { key: "Cache-Control", value: "private, no-store" },
        ],
      })),
    ];
  },
});
