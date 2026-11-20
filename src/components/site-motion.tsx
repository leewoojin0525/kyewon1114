"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export function SiteMotion() {
  const pathname = usePathname();
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    let observer: IntersectionObserver | undefined;
    const elements = new Set<HTMLElement>();
    const selector =
      ".public-site .project-card, .public-site .section-heading, .public-site .studio-teaser-grid, .public-site .studio-opening > h1, .public-site .studio-about, .public-site .studio-statement, .public-site .service-list > *, .public-site .process-list > *, .public-site .contact-intro, .public-site .footer-top, .public-site [data-reveal], .public-site .detail-intro, .public-site .block-text, .public-site .detail-cta";
    function scan() {
      document.querySelectorAll<HTMLElement>(selector).forEach((element) => {
        if (elements.has(element)) return;
        elements.add(element);
        if (
          !media.matches &&
          element.getBoundingClientRect().top > window.innerHeight * 0.92
        ) {
          element.classList.add("reveal-pending", "reveal-enabled");
          observer?.observe(element);
        }
      });
    }
    function configure() {
      observer?.disconnect();
      elements.forEach((element) => element.classList.remove("reveal-pending"));
      elements.clear();
      if (media.matches) return;
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              entry.target.classList.remove("reveal-pending");
              observer?.unobserve(entry.target);
            }
          }
        },
        { rootMargin: "0px 0px 40px 0px", threshold: 0.04 },
      );
      scan();
    }
    configure();
    // App Router can stream cards and copy after the pathname commits.
    let frame = 0;
    const mutations = new MutationObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(scan);
    });
    const main = document.getElementById("main");
    if (main) mutations.observe(main, { childList: true, subtree: true });
    media.addEventListener("change", configure);
    return () => {
      observer?.disconnect();
      mutations.disconnect();
      cancelAnimationFrame(frame);
      media.removeEventListener("change", configure);
      elements.forEach((element) => element.classList.remove("reveal-pending"));
    };
  }, [pathname]);
  return null;
}
