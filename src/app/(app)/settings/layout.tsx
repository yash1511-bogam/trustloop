import { SlidersHorizontal } from "lucide-react";
import { SettingsNav } from "@/components/settings-nav";
import { requireAuth } from "@/lib/auth";

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = await requireAuth();

  return (
    <div className="grid gap-6 lg:grid-cols-[250px_minmax(0,1fr)]">
      <aside className="surface h-fit p-6 lg:sticky lg:top-6">
        <div className="mb-4">
          <p className="kicker">Settings</p>
          <h2 className="mt-1 text-lg font-semibold text-slate-100">{auth.user.workspaceName}</h2>
          <p className="mt-1 text-sm text-neutral-500">Configure TrustLoop for your ops workflow.</p>
        </div>

        <SettingsNav />

        <div className="panel-card mt-4 p-4 text-xs text-neutral-500">
          <p className="inline-flex items-center gap-1 font-semibold text-slate-400">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Tip
          </p>
          <p className="mt-1">Move section by section. Save each panel before switching pages.</p>
        </div>
      </aside>

      <div className="page-stack min-w-0">{children}</div>
    </div>
  );
}
