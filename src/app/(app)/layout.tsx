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
      <header className="surface mb-5 flex flex-wrap items-center justify-between gap-4 p-4 md:p-5">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(145deg,#1c1917_0%,#292524_100%)] text-amber-100 shadow-[0_12px_24px_rgba(28,25,23,0.26)]">
            <Siren className="h-5 w-5" />
          </span>
          <div>
            <p className="kicker">{auth.user.workspaceName}</p>
            <h1 className="mt-1 text-xl font-semibold text-slate-900">TrustLoop Control Center</h1>
            <p className="text-xs text-slate-600">Signed in as {auth.user.name}</p>
          </div>
        </div>

        <nav className="flex flex-wrap items-center gap-2 md:justify-end">
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
