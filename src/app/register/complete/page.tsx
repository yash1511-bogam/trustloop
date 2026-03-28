"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Buildings } from "@phosphor-icons/react";

export default function CompleteRegistrationPage() {
  return (
    <Suspense>
      <CompleteRegistrationInner />
    </Suspense>
  );
}

function CompleteRegistrationInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const session = searchParams.get("session");
  const [companyName, setCompanyName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) {
      setError("Invalid session. Start registration again.");
      return;
    }
    setError(null);
    setSubmitting(true);

    const res = await fetch("/api/auth/register/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session, companyName }),
    });

    setSubmitting(false);

    if (!res.ok) {
      const payload = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(payload?.error ?? "Unable to complete registration.");
      return;
    }

    const payload = (await res.json().catch(() => null)) as { redirectTo?: string } | null;
    router.push(payload?.redirectTo ?? "/dashboard");
    router.refresh();
  }

  if (!session) {
    return (
      <main className="auth-shell">
        <p className="text-[var(--color-subtext)]">
          Invalid registration link.{" "}
          <Link className="text-[var(--color-title)] underline decoration-[var(--color-rim)] underline-offset-4" href="/register">
            Start over
          </Link>
        </p>
      </main>
    );
  }

  return (
    <main className="auth-shell">
      <section className="auth-panel surface w-full max-w-md">
        <div className="mb-6 flex items-center gap-2 text-xs text-[var(--color-ghost)]">
          <span className="text-[var(--color-signal)]">Register</span>
          <span>→</span>
          <span className="text-[var(--color-signal)]">Verify</span>
          <span>→</span>
          <span className="font-medium text-[var(--color-title)]">Workspace</span>
          <span>→</span>
          <span>Plan</span>
        </div>
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--color-rim)] bg-[var(--color-void)]">
            <Buildings color="var(--color-subtext)" size={18} weight="duotone" />
          </span>
          <div>
            <h1 className="font-[var(--font-heading)] text-[24px] font-bold text-[var(--color-title)]">One more step</h1>
            <p className="text-sm text-[var(--color-subtext)]">Enter your company name to create the workspace.</p>
          </div>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="field">
            <label className="sr-only" htmlFor="company-name">Company name</label>
            <input
              autoFocus
              className="input"
              id="company-name"
              maxLength={80}
              minLength={2}
              onChange={(event) => setCompanyName(event.target.value)}
              placeholder="Company name"
              required
              value={companyName}
            />
          </div>

          <button className="btn btn-primary w-full" disabled={submitting} type="submit">
            {submitting ? "Creating workspace…" : "Create workspace"}
          </button>
        </form>

        {error ? (
          <p className="mt-4 rounded-[var(--radius-sm)] border border-[rgba(232,66,66,0.24)] bg-[rgba(232,66,66,0.08)] p-3 text-sm text-[var(--color-danger)]">
            {error}
          </p>
        ) : null}
      </section>
    </main>
  );
}
