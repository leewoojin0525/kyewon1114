import { ContactForm } from "@/components/contact-form";
import { publicSettings } from "@/lib/content";
import { isLive } from "@/lib/env";
export const metadata = {
  title: "Contact",
  description: "Start a conversation about your next space.",
  alternates: { canonical: "/contact" },
};
export default async function Contact({
  searchParams,
}: {
  searchParams: Promise<{ project?: string }>;
}) {
  const s = await publicSettings(),
    q = await searchParams;
  return (
    <div className="wrap contact-page">
      <div className="contact-intro">
        <span className="eyebrow">LET’S BEGIN A CONVERSATION</span>
        <h1>
          Your next space,
          <br />
          woven together.
        </h1>
        <p>
          Every project begins with a conversation.
          <br />
          Tell us what you have in mind.
        </p>
        <div className="contact-direct">
          <span className="eyebrow">DIRECT CONTACT</span>
          {s.email ? (
            <a className="email-link" href={`mailto:${s.email}`}>
              {s.email} ↗
            </a>
          ) : (
            <p className="caption">Contact details will be available soon.</p>
          )}
          {s.phone && <a href={`tel:${s.phone}`}>{s.phone}</a>}
        </div>
        {!isLive && (
          <p className="preview-note">
            In this private preview, inquiries are saved locally. Email delivery
            is not yet connected.
          </p>
        )}
      </div>
      <ContactForm
        reference={(q.project || "").slice(0, 180)}
        email={s.email}
        enabled={!isLive || s.privacyApproved}
      />
    </div>
  );
}
