"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
const links = [
  ["PROJECTS", "/projects"],
  ["STUDIO", "/studio"],
  ["PRESS", "/press"],
  ["CONTACT", "/contact"],
];
export function Navigation() {
  const pathname = usePathname(),
    [open, setOpen] = useState(false),
    button = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    setOpen(false);
  }, [pathname]);
  return (
    <header className="site-header wrap">
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
        ref={button}
        className="menu-toggle"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        aria-controls="main-navigation"
        onClick={() => setOpen(!open)}
      >
        {open ? "CLOSE −" : "MENU +"}
      </button>
      <nav
        id="main-navigation"
        className={open ? "nav open" : "nav"}
        aria-label="Main navigation"
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setOpen(false);
            button.current?.focus();
          }
        }}
      >
        {links.map(([label, url]) => (
          <Link
            key={url}
            href={url}
            aria-current={pathname.startsWith(url) ? "page" : undefined}
          >
            {label}
            {label === "CONTACT" && <span aria-hidden> ↗</span>}
          </Link>
        ))}
      </nav>
    </header>
  );
}
