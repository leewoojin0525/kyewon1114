/** A quiet, consistent directional mark; the parent retains its full hit area. */
export function DiagonalArrow({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`diagonal-arrow ${className}`}
      width="12"
      height="12"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M3.5 12.5 12.5 3.5M3.5 3.5h9v9"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
