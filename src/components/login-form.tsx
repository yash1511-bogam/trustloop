"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useCleanUrl } from "@/hooks/use-clean-url";
import { OAuthButtons } from "@/components/oauth-buttons";
import { SamlSsoForm } from "@/components/saml-sso-form";
import { useOtpResend } from "@/components/use-otp-resend";
import {
  TurnstileWidget,
  type TurnstileWidgetHandle,
} from "@/components/turnstile-widget";

type LoginFormProps = {
  turnstileSiteKey?: string | null;
};

export function LoginForm({ turnstileSiteKey }: LoginFormProps) {
  useCleanUrl(["error", "token", "provider", "stytch_token_type"]);
  const router = useRouter();
  const turnstileRef = useRef<TurnstileWidgetHandle | null>(null);
  const [email, setEmail] = useState("");
  const [methodId, setMethodId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const requiresTurnstile = Boolean(turnstileSiteKey);
  const emailRef = useRef(email);
  useEffect(() => { emailRef.current = email; }, [email]);

  const resendFn = useCallback(async () => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: emailRef.current }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    setMethodId(data.methodId);
    setMessage("Verification code resent.");
    return true;
  }, []);
  const otpResend = useOtpResend(resendFn);

  async function startChallenge(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (requiresTurnstile && !turnstileToken) {
      setError("Complete the security check before continuing.");
      return;
    }
    setError(null);
    setMessage(null);
    setSubmitting(true);

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, turnstileToken }),
    });

    setSubmitting(false);
    turnstileRef.current?.reset();

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

    const payload = (await response.json().catch(() => null)) as
      | { redirectTo?: string }
      | null;
    router.push(payload?.redirectTo ?? "/dashboard");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <OAuthButtons
        mode="login"
        turnstileToken={turnstileToken}
        disabled={submitting || (requiresTurnstile && !turnstileToken)}
      />
      <SamlSsoForm
        disabled={submitting || (requiresTurnstile && !turnstileToken)}
        mode="login"
        turnstileToken={turnstileToken}
      />

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

        <TurnstileWidget
          ref={turnstileRef}
          siteKey={turnstileSiteKey}
          onTokenChange={setTurnstileToken}
        />

        <button
          className="btn btn-primary w-full"
          disabled={submitting || (requiresTurnstile && !turnstileToken)}
          type="submit"
        >
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
          <button className="btn btn-ghost w-full text-sm" disabled={!otpResend.canResend} onClick={otpResend.resend} type="button">
            {otpResend.label}
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
