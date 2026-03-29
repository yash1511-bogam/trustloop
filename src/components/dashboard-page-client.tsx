"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
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
        <div className="section-heading mb-6">
          <h2 className="section-title">Incident Velocity & Severity</h2>
          <p className="section-description">Live multidimensional view of your incident queue.</p>
        </div>
        <div className="surface p-6 h-[400px] w-full relative">
          <ResponsiveBar
            data={[
              { id: "P1 Critical", value: counts.p1, color: "var(--color-danger)" },
              { id: "Open Queue", value: counts.open, color: "var(--color-warning)" },
              { id: "Resolved (7d)", value: counts.resolved, color: "var(--color-resolve)" },
              { id: "Created (7d)", value: counts.created7d, color: "var(--color-info)" },
            ]}
            keys={["value"]}
            indexBy="id"
            margin={{ top: 20, right: 20, bottom: 40, left: 40 }}
            padding={0.4}
            valueScale={{ type: "linear" }}
            indexScale={{ type: "band", round: true }}
            colors={{ datum: "data.color" }}
            borderRadius={8}
            borderWidth={0}
            theme={{
              text: { fill: "var(--color-subtext)", fontSize: 13, fontFamily: "var(--font-ui)" },
              axis: {
                domain: { line: { stroke: "transparent" } },
                ticks: { line: { stroke: "transparent" }, text: { fill: "var(--color-ghost)" } },
              },
              grid: { line: { stroke: "var(--color-rim)", strokeDasharray: "4 4" } },
              tooltip: { container: { background: "var(--color-surface)", color: "var(--color-title)", borderRadius: "12px", boxShadow: "0 8px 32px rgba(0,0,0,0.4)" } },
            }}
            axisTop={null}
            axisRight={null}
            axisBottom={{
              tickSize: 0,
              tickPadding: 16,
              tickRotation: 0,
            }}
            axisLeft={{
              tickSize: 0,
              tickPadding: 16,
              tickRotation: 0,
              tickValues: 5,
            }}
            labelSkipWidth={12}
            labelSkipHeight={12}
            labelTextColor="var(--color-void)"
            animate={true}
            motionConfig="wobbly"
          />
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
