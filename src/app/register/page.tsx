import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/register-form";
import { GradientCard } from "@/components/gradient-card";
import { TrustLoopLogo } from "@/components/trustloop-logo";
import { getAuth } from "@/lib/auth";
import { redirectToOAuthCallbackIfPresent } from "@/lib/oauth-callback-redirect";
import { prisma } from "@/lib/prisma";
import { isTurnstileEnabled, turnstileSiteKey } from "@/lib/turnstile";

export const metadata: Metadata = {
  title: "Create Your Workspace",
  description:
    "Set up your TrustLoop workspace in under two minutes. Detect AI incidents from Datadog, PagerDuty, and Sentry — triage with AI, publish customer-safe updates, and keep leadership informed.",
  alternates: { canonical: "/register" },
};

const oauthErrorMessages: Record<string, string> = {
  oauth_not_configured: "OAuth is not configured yet. Ask your admin to set STYTCH_PUBLIC_TOKEN and redirect URLs.",
  oauth_invalid_callback: "OAuth callback was invalid. Start sign-up again.",
  oauth_email_missing: "Your OAuth account did not provide a verified email. Use OTP registration instead.",
  oauth_no_workspace_account: "No existing workspace account matched that OAuth identity. Continue creating a workspace below.",
  oauth_no_discovered_organization: "No organization was discovered for this account in Stytch. Continue with OTP registration.",
  oauth_mfa_required: "Your Stytch organization requires additional verification. Complete MFA in Stytch and retry.",
  oauth_failed: "OAuth registration failed. Try again or use email OTP.",
  company_name_taken: "A company with this name is already registered. Please choose a different company name.",
  invite_code_required: "An invite code is required to register. Request early access first.",
  invite_code_invalid: "Invalid or already used invite code.",
  saml_not_configured: "SAML SSO is not configured for this environment. Ask your admin to enable Stytch B2B SSO.",
  saml_workspace_not_found: "Workspace not found. Enter the workspace slug configured by your TrustLoop admin.",
  saml_workspace_not_ready: "SAML is not fully configured for that workspace yet. Contact your workspace owner.",
  saml_plan_required: "SAML SSO is only available on the Enterprise plan for that workspace.",
  saml_callback_invalid: "SAML callback was invalid. Start sign-up again.",
  saml_email_missing: "SAML response did not include an email address. Contact your identity provider admin.",
  saml_invite_required: "Your SAML identity is valid, but no active invite was found for this workspace.",
  saml_auth_failed: "SAML sign-up failed. Try again or use email OTP.",
  security_verification_failed: "Security verification failed. Complete the Turnstile check and try again.",
};

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{
    invite?: string;
    email?: string;
    error?: string;
    token?: string;
    provider?: string;
    stytch_token_type?: string;
    invite_code?: string;
    plan?: string;
    interval?: string;
  }>;
}) {
  const params = await redirectToOAuthCallbackIfPresent(searchParams);
  const auth = await getAuth();
  if (auth) redirect("/dashboard");
  const siteKey = isTurnstileEnabled() ? turnstileSiteKey() : null;

  const inviteToken = params.invite;
  const errorMessage = params.error ? oauthErrorMessages[params.error] : null;
  const invite = inviteToken
    ? await prisma.workspaceInvite.findFirst({
        where: { token: inviteToken, usedAt: null, expiresAt: { gt: new Date() } },
        include: { workspace: { select: { name: true } } },
      })
    : null;
  const inviteEmail = invite?.email ?? params.email ?? undefined;

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
          <GradientCard gradient="linear-gradient(135deg, #060630, #6e2815, #4a6860, #2d5913, #011e06)" heading="Build trust with every incident." description="Set up your workspace in under two minutes. Detect AI failures, triage with AI, and publish customer-safe updates from one place.">
            <Link href="/"><TrustLoopLogo size={18} variant="full" /></Link>
          </GradientCard>

          {/* Right — form */}
        <div className="flex flex-col items-center overflow-y-auto px-6 py-8">
          <div className="w-full max-w-[380px]">
            <h1 className="font-[var(--font-heading)] text-[24px] font-bold text-[var(--color-title)]">
              Create your workspace
            </h1>
            <p className="mt-1.5 text-[14px] text-[var(--color-subtext)]">
              14-day free trial. No credit card required.
            </p>

            {inviteToken && !invite && (
              <p className="mt-4 rounded-lg border border-[rgba(232,66,66,0.2)] bg-[rgba(232,66,66,0.06)] px-3 py-2.5 text-[13px] text-[var(--color-danger)]">
                Invite link is invalid or expired.
              </p>
            )}
            {errorMessage && (
              <p className="mt-4 rounded-lg border border-[rgba(232,66,66,0.2)] bg-[rgba(232,66,66,0.06)] px-3 py-2.5 text-[13px] text-[var(--color-danger)]">
                {errorMessage}
              </p>
            )}

            <div className="mt-6">
              <RegisterForm
                initialEmail={inviteEmail}
                initialWorkspaceName={invite?.workspace.name}
                initialInviteCode={params.invite_code}
                inviteToken={invite?.token}
                turnstileSiteKey={siteKey}
                selectedPlan={params.plan}
                selectedInterval={params.interval}
              />
            </div>

            <p className="mt-6 text-[13px] text-[var(--color-ghost)]">
              Already have an account?{" "}
              <Link className="text-[var(--color-title)] underline decoration-[var(--color-rim)] underline-offset-4 transition-colors hover:text-[var(--color-signal)]" href="/login">
                Sign in
              </Link>
            </p>

            <p className="mt-8 text-[11px] text-[var(--color-ghost)]">
              By creating a workspace you agree to our{" "}
              <Link className="underline underline-offset-2 hover:text-[var(--color-subtext)]" href="/terms">Terms</Link>
              {" & "}
              <Link className="underline underline-offset-2 hover:text-[var(--color-subtext)]" href="/privacy">Privacy Policy</Link>.
            </p>
          </div>
        </div>
        </div>
      </div>
    </main>
  );
}
