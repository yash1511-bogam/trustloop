import Link from "next/link";
import { LifeBuoy, ShieldCheck, Sparkles } from "lucide-react";
import { redirect } from "next/navigation";
import { ForgotAccessForm } from "@/components/forgot-access-form";
import { getAuth } from "@/lib/auth";
import { isTurnstileEnabled, turnstileSiteKey } from "@/lib/turnstile";

export default async function ForgotAccessPage() {
  const auth = await getAuth();
  if (auth) {
    redirect("/dashboard");
  }
  const siteKey = isTurnstileEnabled() ? turnstileSiteKey() : null;

  return (
    <main className="container-shell fade-in py-12 md:py-16">
      <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-[0.94fr_1.06fr]">
        <section className="surface p-8 md:p-10">
          <p className="kicker">Recover access</p>
          <h1 className="mt-2 text-3xl font-bold text-white">Restore workspace access safely</h1>
          <p className="mt-2 text-sm text-neutral-400">
            Request a recovery OTP on your work email and continue with secure verification.
          </p>

          <div className="mt-6 space-y-4">
            <div className="flex items-start gap-2 text-sm text-neutral-400">
              <ShieldCheck className="mt-0.5 h-4 w-4 text-cyan-700" />
              Security notification email whenever recovery starts
            </div>
            <div className="flex items-start gap-2 text-sm text-neutral-400">
              <LifeBuoy className="mt-0.5 h-4 w-4 text-cyan-700" />
              Auto guidance with safe account recovery sequence
            </div>
            <div className="flex items-start gap-2 text-sm text-neutral-400">
              <Sparkles className="mt-0.5 h-4 w-4 text-cyan-700" />
              Same passwordless flow as standard workspace login
            </div>
          </div>
        </section>

        <section className="surface p-8">
          <p className="kicker mb-2">Account recovery</p>
          <h2 className="mb-1 text-3xl font-semibold">Reset your session</h2>
          <p className="mb-6 text-sm text-neutral-400">
            Enter your work email to get a recovery code and verify identity.
          </p>

          <ForgotAccessForm turnstileSiteKey={siteKey} />

          <p className="mt-6 text-sm text-neutral-400">
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
