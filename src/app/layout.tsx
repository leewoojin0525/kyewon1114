import type { Metadata } from "next";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/noto-sans-kr/400.css";
import "@fontsource/noto-sans-kr/500.css";
import "./globals.css";
export const metadata: Metadata = {
  title: {
    default: "WOVN STUDIO — Spaces, woven.",
    template: "%s — WOVN STUDIO",
  },
  description:
    "Spatial design and project management. Connecting people, places and possibilities.",
  metadataBase: new URL(process.env.APP_URL || "http://127.0.0.1:3000"),
  robots:
    process.env.APP_ENV === "production"
      ? { index: true, follow: true }
      : { index: false, follow: false },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
