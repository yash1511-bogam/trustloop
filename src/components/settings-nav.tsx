"use client";

import { usePathname } from "next/navigation";
import {
  Buildings,
  CreditCard,
  GearSix,
  LinkSimple,
  Notebook,
  Robot,
  ShieldCheck,
  UsersThree,
  Waves,
} from "@phosphor-icons/react";
import { HoverLink } from "@/components/hover-link";

const groups = [
  {
    label: "Account",
    items: [
      { href: "/settings/profile", icon: GearSix, label: "Profile" },
    ],
  },
  {
    label: "Workspace",
    items: [
      { href: "/settings", icon: Buildings, label: "General" },
      { href: "/settings/team", icon: UsersThree, label: "Team" },
      { href: "/settings/billing", icon: CreditCard, label: "Billing" },
    ],
  },
  {
    label: "Integrations",
    items: [
      { href: "/settings/ai", icon: Robot, label: "AI & API Keys" },
      { href: "/settings/workspace#integrations", icon: LinkSimple, label: "Webhooks & Integrations" },
      { href: "/settings/workspace#on-call", icon: Waves, label: "On-Call" },
    ],
  },
  {
    label: "Security",
    items: [
      { href: "/settings/ai#api-keys", icon: ShieldCheck, label: "API Keys" },
      { href: "/settings/audit", icon: Notebook, label: "Audit Log" },
      { href: "/settings/workspace#security", icon: ShieldCheck, label: "SAML SSO" },
    ],
  },
] as const;

function normalizeHref(href: string): string {
  return href.split("#")[0];
}

function isActive(pathname: string, href: string): boolean {
  const normalized = normalizeHref(href);
  if (normalized === "/settings") {
    return pathname === normalized;
  }
  return pathname === normalized || pathname.startsWith(`${normalized}/`);
}

export function SettingsNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Settings navigation">
      {groups.map((group) => (
        <div className="settings-sidebar-group" key={group.label}>
          <div className="app-nav-group-label">{group.label}</div>
          {group.items.map((item) => {
            const active = isActive(pathname, item.href);

            return (
              <HoverLink
                className={active ? "settings-link settings-link-active" : "settings-link"}
                href={item.href}
                key={item.href}
              >
                <item.icon size={18} weight="regular" />
                <span>{item.label}</span>
              </HoverLink>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
