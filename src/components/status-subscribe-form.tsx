"use client";

import { useState } from "react";

export function StatusSubscribeForm({ slug }: { slug: string }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState("loading");
    try {
      const res = await fetch(`/api/status/${slug}/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setState(res.ok ? "done" : "error");
    } catch {
      setState("error");
    }
  }

  if (state === "done") {
    return <p className="text-sm text-emerald-400">Subscribed! You&apos;ll receive incident updates.</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="email"
        required
        placeholder="you@company.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="input flex-1"
      />
      <button type="submit" disabled={state === "loading"} className="btn btn-primary">
        {state === "loading" ? "Subscribing…" : "Subscribe"}
      </button>
      {state === "error" && <p className="text-sm text-red-400">Failed. Try again.</p>}
    </form>
  );
}
