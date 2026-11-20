"use client";

import { DiagonalArrow } from "@/components/diagonal-arrow";

import { IntentLink as Link } from "@/components/intent-link";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useDecodedCarousel, type CarouselImage } from "./use-decoded-carousel";

export type HomeSlide = CarouselImage & {
  id: string;
  title: string;
  href: string;
  alt: string;
  width: number;
  height: number;
  focal: string;
  mobileFocal: string;
};

export function HomeHero({ slides }: { slides: HomeSlide[] }) {
  const { current, previous, loading, move } = useDecodedCarousel(slides);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(true);
  const [visible, setVisible] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const hero = useRef<HTMLElement>(null);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const suppressClick = useRef(false);
  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const motion = () => setReduced(preference.matches);
    const visibility = () => setVisible(!document.hidden);
    const menu = (event: Event) =>
      setMenuOpen(Boolean((event as CustomEvent<boolean>).detail));
    motion();
    visibility();
    preference.addEventListener("change", motion);
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("wovn:menu", menu);
    return () => {
      preference.removeEventListener("change", motion);
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("wovn:menu", menu);
    };
  }, []);
  const [inView, setInView] = useState(true);
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.2 },
    );
    if (hero.current) observer.observe(hero.current);
    return () => observer.disconnect();
  }, []);
  const playing =
    !paused && !reduced && visible && inView && !menuOpen && !hovered;
  useEffect(() => {
    if (!playing || slides.length < 2 || loading) return;
    const timer = window.setTimeout(() => move(1), 6000);
    return () => window.clearTimeout(timer);
  }, [current, playing, slides.length, loading, move]);
  if (!slides.length) return null;
  const slide = slides[current];
  const outgoing = previous === null ? null : slides[previous];
  function navigate(step: number) {
    setPaused(true);
    move(step);
  }
  function photograph(item: HomeSlide, hidden = false) {
    return (
      <img
        src={item.src}
        srcSet={item.srcSet}
        sizes={item.sizes}
        alt={hidden ? "" : item.alt}
        width={item.width}
        height={item.height}
        draggable={false}
        decoding="async"
        fetchPriority={hidden ? "auto" : "high"}
        style={
          {
            "--hero-focal": item.focal,
            "--hero-mobile-focal": item.mobileFocal,
          } as CSSProperties
        }
      />
    );
  }
  return (
    <section
      ref={hero}
      className="home-hero"
      aria-label="Selected projects"
      aria-roledescription="carousel"
      onFocusCapture={(event) => {
        // The play control owns its toggle; focus must not toggle it twice.
        if (!(event.target as HTMLElement).closest(".hero-play"))
          setPaused(true);
      }}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
          event.preventDefault();
          navigate(event.key === "ArrowLeft" ? -1 : 1);
        }
      }}
    >
      {outgoing && (
        <div className="home-hero-photo hero-outgoing" aria-hidden="true">
          {photograph(outgoing, true)}
        </div>
      )}
      <Link
        key={slide.id}
        href={slide.href}
        className={`home-hero-photo${outgoing ? " hero-enter" : ""}`}
        aria-label={`View ${slide.title}`}
        aria-busy={loading}
        onTouchStart={(event) => {
          setPaused(true);
          suppressClick.current = false;
          const point = event.touches[0];
          touch.current =
            event.touches.length === 1
              ? { x: point.clientX, y: point.clientY }
              : null;
        }}
        onTouchEnd={(event) => {
          const start = touch.current;
          touch.current = null;
          if (!start) return;
          const point = event.changedTouches[0];
          const dx = point.clientX - start.x,
            dy = point.clientY - start.y;
          if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.4) {
            suppressClick.current = true;
            navigate(dx < 0 ? 1 : -1);
          }
        }}
        onTouchCancel={() => {
          touch.current = null;
        }}
        onClick={(event) => {
          if (suppressClick.current) {
            event.preventDefault();
            suppressClick.current = false;
          }
        }}
      >
        {photograph(slide)}
      </Link>
      <div className="home-hero-caption">
        <h1>
          <Link href={slide.href}>
            {slide.title}{" "}
            <span aria-hidden="true">
              <DiagonalArrow />
            </span>
          </Link>
        </h1>
      </div>
      <div
        className="hero-controls"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Previous featured project"
          disabled={slides.length < 2}
        >
          ←
        </button>
        <span
          className="hero-count"
          aria-live={playing ? "off" : "polite"}
          aria-atomic="true"
        >
          {String(current + 1).padStart(2, "0")} /{" "}
          {String(slides.length).padStart(2, "0")}
        </span>
        <button
          type="button"
          onClick={() => navigate(1)}
          aria-label="Next featured project"
          disabled={slides.length < 2}
        >
          →
        </button>
        {!reduced && slides.length > 1 && (
          <button
            type="button"
            className="hero-play"
            onClick={() => setPaused((value) => !value)}
            aria-label={paused ? "Play slideshow" : "Pause slideshow"}
          >
            {paused ? "PLAY" : "PAUSE"}
          </button>
        )}
      </div>
      <div className="hero-progress" aria-hidden="true">
        {slides.map((item, index) => (
          <span key={item.id} className={index === current ? "active" : ""} />
        ))}
      </div>
    </section>
  );
}
