import Link from "next/link";
import { Lock } from "lucide-react";

type Props = {
  allowed: boolean;
  planLabel: string;
  children: React.ReactNode;
};

/**
 * Inline upgrade badge + disabled children pattern.
 * When gated, renders a small badge and disables all interactive children
 * via pointer-events-none + opacity. No overlay.
 */
export function UpgradeGate({ allowed, children }: Props) {
  if (allowed) return <>{children}</>;

  return (
    <div>
      <div className="pointer-events-none select-none opacity-50" aria-disabled="true">
        {children}
      </div>
    </div>
  );
}

/**
 * Inline badge to place next to a section heading when the feature is gated.
 * Shows "Requires X plan" with a small upgrade link.
 */
export function PlanBadge({ allowed, planLabel }: { allowed: boolean; planLabel: string }) {
  if (allowed) return null;

  return (
    <span className="inline-flex items-center gap-1.5 ml-3 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-400 align-middle">
      <Lock className="h-3 w-3" />
      Requires {planLabel}
      <Link href="/settings/billing" className="ml-1 underline underline-offset-2 hover:text-amber-300">
        Upgrade
      </Link>
    </span>
  );
}
