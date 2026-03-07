import Link from "next/link";
import { ArrowRight, ShieldCheck, Sparkles } from "lucide-react";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { getAuth } from "@/lib/auth";

export default async function LoginPage() {
  const auth = await getAuth();
  if (auth) {
    redirect("/dashboard");
  }

  return (
    <main className="container-shell fade-in py-10">
      <div className="mx-auto grid max-w-5xl gap-5 md:grid-cols-[0.92fr_1.08fr]">
        <section className="surface p-6 md:p-8">
          <p className="kicker">Welcome back</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">Continue incident operations</h1>
          <p className="mt-2 text-sm text-slate-700">
            Sign in with your work email. Verification is handled through Stytch one-time passcodes.
          </p>

          <div className="mt-6 space-y-3">
            {[
              "Secure email OTP login",
              "Workspace-scoped access control",
              "No password reset workflows",
            ].map((item) => (
              <div className="flex items-start gap-2 text-sm text-slate-700" key={item}>
                <ShieldCheck className="mt-0.5 h-4 w-4 text-cyan-700" />
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="surface p-7">
          <p className="kicker mb-2">Sign in</p>
          <h2 className="mb-1 text-3xl font-semibold">Access your workspace</h2>
          <p className="mb-6 text-sm text-slate-600">
            Enter your work email and verify with a one-time code from Stytch.
          </p>

          <LoginForm />

          <p className="mt-5 text-sm text-slate-600">
            Need a workspace?{" "}
            <Link className="font-semibold text-cyan-700 underline" href="/register">
              Create one
            </Link>
          </p>
        </section>
      </div>

      <div className="mx-auto mt-6 max-w-5xl rounded-2xl border border-slate-200/80 bg-white/80 p-4 text-xs text-slate-600">
        <p className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-cyan-700" />
          Looking for onboarding docs and architecture details? Start from the dashboard after login.
          <ArrowRight className="h-3.5 w-3.5" />
        </p>
      </div>
    </main>
  );
}
