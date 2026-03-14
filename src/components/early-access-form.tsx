"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";

export function EarlyAccessForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [methodId, setMethodId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function requestAccess(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setSubmitting(true);

    const res = await fetch("/api/early-access", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, companyName: companyName || undefined }),
    });

    setSubmitting(false);
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setError(data?.error ?? "Something went wrong.");
      return;
    }
    setMethodId(data.methodId);
    setMessage(data.message);
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    if (!methodId) return;
    setError(null);
    setMessage(null);
    setSubmitting(true);

    const res = await fetch("/api/early-access/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ methodId, code }),
    });

    setSubmitting(false);
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setError(data?.error ?? "Verification failed.");
      return;
    }
    setVerified(true);
    setMessage(data.message);
  }

  if (verified) {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <CheckCircle2 className="h-10 w-10 text-emerald-500" />
        <p className="text-lg font-semibold text-white">You&apos;re on the list!</p>
        <p className="text-sm text-neutral-400">We&apos;ll send your invite code when your spot is ready.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {!methodId ? (
        <form className="space-y-3" onSubmit={requestAccess}>
          <input
            className="input"
            placeholder="Your name *"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <input
            className="input"
            type="email"
            placeholder="Work email *"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            className="input"
            placeholder="Company name (optional)"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
          />
          <button className="btn btn-primary w-full" disabled={submitting} type="submit">
            {submitting ? "Sending..." : "Sign up for early access"}
          </button>
        </form>
      ) : (
        <form className="space-y-3" onSubmit={verifyCode}>
          <p className="text-sm text-neutral-400">Enter the code sent to <span className="text-white font-medium">{email}</span></p>
          <input
            className="input text-center tracking-widest text-lg"
            placeholder="Verification code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            inputMode="numeric"
            autoComplete="one-time-code"
            minLength={4}
            maxLength={12}
            required
          />
          <button className="btn btn-primary w-full" disabled={submitting} type="submit">
            {submitting ? "Verifying..." : "Verify email"}
          </button>
        </form>
      )}

      {message && !verified ? (
        <p className="rounded-lg border border-emerald-900/50 bg-emerald-950/20 p-3 text-sm text-emerald-400">{message}</p>
      ) : null}
      {error ? (
        <p className="rounded-lg border border-red-900/50 bg-red-950/20 p-3 text-sm text-red-400">{error}</p>
      ) : null}
    </div>
  );
}
