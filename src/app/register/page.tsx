import Link from "next/link";
import { Bot, Building2, Sparkles } from "lucide-react";
import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/register-form";
import { getAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const oauthErrorMessages: Record<string, string> = {
  oauth_not_configured:
    "OAuth is not configured yet. Ask your admin to set STYTCH_PUBLIC_TOKEN and redirect URLs.",
  oauth_email_missing:
    "Your OAuth account did not provide a verified email. Use OTP registration instead.",
  oauth_no_workspace_account:
    "No existing workspace account matched that OAuth identity. Continue creating a workspace below.",
  invite_invalid: "Invite is invalid or expired.",
  invite_email_mismatch: "Invite email does not match the OAuth account.",
  oauth_failed: "OAuth registration failed. Try again or use email OTP.",
};

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string; email?: string; error?: string }>;
}) {
  const auth = await getAuth();
  if (auth) {
    redirect("/dashboard");
  }

  const params = await searchParams;
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
    <main className="container-shell fade-in py-10">
      <div className="mx-auto grid max-w-5xl gap-5 md:grid-cols-[0.92fr_1.08fr]">
        <section className="surface p-6 md:p-8">
          <p className="kicker">Create workspace</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">Launch TrustLoop in minutes</h1>
          <p className="mt-2 text-sm text-slate-700">
            Set up your incident workspace, verify your work email with Stytch OTP, and start capturing AI incidents immediately.
          </p>

          <div className="mt-6 space-y-3">
            <div className="flex items-start gap-2 text-sm text-slate-700">
              <Building2 className="mt-0.5 h-4 w-4 text-cyan-700" />
              Workspace-level controls and quotas from day one
            </div>
            <div className="flex items-start gap-2 text-sm text-slate-700">
              <Bot className="mt-0.5 h-4 w-4 text-cyan-700" />
              BYOK for OpenAI, Gemini, and Anthropic workflows
            </div>
            <div className="flex items-start gap-2 text-sm text-slate-700">
              <Sparkles className="mt-0.5 h-4 w-4 text-cyan-700" />
              Executive analytics and trend read models included
            </div>
          </div>
        </section>

        <section className="surface p-7">
          <p className="kicker mb-2">New workspace</p>
          <h2 className="mb-1 text-3xl font-semibold">Create TrustLoop account</h2>
          <p className="mb-6 text-sm text-slate-600">
            Start with Google/GitHub OAuth or verify ownership with a one-time code.
          </p>

          {inviteToken && !invite ? (
            <p className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              Invite link is invalid or expired. Request a new invite from your workspace owner.
            </p>
          ) : null}
          {errorMessage ? (
            <p className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {errorMessage}
            </p>
          ) : null}

          <RegisterForm
            initialEmail={inviteEmail}
            initialWorkspaceName={invite?.workspace.name}
            inviteToken={invite?.token}
          />

          <p className="mt-5 text-sm text-slate-600">
            Already have an account?{" "}
            <Link className="font-semibold text-cyan-700 underline" href="/login">
              Sign in
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
