"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useCleanUrl } from "@/hooks/use-clean-url";
import { OAuthButtons } from "@/components/oauth-buttons";
import { SamlSsoForm } from "@/components/saml-sso-form";
import {
  OTP_RESEND_COOLDOWN_SECONDS,
  useOtpResend,
} from "@/components/use-otp-resend";
import {
  TurnstileWidget,
  type TurnstileWidgetHandle,
} from "@/components/turnstile-widget";

type Props = {
  initialWorkspaceName?: string;
  initialEmail?: string;
  initialInviteCode?: string;
  inviteToken?: string;
  turnstileSiteKey?: string | null;
};

export function RegisterForm({
  initialWorkspaceName,
  initialEmail,
  initialInviteCode,
  inviteToken,
  turnstileSiteKey,
}: Props) {
  useCleanUrl(["error", "email", "token", "provider", "stytch_token_type", "invite_code"]);
  const router = useRouter();
  const turnstileRef = useRef<TurnstileWidgetHandle | null>(null);
  const [workspaceName, setWorkspaceName] = useState(initialWorkspaceName ?? "");
  const [name, setName] = useState("");
  const [email, setEmail] = useState(initialEmail ?? "");
  const [methodId, setMethodId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [inviteCode, setInviteCode] = useState(initialInviteCode ?? "");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const requiresTurnstile = Boolean(turnstileSiteKey);
  const formDataRef = useRef({ workspaceName, name, email, inviteToken, inviteCode });
  useEffect(() => { formDataRef.current = { workspaceName, name, email, inviteToken, inviteCode }; }, [workspaceName, name, email, inviteToken, inviteCode]);

  const resendFn = useCallback(async () => {
    const d = formDataRef.current;
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workspaceName: d.workspaceName,
        name: d.name,
        email: d.email,
        inviteToken: d.inviteToken ?? undefined,
        inviteCode: d.inviteCode || undefined,
      }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setError(data?.error ?? "Unable to resend verification code.");
      return false;
    }
    setMethodId(data.methodId);
    setError(null);
    setMessage(data.message ?? "Verification code resent.");
    return data.cooldownSeconds ?? OTP_RESEND_COOLDOWN_SECONDS;
  }, []);
  const otpResend = useOtpResend(resendFn);

  async function startRegistration(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (requiresTurnstile && !turnstileToken) {
      setError("Complete the security check before continuing.");
      return;
    }
    setError(null);
    setMessage(null);
    setSubmitting(true);

    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workspaceName,
        name,
        email,
        inviteToken: inviteToken ?? undefined,
        inviteCode: inviteCode || undefined,
        turnstileToken,
      }),
    });

    setSubmitting(false);
    turnstileRef.current?.reset();

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      setError(payload?.error ?? "Unable to start registration.");
      return;
    }

    const payload = (await response.json()) as {
      methodId: string;
      message?: string;
      cooldownSeconds?: number;
    };

    setMethodId(payload.methodId);
    otpResend.activate(payload.cooldownSeconds ?? OTP_RESEND_COOLDOWN_SECONDS);
    setMessage(payload.message ?? "Verification code sent.");
  }

  async function verifyRegistration(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!methodId) {
      setError("Start registration first.");
      return;
    }

    setError(null);
    setMessage(null);
    setSubmitting(true);

    const response = await fetch("/api/auth/register/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ methodId, code }),
    });

    setSubmitting(false);

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      setError(payload?.error ?? "Unable to verify registration.");
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
        mode="register"
        workspaceName={workspaceName}
        inviteToken={inviteToken}
        inviteCode={inviteCode || undefined}
        turnstileToken={turnstileToken}
        disabled={submitting || (requiresTurnstile && !turnstileToken)}
      />
      <SamlSsoForm
        disabled={submitting || (requiresTurnstile && !turnstileToken)}
        mode="register"
        turnstileToken={turnstileToken}
      />

      <div className="flex items-center gap-2 text-xs text-[var(--color-ghost)]">
        <div className="h-px flex-1 bg-[var(--color-rim)]" />
        <span>or use email OTP</span>
        <div className="h-px flex-1 bg-[var(--color-rim)]" />
      </div>

      <form className="space-y-4" onSubmit={startRegistration}>
        <div>
          <label className="sr-only" htmlFor="workspace-name">
            Company name
          </label>
          <input
            id="workspace-name"
            className="input"
            placeholder="Company name"
            value={workspaceName}
            onChange={(event) => setWorkspaceName(event.target.value)}
            disabled={Boolean(inviteToken)}
            required
          />
        </div>

        <div>
          <label className="sr-only" htmlFor="name">
            Your name
          </label>
          <input
            id="name"
            className="input"
            placeholder="Your name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
        </div>

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
            disabled={Boolean(initialEmail)}
            required
          />
        </div>

        <div>
          <label className="sr-only" htmlFor="invite-code">
            Invite code
          </label>
          <input
            id="invite-code"
            className="input"
            placeholder="Invite code"
            value={inviteCode}
            onChange={(event) => setInviteCode(event.target.value)}
            disabled={Boolean(inviteToken)}
            required={!inviteToken}
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
        <form className="space-y-4 mt-6" onSubmit={verifyRegistration}>
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
            {submitting ? "Verifying..." : "Verify and create workspace"}
          </button>
          <button className="btn btn-ghost w-full text-sm" disabled={!otpResend.canResend} onClick={otpResend.resend} type="button">
            {otpResend.label}
          </button>
        </form>
      ) : null}

      {message ? (
        <p className="rounded-[var(--radius-sm)] border border-[rgba(22,163,74,0.24)] bg-[rgba(22,163,74,0.08)] p-3 text-sm text-[var(--color-resolve)]">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-[var(--radius-sm)] border border-[rgba(232,66,66,0.24)] bg-[rgba(232,66,66,0.08)] p-3 text-sm text-[var(--color-danger)]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
