import Link from "next/link";
import {
  Buildings,
  Robot,
  Sparkle,
} from "@phosphor-icons/react/dist/ssr";
import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/register-form";
import { TrustLoopLogo } from "@/components/trustloop-logo";
import { getAuth } from "@/lib/auth";
import { redirectToOAuthCallbackIfPresent } from "@/lib/oauth-callback-redirect";
import { prisma } from "@/lib/prisma";
import { isTurnstileEnabled, turnstileSiteKey } from "@/lib/turnstile";

const featurePoints = [
  {
    icon: Buildings,
    copy: "Workspace-level controls, quotas, and team roles from day one.",
  },
  {
    icon: Robot,
    copy: "Bring your own provider keys and route workflows with precision.",
  },
  {
    icon: Sparkle,
    copy: "Executive trends, exports, and automation history built into the core product.",
  },
];

const oauthErrorMessages: Record<string, string> = {
  oauth_not_configured:
    "OAuth is not configured yet. Ask your admin to set STYTCH_PUBLIC_TOKEN and redirect URLs.",
  oauth_invalid_callback: "OAuth callback was invalid. Start sign-up again.",
  oauth_email_missing:
    "Your OAuth account did not provide a verified email. Use OTP registration instead.",
  oauth_no_workspace_account:
    "No existing workspace account matched that OAuth identity. Continue creating a workspace below.",
  oauth_no_discovered_organization:
    "No organization was discovered for this account in Stytch. Continue with OTP registration.",
  oauth_mfa_required:
    "Your Stytch organization requires additional verification. Complete MFA in Stytch and retry.",
  invite_invalid: "Invite is invalid or expired.",
  invite_email_mismatch: "Invite email does not match the OAuth account.",
  oauth_failed: "OAuth registration failed. Try again or use email OTP.",
  company_name_taken:
    "A company with this name is already registered. Please choose a different company name.",
  invite_code_required: "An invite code is required to register. Request early access first.",
  invite_code_invalid: "Invalid or already used invite code.",
  saml_not_configured:
    "SAML SSO is not configured for this environment. Ask your admin to enable Stytch B2B SSO.",
  saml_workspace_not_found:
    "Workspace not found. Enter the workspace slug configured by your TrustLoop admin.",
  saml_workspace_not_ready:
    "SAML is not fully configured for that workspace yet. Contact your workspace owner.",
  saml_plan_required:
    "SAML SSO is only available on the Enterprise plan for that workspace.",
  saml_callback_invalid: "SAML callback was invalid. Start sign-up again.",
  saml_email_missing:
    "SAML response did not include an email address. Contact your identity provider admin.",
  saml_invite_required:
    "Your SAML identity is valid, but no active invite was found for this workspace.",
  saml_auth_failed: "SAML sign-up failed. Try again or use email OTP.",
  security_verification_failed:
    "Security verification failed. Complete the Turnstile check and try again.",
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
  }>;
}) {
  const params = await redirectToOAuthCallbackIfPresent(searchParams);
  const auth = await getAuth();
  if (auth) {
    redirect("/dashboard");
  }
  const siteKey = isTurnstileEnabled() ? turnstileSiteKey() : null;

  const inviteToken = params.invite;
  const errorMessage = params.error ? oauthErrorMessages[params.error] : null;
  const invite =
    inviteToken
      ? await prisma.workspaceInvite.findFirst({
          where: {
            token: inviteToken,
            usedAt: null,
            expiresAt: { gt: new Date() },
          },
          include: {
            workspace: {
              select: {
                name: true,
              },
            },
          },
        })
      : null;

  const inviteEmail = invite?.email ?? params.email ?? undefined;

  return (
    <main className="auth-shell">
      <div className="auth-grid">
        <section className="auth-panel-muted surface dot-grid-band">
          <TrustLoopLogo size={18} variant="full" />
          <p className="page-kicker mt-8">Create workspace</p>
          <h1 className="mt-4 font-[var(--font-heading)] text-[36px] font-bold text-[var(--color-title)]">
            Launch TrustLoop quickly.
          </h1>
          <p className="mt-4 text-[16px] leading-7 text-[var(--color-subtext)]">
            Provision a workspace, verify team identity, and start structured AI incident response in minutes.
          </p>

          <div className="auth-feature-list" role="list">
            {featurePoints.map(({ icon: Icon, copy }) => (
              <div className="auth-feature-item" key={copy} role="listitem">
                <Icon color="var(--color-subtext)" size={18} weight="duotone" />
                <span>{copy}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="auth-panel surface">
          <p className="page-kicker">New workspace</p>
          <h2 className="mt-3 font-[var(--font-heading)] text-[32px] font-bold text-[var(--color-title)]">
            Create your account
          </h2>
          <p className="mt-3 text-[14px] leading-6 text-[var(--color-subtext)]">
            Start with Google, GitHub, SAML SSO, or verify ownership with one-time code.
          </p>

          {inviteToken && !invite ? (
            <p className="mt-6 rounded-[var(--radius-sm)] border border-[rgba(232,66,66,0.24)] bg-[rgba(232,66,66,0.08)] p-4 text-sm text-[var(--color-danger)]">
              Invite link is invalid or expired. Request a new invite from your workspace owner.
            </p>
          ) : null}
          {errorMessage ? (
            <p className="mt-6 rounded-[var(--radius-sm)] border border-[rgba(232,66,66,0.24)] bg-[rgba(232,66,66,0.08)] p-4 text-sm text-[var(--color-danger)]">
              {errorMessage}
            </p>
          ) : null}

          <div className="mt-8">
            <RegisterForm
              initialEmail={inviteEmail}
              initialWorkspaceName={invite?.workspace.name}
              initialInviteCode={params.invite_code}
              inviteToken={invite?.token}
              turnstileSiteKey={siteKey}
            />
          </div>

          <p className="mt-8 text-sm text-[var(--color-subtext)]">
            Already have an account?{" "}
            <Link className="text-[var(--color-title)] underline decoration-[var(--color-rim)] underline-offset-4" href="/login">
              Sign in
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
