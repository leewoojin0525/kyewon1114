"use client";
import { useRef, useState, useEffect, createContext, useContext } from "react";
export type GalleryItem = {
  id: string;
  src: string;
  alt: string;
  caption: string;
  width: number;
  height: number;
};
const ZoomContext = createContext<
  null | ((id: string, trigger: HTMLButtonElement) => void)
>(null);
export function ZoomImage({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  const open = useContext(ZoomContext);
  return open ? (
    <button
      className="zoom-photo"
      onClick={(e) => open(id, e.currentTarget)}
      aria-label="View larger image"
    >
      {children}
    </button>
  ) : (
    children
  );
}
export function GallerySurface({
  items,
  children,
}: {
  items: GalleryItem[];
  children: React.ReactNode;
}) {
  const [current, setCurrent] = useState<number | null>(null),
    dialog = useRef<HTMLDialogElement>(null),
    trigger = useRef<HTMLButtonElement | null>(null),
    touch = useRef(0);
  useEffect(() => {
    if (current !== null) {
      dialog.current?.showModal();
      document.body.style.overflow = "hidden";
    } else {
      dialog.current?.close();
      document.body.style.overflow = "";
      trigger.current?.focus();
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [current]);
  function move(step: number) {
    setCurrent((i) =>
      i === null ? null : (i + step + items.length) % items.length,
    );
  }
  return (
    <ZoomContext.Provider
      value={(id, button) => {
        const index = items.findIndex((i) => i.id === id);
        if (index >= 0) {
          trigger.current = button;
          setCurrent(index);
        }
      }}
    >
      {children}
      <dialog
        ref={dialog}
        className="lightbox"
        aria-label="View larger image"
        onCancel={() => setCurrent(null)}
        onClick={(e) => {
          if (e.target === e.currentTarget) setCurrent(null);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") move(1);
          if (e.key === "ArrowLeft") move(-1);
        }}
      >
        <button
          className="lightbox-close"
          autoFocus
          onClick={() => setCurrent(null)}
          aria-label="Close image viewer"
        >
          CLOSE ×
        </button>
        {current !== null && (
          <>
            <img
              src={items[current].src}
              alt={items[current].alt}
              onTouchStart={(e) => {
                touch.current = e.touches[0].clientX;
              }}
              onTouchEnd={(e) => {
                const dx = e.changedTouches[0].clientX - touch.current;
                if (Math.abs(dx) > 40) move(dx < 0 ? 1 : -1);
              }}
            />
            <div className="lightbox-controls">
              <button onClick={() => move(-1)} aria-label="Previous image">
                ←
              </button>
              <p aria-live="polite">
                {current + 1} / {items.length}　{items[current].caption}
              </p>
              <button onClick={() => move(1)} aria-label="Next image">
                →
              </button>
            </div>
          </>
        )}
      </dialog>
    </ZoomContext.Provider>
  );
}
export function Gallery({ items }: { items: GalleryItem[] }) {
  return (
    <div className="gallery-thumbs">
      {items.map((p, i) => (
        <ZoomImage id={p.id} key={i}>
          <img
            src={p.src}
            alt={p.alt}
            width={p.width}
            height={p.height}
            loading="lazy"
          />
        </ZoomImage>
      ))}
    </div>
  );
}
