"use client";

import Link, { useLinkStatus } from "next/link";
import { useRouter } from "next/navigation";
import { PrefetchKind } from "next/dist/client/components/router-reducer/router-reducer-types";
import { useRef, type ComponentProps } from "react";

function Pending() {
  const { pending } = useLinkStatus();
  return pending ? (
    <span className="link-progress" aria-label="Loading" role="status" />
  ) : null;
}

/** Prefetch dynamic content on intent without fetching every photograph card. */
export function IntentLink({
  children,
  onPointerEnter,
  onFocus,
  onTouchStart,
  prefetch = false,
  ...props
}: ComponentProps<typeof Link>) {
  const router = useRouter();
  const warmed = useRef(false);
  function warm() {
    if (
      warmed.current ||
      typeof props.href !== "string" ||
      !props.href.startsWith("/")
    )
      return;
    warmed.current = true;
    router.prefetch(props.href, {
      kind: PrefetchKind.FULL,
      onInvalidate: () => {
        warmed.current = false;
      },
    });
  }
  return (
    <Link
      {...props}
      prefetch={prefetch}
      onPointerEnter={(e) => {
        warm();
        onPointerEnter?.(e);
      }}
      onFocus={(e) => {
        warm();
        onFocus?.(e);
      }}
      onTouchStart={(e) => {
        warm();
        onTouchStart?.(e);
      }}
    >
      {children}
      <Pending />
    </Link>
  );
}
