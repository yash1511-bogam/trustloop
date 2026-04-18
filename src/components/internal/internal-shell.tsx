"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { InternalRole } from "@/lib/internal-auth";

const NAV_ITEMS = [
  { href: "/_internal", label: "Overview", roles: ["CEO", "SUPPORT", "TECH", "MARKETING"], exact: true },
  { href: "/_internal/revenue", label: "Revenue", roles: ["CEO"] },
  { href: "/_internal/workspaces", label: "Workspaces", roles: ["CEO", "SUPPORT", "TECH"] },
  { href: "/_internal/users", label: "Users", roles: ["CEO", "SUPPORT"] },
  { href: "/_internal/growth", label: "Growth", roles: ["CEO", "MARKETING"] },
  { href: "/_internal/invite-codes", label: "Invite Codes", roles: ["CEO", "MARKETING"] },
  { href: "/_internal/promo-codes", label: "Promo Codes", roles: ["CEO"] },
  { href: "/_internal/team", label: "Team", roles: ["CEO"] },
  { href: "/_internal/enterprise-leads", label: "Enterprise Leads", roles: ["CEO", "MARKETING"] },
  { href: "/_internal/infrastructure", label: "Infrastructure", roles: ["CEO", "TECH"] },
  { href: "/_internal/audit", label: "Audit Log", roles: ["CEO", "TECH"] },
] as const;

export function InternalShell({
  role,
  email,
  children,
}: {
  role: InternalRole;
  email: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const visibleItems = NAV_ITEMS.filter((item) => (item.roles as readonly string[]).includes(role));

  return (
    <div className="flex min-h-screen bg-[#0a0b0d]">
      <aside className="sticky top-0 flex h-screen w-56 shrink-0 flex-col border-r border-[var(--color-rim)] bg-[#0a0b0d]">
        <div className="flex items-center gap-2 border-b border-[var(--color-rim)] px-4 py-3">
          <span className="text-sm font-semibold text-[var(--color-title)]">TrustLoop</span>
          <span className="rounded bg-[#d4622b] px-1.5 py-0.5 text-[10px] font-bold text-white">INTERNAL</span>
        </div>
        <nav className="flex-1 overflow-y-auto px-2 py-3">
          {visibleItems.map((item) => {
            const active = "exact" in item && item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded-md px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-[#17181c] text-[var(--color-title)] font-medium"
                    : "text-[var(--color-ghost)] hover:bg-[#101113] hover:text-[var(--color-body)]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-[var(--color-rim)] px-4 py-3">
          <p className="truncate text-xs text-[var(--color-ghost)]">{email}</p>
          <p className="text-[10px] text-[var(--color-ghost)] opacity-60">{role}</p>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  );
}
