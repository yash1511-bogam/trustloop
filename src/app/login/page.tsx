import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { GradientCard } from "@/components/gradient-card";
import { TrustLoopLogo } from "@/components/trustloop-logo";
import { getAuth } from "@/lib/auth";
import { redirectToOAuthCallbackIfPresent } from "@/lib/oauth-callback-redirect";
import { isTurnstileEnabled, turnstileSiteKey } from "@/lib/turnstile";

export const metadata: Metadata = {
  title: "Sign In",
  description:
    "Sign in to your TrustLoop workspace. Resume AI incident triage, approve customer-safe updates, and access executive reporting — right where you left off.",
  alternates: { canonical: "/login" },
};

const oauthErrorMessages: Record<string, string> = {
  oauth_not_configured: "OAuth is not configured yet. Ask your admin to set STYTCH_PUBLIC_TOKEN and redirect URLs.",
  oauth_invalid_callback: "OAuth callback was invalid. Start sign-in again.",
  oauth_email_missing: "Your OAuth account did not provide a verified email. Try another provider or use email OTP.",
  oauth_no_discovered_organization: "No organization was discovered for this account in Stytch. Try email OTP.",
  oauth_mfa_required: "Your Stytch organization requires additional verification. Complete MFA in Stytch and retry.",
  oauth_failed: "OAuth sign-in failed. Try again or use email OTP.",
  saml_not_configured: "SAML SSO is not configured for this environment. Ask your admin to enable Stytch B2B SSO.",
  saml_workspace_not_found: "Workspace not found. Enter the workspace slug configured by your TrustLoop admin.",
  saml_workspace_not_ready: "SAML is not fully configured for that workspace yet. Contact your workspace owner.",
  saml_plan_required: "SAML SSO is only available on the Enterprise plan for that workspace.",
  saml_callback_invalid: "SAML callback was invalid. Start sign-in again.",
  saml_email_missing: "SAML response did not include an email address. Contact your identity provider admin.",
  saml_invite_required: "Your SAML identity is valid, but your account is not provisioned in this workspace. Ask for an invite.",
  saml_auth_failed: "SAML sign-in failed. Try again or use email OTP.",
  security_verification_failed: "Security verification failed. Complete the Turnstile check and try again.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; token?: string; provider?: string; stytch_token_type?: string }>;
}) {
  const params = await redirectToOAuthCallbackIfPresent(searchParams);
  const auth = await getAuth();
  if (auth) redirect("/dashboard");
  const siteKey = isTurnstileEnabled() ? turnstileSiteKey() : null;

  const errorMessage = params.error ? oauthErrorMessages[params.error] : null;

  return (
    <main className="relative flex h-dvh flex-col overflow-hidden bg-[var(--color-void)]">
      <header className="sticky top-0 z-50 px-6 lg:hidden">
        <div className="flex justify-center" style={{ paddingTop: 8 }}>
          <div className="relative flex w-full max-w-[1160px] items-center justify-between px-4 py-3 md:px-6">
            <Link href="/"><TrustLoopLogo size={18} variant="full" /></Link>
          </div>
        </div>
      </header>

      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
        <div className="grid min-h-0 flex-1 lg:grid-cols-[1fr_1.1fr]">
          {/* Left — brand */}
          <GradientCard colors="bg-gradient-to-br from-[#0d0d0d] via-[#2d2d2d] to-[#1a1a1a]">
            <Link href="/"><TrustLoopLogo size={18} variant="full" /></Link>
          </GradientCard>

          {/* Right — form */}
        <div className="flex flex-col items-center justify-center overflow-y-auto px-6 py-8">
          <div className="w-full max-w-[380px]">
            <h1 className="font-[var(--font-heading)] text-[24px] font-bold text-[var(--color-title)]">
              Welcome back
            </h1>
            <p className="mt-1.5 text-[14px] text-[var(--color-subtext)]">
              Sign in to resume your incident workflow.
            </p>

            {errorMessage && (
              <p className="mt-4 rounded-lg border border-[rgba(232,66,66,0.2)] bg-[rgba(232,66,66,0.06)] px-3 py-2.5 text-[13px] text-[var(--color-danger)]">
                {errorMessage}
              </p>
            )}

            <div className="mt-6">
              <LoginForm turnstileSiteKey={siteKey} />
            </div>

            <div className="mt-6 flex gap-3 text-[13px] text-[var(--color-ghost)]">
              <Link className="transition-colors hover:text-[var(--color-signal)]" href="/forgot-access">Forgot access?</Link>
              <span className="text-[var(--color-rim)]">·</span>
              <Link className="transition-colors hover:text-[var(--color-signal)]" href="/register">Create workspace</Link>
            </div>
          </div>
        </div>
        </div>
      </div>
    </main>
  );
}
