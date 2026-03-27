"use client";

import { useRef, useState } from "react";
import {
  TurnstileWidget,
  type TurnstileWidgetHandle,
} from "@/components/turnstile-widget";

interface Props {
  slug: string;
  turnstileSiteKey?: string | null;
}

export function StatusSubscribeForm({ slug, turnstileSiteKey }: Props) {
  const turnstileRef = useRef<TurnstileWidgetHandle | null>(null);
  const [email, setEmail] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const requiresTurnstile = Boolean(turnstileSiteKey);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (requiresTurnstile && !turnstileToken) {
      setState("error");
      return;
    }
    setState("loading");
    try {
      const res = await fetch(`/api/status/${slug}/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, turnstileToken }),
      });
      turnstileRef.current?.reset();
      setState(res.ok ? "done" : "error");
    } catch {
      turnstileRef.current?.reset();
      setState("error");
    }
  }

  if (state === "done") {
    return <p className="text-sm text-[var(--color-resolve)]">Subscribed! You&apos;ll receive incident updates.</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex gap-2">
        <input
          type="email"
          required
          placeholder="you@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input flex-1"
        />
        <button
          type="submit"
          disabled={state === "loading" || (requiresTurnstile && !turnstileToken)}
          className="btn btn-primary"
        >
          {state === "loading" ? "Subscribing…" : "Subscribe"}
        </button>
      </div>
      <TurnstileWidget ref={turnstileRef} siteKey={turnstileSiteKey} onTokenChange={setTurnstileToken} />
      {state === "error" && <p className="text-sm text-[var(--color-danger)]">Failed. Try again.</p>}
    </form>
  );
}
