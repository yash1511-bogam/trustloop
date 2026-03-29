"use client";

import { SidebarSimple } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import Image from "next/image";
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 1024px)");

    const syncLayout = () => {
      const isDesktop = mediaQuery.matches;
      setDesktop(isDesktop);
      setMenuOpen(false);
    };

    syncLayout();
    mediaQuery.addEventListener("change", syncLayout);
    return () => mediaQuery.removeEventListener("change", syncLayout);
  }, []);

  function closeMenu() {
    setMenuOpen(false);
  }

  const compact = desktop && sidebarCollapsed;
  const planLabel = workspacePlanTier.toUpperCase();
  const sidebarClass = [
    "app-sidebar",
    compact ? "app-sidebar-collapsed" : "",
    !desktop && menuOpen ? "app-sidebar-mobile-open" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const initial = workspaceName.charAt(0).toUpperCase();

  return (
    <main className="app-main-shell">
      <TrustLoopLoader />
      <GlobalSearch />
      {!desktop ? (
        <header className="menu-mobile-bar">
          <button
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            className="app-sidebar-toggle"
            onClick={() => setMenuOpen((value) => !value)}
            type="button"
          >
            <SidebarSimple color="var(--color-subtext)" size={20} weight="regular" />
          </button>
          <TrustLoopLogo size={16} variant="full" />
          <span className="text-[11px] font-medium text-[var(--color-ghost)] truncate max-w-[100px]">{workspaceName}</span>
        </header>
      ) : null}

      {menuOpen && !desktop ? (
        <button
          aria-label="Close menu backdrop"
          className="menu-backdrop"
          onClick={closeMenu}
          type="button"
        />
      ) : null}

      <aside className={sidebarClass}>
        <div className="app-sidebar-header">
          {compact ? (
            <Image src="/Logo/%E2%88%9E.svg" alt="TrustLoop" width={28} height={16} draggable={false} />
          ) : (
            <>
              <TrustLoopLogo size={20} variant="full" />
              {desktop ? (
                <button
                  aria-label="Collapse sidebar"
                  className="app-sidebar-toggle"
                  onClick={() => setSidebarCollapsed(true)}
                  type="button"
                >
                  <SidebarSimple color="var(--color-subtext)" size={18} weight="regular" />
                </button>
              ) : null}
            </>
          )}
        </div>

        {compact ? (
          <div className="flex justify-center py-2">
            <div
              className="flex items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-surface)] text-[var(--color-title)] font-semibold text-[13px] cursor-pointer"
              style={{ width: 36, height: 36 }}
              title={`${workspaceName} · ${planLabel}`}
              onClick={() => setSidebarCollapsed(false)}
            >
              {initial}
            </div>
          </div>
        ) : (
          <div className="app-sidebar-workspace">
            <div className="app-sidebar-workspace-row">
              <div className="app-sidebar-workspace-name">{workspaceName}</div>
              <span className="app-sidebar-plan">{planLabel}</span>
            </div>
            <WorkspaceSwitcher
              currentWorkspaceId={currentWorkspaceId}
              workspaces={workspaces}
            />
            {complianceMode ? (
              <div className="badge badge-warning badge-sm w-fit">Compliance mode</div>
            ) : null}
          </div>
        )}

        <div className="app-sidebar-divider" />

        <div className="app-sidebar-section">
          <AppShellNav
            compact={compact}
            role={currentRole}
            slug={currentSlug}
            onNavigate={() => {
              if (!desktop) closeMenu();
            }}
          />
        </div>

        <div className="app-sidebar-footer">
          <LogoutButton compact={compact} />
        </div>
      </aside>

      <section className="app-shell-content" id="main-content">{children}</section>
    </main>
  );
}
