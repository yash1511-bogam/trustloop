"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Blocks, Bot, Building2, CreditCard, Users } from "lucide-react";

const items = [
  { href: "/settings", label: "Overview", icon: Blocks },
  { href: "/settings/ai", label: "AI & API Keys", icon: Bot },
  { href: "/settings/workspace", label: "Workspace", icon: Building2 },
  { href: "/settings/team", label: "Team", icon: Users },
  { href: "/settings/billing", label: "Billing", icon: CreditCard },
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === "/settings") {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

type SettingsNavProps = {
  compact?: boolean;
};

export function SettingsNav({ compact = false }: SettingsNavProps) {
  const pathname = usePathname();

  return (
    <nav className={compact ? "settings-subnav" : "app-nav-links"} aria-label="Settings navigation">
      {items.map((item) => {
        const active = isActive(pathname, item.href);
        const linkClass = compact
          ? active
            ? "settings-subnav-link settings-subnav-link-active"
            : "settings-subnav-link"
          : active
            ? "app-nav-link app-nav-link-active"
            : "app-nav-link";

        return (
          <Link
            className={linkClass}
            href={item.href}
            key={item.href}
          >
            <item.icon className="h-4 w-4" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
