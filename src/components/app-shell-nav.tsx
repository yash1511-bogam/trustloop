"use client";

import { motion, AnimatePresence } from "framer-motion";
import { HoverLink } from "./hover-link";
import { usePathname } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { Role } from "@prisma/client";
import { workspacePath } from "@/lib/workspace-url";

import { SparklesIcon } from "@/components/ui/sparkles-icon";
import { LayoutGridIcon } from "@/components/ui/layout-grid-icon";
import { ActivityIcon } from "@/components/ui/activity-icon";
import { BlocksIcon } from "@/components/ui/blocks-icon";
import { ChartPieIcon } from "@/components/ui/chart-pie-icon";
import { LayersIcon } from "@/components/ui/layers-icon";
import { UserIcon } from "@/components/ui/user-icon";
import { UsersIcon } from "@/components/ui/users-icon";
import { CreditCardIcon } from "@/components/ui/credit-card-icon";
import { WebhookIcon } from "@/components/ui/webhook-icon";
import { ZapIcon } from "@/components/ui/zap-icon";
import { KeyRoundIcon } from "@/components/ui/key-round-icon";
import { ScanIcon } from "@/components/ui/scan-icon";
import { ShieldCheckIcon } from "@/components/ui/shield-check-icon";

type AnimatedIconHandle = { startAnimation: () => void; stopAnimation: () => void };
type AnimatedIcon = React.ForwardRefExoticComponent<{ size?: number; className?: string; isAnimated?: boolean } & React.RefAttributes<AnimatedIconHandle>>;

type NavItem = {
  href: string;
  label: string;
  icon: AnimatedIcon;
  exact?: boolean;
};

type NavGroup = {
  label: string;
  items: readonly NavItem[];
};

const mainNavItems: readonly NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutGridIcon },
  { href: "/incidents", label: "Incidents", icon: ActivityIcon },
  { href: "/analytics", label: "Analytics", icon: ChartPieIcon },
];

const settingsGroups: readonly NavGroup[] = [
  {
    label: "Account",
    items: [
      { href: "/account/profile", label: "Profile", icon: UserIcon },
    ],
  },
  {
    label: "Workspace",
    items: [
      { href: "/workspace", label: "Overview", icon: LayersIcon, exact: true },
      { href: "/workspace/general", label: "General", icon: BlocksIcon },
      { href: "/workspace/team", label: "Team", icon: UsersIcon },
      { href: "/workspace/billing", label: "Billing", icon: CreditCardIcon },
    ],
  },
  {
    label: "Integrations",
    items: [
      { href: "/integrations/ai", label: "AI Providers", icon: SparklesIcon },
      { href: "/integrations/webhooks", label: "Webhooks", icon: WebhookIcon },
      { href: "/integrations/on-call", label: "On-Call", icon: ZapIcon },
    ],
  },
  {
    label: "Security",
    items: [
      { href: "/security/api-keys", label: "API Keys", icon: KeyRoundIcon },
      { href: "/security/audit", label: "Audit Log", icon: ScanIcon },
      { href: "/security/sso", label: "SAML SSO", icon: ShieldCheckIcon },
    ],
  },
];

/* Flatten all settings items for collapsed icon-only view */
const allSettingsItems: readonly NavItem[] = settingsGroups.flatMap((g) => g.items);

function isActive(pathname: string, href: string, exact?: boolean): boolean {
  const normalized = href.split("#")[0];
  if (exact) return pathname === normalized;
  return pathname === normalized || pathname.startsWith(`${normalized}/`);
}

