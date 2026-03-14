import Link from "next/link";
import { Bot, Building2, Sparkles } from "lucide-react";
import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/register-form";
import { getAuth } from "@/lib/auth";
import { redirectToOAuthCallbackIfPresent } from "@/lib/oauth-callback-redirect";
import { prisma } from "@/lib/prisma";
import { isTurnstileEnabled, turnstileSiteKey } from "@/lib/turnstile";

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
    <main className="flex min-h-[calc(100vh-80px)] flex-col items-center justify-center px-6 py-12 md:py-16">
      <div className="mx-auto grid w-full max-w-[1000px] gap-8 md:grid-cols-2">
        <section className="flex flex-col justify-center rounded-2xl border border-neutral-800 bg-neutral-900/30 p-8 backdrop-blur-sm lg:p-12">
          <p className="kicker">Create workspace</p>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-white md:text-4xl">Launch TrustLoop quickly</h1>
          <p className="mt-4 text-base leading-relaxed text-neutral-400">
            Provision a workspace, verify team identity, and start structured AI incident response in minutes.
          </p>

          <div className="mt-10 space-y-6">
            <div className="flex items-start gap-4 text-sm text-neutral-400">
              <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-950/30 text-cyan-500">
                <Building2 className="h-3 w-3" />
              </span>
              <span>Workspace-level controls, quotas, and team roles from day one</span>
            </div>
            <div className="flex items-start gap-4 text-sm text-neutral-400">
              <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-950/30 text-cyan-500">
                <Bot className="h-3 w-3" />
              </span>
              <span>BYOK routing for OpenAI, Gemini, and Anthropic workflows</span>
            </div>
            <div className="flex items-start gap-4 text-sm text-neutral-400">
              <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-950/30 text-cyan-500">
                <Sparkles className="h-3 w-3" />
              </span>
              <span>Executive trends, exports, and automation history included</span>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-8 lg:p-12 shadow-2xl">
          <p className="kicker mb-3">New workspace</p>
          <h2 className="mb-2 text-3xl font-bold text-white">Create TrustLoop account</h2>
          <p className="mb-8 text-sm text-neutral-400">
            Start with Google, GitHub, SAML SSO, or verify ownership with one-time code.
          </p>

          {inviteToken && !invite ? (
            <p className="mb-6 rounded-lg border border-red-900/50 bg-red-950/20 p-4 text-sm text-red-400">
              Invite link is invalid or expired. Request a new invite from your workspace owner.
            </p>
          ) : null}
          {errorMessage ? (
            <p className="mb-6 rounded-lg border border-red-900/50 bg-red-950/20 p-4 text-sm text-red-400">
              {errorMessage}
            </p>
          ) : null}

          <RegisterForm
            initialEmail={inviteEmail}
            initialWorkspaceName={invite?.workspace.name}
            inviteToken={invite?.token}
            initialInviteCode={params.invite_code}
            turnstileSiteKey={siteKey}
          />

          <p className="mt-8 text-sm text-neutral-400">
            Already have an account?{" "}
            <Link className="font-semibold text-white hover:underline" href="/login">
              Sign in
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
