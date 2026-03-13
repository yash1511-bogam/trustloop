"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import { type ReactNode } from "react";

type Props = {
  allowed: boolean;
  planLabel: string;
  children: ReactNode;
};

export function UpgradeGate({ allowed, planLabel, children }: Props) {
  if (allowed) return <>{children}</>;

  return (
    <div className="relative">
      <div className="pointer-events-none select-none opacity-30" aria-hidden>
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-black/80 px-8 py-6 backdrop-blur-sm">
          <Lock className="h-5 w-5 text-neutral-400" />
          <p className="text-sm text-neutral-300">
            Available on the <span className="font-semibold text-slate-100">{planLabel}</span> plan
          </p>
          <Link
            href="/settings/billing"
            className="btn btn-primary text-xs !min-h-[32px] px-4"
          >
            Upgrade to {planLabel}
          </Link>
        </div>
      </div>
    </div>
  );
}
