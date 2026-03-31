"use client";

import { SidebarSimple, X } from "@phosphor-icons/react";
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
  trialDaysLeft: number | null;
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
  trialDaysLeft,
  workspaces,
  children,
}: AppShellFrameProps) {
  const [desktop, setDesktop] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window !== "undefined") return localStorage.getItem("sidebar-collapsed") === "1";
    return false;
  });

  useEffect(() => {
    localStorage.setItem("sidebar-collapsed", collapsed ? "1" : "0");
  }, [collapsed]);

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
    desktop && collapsed ? "app-sidebar-collapsed" : "",
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
          {!(desktop && collapsed) && <TrustLoopLogo size={20} variant="full" />}
          {desktop ? (
            <button
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              className="app-sidebar-toggle"
              onClick={() => setCollapsed((v) => !v)}
              type="button"
            >
              <SidebarSimple color="var(--color-subtext)" size={20} weight="regular" />
            </button>
          ) : (
            <button
              aria-label="Close menu"
              className="app-sidebar-toggle"
              onClick={() => setMenuOpen(false)}
              type="button"
            >
              <X color="var(--color-subtext)" size={20} weight="regular" />
            </button>
          )}
        </div>

        {!(desktop && collapsed) && (
          <div className="app-sidebar-workspace">
            <div className="app-sidebar-workspace-row">
              <div className="app-sidebar-workspace-name">{workspaceName}</div>
              <span className="app-sidebar-plan">{planLabel}</span>
            </div>
            {trialDaysLeft !== null && (
              <div className="text-[11px] font-medium px-2 py-0.5 rounded-full w-fit" style={{ background: trialDaysLeft <= 3 ? "rgba(232,66,66,0.12)" : "rgba(14,165,233,0.12)", color: trialDaysLeft <= 3 ? "var(--color-danger)" : "var(--color-info)" }}>
                {trialDaysLeft === 0 ? "Trial expires today" : `${trialDaysLeft}d left in trial`}
              </div>
            )}
            <WorkspaceSwitcher currentWorkspaceId={currentWorkspaceId} workspaces={workspaces} />
            {complianceMode ? <div className="badge badge-warning badge-sm w-fit">Compliance mode</div> : null}
          </div>
        )}

        <div className="app-sidebar-divider" />

        <div className="app-sidebar-section">
          <AppShellNav
            compact={desktop && collapsed}
            role={currentRole}
            slug={currentSlug}
            onNavigate={() => { if (!desktop) setMenuOpen(false); }}
          />
        </div>

        <div className="app-sidebar-footer">
          <LogoutButton compact={desktop && collapsed} />
        </div>
      </aside>

      <section className="app-shell-content" id="main-content">{children}</section>
    </main>
  );
}
