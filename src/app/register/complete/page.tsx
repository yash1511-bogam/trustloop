"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Building2 } from "lucide-react";

export default function CompleteRegistrationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const session = searchParams.get("session");
  const [companyName, setCompanyName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
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
      <main className="flex min-h-[calc(100vh-80px)] items-center justify-center px-6">
        <p className="text-neutral-400">Invalid registration link. <a href="/register" className="text-white underline">Start over</a></p>
      </main>
    );
  }

  return (
    <main className="flex min-h-[calc(100vh-80px)] items-center justify-center px-6 py-12">
      <section className="w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-900 p-8 shadow-2xl">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-950/30 text-cyan-500">
            <Building2 className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-xl font-bold text-white">One more step</h1>
            <p className="text-sm text-neutral-400">Enter your company name to create your workspace.</p>
          </div>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="sr-only" htmlFor="company-name">Company name</label>
            <input
              id="company-name"
              className="input"
              placeholder="Company name"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              minLength={2}
              maxLength={80}
              autoFocus
              required
            />
          </div>

          <button className="btn btn-primary w-full" disabled={submitting} type="submit">
            {submitting ? "Creating workspace..." : "Create workspace"}
          </button>
        </form>

        {error && (
          <p className="mt-4 rounded-lg border border-red-900/50 bg-red-950/20 p-3 text-sm text-red-400">
            {error}
          </p>
        )}
      </section>
    </main>
  );
}
