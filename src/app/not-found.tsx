import Link from "next/link";
export default function NotFound() {
  return (
    <main className="error-page">
      <img
        src="/brand/wovn-studio.svg"
        width="114"
        height="40"
        alt="WOVN STUDIO"
      />
      <span className="eyebrow">404 / PAGE NOT FOUND</span>
      <h1>
        This page is
        <br />
        not here.
      </h1>
      <p>Check the address or explore our projects.</p>
      <Link className="button" href="/">
        Back to home ↗
      </Link>
    </main>
  );
}
