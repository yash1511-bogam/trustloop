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
  Sliders,
  SquaresFour,
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
      { href: "/settings", icon: SquaresFour, label: "Overview" },
      { href: "/settings/general", icon: Sliders, label: "General" },
      { href: "/settings/workspace", icon: Buildings, label: "Quotas" },
      { href: "/settings/team", icon: UsersThree, label: "Team" },
      { href: "/settings/billing", icon: CreditCard, label: "Billing" },
    ],
  },
  {
    label: "Integrations",
    items: [
      { href: "/settings/ai", icon: Robot, label: "AI Providers" },
      { href: "/settings/webhooks", icon: LinkSimple, label: "Webhooks" },
      { href: "/settings/on-call", icon: Waves, label: "On-Call" },
    ],
  },
  {
    label: "Security",
    items: [
      { href: "/settings/api-keys", icon: ShieldCheck, label: "API Keys" },
      { href: "/settings/sso", icon: ShieldCheck, label: "SAML SSO" },
      { href: "/settings/audit", icon: Notebook, label: "Audit Log" },
    ],
  },
] as const;

export function SettingsNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Settings navigation">
      {groups.map((group) => (
        <div className="settings-sidebar-group" key={group.label}>
          <div className="app-nav-group-label">{group.label}</div>
          {group.items.map((item) => {
            const active =
              item.href === "/settings"
                ? pathname === "/settings"
                : pathname.startsWith(item.href);

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