function isGroupActive(pathname: string, group: NavGroup): boolean {
  return group.items.some((item) => isActive(pathname, item.href, item.exact));
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
  const iconRefs = useRef<Record<string, AnimatedIconHandle | null>>({});
  const inSettings = pathname.startsWith("/workspace") || pathname.startsWith("/account") || pathname.startsWith("/integrations") || pathname.startsWith("/security");

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    settingsGroups.forEach((g) => { initial[g.label] = false; });
    return initial;
  });

  const toggleGroup = (label: string) => {
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  };

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

  const resolve = (href: string) => slug && role ? workspacePath(href, slug, role as Role) : href;

  const mainItems = mainNavItems.map((item) => ({ ...item, href: resolve(item.href) }));

  const handleEnter = (href: string) => {
    setHoveredHref(href);
    iconRefs.current[href]?.startAnimation();
  };
  const handleLeave = (href: string) => {
    setHoveredHref(null);
    iconRefs.current[href]?.stopAnimation();
  };

  /* Shared link renderer */
  function renderLink(item: NavItem & { href: string }, opts: { iconOnly: boolean; iconSize: number; fontSize?: string; indent?: boolean }) {
    const active = isActive(pathname, item.href, item.exact);
    const cls = opts.iconOnly
      ? active ? "app-nav-link app-nav-link-icon-only app-nav-link-active" : "app-nav-link app-nav-link-icon-only"
      : active ? "app-nav-link app-nav-link-active" : "app-nav-link";

    return (
      <div
        key={item.href}
        className={opts.iconOnly ? "app-nav-tooltip" : undefined}
        onMouseEnter={() => handleEnter(item.href)}
        onMouseLeave={() => handleLeave(item.href)}
        style={{ position: "relative" }}
      >
        <AnimatePresence>
          {hoveredHref === item.href && !active && (
            <motion.span
              className="absolute inset-0 rounded-[var(--radius-md)] bg-[var(--color-raised)]"
              layoutId="sidebar-nav-highlight"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
          )}
        </AnimatePresence>
        <HoverLink className={`${cls} relative z-10`} href={item.href} onClick={onNavigate} title={item.label}>
          <item.icon ref={(el) => { iconRefs.current[item.href] = el; }} size={opts.iconSize} isAnimated={false} />
          {opts.iconOnly ? (
            <>
              <span className="sr-only">{item.label}</span>
              <span className="app-nav-tooltip-label">{item.label}</span>
            </>
          ) : (
            <span style={{ fontSize: opts.fontSize }}>{item.label}</span>
          )}
        </HoverLink>
      </div>
    );
  }

  /* ── Collapsed: icon-only with tooltips for everything ── */
  if (compact) {
    return (
      <nav aria-label="Primary navigation" className="app-nav" ref={navRef} onKeyDown={handleKeyDown}>
        <div className="app-nav-group">
          {mainItems.map((item) => renderLink(item, { iconOnly: true, iconSize: 20 }))}
        </div>
        <div className="app-sidebar-divider" />
        <div className="app-nav-group">
          {allSettingsItems.map((item) => {
            const resolved = { ...item, href: resolve(item.href) };
            return renderLink(resolved, { iconOnly: true, iconSize: 18 });
          })}
        </div>
      </nav>
    );
  }

  /* ── Expanded: full labels with collapsible groups ── */
  return (
    <nav aria-label="Primary navigation" className="app-nav" ref={navRef} onKeyDown={handleKeyDown}>
      <div className="app-nav-group">
        {mainItems.map((item) => renderLink(item, { iconOnly: false, iconSize: 20 }))}
      </div>

      {settingsGroups.map((group) => {
        const groupActive = inSettings && isGroupActive(pathname, group);
        const isOpen = openGroups[group.label] || groupActive;

        return (
          <div key={group.label}>
            <button
              type="button"
              onClick={() => toggleGroup(group.label)}
              className="app-nav-link w-full justify-between"
            >
              <span className="app-nav-group-label font-medium" style={{ padding: 0, margin: 0 }}>{group.label}</span>
              <svg
                width={12}
                height={12}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-[var(--color-ghost)] transition-transform duration-200"
                style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>

            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                  style={{ overflow: "hidden" }}
                >
                  <div className="app-nav-group pl-1">
                    {group.items.map((item) => {
                      const resolved = { ...item, href: resolve(item.href) };
                      return renderLink(resolved, { iconOnly: false, iconSize: 18, fontSize: "13px" });
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </nav>
  );
}
