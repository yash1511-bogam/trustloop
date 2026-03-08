"use client";

import { CalendarClock, PanelLeftClose, PanelLeftOpen, Siren } from "lucide-react";
import { useEffect, useState } from "react";
import { AppShellNav } from "@/components/app-shell-nav";
import { LogoutButton } from "@/components/logout-button";
import { ThemeToggle } from "@/components/theme-toggle";

type AppShellFrameProps = {
  workspaceName: string;
  userName: string;
  complianceMode: boolean;
  children: React.ReactNode;
};

export function AppShellFrame({
  workspaceName,
  userName,
  complianceMode,
  children,
}: AppShellFrameProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [desktop, setDesktop] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 1024px)");

    const syncLayout = () => {
      const isDesktop = mediaQuery.matches;
      setDesktop(isDesktop);
      setMenuOpen(isDesktop);
    };

    syncLayout();
    mediaQuery.addEventListener("change", syncLayout);
    return () => mediaQuery.removeEventListener("change", syncLayout);
  }, []);

  function closeMenu() {
    setMenuOpen(false);
  }

  const compactDesktopMenu = desktop && !menuOpen;
  const drawerClass = desktop
    ? compactDesktopMenu
      ? "menu-drawer menu-drawer-desktop menu-drawer-compact"
      : "menu-drawer menu-drawer-desktop"
    : menuOpen
      ? "menu-drawer menu-drawer-mobile menu-drawer-open"
      : "menu-drawer menu-drawer-mobile";
  const contentClass = desktop
    ? compactDesktopMenu
      ? "menu-content page-stack min-w-0 menu-content-compact"
      : "menu-content page-stack min-w-0 menu-content-open"
    : "menu-content page-stack min-w-0";

  return (
    <main className="app-main-shell fade-in">
      {!desktop ? (
        <header className="menu-mobile-bar">
          <button
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            className="menu-toggle"
            onClick={() => setMenuOpen((value) => !value)}
            type="button"
          >
            {menuOpen ? <PanelLeftClose className="h-5 w-5" /> : <PanelLeftOpen className="h-5 w-5" />}
          </button>
          <div className="menu-bar-title">
            <Siren className="h-4 w-4" />
            <span>TrustLoop</span>
          </div>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
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

      <aside className={drawerClass}>
        <div className={compactDesktopMenu ? "menu-drawer-top menu-drawer-top-compact" : "menu-drawer-top"}>
          <div className="inline-flex items-center gap-2">
            <button
              aria-label={menuOpen ? "Collapse menu" : "Expand menu"}
              className="menu-toggle"
              onClick={() => setMenuOpen((value) => !value)}
              type="button"
            >
              {menuOpen ? <PanelLeftClose className="h-5 w-5" /> : <PanelLeftOpen className="h-5 w-5" />}
            </button>
            {compactDesktopMenu ? null : (
              <div className="menu-drawer-brand">
                <Siren className="h-4 w-4" />
                <span>TrustLoop</span>
              </div>
            )}
          </div>
          <ThemeToggle />
        </div>

        {compactDesktopMenu ? null : (
          <div className="menu-drawer-meta">
            <p className="kicker">{workspaceName}</p>
            <h1 className="text-lg font-semibold text-slate-100">Operations</h1>
            <p className="text-sm text-neutral-500">{userName}</p>
            {complianceMode ? (
              <span className="inline-flex rounded-full border border-neutral-800 bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-300">
                Compliance mode
              </span>
            ) : null}
          </div>
        )}

        <AppShellNav
          compact={compactDesktopMenu}
          onNavigate={() => {
            if (!desktop) closeMenu();
          }}
        />

        {compactDesktopMenu ? null : (
          <div className="menu-drawer-footer">
            <div className="panel-card p-4 text-xs text-neutral-500">
              <div className="mb-1 inline-flex items-center gap-1 font-semibold text-slate-400">
                <CalendarClock className="h-3.5 w-3.5" />
                Daily Workflow
              </div>
              <p>Review P1 queue, send customer-safe updates, then refresh executive read models.</p>
            </div>
            <LogoutButton />
          </div>
        )}
      </aside>

      <section className={contentClass}>
        {children}
      </section>
    </main>
  );
}
