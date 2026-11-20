import { publicJournalIndex } from "@/lib/content";
import { JournalCards } from "@/components/editorial";

export const metadata = {
  title: "Journal",
  description:
    "Notes on everyday life, architecture and the beauty we encounter.",
  alternates: { canonical: "/journal" },
};

export default async function Journal() {
  const entries = await publicJournalIndex();
  return (
    <div className="wrap section-first observation-index">
      <div className="page-title">
        <h1>
          Journal{" "}
          <span className="count">
            ({String(entries.length).padStart(2, "0")})
          </span>
        </h1>
        <p>Everyday observations. Ideas that stay with us.</p>
      </div>
      {entries.length ? (
        <JournalCards documents={entries} />
      ) : (
        <p className="section">New observations, coming soon.</p>
      )}
    </div>
  );
}
