import Link from "next/link";
import { Bot, Building2, Sparkles } from "lucide-react";
import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/register-form";
import { getAuth } from "@/lib/auth";

export default async function RegisterPage() {
  const auth = await getAuth();
  if (auth) {
    redirect("/dashboard");
  }

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
            Start with your work email and verify ownership with a one-time code.
          </p>

          <RegisterForm />

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
