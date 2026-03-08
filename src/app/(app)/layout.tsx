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
    <main className="container-shell fade-in py-8 md:py-8">
      <div className="app-shell">
        <aside className="surface app-nav-panel">
          <div className="space-y-4">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-900 text-sky-50 shadow-sm">
              <Siren className="h-5 w-5" />
            </span>
            <div>
              <p className="kicker">{auth.user.workspaceName}</p>
              <h1 className="mt-1 text-xl font-semibold text-slate-100">TrustLoop Operations</h1>
              <p className="text-sm text-neutral-500">{auth.user.name}</p>
              {workspace?.complianceMode ? (
                <span className="mt-2 inline-flex rounded-full border border-neutral-800 bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-300">
                  Compliance mode
                </span>
              ) : null}
            </div>
          </div>

          <AppShellNav />

          <div className="panel-card p-4 text-xs text-neutral-500">
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
