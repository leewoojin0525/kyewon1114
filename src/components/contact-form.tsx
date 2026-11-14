"use client";
import Link from "next/link";
import { useRef, useState } from "react";
export function ContactForm({
  reference,
  email,
  enabled,
}: {
  reference: string;
  email: string;
  enabled: boolean;
}) {
  const started = useRef(Date.now()),
    submission = useRef(""),
    [method, setMethod] = useState("email"),
    [busy, setBusy] = useState(false),
    [fields, setFields] = useState<Record<string, string>>({}),
    [error, setError] = useState(""),
    [receipt, setReceipt] = useState("");
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setFields({});
    const form = e.currentTarget,
      data = Object.fromEntries(new FormData(form));
    submission.current ||= crypto.randomUUID();
    try {
      const r = await fetch("/api/wovn/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          replyMethod: method,
          reference,
          consent: data.consent === "on",
          submissionKey: submission.current,
          startedAt: started.current,
        }),
      });
      const result = await r.json();
      if (!r.ok) {
        const messages: Record<string, string> = {
          name: "Please enter a name between 2 and 50 characters.",
          contact:
            method === "email"
              ? "Please enter a valid email address."
              : "Please enter a valid phone number.",
          message: "Please enter between 10 and 3,000 characters.",
          consent: "Please read and agree to the privacy notice.",
        };
        const errors = Object.fromEntries(
          Object.keys(result.fields || {}).map((key) => [
            key,
            messages[key] || "Please check this field.",
          ]),
        );
        setFields(errors);
        setError(
          Object.keys(errors).length
            ? "Please check the highlighted fields."
            : r.status === 429
              ? "Too many requests. Please try again later or contact us by email."
              : r.status === 409
                ? "This submission has already been used. Please start a new inquiry."
                : "We could not save your inquiry. Please try again.",
        );
        setTimeout(() => {
          form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
        }, 50);
      } else setReceipt(result.receipt);
    } catch {
      setError(
        "We could not confirm your submission. Please retry this form; repeated submissions will not create duplicates.",
      );
    } finally {
      setBusy(false);
    }
  }
  function field(
    name: string,
    label: string,
    required = false,
    props: React.InputHTMLAttributes<HTMLInputElement> = {},
  ) {
    return (
      <label className="field">
        {label}
        {required && <span className="required"> *</span>}
        <input
          name={name}
          required={required}
          aria-invalid={!!fields[name]}
          aria-describedby={fields[name] ? `${name}-error` : undefined}
          {...props}
        />
        {fields[name] && (
          <span className="field-error" id={`${name}-error`}>
            {fields[name]}
          </span>
        )}
      </label>
    );
  }
  if (receipt)
    return (
      <div className="contact-success" role="status">
        <span className="eyebrow">THANK YOU / INQUIRY RECEIVED</span>
        <h2>
          Thank you for
          <br />
          getting in touch.
        </h2>
        <p>
          Your inquiry has been saved.
          <br />
          We will reply using your preferred contact method.
        </p>
        <p className="receipt">
          Reference <strong>{receipt}</strong>
        </p>
        <button
          className="text-link"
          onClick={() => {
            setReceipt("");
            submission.current = "";
            started.current = Date.now();
          }}
        >
          Start a new inquiry ↗
        </button>
      </div>
    );
  return (
    <form
      className="contact-form"
      method="post"
      action="/api/wovn/inquiry"
      onSubmit={submit}
      noValidate
    >
      <p className="form-note">
        * Required. Other details can be decided later.
      </p>
      {reference && <p className="notice">Project reference: {reference}</p>}
      <div className="form-grid">
        {field("name", "Name", true, {
          autoComplete: "name",
          maxLength: 50,
          placeholder: "Your name",
        })}
        <label className="field">
          Preferred reply method <span className="required">*</span>
          <select value={method} onChange={(e) => setMethod(e.target.value)}>
            <option value="email">Email</option>
            <option value="phone">Phone</option>
          </select>
        </label>
        <div className="full">
          {field(
            "contact",
            method === "email" ? "Email address" : "Phone number",
            true,
            {
              type: method === "email" ? "email" : "tel",
              autoComplete: method === "email" ? "email" : "tel",
              placeholder:
                method === "email" ? "name@example.com" : "010-0000-0000",
              maxLength: 254,
            },
          )}
        </div>
        <label className="field">
          Project type
          <select name="projectType" defaultValue="">
            <option value="">Please select</option>
            {[
              ["신축", "New build"],
              ["리모델링", "Renovation"],
              ["인테리어", "Interior design"],
              ["기타·상담", "Other / Consultation"],
            ].map(([v, label]) => (
              <option key={v} value={v}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Services
          <select name="service" defaultValue="">
            <option value="">Please select</option>
            {[
              ["디자인", "Design"],
              ["PM", "Project management"],
              ["디자인+PM", "Design + Project management"],
              ["상담 후 결정", "To be discussed"],
            ].map(([v, label]) => (
              <option key={v} value={v}>
                {label}
              </option>
            ))}
          </select>
        </label>
        {field("region", "Location", false, {
          placeholder: "City or district",
          maxLength: 120,
        })}
        {field("area", "Area", false, {
          placeholder: "e.g. 120 m² / To be decided",
          maxLength: 100,
        })}
        {field("budget", "Budget", false, {
          placeholder: "Approximate range / To be decided",
          maxLength: 150,
        })}
        {field("schedule", "Timeline", false, {
          placeholder: "Target dates / To be decided",
          maxLength: 150,
        })}
        <label className="field full">
          Tell us about your project <span className="required">*</span>
          <textarea
            name="message"
            rows={6}
            required
            maxLength={3000}
            placeholder="What kind of space do you have in mind? Tell us about the project and what you would like to explore together."
            aria-invalid={!!fields.message}
            aria-describedby={fields.message ? "message-error" : undefined}
          />
          {fields.message && (
            <span className="field-error" id="message-error">
              {fields.message}
            </span>
          )}
        </label>
      </div>
      <div className="honeypot" aria-hidden>
        <label>
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <label className="checkbox">
        <input
          name="consent"
          type="checkbox"
          required
          aria-invalid={!!fields.consent}
        />
        <span>
          <Link href="/privacy" target="_blank">
            Privacy notice
          </Link>
          : I have read and agree to the collection and use of my information.
          (Required)
          <small>
            Your name, preferred contact details and inquiry are used to respond
            to you and retained for 12 months.
          </small>
        </span>
      </label>
      {fields.consent && <p className="field-error">{fields.consent}</p>}
      {error && (
        <p className="form-error" role="alert">
          {error}
          {email && (
            <>
              {" "}
              <a href={`mailto:${email}`}>Contact us by email</a>
            </>
          )}
        </p>
      )}
      {!enabled && (
        <p className="notice">Online inquiries will be available soon.</p>
      )}
      <button
        className="submit-button"
        type="submit"
        disabled={busy || !enabled}
      >
        {busy ? "Saving your inquiry…" : "Send inquiry"}
        <span>↗</span>
      </button>
      <p className="caption">
        Submitting this form begins a conversation. It does not constitute a
        quote or contract.
      </p>
    </form>
  );
}
