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
      { href: "/account/profile", icon: GearSix, label: "Profile" },
    ],
  },
  {
    label: "Workspace",
    items: [
      { href: "/workspace", icon: SquaresFour, label: "Overview" },
      { href: "/workspace/general", icon: Sliders, label: "General" },
      { href: "/workspace/quotas", icon: Buildings, label: "Quotas" },
      { href: "/workspace/team", icon: UsersThree, label: "Team" },
      { href: "/workspace/billing", icon: CreditCard, label: "Billing" },
    ],
  },
  {
    label: "Integrations",
    items: [
      { href: "/integrations/ai", icon: Robot, label: "AI Providers" },
      { href: "/integrations/webhooks", icon: LinkSimple, label: "Webhooks" },
      { href: "/integrations/on-call", icon: Waves, label: "On-Call" },
    ],
  },
  {
    label: "Security",
    items: [
      { href: "/security/api-keys", icon: ShieldCheck, label: "API Keys" },
      { href: "/security/sso", icon: ShieldCheck, label: "SAML SSO" },
      { href: "/security/audit", icon: Notebook, label: "Audit Log" },
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
              item.href === "/workspace"
                ? pathname === "/workspace"
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
