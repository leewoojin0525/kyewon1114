"use client";

import { useRef } from "react";
import { ZoomImage, type GalleryItem } from "./gallery";
import { useDecodedCarousel } from "./use-decoded-carousel";

export function ProjectSlideshow({ items }: { items: GalleryItem[] }) {
  const { current, previous, loading, error, move } = useDecodedCarousel(items);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const suppressClick = useRef(false);
  if (!items.length) return null;
  const photo = items[current];
  const outgoing = previous === null ? null : items[previous];
  return (
    <section
      className="project-slideshow"
      aria-label="Project photographs"
      aria-roledescription="carousel"
      data-photo-order={items.map((item) => item.id).join(",")}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
          event.preventDefault();
          move(event.key === "ArrowLeft" ? -1 : 1);
        }
      }}
    >
      <div
        className="project-slideshow-stage"
        aria-busy={loading}
        onTouchStart={(event) => {
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
          const dx = point.clientX - start.x;
          const dy = point.clientY - start.y;
          if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.4) {
            suppressClick.current = true;
            move(dx < 0 ? 1 : -1);
          }
        }}
        onTouchCancel={() => {
          touch.current = null;
        }}
        onClickCapture={(event) => {
          if (suppressClick.current) {
            suppressClick.current = false;
            event.preventDefault();
            event.stopPropagation();
          }
        }}
      >
        {outgoing && (
          <div
            className="project-slide-image slide-outgoing"
            aria-hidden="true"
          >
            <img
              src={outgoing.src}
              alt=""
              width={outgoing.width}
              height={outgoing.height}
              draggable={false}
            />
          </div>
        )}
        <div
          key={photo.id}
          className={`project-slide-image${outgoing ? " slide-enter" : ""}`}
        >
          <ZoomImage id={photo.id}>
            <img
              src={photo.src}
              alt={photo.alt}
              width={photo.width}
              height={photo.height}
              decoding="async"
              fetchPriority="high"
              draggable={false}
            />
          </ZoomImage>
        </div>
        <button
          type="button"
          className="project-slide-arrow previous"
          onClick={() => move(-1)}
          aria-label="Previous photograph"
          disabled={items.length < 2}
        >
          ←
        </button>
        <button
          type="button"
          className="project-slide-arrow next"
          onClick={() => move(1)}
          aria-label="Next photograph"
          disabled={items.length < 2}
        >
          →
        </button>
      </div>
      <p className="project-slide-count" aria-live="polite" aria-atomic="true">
        <span aria-hidden="true">
          {String(current + 1).padStart(2, "0")} /{" "}
          {String(items.length).padStart(2, "0")}
        </span>
        <span className="sr-only">
          Photograph {current + 1} of {items.length}
          {error
            ? ". The next photograph could not load. Please try again."
            : ""}
        </span>
      </p>
    </section>
  );
}
