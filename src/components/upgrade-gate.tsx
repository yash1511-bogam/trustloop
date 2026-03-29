import Link from "next/link";
import { Lock } from "@/components/icon-compat";

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
export function UpgradeGate({ allowed, planLabel, children }: Props) {
  if (allowed) return <>{children}</>;

  return (
    <div className="relative overflow-hidden rounded-[var(--radius-md)]">
      <div className="pointer-events-none select-none opacity-40 blur-[1px]" aria-disabled="true">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="rounded-[var(--radius-md)] border border-[rgba(217,119,6,0.24)] bg-[rgba(217,119,6,0.08)] px-4 py-2 text-sm font-medium text-[var(--color-warning)] backdrop-blur-sm">
          <Lock className="mr-1.5 inline h-3.5 w-3.5" />
          Requires {planLabel} plan ·{" "}
          <Link href="/settings/billing" className="underline underline-offset-2 hover:text-[var(--color-body)]">
            Upgrade
          </Link>
        </div>
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
    <span className="inline-flex items-center gap-1.5 ml-3 rounded-full border border-[rgba(217,119,6,0.24)] bg-[rgba(217,119,6,0.08)] px-3 py-1 text-xs font-medium text-[var(--color-warning)] align-middle">
      <Lock className="h-3 w-3" />
      Requires {planLabel}
      <Link href="/settings/billing" className="ml-1 underline underline-offset-2 hover:text-[var(--color-body)]">
        Upgrade
      </Link>
    </span>
  );
}
