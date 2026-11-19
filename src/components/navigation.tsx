"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type CSSProperties } from "react";

const links = [
  ["PROJECTS", "/projects"],
  ["STUDIO", "/studio"],
  ["PRESS", "/press"],
  ["CONTACT", "/contact"],
];

export function Navigation() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const panel = dialog.current;
    if (!panel) return;
    window.dispatchEvent(new CustomEvent("wovn:menu", { detail: open }));
    if (!open) {
      if (panel.open) panel.close();
      return;
    }
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.showModal();
    return () => {
      document.body.style.overflow = overflow;
    };
  }, [open]);
  function close(restoreFocus = true) {
    setOpen(false);
    if (restoreFocus) trigger.current?.focus();
  }
  return (
    <>
      <header
        className={`site-header wrap${pathname === "/" ? " home-header" : ""}`}
      >
        <Link href="/" aria-label="WOVN STUDIO home">
          <img
            className="logo"
            src="/brand/wovn-studio.svg"
            width="114"
            height="40"
            alt="WOVN STUDIO"
          />
        </Link>
        <button
          ref={trigger}
          type="button"
          className="menu-toggle"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls="main-navigation"
          onClick={() => setOpen(true)}
        >
          MENU <span aria-hidden="true">+</span>
        </button>
      </header>
      <dialog
        ref={dialog}
        id="main-navigation"
        className="menu-panel"
        aria-label="Main navigation"
        onCancel={(event) => {
          event.preventDefault();
          close();
        }}
        onClose={() => setOpen(false)}
      >
        <div className="menu-panel-top">
          <Link
            href="/"
            aria-label="WOVN STUDIO home"
            onClick={() => close(false)}
          >
            <img
              className="logo"
              src="/brand/wovn-studio.svg"
              width="114"
              height="40"
              alt="WOVN STUDIO"
            />
          </Link>
          <button
            type="button"
            className="menu-toggle"
            onClick={() => close()}
            autoFocus
          >
            CLOSE <span aria-hidden="true">−</span>
          </button>
        </div>
        <nav aria-label="Main navigation">
          {links.map(([label, href], index) => (
            <Link
              key={href}
              href={href}
              style={{ "--menu-order": index } as CSSProperties}
              aria-current={pathname.startsWith(href) ? "page" : undefined}
              onClick={() => close(false)}
            >
              <span className="menu-number" aria-hidden="true">
                0{index + 1}
              </span>
              {label}
              <span className="menu-link-arrow" aria-hidden="true">
                ↗
              </span>
            </Link>
          ))}
        </nav>
      </dialog>
    </>
  );
}
