"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { OAuthButtons } from "@/components/oauth-buttons";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [samlSlug, setSamlSlug] = useState("");
  const [methodId, setMethodId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function startChallenge(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setSubmitting(true);

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    setSubmitting(false);

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      setError(payload?.error ?? "Unable to start sign in.");
      return;
    }

    const payload = (await response.json()) as {
      methodId: string;
      message?: string;
    };

    setMethodId(payload.methodId);
    setMessage(payload.message ?? "Verification code sent.");
  }

  async function verifyChallenge(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!methodId) {
      setError("Start sign in first.");
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
      setError(payload?.error ?? "Unable to verify sign in.");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <OAuthButtons mode="login" disabled={submitting} />

      <form action="/api/auth/saml/start" className="space-y-3" method="GET">
        <div>
          <label className="sr-only" htmlFor="saml-slug">
            Workspace slug
          </label>
          <input
            id="saml-slug"
            className="input"
            name="slug"
            placeholder="Workspace slug for SAML SSO (e.g. acme-ai)"
            value={samlSlug}
            onChange={(event) => setSamlSlug(event.target.value.toLowerCase())}
            minLength={3}
            maxLength={60}
            pattern="^[a-z0-9-]+$"
          />
        </div>
        <button className="btn btn-ghost w-full" disabled={submitting || samlSlug.length < 3} type="submit">
          Continue with SAML SSO
        </button>
      </form>

      <div className="flex items-center gap-2 text-xs text-neutral-500">
        <div className="h-px flex-1 bg-neutral-900" />
        <span>or use email OTP</span>
        <div className="h-px flex-1 bg-neutral-900" />
      </div>

      <form className="space-y-4" onSubmit={startChallenge}>
        <div>
          <label className="sr-only" htmlFor="email">
            Work email
          </label>
          <input
            id="email"
            className="input"
            type="email"
            placeholder="Work email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>

        <button className="btn btn-primary w-full" disabled={submitting} type="submit">
          {submitting ? "Sending code..." : "Send verification code"}
        </button>
      </form>

      {methodId ? (
        <form className="space-y-4 mt-6" onSubmit={verifyChallenge}>
          <div>
            <label className="sr-only" htmlFor="code">
              Verification code
            </label>
            <input
              id="code"
              className="input text-center tracking-widest text-lg"
              placeholder="Verification code"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              inputMode="numeric"
              autoComplete="one-time-code"
              minLength={4}
              maxLength={12}
              required
            />
          </div>

          <button className="btn btn-primary w-full" disabled={submitting} type="submit">
            {submitting ? "Verifying..." : "Verify and sign in"}
          </button>
        </form>
      ) : null}

      {message ? (
        <p className="rounded-lg border border-emerald-900/50 bg-emerald-950/20 p-3 text-sm text-emerald-400">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-lg border border-red-900/50 bg-red-950/20 p-3 text-sm text-red-400">
          {error}
        </p>
      ) : null}
    </div>
  );
}
