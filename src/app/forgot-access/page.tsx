import Link from "next/link";
import {
  Lifebuoy,
  ShieldCheck,
  Sparkle,
} from "@phosphor-icons/react/dist/ssr";
import { redirect } from "next/navigation";
import { ForgotAccessForm } from "@/components/forgot-access-form";
import { TrustLoopLogo } from "@/components/trustloop-logo";
import { getAuth } from "@/lib/auth";
import { isTurnstileEnabled, turnstileSiteKey } from "@/lib/turnstile";

const featurePoints = [
  {
    icon: ShieldCheck,
    copy: "Security notification coverage whenever account recovery begins.",
  },
  {
    icon: Lifebuoy,
    copy: "Guided recovery flow without password resets or shared secrets.",
  },
  {
    icon: Sparkle,
    copy: "The same responder-focused auth path used for day-to-day access.",
  },
];

export default async function ForgotAccessPage() {
  const auth = await getAuth();
  if (auth) {
    redirect("/dashboard");
  }
  const siteKey = isTurnstileEnabled() ? turnstileSiteKey() : null;

  return (
    <main className="auth-shell">
      <div className="auth-grid">
        <section className="auth-panel-muted surface">
          <TrustLoopLogo size={18} variant="full" />
          <p className="page-kicker mt-8">Recover access</p>
          <h1 className="mt-4 font-[var(--font-heading)] text-[36px] font-bold text-[var(--color-title)]">
            Restore workspace access safely.
          </h1>
          <p className="mt-4 text-[16px] leading-7 text-[var(--color-subtext)]">
            Request a recovery OTP on your work email and continue with the same passwordless verification flow.
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
          <p className="page-kicker">Account recovery</p>
          <h2 className="mt-3 font-[var(--font-heading)] text-[32px] font-bold text-[var(--color-title)]">
            Reset your session
          </h2>
          <p className="mt-3 text-[14px] leading-6 text-[var(--color-subtext)]">
            Enter your work email to request a recovery code and verify identity.
          </p>

          <div className="mt-8">
            <ForgotAccessForm turnstileSiteKey={siteKey} />
          </div>

          <p className="mt-8 text-sm text-[var(--color-subtext)]">
            Back to{" "}
            <Link className="text-[var(--color-title)] underline decoration-[var(--color-rim)] underline-offset-4" href="/login">
              sign in
            </Link>
            .
          </p>
        </section>
      </div>
    </main>
  );
}
