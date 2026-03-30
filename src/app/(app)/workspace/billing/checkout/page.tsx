"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function CheckoutPage() {
  return (
    <Suspense>
      <CheckoutInner />
    </Suspense>
  );
}

function CheckoutInner() {
  const params = useSearchParams();
  const router = useRouter();
  const plan = params.get("plan") ?? "starter";
  const interval = params.get("interval") ?? "monthly";
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    async function run() {
      try {
        // Starter: start 14-day trial first, then go to checkout for card verification
        if (plan === "starter") {
          const trialRes = await fetch("/api/billing/start-trial", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ plan: "starter" }),
          });
          if (!trialRes.ok) {
            const data = (await trialRes.json().catch(() => null)) as { error?: string } | null;
            if (!data?.error?.includes("already")) {
              setError(data?.error ?? "Failed to start trial.");
              return;
            }
          }
        }

        const res = await fetch("/api/billing/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan, interval }),
        });
        const data = (await res.json().catch(() => null)) as { checkoutUrl?: string; error?: string } | null;
        if (!res.ok || !data?.checkoutUrl) {
          if (res.status === 409) {
            router.replace("/dashboard");
            return;
          }
          setError(data?.error ?? "Failed to start checkout.");
          return;
        }
        window.location.assign(data.checkoutUrl);
      } catch {
        setError("Failed to start checkout.");
      }
    }

    void run();
  }, [plan, interval, router]);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[var(--color-void)]">
      <div className="text-center">
        {error ? (
          <div className="space-y-4">
            <p className="text-sm text-[var(--color-danger)]">{error}</p>
            <a className="text-sm text-[var(--color-signal)] underline" href="/workspace/billing">
              Go to billing
            </a>
          </div>
        ) : (
          <div className="space-y-3">
            <span className="mx-auto block h-5 w-5 rounded-full border-2 border-[var(--color-signal)] border-t-transparent animate-spin" />
            <p className="text-sm text-[var(--color-subtext)]">
              {plan === "starter" ? "Setting up your trial..." : "Redirecting to payment..."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
