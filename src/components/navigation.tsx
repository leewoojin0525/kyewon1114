"use client";

import { DiagonalArrow } from "@/components/diagonal-arrow";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { PrefetchKind } from "next/dist/client/components/router-reducer/router-reducer-types";
import { useEffect, useRef, useState, type CSSProperties } from "react";

const links = [
  ["PROJECTS", "/projects"],
  ["STUDIO", "/studio"],
  ["PRESS", "/press"],
  ["CONTACT", "/contact"],
];
type MenuProject = { title: string; href: string };
type BackdropPhoto = { src: string; position: string };

export function Navigation({ projects }: { projects: MenuProject[] }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [showProjects, setShowProjects] = useState(false);
  const [destination, setDestination] = useState<string | null>(null);
  const [backdrop, setBackdrop] = useState<BackdropPhoto | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const projectsTrigger = useRef<HTMLButtonElement>(null);
  const projectBack = useRef<HTMLButtonElement>(null);
  const restoreFocus = useRef(true);
  const warmed = useRef(new Set<string>());

  function warm(href: string) {
    if (warmed.current.has(href)) return;
    warmed.current.add(href);
    router.prefetch(href, {
      // Next 16.4's router requires FULL to include dynamic page data.
      kind: PrefetchKind.FULL,
      onInvalidate: () => {
        warmed.current.delete(href);
      },
    });
  }
  function warmMenu() {
    // Warm four primary routes; project details are warmed only on intent.
    for (const [, href] of links) warm(href);
  }
  function openMenu() {
    warmMenu();
    const photograph =
      pathname === "/"
        ? document.querySelector<HTMLImageElement>(
            ".home-hero-photo:not(.hero-outgoing) img",
          )
        : null;
    setBackdrop(
      photograph?.complete && photograph.naturalWidth
        ? {
            src: photograph.currentSrc || photograph.src,
            position: getComputedStyle(photograph).objectPosition,
          }
        : null,
    );
    restoreFocus.current = true;
    setDestination(null);
    setShowProjects(false);
    setClosing(false);
    setOpen(true);
  }
  function close(returnFocus = true) {
    restoreFocus.current = returnFocus;
    setClosing(true);
  }
  function navigate(href: string) {
    if (href === pathname) close();
    else setDestination(href);
  }
  useEffect(() => {
    const panel = dialog.current;
    if (!panel) return;
    window.dispatchEvent(new CustomEvent("wovn:menu", { detail: open }));
    if (!open) {
      if (panel.open) {
        panel.close();
        if (restoreFocus.current) trigger.current?.focus();
      }
      return;
    }
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.showModal();
    return () => {
      document.body.style.overflow = overflow;
      window.dispatchEvent(new CustomEvent("wovn:menu", { detail: false }));
    };
  }, [open]);
  useEffect(() => {
    if (!closing) return;
    const duration = window.matchMedia("(prefers-reduced-motion: reduce)")
      .matches
      ? 0
      : 180;
    const timer = window.setTimeout(() => {
      setOpen(false);
      setClosing(false);
      setDestination(null);
    }, duration);
    return () => window.clearTimeout(timer);
  }, [closing]);
  useEffect(() => {
    if (!destination || pathname !== destination) return;
    // Keep the photo/menu in place until the destination has committed.
    restoreFocus.current = false;
    setClosing(true);
  }, [pathname, destination]);
  useEffect(() => {
    if (showProjects) projectBack.current?.focus();
  }, [showProjects]);

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
          onPointerEnter={warmMenu}
          onFocus={warmMenu}
          onClick={openMenu}
        >
          MENU <span aria-hidden="true">+</span>
        </button>
      </header>
      <dialog
        ref={dialog}
        id="main-navigation"
        className={`menu-panel${backdrop ? " menu-over-photo" : ""}${closing ? " menu-closing" : ""}`}
        aria-label="Main navigation"
        aria-busy={Boolean(destination)}
        onCancel={(event) => {
          event.preventDefault();
          close();
        }}
        onClose={() => {
          setOpen(false);
          setClosing(false);
          setDestination(null);
        }}
      >
        {backdrop && (
          <>
            <img
              className="menu-backdrop-photo"
              src={backdrop.src}
              alt=""
              style={{ objectPosition: backdrop.position }}
            />
            <div className="menu-scrim" aria-hidden="true" />
          </>
        )}
        <div className="menu-panel-top">
          <Link
            href="/"
            aria-label="WOVN STUDIO home"
            onNavigate={() => navigate("/")}
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
        <div
          className={`menu-content${showProjects ? " menu-projects-open" : ""}`}
        >
          <nav className="menu-primary" aria-label="Main navigation">
            {links.map(([label, href], index) =>
              href === "/projects" ? (
                <button
                  key={href}
                  ref={projectsTrigger}
                  type="button"
                  className="menu-primary-link"
                  style={{ "--menu-order": index } as CSSProperties}
                  aria-expanded={showProjects}
                  aria-controls="menu-projects"
                  onClick={() => setShowProjects((value) => !value)}
                >
                  <span className="menu-number" aria-hidden="true">
                    01
                  </span>
                  {label}
                  <span className="menu-link-arrow" aria-hidden="true">
                    {showProjects ? "−" : "+"}
                  </span>
                </button>
              ) : (
                <Link
                  key={href}
                  href={href}
                  className="menu-primary-link"
                  prefetch={true}
                  style={{ "--menu-order": index } as CSSProperties}
                  aria-current={pathname.startsWith(href) ? "page" : undefined}
                  data-pending={destination === href || undefined}
                  onNavigate={() => navigate(href)}
                >
                  <span className="menu-number" aria-hidden="true">
                    0{index + 1}
                  </span>
                  {label}
                  <span className="menu-link-arrow" aria-hidden="true">
                    <DiagonalArrow />
                  </span>
                </Link>
              ),
            )}
          </nav>
          <div
            id="menu-projects"
            className="menu-projects"
            hidden={!showProjects}
          >
            <div className="menu-projects-heading">
              <button
                ref={projectBack}
                type="button"
                className="menu-back"
                onClick={() => {
                  setShowProjects(false);
                  projectsTrigger.current?.focus();
                }}
              >
                ← MENU
              </button>
              <Link
                href="/projects"
                prefetch={true}
                onNavigate={() => navigate("/projects")}
              >
                VIEW ALL PROJECTS <DiagonalArrow />
              </Link>
            </div>
            <nav className="menu-project-list" aria-label="Projects">
              {projects.map((project, index) => (
                <Link
                  key={project.href}
                  href={project.href}
                  prefetch={false}
                  style={
                    { "--project-order": Math.min(index, 8) } as CSSProperties
                  }
                  aria-current={pathname === project.href ? "page" : undefined}
                  data-pending={destination === project.href || undefined}
                  onPointerEnter={() => warm(project.href)}
                  onFocus={() => warm(project.href)}
                  onNavigate={() => navigate(project.href)}
                >
                  {project.title}
                </Link>
              ))}
            </nav>
          </div>
        </div>
        <p className="menu-status" role="status" aria-live="polite">
          {destination ? "Opening…" : ""}
        </p>
      </dialog>
    </>
  );
}
