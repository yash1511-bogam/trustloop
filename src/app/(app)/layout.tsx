import Link from "next/link";
import { BarChart3, LayoutDashboard, Settings, Siren } from "lucide-react";
import { requireAuth } from "@/lib/auth";
import { LogoutButton } from "@/components/logout-button";

const nav = [
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
];

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = await requireAuth();

  return (
    <main className="container-shell fade-in py-6">
      <header className="surface mb-5 flex flex-wrap items-center justify-between gap-3 p-4 md:p-5">
        <div>
          <p className="kicker">{auth.user.workspaceName}</p>
          <h1 className="mt-1 flex items-center gap-2 text-xl font-semibold text-slate-900">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-950 text-white">
              <Siren className="h-4 w-4" />
            </span>
            TrustLoop Incident Workspace
          </h1>
        </div>

        <nav className="flex flex-wrap items-center gap-2">
          {nav.map((item) => (
            <Link className="btn btn-ghost" href={item.href} key={item.href}>
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
          <LogoutButton />
        </nav>
      </header>

      {children}
    </main>
  );
}
