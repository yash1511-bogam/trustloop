"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, LayoutDashboard, Settings } from "lucide-react";

const navItems = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    href: "/executive",
    label: "Executive",
    icon: BarChart3,
  },
  {
    href: "/settings",
    label: "Settings",
    icon: Settings,
  },
] as const;

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShellNav() {
  const pathname = usePathname();

  return (
    <nav className="app-nav-links" aria-label="Primary navigation">
      {navItems.map((item) => {
        const active = isActive(pathname, item.href);
        const className = active
          ? "app-nav-link app-nav-link-active"
          : "app-nav-link";

        return (
          <Link className={className} href={item.href} key={item.href}>
            <item.icon className="h-4 w-4" />
            <span className="text-sm font-semibold">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
