"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";

function UnsubscribeContent() {
  const params = useSearchParams();
  const token = params.get("token");
  const [state, setState] = useState<"loading" | "confirm" | "done" | "error">(() => token ? "loading" : "error");
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    fetch(`/api/email/unsubscribe?token=${encodeURIComponent(token)}`)
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((d) => { if (!cancelled) { setEmail(d.email); setState(d.subscribed ? "confirm" : "done"); } })
      .catch(() => { if (!cancelled) setState("error"); });
    return () => { cancelled = true; };
  }, [token]);

  const confirm = useCallback(() => {
    setState("loading");
    fetch("/api/email/unsubscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then((r) => r.ok ? setState("done") : setState("error"))
      .catch(() => setState("error"));
  }, [token]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#020203] px-4">
      <div className="w-full max-w-md rounded-2xl border border-[var(--color-rim)] bg-[var(--color-void)] p-8 text-center">
        <h1 className="mb-2 text-xl font-bold text-[var(--color-bright)]">TrustLoop</h1>

        {state === "loading" && <p className="text-[var(--color-subtext)]">Loading…</p>}

        {state === "confirm" && (
          <>
            <p className="mb-1 text-[var(--color-body)]">Unsubscribe from TrustLoop emails?</p>
            <p className="mb-6 text-sm text-[var(--color-ghost)]">{email}</p>
            <button
              onClick={confirm}
              className="rounded-lg bg-[var(--color-signal)] px-6 py-2.5 text-sm font-semibold text-[var(--color-bright)] hover:bg-[#cf4a22] transition"
            >
              Confirm unsubscribe
            </button>
          </>
        )}

        {state === "done" && (
          <p className="text-[var(--color-body)]">You have been unsubscribed. You will no longer receive non-critical emails from TrustLoop.</p>
        )}

        {state === "error" && (
          <p className="text-[var(--color-danger)]">Invalid or expired unsubscribe link.</p>
        )}
      </div>
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-[#020203] text-[var(--color-subtext)]">Loading…</div>}>
      <UnsubscribeContent />
    </Suspense>
  );
}
