"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="error-page">
      <span className="eyebrow">A MOMENT PLEASE</span>
      <h1>
        A brief
        <br />
        interruption.
      </h1>
      <p>Please try again in a moment. Your saved work is safe.</p>
      <button className="button" onClick={reset}>
        Try again ↗
      </button>
    </main>
  );
}
