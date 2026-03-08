import { CalendarClock, Siren } from "lucide-react";
import { LogoutButton } from "@/components/logout-button";
import { AppShellNav } from "@/components/app-shell-nav";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = await requireAuth();
  const workspace = await prisma.workspace.findUnique({
    where: { id: auth.user.workspaceId },
    select: { complianceMode: true },
  });

  return (
    <main className="container-shell fade-in py-7 md:py-8">
      <div className="app-shell">
        <aside className="surface app-nav-panel">
          <div className="space-y-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[linear-gradient(145deg,#0891b2_0%,#1d4ed8_100%)] text-sky-50 shadow-[0_12px_24px_rgba(2,132,199,0.32)]">
              <Siren className="h-5 w-5" />
            </span>
            <div>
              <p className="kicker">{auth.user.workspaceName}</p>
              <h1 className="mt-1 text-xl font-semibold text-slate-100">TrustLoop Operations</h1>
              <p className="text-sm text-slate-500">{auth.user.name}</p>
              {workspace?.complianceMode ? (
                <span className="mt-2 inline-flex rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-300">
                  Compliance mode
                </span>
              ) : null}
            </div>
          </div>

          <AppShellNav />

          <div className="panel-card p-3 text-xs text-slate-500">
            <div className="mb-1 inline-flex items-center gap-1 font-semibold text-slate-400">
              <CalendarClock className="h-3.5 w-3.5" />
              Daily Workflow
            </div>
            <p>Review P1 queue, send customer-safe updates, then refresh executive read models.</p>
          </div>

          <div>
            <LogoutButton />
          </div>
        </aside>

        <section className="page-stack min-w-0">{children}</section>
      </div>
    </main>
  );
}
