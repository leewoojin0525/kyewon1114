import { publicSettings } from "@/lib/content";
import { privacyVersion } from "@/lib/inquiries";
export const metadata = {
  title: "Privacy",
  alternates: { canonical: "/privacy" },
};
export default async function Privacy() {
  const s = await publicSettings();
  return (
    <article className="wrap legal section-first">
      <span className="eyebrow">PRIVACY / {privacyVersion}</span>
      <h1>Privacy notice</h1>
      {!s.privacyApproved && (
        <p className="notice">
          Private preview. This notice will be finalised when service providers,
          storage locations and business contact details are confirmed.
        </p>
      )}
      <section>
        <h2>Information we collect</h2>
        <p>
          {s.companyName} collects your name, preferred reply method, contact
          details and inquiry to respond to project requests. Optional details
          such as location, area, budget, timeline and services are collected
          only when provided. You do not need to provide both an email address
          and a phone number.
        </p>
      </section>
      <section>
        <h2>Retention and deletion</h2>
        <p>
          Inquiries are retained for 12 months from submission, then deleted.
          This is our internal retention period. Contract records are managed
          separately. Archiving an inquiry does not extend its retention period.
        </p>
      </section>
      <section>
        <h2>Your choices</h2>
        <p>
          You may decline consent, in which case this online form cannot be
          submitted. Requests to access, correct or delete your information can
          be sent to our confirmed business contact.
        </p>
        {s.email && <a href={`mailto:${s.email}`}>{s.email}</a>}
      </section>
      <section>
        <h2>Storage and access</h2>
        <p className="pre-line">
          {s.privacyProcessors ||
            "This private preview stores and tests information locally. Hosting, database and email providers, processing locations, and any outsourced or international processing will be confirmed before launch."}
        </p>
        <p>
          Inquiry details are accessible to the owner account. Editor accounts
          do not have inquiry access by default. Email notifications contain
          only minimal information, such as a reference number, and do not
          include your message or contact details.
        </p>
      </section>
      <section>
        <h2>Security and automatic collection</h2>
        <p>
          We do not use advertising trackers. Abuse prevention identifiers are
          stored as hashes and deleted after their limiting period.
          Administrator authentication cookies are used only for sign-in.
        </p>
      </section>
    </article>
  );
}
