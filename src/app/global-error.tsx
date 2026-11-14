"use client";
export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="en">
      <body>
        <main>
          <h1>We could not load this page.</h1>
          <p>Please try again in a moment.</p>
          <button onClick={reset}>Try again</button>
        </main>
      </body>
    </html>
  );
}
