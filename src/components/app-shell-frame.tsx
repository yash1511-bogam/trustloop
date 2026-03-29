"use client";

import { SidebarSimple } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { AppShellNav } from "@/components/app-shell-nav";
import { LogoutButton } from "@/components/logout-button";
import { TrustLoopLoader } from "@/components/trustloop-loader";
import { GlobalSearch } from "@/components/global-search";
import { TrustLoopLogo } from "@/components/trustloop-logo";
import { WorkspaceSwitcher } from "@/components/workspace-switcher";

type AppShellFrameProps = {
  workspaceName: string;
  workspacePlanTier: string;
  currentWorkspaceId: string;
  currentRole: string;
  currentSlug: string | null;
  complianceMode: boolean;
  workspaces: Array<{
    id: string;
    name: string;
    role: string;
    slug: string | null;
  }>;
  children: React.ReactNode;
};

export function AppShellFrame({
  workspaceName,
  workspacePlanTier,
  currentWorkspaceId,
  currentRole,
  currentSlug,
  complianceMode,
  workspaces,
  children,
}: AppShellFrameProps) {
  const [desktop, setDesktop] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 1024px)");
    const syncLayout = () => {
      setDesktop(mediaQuery.matches);
      setMenuOpen(false);
    };
    syncLayout();
    mediaQuery.addEventListener("change", syncLayout);
    return () => mediaQuery.removeEventListener("change", syncLayout);
  }, []);

  const planLabel = workspacePlanTier.toUpperCase();
  const sidebarClass = [
    "app-sidebar",
    !desktop && menuOpen ? "app-sidebar-mobile-open" : "",
  ].filter(Boolean).join(" ");

  return (
    <main className="app-main-shell">
      <TrustLoopLoader />
      <GlobalSearch />
      {!desktop ? (
        <header className="menu-mobile-bar">
          <button
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            className="app-sidebar-toggle"
            onClick={() => setMenuOpen((v) => !v)}
            type="button"
          >
            <SidebarSimple color="var(--color-subtext)" size={20} weight="regular" />
          </button>
          <TrustLoopLogo size={16} variant="full" />
          <span className="text-[11px] font-medium text-[var(--color-ghost)] truncate max-w-[100px]">{workspaceName}</span>
        </header>
      ) : null}

      {menuOpen && !desktop ? (
        <button aria-label="Close menu backdrop" className="menu-backdrop" onClick={() => setMenuOpen(false)} type="button" />
      ) : null}

      <aside className={sidebarClass}>
        <div className="app-sidebar-header">
          <TrustLoopLogo size={20} variant="full" />
        </div>

        <div className="app-sidebar-workspace">
          <div className="app-sidebar-workspace-row">
            <div className="app-sidebar-workspace-name">{workspaceName}</div>
            <span className="app-sidebar-plan">{planLabel}</span>
          </div>
          <WorkspaceSwitcher currentWorkspaceId={currentWorkspaceId} workspaces={workspaces} />
          {complianceMode ? <div className="badge badge-warning badge-sm w-fit">Compliance mode</div> : null}
        </div>

        <div className="app-sidebar-divider" />

        <div className="app-sidebar-section">
          <AppShellNav
            compact={false}
            role={currentRole}
            slug={currentSlug}
            onNavigate={() => { if (!desktop) setMenuOpen(false); }}
          />
        </div>

        <div className="app-sidebar-footer">
          <LogoutButton compact={false} />
        </div>
      </aside>

      <section className="app-shell-content" id="main-content">{children}</section>
    </main>
  );
}
