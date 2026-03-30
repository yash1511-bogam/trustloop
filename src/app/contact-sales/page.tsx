"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react";
import { Loader2, CheckCircle2, AlertCircle } from "@/components/icon-compat";

export default function ContactSalesPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/contact-sales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, company, phone, message }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "Something went wrong. Please try again.");
      return;
    }

    setSuccess(true);
  }

  if (success) {
    return (
      <main className="min-h-dvh flex items-center justify-center px-4" style={{ background: "var(--color-void)" }}>
        <div className="max-w-md w-full text-center space-y-6">
          <div className="mx-auto w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "rgba(22,163,74,0.12)" }}>
            <CheckCircle2 className="h-6 w-6 text-[var(--color-resolve)]" />
          </div>
          <h1 className="text-2xl font-bold text-[var(--color-title)]">We&apos;ll be in touch</h1>
          <p className="text-sm text-[var(--color-subtext)] leading-relaxed">
            Thank you for your interest in TrustLoop Enterprise. Our team will contact you within 24–48 hours to discuss your requirements.
          </p>
          <Link href="/workspace/billing" className="btn btn-ghost inline-flex">
            Back to billing
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh flex items-center justify-center px-4 py-16" style={{ background: "var(--color-void)" }}>
      <div className="max-w-lg w-full">
        <div className="mb-10">
          <Link href="/" className="mb-6 inline-flex items-center gap-1.5 text-sm text-[var(--color-ghost)] transition-colors hover:text-[var(--color-body)]">
            <ArrowLeft size={14} weight="bold" />
            Back
          </Link>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] mb-3" style={{ color: "var(--color-signal)" }}>Enterprise</p>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--color-title)]">Talk to our team</h1>
          <p className="mt-3 text-sm text-[var(--color-subtext)] leading-relaxed">
            Tell us about your organization and we&apos;ll get back to you within 24–48 hours with a tailored plan.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 text-sm rounded-lg border flex items-center gap-2 bg-[rgba(232,66,66,0.08)] border-[rgba(232,66,66,0.24)] text-[var(--color-danger)]">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-xs font-medium uppercase tracking-wider text-[var(--color-ghost)]">
                Full name <span className="text-[var(--color-danger)]">*</span>
              </label>
              <input className="input w-full" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Jane Smith" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium uppercase tracking-wider text-[var(--color-ghost)]">
                Work email <span className="text-[var(--color-danger)]">*</span>
              </label>
              <input className="input w-full" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="jane@company.com" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-xs font-medium uppercase tracking-wider text-[var(--color-ghost)]">
                Company <span className="text-[var(--color-danger)]">*</span>
              </label>
              <input className="input w-full" value={company} onChange={(e) => setCompany(e.target.value)} required placeholder="Acme Corp" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium uppercase tracking-wider text-[var(--color-ghost)]">Phone</label>
              <input className="input w-full" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 (555) 000-0000" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-wider text-[var(--color-ghost)]">Message</label>
            <textarea
              className="input w-full min-h-[100px] resize-y"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tell us about your team size, compliance needs, or any specific requirements…"
            />
          </div>

          <button type="submit" disabled={loading} className="btn btn-primary w-full py-3">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit inquiry"}
          </button>

          <p className="text-xs text-center text-[var(--color-ghost)]">
            We&apos;ll respond within 24–48 hours. No spam, ever.
          </p>
        </form>
      </div>
    </main>
  );
}
