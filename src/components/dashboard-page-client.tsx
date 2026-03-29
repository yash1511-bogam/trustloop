"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Plus,
  Lightning,
  ShieldWarning,
  CheckCircle,
  Clock,
  ChartPie,
} from "@phosphor-icons/react";
import { CreateIncidentForm } from "@/components/create-incident-form";
import { DashboardIncidentQueue } from "@/components/dashboard-incident-queue";
import { OnboardingChecklist } from "@/components/onboarding-checklist";
import { ResponsiveBar } from "@nivo/bar";

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
  onboarding: {
    dismissed: boolean;
    hasIncident: boolean;
    hasTriaged: boolean;
    hasAiKey: boolean;
    hasSlack: boolean;
    hasWebhook: boolean;
  };
};

/* ── Donut chart (pure SVG) ── */
function CoverageDonut({ triage, update }: { triage: number; update: number }) {
  const r = 54;
  const c = 2 * Math.PI * r;
  const gap = c * 0.02;
  const triageLen = (triage / 100) * c - gap;
  const updateLen = (update / 100) * c - gap;
  const remaining = c - triageLen - updateLen - gap * 3;

  return (
    <div className="flex flex-col items-center gap-4">
      <svg width={140} height={140} viewBox="0 0 140 140">
        <circle cx={70} cy={70} r={r} fill="none" stroke="var(--color-rim)" strokeWidth={12} />
        <circle
          cx={70} cy={70} r={r} fill="none"
          stroke="#d4622b" strokeWidth={12}
          strokeDasharray={`${triageLen} ${c - triageLen}`}
          strokeDashoffset={c * 0.25}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 0.6s ease" }}
        />
        <circle
          cx={70} cy={70} r={r} fill="none"
          stroke="#e8944a" strokeWidth={12}
          strokeDasharray={`${updateLen} ${c - updateLen}`}
          strokeDashoffset={c * 0.25 - triageLen - gap}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 0.6s ease" }}
        />
        <circle
          cx={70} cy={70} r={r} fill="none"
          stroke="var(--color-raised)" strokeWidth={12}
          strokeDasharray={`${remaining > 0 ? remaining : 0} ${c - (remaining > 0 ? remaining : 0)}`}
          strokeDashoffset={c * 0.25 - triageLen - gap - updateLen - gap}
          strokeLinecap="round"
        />
        <text x={70} y={66} textAnchor="middle" fill="var(--color-title)" fontSize={22} fontWeight={700}>
          {Math.round((triage + update) / 2)}%
        </text>
        <text x={70} y={84} textAnchor="middle" fill="var(--color-ghost)" fontSize={11}>
          avg coverage
        </text>
      </svg>
      <div className="flex flex-col gap-2 text-[13px]">
        <div className="flex items-center gap-2">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: "#d4622b" }} />
          <span className="text-[var(--color-subtext)]">Triage</span>
          <span className="ml-auto font-semibold text-[var(--color-title)]">{triage}%</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: "#e8944a" }} />
          <span className="text-[var(--color-subtext)]">Updates</span>
          <span className="ml-auto font-semibold text-[var(--color-title)]">{update}%</span>
        </div>
      </div>
    </div>
  );
}

