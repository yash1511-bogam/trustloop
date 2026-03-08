"use client";

import { useMemo } from "react";

type Mode = "login" | "register";

type Props = {
  mode: Mode;
  workspaceName?: string;
  inviteToken?: string;
  disabled?: boolean;
};

const providerOptions = [
  { id: "google", label: "Google" },
  { id: "github", label: "GitHub" },
] as const;

function oauthHref(input: {
  provider: "google" | "github";
  mode: Mode;
  workspaceName?: string;
  inviteToken?: string;
}): string {
  const params = new URLSearchParams({
    intent: input.mode,
  });

  if (input.workspaceName?.trim()) {
    params.set("workspaceName", input.workspaceName.trim().slice(0, 80));
  }

  if (input.inviteToken) {
    params.set("inviteToken", input.inviteToken);
  }

  return `/api/auth/oauth/${input.provider}?${params.toString()}`;
}

export function OAuthButtons({ mode, workspaceName, inviteToken, disabled }: Props) {
  const hrefs = useMemo(() => {
    return providerOptions.map((provider) => ({
      ...provider,
      href: oauthHref({
        provider: provider.id,
        mode,
        workspaceName,
        inviteToken,
      }),
    }));
  }, [mode, workspaceName, inviteToken]);

  return (
    <div className="space-y-2">
      <p className="text-xs uppercase tracking-wide text-slate-500">
        Or continue with OAuth
      </p>
      <div className="grid gap-2 md:grid-cols-2">
        {hrefs.map((provider) => (
          <a
            aria-disabled={disabled}
            className={`btn btn-ghost text-center ${disabled ? "pointer-events-none opacity-60" : ""}`}
            href={provider.href}
            key={provider.id}
          >
            Continue with {provider.label}
          </a>
        ))}
      </div>
    </div>
  );
}
