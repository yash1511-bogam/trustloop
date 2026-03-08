"use client";

import { useMemo } from "react";
import { Github } from "lucide-react";

type Mode = "login" | "register";

type Props = {
  mode: Mode;
  workspaceName?: string;
  inviteToken?: string;
  disabled?: boolean;
};

const GoogleIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-1 .67-2.28 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.67-.35-1.39-.35-2.09s.13-1.42.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </svg>
);

const providerOptions = [
  { id: "google", label: "Google", icon: GoogleIcon },
  { id: "github", label: "GitHub", icon: Github },
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
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        {hrefs.map((provider) => (
          <a
            aria-disabled={disabled}
            className={`btn btn-ghost justify-center text-center py-2.5 rounded-xl border border-neutral-800 hover:bg-neutral-800 transition-all ${disabled ? "pointer-events-none opacity-60" : ""}`}
            href={provider.href}
            key={provider.id}
          >
            <provider.icon className="h-4 w-4" />
            <span className="text-sm font-medium">{provider.label}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
