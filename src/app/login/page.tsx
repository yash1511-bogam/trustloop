import Link from "next/link";
import { ArrowRight, ShieldCheck, Sparkles } from "lucide-react";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { getAuth } from "@/lib/auth";

const oauthErrorMessages: Record<string, string> = {
  oauth_not_configured:
    "OAuth is not configured yet. Ask your admin to set STYTCH_PUBLIC_TOKEN and redirect URLs.",
  oauth_invalid_callback: "OAuth callback was invalid. Start sign-in again.",
  oauth_failed: "OAuth sign-in failed. Try again or use email OTP.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const auth = await getAuth();
  if (auth) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const errorMessage = params.error ? oauthErrorMessages[params.error] : null;

  return (
    <main className="container-shell fade-in py-12 md:py-14">
      <div className="mx-auto grid max-w-6xl gap-7 md:grid-cols-[0.94fr_1.06fr]">
        <section className="surface p-8 md:p-9">
          <p className="kicker">Welcome back</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">Resume incident operations</h1>
          <p className="mt-2 text-sm text-slate-700">
            Sign in with your work email and continue triage, communication, and executive reporting.
          </p>

          <div className="mt-6 space-y-3">
            {[
              "Secure OTP sign-in powered by Stytch",
              "Workspace-scoped role and quota enforcement",
              "No shared passwords or reset tickets",
            ].map((item) => (
              <div className="flex items-start gap-2 text-sm text-slate-700" key={item}>
                <ShieldCheck className="mt-0.5 h-4 w-4 text-cyan-700" />
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="surface p-8">
          <p className="kicker mb-2">Sign in</p>
          <h2 className="mb-1 text-3xl font-semibold">Access your workspace</h2>
          <p className="mb-6 text-sm text-slate-600">
            Continue with Google, GitHub, or one-time code verification.
          </p>

          {errorMessage ? (
            <p className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {errorMessage}
            </p>
          ) : null}

          <LoginForm />

          <p className="mt-5 text-sm text-slate-600">
            Lost access?{" "}
            <Link className="font-semibold text-cyan-700 underline" href="/forgot-access">
              Recover account
            </Link>
          </p>

          <p className="mt-2 text-sm text-slate-600">
            Need a workspace?{" "}
            <Link className="font-semibold text-cyan-700 underline" href="/register">
              Create one
            </Link>
          </p>
        </section>
      </div>

      <div className="mx-auto mt-8 max-w-6xl panel-card p-5 text-xs text-slate-600">
        <p className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-cyan-700" />
          After sign-in, open dashboard workflows, incident queue filters, and automation settings.
          <ArrowRight className="h-3.5 w-3.5" />
        </p>
      </div>
    </main>
  );
}
