"use client";

import { useEffect, useState } from "react";
import {
  Plus,
  ShieldWarning,
  CheckCircle,
  ListDashes,
  Warning,
} from "@phosphor-icons/react";
import { CreateIncidentForm } from "@/components/create-incident-form";
import { DashboardIncidentQueue } from "@/components/dashboard-incident-queue";

type Props = {
  counts: {
    total: number;
    open: number;
    p1: number;
    resolved7d: number;
  };
};

export function IncidentsPageClient({ counts }: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (!drawerOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setDrawerOpen(false); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [drawerOpen]);

  const stats = [
    { label: "Total incidents", value: counts.total, icon: ListDashes, color: "#d4622b", bg: "rgba(212,98,43,0.10)" },
    { label: "Open", value: counts.open, icon: ShieldWarning, color: "#e8944a", bg: "rgba(232,148,74,0.10)" },
    { label: "P1 critical", value: counts.p1, icon: Warning, color: "#c2571f", bg: "rgba(194,87,31,0.10)" },
    { label: "Resolved (7d)", value: counts.resolved7d, icon: CheckCircle, color: "#f0b27a", bg: "rgba(240,178,122,0.12)" },
  ];

  return (
    <div className="page-shell page-stack">
      {/* Hero */}
      <section className="dash-hero section-enter">
        <div className="dash-hero-inner">
          <div className="dash-hero-text">
            <p className="page-kicker">Incidents</p>
            <h1 className="page-title">All incidents</h1>
          </div>
          <div className="page-header-actions">
            <button className="btn btn-primary" onClick={() => setDrawerOpen(true)} type="button">
              <Plus size={14} weight="regular" />
              New incident
            </button>
          </div>
        </div>
      </section>

      {/* Stat cards */}
      <section className="dash-stats section-enter" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        {stats.map((s) => (
          <div key={s.label} className="dash-stat-card">
            <div className="dash-stat-icon" style={{ background: s.bg, color: s.color }}>
              <s.icon size={20} weight="duotone" />
            </div>
            <div className="dash-stat-value" style={{ fontSize: 28 }}>{s.value}</div>
            <div className="dash-stat-label">{s.label}</div>
          </div>
        ))}
      </section>

      {/* Queue */}
      <DashboardIncidentQueue />

      {/* Drawer */}
      {drawerOpen ? (
        <>
          <button
            aria-label="Close incident drawer"
            className="drawer-backdrop"
            onClick={() => setDrawerOpen(false)}
            type="button"
          />
          <div className="drawer-shell" role="dialog" aria-modal="true" aria-label="Create new incident">
            <div className="drawer-panel">
              <div className="drawer-header">
                <div className="section-heading">
                  <p className="page-kicker">New Incident</p>
                  <h2 className="settings-section-title">Log a new AI failure</h2>
                  <p className="section-description">
                    Capture customer impact, route ownership, and open the incident record immediately.
                  </p>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => setDrawerOpen(false)} type="button">
                  Close
                </button>
              </div>
              <div className="drawer-body">
                <CreateIncidentForm />
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
