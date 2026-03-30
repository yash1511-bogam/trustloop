"use client";

import { useState } from "react";
import Link from "next/link";
import { TrustLoopLogo } from "@/components/trustloop-logo";

export default function EarlyAccessPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/early-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, companyName: companyName || undefined }),
      });
      const data = (await res.json().catch(() => null)) as { message?: string; error?: string } | null;
      if (!res.ok) {
        setError(data?.error ?? "Something went wrong.");
      } else {
        setMessage(data?.message ?? "You're on the list!");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-[var(--color-void)] px-6">
      <header className="fixed top-0 left-0 right-0 z-50 px-6">
        <div className="flex justify-center" style={{ paddingTop: 8 }}>
          <div className="relative flex w-full max-w-[1160px] items-center justify-between px-4 py-3 md:px-6">
            <Link href="/"><TrustLoopLogo size={18} variant="full" /></Link>
          </div>
        </div>
      </header>
      <div className="w-full max-w-[400px]">
        <Link href="/" className="mb-8 inline-block text-sm text-[var(--color-ghost)] hover:text-[var(--color-body)] transition-colors">
          ← Back to home
        </Link>

        <h1 className="font-[var(--font-heading)] text-[28px] font-bold text-[var(--color-title)]">
          Sign up for early access
        </h1>
        <p className="mt-2 text-sm text-[var(--color-subtext)]">
          Join the waitlist and we&apos;ll send you an invite when your spot is ready.
        </p>

        {message ? (
          <div className="mt-6 rounded-lg border border-[rgba(22,163,74,0.24)] bg-[rgba(22,163,74,0.08)] px-4 py-3 text-sm text-[var(--color-resolve)]">
            {message}
          </div>
        ) : (
          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="sr-only" htmlFor="ea-name">Full name</label>
              <input
                id="ea-name"
                className="input"
                placeholder="Full name *"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="sr-only" htmlFor="ea-email">Email</label>
              <input
                id="ea-email"
                className="input"
                type="email"
                placeholder="Work email *"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="sr-only" htmlFor="ea-company">Company</label>
              <input
                id="ea-company"
                className="input"
                placeholder="Company (optional)"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              />
            </div>
            <button className="btn btn-primary w-full" disabled={submitting} type="submit">
              {submitting ? "Submitting..." : "Sign up for early access"}
            </button>
          </form>
        )}

        {error && (
          <p className="mt-4 rounded-lg border border-[rgba(232,66,66,0.2)] bg-[rgba(232,66,66,0.06)] px-3 py-2.5 text-sm text-[var(--color-danger)]">
            {error}
          </p>
        )}

        <p className="mt-6 text-[13px] text-[var(--color-ghost)]">
          Already have an invite?{" "}
          <Link className="text-[var(--color-title)] underline decoration-[var(--color-rim)] underline-offset-4 hover:text-[var(--color-signal)]" href="/register">
            Create workspace
          </Link>
        </p>
      </div>
    </main>
  );
}
