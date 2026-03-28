"use client";

import type { Icon as PhosphorIcon } from "@phosphor-icons/react";
import {
  Buildings,
  ChartBar,
  CreditCard,
  GearSix,
  Robot,
  SquaresFour,
  UsersThree,
} from "@phosphor-icons/react";
import { HoverLink } from "./hover-link";
import { usePathname } from "next/navigation";
import { useCallback, useRef } from "react";
import { Role } from "@prisma/client";
import { workspacePath } from "@/lib/workspace-url";

type NavItem = {
  href: string;
  label: string;
  icon: PhosphorIcon;
  exact?: boolean;
};

const mainNavItems: readonly NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: SquaresFour },
  { href: "/executive", label: "Executive", icon: ChartBar },
];

const settingsNavItems: readonly NavItem[] = [
  { href: "/settings/profile", label: "Profile", icon: GearSix },
  { href: "/settings/ai", label: "AI & API Keys", icon: Robot },
  { href: "/settings/workspace", label: "Workspace", icon: Buildings },
  { href: "/settings/team", label: "Team", icon: UsersThree },
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
  const navRef = useRef<HTMLElement>(null);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const links = navRef.current?.querySelectorAll<HTMLAnchorElement>("a");
    if (!links?.length) return;
    const arr = Array.from(links);
    const idx = arr.indexOf(document.activeElement as HTMLAnchorElement);
    const next = e.key === "ArrowDown" ? (idx + 1) % arr.length : (idx - 1 + arr.length) % arr.length;
    arr[next]?.focus();
  }, []);
  const mainItems = mainNavItems.map((item) => ({
    ...item,
    href: slug && role ? workspacePath(item.href, slug, role as Role) : item.href,
  }));
  const settingsItems = settingsNavItems.map((item) => ({
    ...item,
    href: slug && role ? workspacePath(item.href, slug, role as Role) : item.href,
  }));

  return (
    <nav aria-label="Primary navigation" className="app-nav" ref={navRef} onKeyDown={handleKeyDown}>
      <div className="app-nav-group">
        {mainItems.map((item) => {
          const active = isActive(pathname, item.href, item.exact);
          const className = compact
            ? active
              ? "app-nav-link app-nav-link-icon-only app-nav-link-active"
              : "app-nav-link app-nav-link-icon-only"
            : active
              ? "app-nav-link app-nav-link-active"
              : "app-nav-link";

          return (
            <HoverLink className={className} href={item.href} key={item.href} onClick={onNavigate} title={item.label}>
              <item.icon size={18} weight="regular" />
              {compact ? <span className="sr-only">{item.label}</span> : <span>{item.label}</span>}
            </HoverLink>
          );
        })}
      </div>

      {compact ? null : <div className="mt-2 border-t border-[var(--color-rim)] pt-3"><span className="app-nav-group-label font-medium">Settings</span></div>}

      <div className="app-nav-group">
        {settingsItems.map((item) => {
          const active = isActive(pathname, item.href, item.exact);
          const className = compact
            ? active
              ? "app-nav-link app-nav-link-icon-only app-nav-link-active"
              : "app-nav-link app-nav-link-icon-only"
            : active
              ? "app-nav-link app-nav-link-active"
              : "app-nav-link";

          return (
            <HoverLink className={className} href={item.href} key={item.href} onClick={onNavigate} title={item.label}>
              <item.icon size={18} weight="regular" />
              {compact ? <span className="sr-only">{item.label}</span> : <span>{item.label}</span>}
            </HoverLink>
          );
        })}
      </div>
    </nav>
  );
}
