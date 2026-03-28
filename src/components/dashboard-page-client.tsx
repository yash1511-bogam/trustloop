"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  CaretDown,
  CaretRight,
  Plus,
} from "@phosphor-icons/react";
import { CreateIncidentForm } from "@/components/create-incident-form";
import { DashboardIncidentQueue } from "@/components/dashboard-incident-queue";
import { OnboardingChecklist } from "@/components/onboarding-checklist";

type Snapshot = {
  updatedAt?: string | null;
  triageCoveragePct?: number | null;
  customerUpdateCoveragePct?: number | null;
  p1OpenIncidents?: number | null;
};

type DashboardPageClientProps = {
  counts: {
    total: number;
    p1: number;
    open: number;
    resolved: number;
    created7d: number;
    avgResolutionHours: number;
  };
  snapshot: Snapshot | null;
};

export function DashboardPageClient({
  counts,
  snapshot,
}: DashboardPageClientProps) {
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Close drawer on Escape key
  useEffect(() => {
    if (!drawerOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setDrawerOpen(false); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [drawerOpen]);

  return (
    <div className="page-shell page-stack">
      <OnboardingChecklist />

      <section className="page-header section-enter">
        <div className="page-header-main">
          <p className="page-kicker">Incident Operations</p>
          <h1 className="page-title">Command dashboard</h1>
          <p className="page-description">
            Live responder metrics, queue pressure, and customer-safe action paths in one controlled surface.
          </p>
        </div>
        <div className="page-header-actions">
          <Link className="btn btn-ghost" href="/executive">
            Open executive view
            <ArrowRight size={16} weight="regular" />
          </Link>
          <button className="btn btn-primary" onClick={() => setDrawerOpen(true)} title="Create new incident (N)" type="button">
            <Plus size={16} weight="regular" />
            New Incident
          </button>
        </div>
      </section>

      <section className="section-enter">
        <div className="section-heading">
          <h2 className="section-title">Live metrics</h2>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          <article className="metric-card stagger-item">
            <p className="metric-label">Total incidents</p>
            <p className="metric-value">{counts.total}</p>
            <p className="metric-meta">All time</p>
          </article>
          <article className="metric-card metric-card-p1 stagger-item">
            <p className="metric-label">P1 open</p>
            <p className="metric-value">{counts.p1}</p>
            <p className="metric-meta">Immediate attention</p>
          </article>
          <article className="metric-card stagger-item">
            <p className="metric-label">Open incidents</p>
            <p className="metric-value">{counts.open}</p>
            <p className="metric-meta">Current queue</p>
          </article>
          <article className="metric-card stagger-item">
            <p className="metric-label">Resolved</p>
            <p className="metric-value">{counts.resolved}</p>
            <p className="metric-meta">Past 7 days</p>
          </article>
          <article className="metric-card stagger-item">
            <p className="metric-label">Created</p>
            <p className="metric-value">{counts.created7d}</p>
            <p className="metric-meta">Past 7 days</p>
          </article>
          <article className="metric-card stagger-item">
            <p className="metric-label">Avg resolve</p>
            <p className="metric-value">{counts.avgResolutionHours}</p>
            <p className="metric-meta">Hours over 30 days</p>
          </article>
        </div>
      </section>

      <section className="section-enter">
        <div className="surface p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="section-heading">
              <h2 className="section-title">Executive read-model snapshot</h2>
              <p className="section-description">
                Collapsed by default so responders stay focused on the live queue.
              </p>
            </div>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setAnalyticsOpen((value) => !value)}
              type="button"
            >
              {analyticsOpen ? "Collapse analytics" : "Expand analytics"}
              {analyticsOpen ? <CaretDown size={14} weight="regular" /> : <CaretRight size={14} weight="regular" />}
            </button>
          </div>

          {analyticsOpen ? (
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <article className="metric-card">
                <p className="metric-label">Triage coverage</p>
                <p className="metric-value">{snapshot?.triageCoveragePct ?? 0}</p>
                <p className="metric-meta">30 day percentage</p>
              </article>
              <article className="metric-card">
                <p className="metric-label">Customer updates</p>
                <p className="metric-value">{snapshot?.customerUpdateCoveragePct ?? 0}</p>
                <p className="metric-meta">30 day percentage</p>
              </article>
              <article className="metric-card metric-card-p1">
                <p className="metric-label">P1 active now</p>
                <p className="metric-value">{snapshot?.p1OpenIncidents ?? 0}</p>
                <p className="metric-meta">
                  {snapshot?.updatedAt
                    ? `Updated ${new Date(snapshot.updatedAt).toLocaleString("en-US")}`
                    : "No cached snapshot yet"}
                </p>
              </article>
            </div>
          ) : null}
        </div>
      </section>

      <DashboardIncidentQueue />

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
