import Link from "next/link";
import {
  ShieldCheck,
  Sparkle,
  Warning,
} from "@phosphor-icons/react/dist/ssr";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { TrustLoopLogo } from "@/components/trustloop-logo";
import { getAuth } from "@/lib/auth";
import { redirectToOAuthCallbackIfPresent } from "@/lib/oauth-callback-redirect";
import { isTurnstileEnabled, turnstileSiteKey } from "@/lib/turnstile";

const featurePoints = [
  {
    icon: ShieldCheck,
    copy: "Passwordless access backed by one-time verification and scoped sessions.",
  },
  {
    icon: Sparkle,
    copy: "One workspace for intake, response, and executive visibility.",
  },
  {
    icon: Warning,
    copy: "Designed for the moments where the blast radius is still changing.",
  },
];

const oauthErrorMessages: Record<string, string> = {
  oauth_not_configured:
    "OAuth is not configured yet. Ask your admin to set STYTCH_PUBLIC_TOKEN and redirect URLs.",
  oauth_invalid_callback: "OAuth callback was invalid. Start sign-in again.",
  oauth_email_missing:
    "Your OAuth account did not provide a verified email. Try another provider or use email OTP.",
  oauth_no_discovered_organization:
    "No organization was discovered for this account in Stytch. Try email OTP.",
  oauth_mfa_required:
    "Your Stytch organization requires additional verification. Complete MFA in Stytch and retry.",
  oauth_failed: "OAuth sign-in failed. Try again or use email OTP.",
  saml_not_configured:
    "SAML SSO is not configured for this environment. Ask your admin to enable Stytch B2B SSO.",
  saml_workspace_not_found:
    "Workspace not found. Enter the workspace slug configured by your TrustLoop admin.",
  saml_workspace_not_ready:
    "SAML is not fully configured for that workspace yet. Contact your workspace owner.",
  saml_plan_required:
    "SAML SSO is only available on the Enterprise plan for that workspace.",
  saml_callback_invalid: "SAML callback was invalid. Start sign-in again.",
  saml_email_missing:
    "SAML response did not include an email address. Contact your identity provider admin.",
  saml_invite_required:
    "Your SAML identity is valid, but your account is not provisioned in this workspace. Ask for an invite.",
  saml_auth_failed: "SAML sign-in failed. Try again or use email OTP.",
  security_verification_failed:
    "Security verification failed. Complete the Turnstile check and try again.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; token?: string; provider?: string; stytch_token_type?: string }>;
}) {
  const params = await redirectToOAuthCallbackIfPresent(searchParams);
  const auth = await getAuth();
  if (auth) {
    redirect("/dashboard");
  }
  const siteKey = isTurnstileEnabled() ? turnstileSiteKey() : null;

  const errorMessage = params.error ? oauthErrorMessages[params.error] : null;

  return (
    <main className="auth-shell">
      <div className="auth-grid">
        <section className="auth-panel-muted surface">
          <TrustLoopLogo size={18} variant="full" />
          <p className="page-kicker mt-8">Welcome back</p>
          <h1 className="mt-4 font-[var(--font-heading)] text-[36px] font-bold text-[var(--color-title)]">
            Resume incident operations.
          </h1>
          <p className="mt-4 text-[16px] leading-7 text-[var(--color-subtext)]">
            Continue triage, customer communication, and executive reporting without reassembling context.
          </p>

          <div className="auth-feature-list">
            {featurePoints.map(({ icon: Icon, copy }) => (
              <div className="auth-feature-item" key={copy}>
                <Icon color="var(--color-subtext)" size={18} weight="duotone" />
                <span>{copy}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="auth-panel surface">
          <p className="page-kicker">Sign in</p>
          <h2 className="mt-3 font-[var(--font-heading)] text-[32px] font-bold text-[var(--color-title)]">
            Access your workspace
          </h2>
          <p className="mt-3 text-[14px] leading-6 text-[var(--color-subtext)]">
            Continue with Google, GitHub, SAML SSO, or one-time code verification.
          </p>

          {errorMessage ? (
            <p className="mt-6 rounded-[var(--radius-sm)] border border-[rgba(232,66,66,0.24)] bg-[rgba(232,66,66,0.08)] p-4 text-sm text-[var(--color-danger)]">
              {errorMessage}
            </p>
          ) : null}

          <div className="mt-8">
            <LoginForm turnstileSiteKey={siteKey} />
          </div>

          <div className="mt-8 grid gap-2 text-sm text-[var(--color-subtext)]">
            <p>
              Lost access?{" "}
              <Link className="text-[var(--color-title)] underline decoration-[var(--color-rim)] underline-offset-4" href="/forgot-access">
                Recover account
              </Link>
            </p>
            <p>
              Need a workspace?{" "}
              <Link className="text-[var(--color-title)] underline decoration-[var(--color-rim)] underline-offset-4" href="/register">
                Create one
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
