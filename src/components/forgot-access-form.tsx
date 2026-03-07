"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ForgotAccessForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [methodId, setMethodId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function requestRecovery(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setSubmitting(true);

    const response = await fetch("/api/auth/forgot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    setSubmitting(false);

    const payload = (await response.json().catch(() => null)) as
      | { methodId?: string | null; message?: string; error?: string }
      | null;

    if (!response.ok) {
      setError(payload?.error ?? "Unable to start account recovery.");
      return;
    }

    setMethodId(payload?.methodId ?? null);
    setMessage(payload?.message ?? "Recovery challenge started.");
  }

  async function verifyRecovery(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!methodId) {
      setError("Request a recovery code first.");
      return;
    }

    setError(null);
    setMessage(null);
    setSubmitting(true);

    const response = await fetch("/api/auth/login/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ methodId, code }),
    });

    setSubmitting(false);

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      setError(payload?.error ?? "Invalid or expired verification code.");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <form className="space-y-4" onSubmit={requestRecovery}>
        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="forgot-email">
            Work email
          </label>
          <input
            id="forgot-email"
            className="input"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>

        <button className="btn btn-primary w-full" disabled={submitting} type="submit">
          {submitting ? "Sending recovery code..." : "Send recovery code"}
        </button>
      </form>

      {methodId ? (
        <form className="space-y-4" onSubmit={verifyRecovery}>
          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="forgot-code">
              Verification code
            </label>
            <input
              id="forgot-code"
              className="input"
              inputMode="numeric"
              autoComplete="one-time-code"
              minLength={4}
              maxLength={12}
              value={code}
              onChange={(event) => setCode(event.target.value)}
              required
            />
          </div>

          <button className="btn btn-primary w-full" disabled={submitting} type="submit">
            {submitting ? "Verifying..." : "Verify and recover access"}
          </button>
        </form>
      ) : null}

      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </div>
  );
}
