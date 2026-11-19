"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export function SiteMotion() {
  const pathname = usePathname();
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    let observer: IntersectionObserver | undefined;
    const elements = Array.from(
      document.querySelectorAll<HTMLElement>(
        ".public-site .project-card, .public-site .section-heading, .public-site .studio-teaser-grid, .public-site .studio-opening, .public-site .studio-about, .public-site .studio-statement, .public-site .service-list > *, .public-site .process-list > *, .public-site .contact-intro, .public-site .footer-top",
      ),
    );
    function configure() {
      observer?.disconnect();
      elements.forEach((element) => element.classList.remove("reveal-pending"));
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
      for (const element of elements) {
        if (element.getBoundingClientRect().top > window.innerHeight * 0.92) {
          element.classList.add("reveal-pending", "reveal-enabled");
          observer.observe(element);
        }
      }
    }
    configure();
    media.addEventListener("change", configure);
    return () => {
      observer?.disconnect();
      media.removeEventListener("change", configure);
      elements.forEach((element) => element.classList.remove("reveal-pending"));
    };
  }, [pathname]);
  return null;
}
