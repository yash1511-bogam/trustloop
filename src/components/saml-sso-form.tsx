"use client";

import { useState } from "react";

type Props = {
  mode: "login" | "register";
  turnstileToken?: string | null;
  disabled?: boolean;
};

export function SamlSsoForm({ mode, turnstileToken, disabled }: Props) {
  const [samlSlug, setSamlSlug] = useState("");
  const [open, setOpen] = useState(false);

  return (
    <details className="group" open={open} onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}>
      <summary className="flex cursor-pointer list-none items-center justify-center gap-2 rounded-[var(--radius-sm)] border border-[var(--color-rim)] bg-transparent px-4 py-2 text-sm text-[var(--color-subtext)] transition-colors hover:border-[var(--color-muted)] hover:bg-[var(--color-raised)] hover:text-[var(--color-body)]">
        Continue with SAML SSO
        <svg className="h-3 w-3 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth="2"><path d="M3 4.5l3 3 3-3" /></svg>
      </summary>
      <form action="/api/auth/saml/start" className="mt-3 space-y-3" method="GET">
        <input name="intent" type="hidden" value={mode} />
        {turnstileToken ? (
          <input name="turnstileToken" type="hidden" value={turnstileToken} />
        ) : null}
        <div>
          <label className="sr-only" htmlFor={`saml-slug-${mode}`}>
            Workspace slug
          </label>
          <input
            id={`saml-slug-${mode}`}
            className="input"
            name="slug"
            placeholder="Workspace slug (e.g. acme-ai)"
            value={samlSlug}
            onChange={(event) => setSamlSlug(event.target.value.toLowerCase())}
            minLength={3}
            maxLength={60}
            pattern="^[a-z0-9-]+$"
          />
        </div>
        <button
          className="btn btn-ghost w-full"
          disabled={disabled || samlSlug.length < 3}
          type="submit"
        >
          Sign in with SAML
        </button>
      </form>
    </details>
  );
}
