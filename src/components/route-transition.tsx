"use client";

import type {} from "react/canary";
import { ViewTransition, type ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function RouteTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const search = useSearchParams();
  return (
    <ViewTransition
      key={`${pathname}?${search}`}
      name="wovn-page"
      share="wovn-page"
      enter="wovn-page"
      exit="wovn-page"
      default="none"
    >
      <div className="route-content">{children}</div>
    </ViewTransition>
  );
}
