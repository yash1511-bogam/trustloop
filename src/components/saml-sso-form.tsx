"use client";

import { useState } from "react";

type Props = {
  mode: "login" | "register";
  turnstileToken?: string | null;
  disabled?: boolean;
};

export function SamlSsoForm({ mode, turnstileToken, disabled }: Props) {
  const [samlSlug, setSamlSlug] = useState("");

  return (
    <form action="/api/auth/saml/start" className="space-y-3" method="GET">
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
          placeholder="Workspace slug for SAML SSO (e.g. acme-ai)"
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
        Continue with SAML SSO
      </button>
    </form>
  );
}
