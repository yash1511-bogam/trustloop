"use client";

import type { Icon as PhosphorIcon } from "@phosphor-icons/react";
import {
  Buildings,
  ChartBar,
  CreditCard,
  GearSix,
  LinkSimple,
  ListChecks,
  Notebook,
  Robot,
  ShieldCheck,
  SquaresFour,
  UsersThree,
  Waves,
} from "@phosphor-icons/react";
import { motion, AnimatePresence } from "framer-motion";
import { HoverLink } from "./hover-link";
import { usePathname } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { Role } from "@prisma/client";
import { workspacePath } from "@/lib/workspace-url";

type NavItem = {
  href: string;
  label: string;
  icon: PhosphorIcon;
  exact?: boolean;
};

type NavGroup = {
  label: string;
  items: readonly NavItem[];
};

const mainNavItems: readonly NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: SquaresFour },
  { href: "/incidents", label: "Incidents", icon: ListChecks },
  { href: "/executive", label: "Executive", icon: ChartBar },
];

const settingsGroups: readonly NavGroup[] = [
  {
    label: "Account",
    items: [
      { href: "/settings/profile", label: "Profile", icon: GearSix },
    ],
  },
  {
    label: "Workspace",
    items: [
      { href: "/settings", label: "General", icon: Buildings, exact: true },
      { href: "/settings/team", label: "Team", icon: UsersThree },
      { href: "/settings/billing", label: "Billing", icon: CreditCard },
    ],
  },
  {
    label: "Integrations",
    items: [
      { href: "/settings/ai", label: "AI Providers", icon: Robot },
      { href: "/settings/workspace#integrations", label: "Webhooks", icon: LinkSimple },
      { href: "/settings/workspace#on-call", label: "On-Call", icon: Waves },
    ],
  },
  {
    label: "Security",
    items: [
      { href: "/settings/ai#api-keys", label: "API Keys", icon: ShieldCheck },
      { href: "/settings/audit", label: "Audit Log", icon: Notebook },
      { href: "/settings/workspace#security", label: "SAML SSO", icon: ShieldCheck },
    ],
  },
];

function isActive(pathname: string, href: string, exact?: boolean): boolean {
  const normalized = href.split("#")[0];
  if (exact) {
    return pathname === normalized;
  }
  return pathname === normalized || pathname.startsWith(`${normalized}/`);
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
  const [hoveredHref, setHoveredHref] = useState<string | null>(null);

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
  const resolvedGroups = settingsGroups.map((group) => ({
    ...group,
    items: group.items.map((item) => ({
      ...item,
      href: slug && role ? workspacePath(item.href, slug, role as Role) : item.href,
    })),
  }));

  function renderNavItem(item: NavItem & { href: string }) {
    const active = isActive(pathname, item.href, item.exact);
    const className = compact
      ? active
        ? "app-nav-link app-nav-link-icon-only app-nav-link-active"
        : "app-nav-link app-nav-link-icon-only"
      : active
        ? "app-nav-link app-nav-link-active"
        : "app-nav-link";

    return (
      <div
        key={item.href}
        onMouseEnter={() => setHoveredHref(item.href)}
        onMouseLeave={() => setHoveredHref(null)}
        style={{ position: "relative" }}
      >
        <AnimatePresence>
          {hoveredHref === item.href && !active && (
            <motion.span
              className="absolute inset-0 rounded-[var(--radius-sm)] bg-[var(--color-raised)]"
              layoutId="sidebar-nav-highlight"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
          )}
        </AnimatePresence>
        <HoverLink className={`${className} relative z-10`} href={item.href} onClick={onNavigate} title={item.label}>
          <item.icon size={20} weight={active ? "duotone" : "duotone"} />
          {compact ? <span className="sr-only">{item.label}</span> : <span>{item.label}</span>}
        </HoverLink>
      </div>
    );
  }

  return (
    <nav aria-label="Primary navigation" className="app-nav" ref={navRef} onKeyDown={handleKeyDown}>
      <div className="app-nav-group">
        {mainItems.map(renderNavItem)}
      </div>

      {resolvedGroups.map((group) => (
        <div key={group.label}>
          {compact ? null : (
            <div className="mt-3 border-t border-[var(--color-rim)] pt-4">
              <span className="app-nav-group-label font-medium">{group.label}</span>
            </div>
          )}
          <div className="app-nav-group">
            {group.items.map(renderNavItem)}
          </div>
        </div>
      ))}
    </nav>
  );
}
