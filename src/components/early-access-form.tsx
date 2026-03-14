"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import {
  OTP_RESEND_COOLDOWN_SECONDS,
  useOtpResend,
} from "@/components/use-otp-resend";

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
  const submittingRef = useRef(false);
  const formDataRef = useRef({ name, email, companyName });
  useEffect(() => { formDataRef.current = { name, email, companyName }; }, [name, email, companyName]);

  const resendFn = useCallback(async () => {
    const d = formDataRef.current;
    const res = await fetch("/api/early-access", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: d.name, email: d.email, companyName: d.companyName || undefined }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setError(data?.error ?? "Unable to send verification code.");
      return false;
    }
    setMethodId(data.methodId);
    setError(null);
    setMessage(data.message ?? "Verification code resent.");
    return data.cooldownSeconds ?? OTP_RESEND_COOLDOWN_SECONDS;
  }, []);
  const otpResend = useOtpResend(resendFn);

  async function requestAccess(e: React.FormEvent) {
    e.preventDefault();
    if (submittingRef.current) return;
    submittingRef.current = true;
    setError(null);
    setMessage(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/early-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, companyName: companyName || undefined }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "Something went wrong.");
        return;
      }
      setMethodId(data.methodId);
      otpResend.activate(data.cooldownSeconds ?? OTP_RESEND_COOLDOWN_SECONDS);
      setMessage(data.message);
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    if (!methodId || submittingRef.current) return;
    submittingRef.current = true;
    setError(null);
    setMessage(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/early-access/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ methodId, code }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "Verification failed.");
        return;
      }
      setVerified(true);
      setMessage(data.message);
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
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
          <button className="btn btn-ghost w-full text-sm" disabled={!otpResend.canResend} onClick={otpResend.resend} type="button">
            {otpResend.label}
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
