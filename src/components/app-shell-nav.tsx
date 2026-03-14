"use client";

import { HoverLink } from "./hover-link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bot,
  Building2,
  CreditCard,
  LayoutDashboard,
  type LucideIcon,
  Settings,
  Users,
} from "lucide-react";
import { Role } from "@prisma/client";
import { workspacePath } from "@/lib/workspace-url";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
};

const baseNavItems: readonly NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/executive", label: "Executive", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings, exact: true },
  { href: "/settings/ai", label: "AI & API Keys", icon: Bot },
  { href: "/settings/workspace", label: "Workspace", icon: Building2 },
  { href: "/settings/team", label: "Team", icon: Users },
  { href: "/settings/billing", label: "Billing", icon: CreditCard },
];

function isActive(pathname: string, href: string, exact?: boolean): boolean {
  if (exact) {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

type AppShellNavProps = {
  onNavigate?: () => void;
  compact?: boolean;
  role?: string;
  slug?: string | null;
};

export function AppShellNav({ onNavigate, compact = false, role, slug }: AppShellNavProps) {
  const pathname = usePathname();
  const navItems = baseNavItems.map((item) => ({
    ...item,
    href: slug && role ? workspacePath(item.href, slug, role as Role) : item.href,
  }));

  return (
    <nav className={compact ? "app-nav-links app-nav-links-compact" : "app-nav-links"} aria-label="Primary navigation">
      {navItems.map((item) => {
        const active = isActive(pathname, item.href, item.exact);
        const className = compact
          ? active
            ? "app-nav-link app-nav-link-icon app-nav-link-active"
            : "app-nav-link app-nav-link-icon"
          : active
            ? "app-nav-link app-nav-link-active"
            : "app-nav-link";

        return (
          <HoverLink className={className} href={item.href} key={item.href} onClick={onNavigate} title={item.label}>
            <item.icon className={compact ? "h-5 w-5" : "h-4 w-4"} />
            {compact ? (
              <span className="sr-only">{item.label}</span>
            ) : (
              <span>{item.label}</span>
            )}
          </HoverLink>
        );
      })}
    </nav>
  );
}
