"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "@/components/icon-compat";

export function BillingVerification() {
  const router = useRouter();
  const [status, setStatus] = useState<"polling" | "success" | "timeout">("polling");

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 20;

    async function poll() {
      while (!cancelled && attempts < maxAttempts) {
        attempts++;
        try {
          const res = await fetch("/api/billing/status");
          const data = (await res.json().catch(() => null)) as { status?: string } | null;
          if (data?.status === "ACTIVE" || data?.status === "TRIALING") {
            if (!cancelled) { setStatus("success"); setTimeout(() => router.replace("/dashboard"), 1500); }
            return;
          }
        } catch { /* retry */ }
        await new Promise((r) => setTimeout(r, 2000));
      }
      if (!cancelled) setStatus("timeout");
    }

    void poll();
    return () => { cancelled = true; };
  }, [router]);

  if (status === "success") {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-[var(--color-resolve)] bg-[var(--color-resolve)]/10 px-4 py-3 text-sm text-[var(--color-resolve)]">
        <ShieldCheck className="h-4 w-4 shrink-0" />
        Payment confirmed! Your plan has been upgraded.
      </div>
    );
  }

  if (status === "timeout") {
    return (
      <div className="rounded-lg border border-[var(--color-warning)] bg-[var(--color-warning)]/10 px-4 py-3 text-sm text-[var(--color-warning)]">
        Payment is still processing. Your plan will update automatically once confirmed. You can refresh this page to check.
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border border-[var(--color-rim)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-body)]">
      <span className="h-4 w-4 rounded-full border-2 border-[var(--color-signal)] border-t-transparent animate-spin shrink-0" />
      Verifying your payment...
    </div>
  );
}
