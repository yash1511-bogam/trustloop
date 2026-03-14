import Link from "next/link";
import { ArrowRight, ShieldCheck, Sparkles } from "lucide-react";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { getAuth } from "@/lib/auth";
import { redirectToOAuthCallbackIfPresent } from "@/lib/oauth-callback-redirect";
import { isTurnstileEnabled, turnstileSiteKey } from "@/lib/turnstile";

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
    <main className="flex min-h-[calc(100vh-80px)] flex-col items-center justify-center px-6 py-12 md:py-16">
      <div className="mx-auto grid w-full max-w-[1000px] gap-8 md:grid-cols-2">
        <section className="flex flex-col justify-center rounded-2xl border border-neutral-800 bg-neutral-900/30 p-8 backdrop-blur-sm lg:p-12">
          <p className="kicker">Welcome back</p>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-white md:text-4xl">Resume incident operations</h1>
          <p className="mt-4 text-base leading-relaxed text-neutral-400">
            Sign in with your work email and continue triage, communication, and executive reporting.
          </p>

          <div className="mt-10 space-y-6">
            {[
              "Secure OTP sign-in powered by Stytch",
              "Workspace-scoped role and quota enforcement",
              "No shared passwords or reset tickets",
            ].map((item) => (
              <div className="flex items-start gap-4 text-sm text-neutral-400" key={item}>
                <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-950/30 text-cyan-500">
                  <ShieldCheck className="h-3 w-3" />
                </span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-8 lg:p-12 shadow-2xl">
          <p className="kicker mb-3">Sign in</p>
          <h2 className="mb-2 text-3xl font-bold text-white">Access your workspace</h2>
          <p className="mb-8 text-sm text-neutral-400">
            Continue with Google, GitHub, SAML SSO, or one-time code verification.
          </p>

          {errorMessage ? (
            <p className="mb-6 rounded-lg border border-red-900/50 bg-red-950/20 p-4 text-sm text-red-400">
              {errorMessage}
            </p>
          ) : null}

          <LoginForm turnstileSiteKey={siteKey} />

          <div className="mt-8 space-y-2">
            <p className="text-sm text-neutral-400">
              Lost access?{" "}
              <Link className="font-semibold text-white hover:underline" href="/forgot-access">
                Recover account
              </Link>
            </p>

            <p className="text-sm text-neutral-400">
              Need a workspace?{" "}
              <Link className="font-semibold text-white hover:underline" href="/register">
                Create one
              </Link>
            </p>
          </div>
        </section>
      </div>

      <div className="mx-auto mt-12 w-full max-w-[1000px] rounded-2xl border border-neutral-800 bg-neutral-900/50 p-6 text-xs text-neutral-400 backdrop-blur-sm">
        <p className="flex items-center gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-950/30 text-cyan-500">
            <Sparkles className="h-3.5 w-3.5" />
          </span>
          After sign-in, open dashboard workflows, incident queue filters, and automation settings.
          <ArrowRight className="h-3.5 w-3.5 ml-auto" />
        </p>
      </div>
    </main>
  );
}
