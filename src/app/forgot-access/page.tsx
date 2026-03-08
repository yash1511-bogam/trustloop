import Link from "next/link";
import { LifeBuoy, ShieldCheck, Sparkles } from "lucide-react";
import { redirect } from "next/navigation";
import { ForgotAccessForm } from "@/components/forgot-access-form";
import { getAuth } from "@/lib/auth";

export default async function ForgotAccessPage() {
  const auth = await getAuth();
  if (auth) {
    redirect("/dashboard");
  }

  return (
    <main className="container-shell fade-in py-12 md:py-14">
      <div className="mx-auto grid max-w-6xl gap-7 md:grid-cols-[0.94fr_1.06fr]">
        <section className="surface p-8 md:p-9">
          <p className="kicker">Recover access</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">Restore workspace access safely</h1>
          <p className="mt-2 text-sm text-slate-700">
            Request a recovery OTP on your work email and continue with secure verification.
          </p>

          <div className="mt-6 space-y-3">
            <div className="flex items-start gap-2 text-sm text-slate-700">
              <ShieldCheck className="mt-0.5 h-4 w-4 text-cyan-700" />
              Security notification email whenever recovery starts
            </div>
            <div className="flex items-start gap-2 text-sm text-slate-700">
              <LifeBuoy className="mt-0.5 h-4 w-4 text-cyan-700" />
              Auto guidance with safe account recovery sequence
            </div>
            <div className="flex items-start gap-2 text-sm text-slate-700">
              <Sparkles className="mt-0.5 h-4 w-4 text-cyan-700" />
              Same passwordless flow as standard workspace login
            </div>
          </div>
        </section>

        <section className="surface p-8">
          <p className="kicker mb-2">Account recovery</p>
          <h2 className="mb-1 text-3xl font-semibold">Reset your session</h2>
          <p className="mb-6 text-sm text-slate-600">
            Enter your work email to get a recovery code and verify identity.
          </p>

          <ForgotAccessForm />

          <p className="mt-5 text-sm text-slate-600">
            Back to{" "}
            <Link className="font-semibold text-cyan-700 underline" href="/login">
              sign in
            </Link>
            .
          </p>
        </section>
      </div>
    </main>
  );
}
