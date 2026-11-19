"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type CarouselImage = { src: string; srcSet?: string; sizes?: string };

// The displayed photograph remains until the requested image has decoded.
export function useDecodedCarousel(items: CarouselImage[]) {
  const [current, setCurrent] = useState(0);
  const [previous, setPrevious] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const displayed = useRef(0);
  const requested = useRef(0);
  const request = useRef(0);
  const decoded = useRef(new Map<number, Promise<void>>());
  const prepare = useCallback(
    (index: number) => {
      const existing = decoded.current.get(index);
      if (existing) return existing;
      const source = items[index];
      const promise = new Promise<void>((resolve, reject) => {
        const image = new Image();
        image.decoding = "async";
        image.onload = () => {
          image
            .decode()
            .then(resolve, () => (image.naturalWidth ? resolve() : reject()));
        };
        image.onerror = () => reject(new Error("Photograph could not load"));
        if (source.sizes) image.sizes = source.sizes;
        if (source.srcSet) image.srcset = source.srcSet;
        image.src = source.src;
      }).catch((cause) => {
        decoded.current.delete(index);
        throw cause;
      });
      decoded.current.set(index, promise);
      for (const key of decoded.current.keys()) {
        if (decoded.current.size <= 3) break;
        if (key !== index && key !== displayed.current)
          decoded.current.delete(key);
      }
      return promise;
    },
    [items],
  );
  const select = useCallback(
    async (index: number) => {
      if (!items.length) return;
      const next = (index + items.length) % items.length;
      requested.current = next;
      const ticket = ++request.current;
      setError(false);
      if (next === displayed.current) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        await prepare(next);
        if (ticket !== request.current) return;
        setPrevious(displayed.current);
        displayed.current = next;
        setCurrent(next);
      } catch {
        if (ticket === request.current) {
          requested.current = displayed.current;
          setError(true);
        }
      } finally {
        if (ticket === request.current) setLoading(false);
      }
    },
    [items.length, prepare],
  );
  const move = useCallback(
    (step: number) => {
      void select(requested.current + step);
    },
    [select],
  );
  useEffect(() => {
    if (items.length > 1) {
      const timer = window.setTimeout(() => {
        void prepare((current + 1) % items.length).catch(() => {});
      }, 250);
      return () => window.clearTimeout(timer);
    }
  }, [current, items.length, prepare]);
  useEffect(() => {
    if (previous === null) return;
    const timer = window.setTimeout(() => setPrevious(null), 450);
    return () => window.clearTimeout(timer);
  }, [current, previous]);
  useEffect(
    () => () => {
      request.current += 1;
    },
    [],
  );
  return { current, previous, loading, error, move, select };
}
