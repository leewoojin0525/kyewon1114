"use client";

import { useState } from "react";
import { ZoomImage, type GalleryItem } from "./gallery";

export function ProjectSlideshow({ items }: { items: GalleryItem[] }) {
  const [current, setCurrent] = useState(0);
  if (!items.length) return null;
  const photo = items[current];
  function move(step: number) {
    setCurrent((index) => (index + step + items.length) % items.length);
  }
  return (
    <section
      className="project-slideshow"
      aria-label="Project photographs"
      aria-roledescription="carousel"
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
          event.preventDefault();
          move(event.key === "ArrowLeft" ? -1 : 1);
        }
      }}
    >
      <div className="project-slideshow-stage">
        <button type="button" className="project-slide-arrow" onClick={() => move(-1)} aria-label="Previous photograph" disabled={items.length < 2}>←</button>
        <div className="project-slide-image">
          <ZoomImage id={photo.id}>
            <img src={photo.src} alt={photo.alt} width={photo.width} height={photo.height} draggable={false} />
          </ZoomImage>
        </div>
        <button type="button" className="project-slide-arrow" onClick={() => move(1)} aria-label="Next photograph" disabled={items.length < 2}>→</button>
      </div>
      <p className="project-slide-count" aria-live="polite" aria-atomic="true">
        <span aria-hidden="true">{current + 1}/{items.length}</span>
        <span className="sr-only">Photograph {current + 1} of {items.length}</span>
      </p>
      <div className="project-slide-thumbnails" aria-label="Choose a photograph">
        {items.map((item, index) => (
          <button type="button" key={item.id} className="project-slide-thumbnail" aria-label={`Show photograph ${index + 1}`} aria-current={index === current ? "true" : undefined} onClick={() => setCurrent(index)}>
            <img src={item.src} alt="" width={item.width} height={item.height} loading="lazy" draggable={false} />
          </button>
        ))}
      </div>
    </section>
  );
}