export function DashboardPageClient({
  counts,
  snapshot,
  onboarding,
}: DashboardPageClientProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (!drawerOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setDrawerOpen(false); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [drawerOpen]);

  const triagePct = snapshot?.triageCoveragePct ?? 0;
  const updatePct = snapshot?.customerUpdateCoveragePct ?? 0;

  const stats = [
    {
      label: "Open incidents",
      value: counts.open,
      icon: ShieldWarning,
      color: "#d4622b",
      bg: "rgba(212,98,43,0.10)",
      sub: `${counts.p1} P1 critical`,
      trend: counts.created7d > counts.resolved ? "up" as const : "down" as const,
      trendValue: counts.created7d > 0 ? `+${counts.created7d} this week` : "No new this week",
    },
    {
      label: "Resolved (7d)",
      value: counts.resolved,
      icon: CheckCircle,
      color: "#e8944a",
      bg: "rgba(232,148,74,0.10)",
      sub: `${counts.total} total all-time`,
      trend: "up" as const,
      trendValue: counts.resolved > 0 ? `${counts.resolved} closed` : "None yet",
    },
    {
      label: "Avg resolution",
      value: `${counts.avgResolutionHours.toFixed(1)}h`,
      icon: Clock,
      color: "#c2571f",
      bg: "rgba(194,87,31,0.10)",
      sub: "Last 30 days",
      trend: counts.avgResolutionHours < 24 ? "down" as const : "up" as const,
      trendValue: counts.avgResolutionHours < 24 ? "Under target" : "Above target",
    },
  ];

  return (
    <div className="page-shell page-stack">
      <OnboardingChecklist onboarding={onboarding} />

      {/* ── Page header ── */}
      <section className="dash-hero section-enter">
        <div className="dash-hero-inner">
          <div className="dash-hero-text">
            <p className="page-kicker">Dashboard</p>
            <h1 className="page-title">Command center</h1>
          </div>
          <div className="page-header-actions">
            <Link className="btn btn-ghost" href="/executive">
              Executive view
              <ArrowRight size={14} weight="regular" />
            </Link>
            <button className="btn btn-primary" onClick={() => setDrawerOpen(true)} type="button">
              <Plus size={14} weight="regular" />
              New incident
            </button>
          </div>
        </div>
      </section>

      {/* ── Stat cards row ── */}
      <section className="dash-stats section-enter">
        {stats.map((s) => (
          <div key={s.label} className="dash-stat-card">
            <div className="dash-stat-top">
              <div className="dash-stat-icon" style={{ background: s.bg, color: s.color }}>
                <s.icon size={20} weight="duotone" />
              </div>
              <span className={`dash-stat-trend ${s.trend === "down" ? "dash-stat-trend-good" : "dash-stat-trend-warn"}`}>
                {s.trend === "up" ? <ArrowUp size={12} weight="bold" /> : <ArrowDown size={12} weight="bold" />}
                {s.trendValue}
              </span>
            </div>
            <div className="dash-stat-value">{s.value}</div>
            <div className="dash-stat-label">{s.label}</div>
            <div className="dash-stat-sub">{s.sub}</div>
          </div>
        ))}
      </section>

      {/* ── Analytics row: bar chart + coverage donut ── */}
      <section className="dash-analytics section-enter">
        <div className="dash-chart-card dash-chart-card-wide">
          <div className="dash-chart-header">
            <div>
              <h2 className="dash-chart-title">Incident velocity</h2>
              <p className="dash-chart-desc">Severity breakdown of your queue</p>
            </div>
            <div className="flex items-center gap-2">
              <Lightning size={16} weight="duotone" color="#d4622b" />
              <span className="text-[12px] text-[var(--color-ghost)]">Live</span>
            </div>
          </div>
          <div className="h-[280px] w-full">
            <ResponsiveBar
              data={[
                { id: "P1 Critical", value: counts.p1, color: "#c2571f" },
                { id: "Open", value: counts.open, color: "#d4622b" },
                { id: "Resolved", value: counts.resolved, color: "#e8944a" },
                { id: "Created", value: counts.created7d, color: "#f0b27a" },
              ]}
              keys={["value"]}
              indexBy="id"
              margin={{ top: 12, right: 12, bottom: 36, left: 36 }}
              padding={0.45}
              valueScale={{ type: "linear" }}
              indexScale={{ type: "band", round: true }}
              colors={{ datum: "data.color" }}
              borderRadius={6}
              borderWidth={0}
              theme={{
                text: { fill: "var(--color-subtext)", fontSize: 12, fontFamily: "var(--font-ui)" },
                axis: {
                  domain: { line: { stroke: "transparent" } },
                  ticks: { line: { stroke: "transparent" }, text: { fill: "var(--color-ghost)" } },
                },
                grid: { line: { stroke: "var(--color-rim)", strokeDasharray: "4 4" } },
                tooltip: { container: { background: "var(--color-surface)", color: "var(--color-title)", borderRadius: "10px", boxShadow: "0 8px 32px rgba(0,0,0,0.4)", fontSize: 13 } },
              }}
              axisTop={null}
              axisRight={null}
              axisBottom={{ tickSize: 0, tickPadding: 12, tickRotation: 0 }}
              axisLeft={{ tickSize: 0, tickPadding: 12, tickRotation: 0, tickValues: 5 }}
              labelSkipWidth={12}
              labelSkipHeight={12}
              labelTextColor="#fff"
              animate={true}
              motionConfig="wobbly"
            />
          </div>
        </div>

        <div className="dash-chart-card">
          <div className="dash-chart-header">
            <div>
              <h2 className="dash-chart-title">Coverage</h2>
              <p className="dash-chart-desc">Triage & customer updates</p>
            </div>
            <ChartPie size={16} weight="duotone" color="#d4622b" />
          </div>
          <div className="flex items-center justify-center py-4">
            <CoverageDonut triage={triagePct} update={updatePct} />
          </div>
        </div>
      </section>

      {/* ── Incident queue ── */}
      <DashboardIncidentQueue />

      {/* ── Create incident drawer ── */}
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
