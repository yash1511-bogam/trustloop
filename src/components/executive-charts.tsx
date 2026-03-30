"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type SeriesRow = {
  day: string;
  incidentsCreated: number;
  incidentsResolved: number;
  openAtEndOfDay: number;
  p1Created: number;
  triageRuns: number;
  customerUpdatesSent: number;
  reminderEmailsSent: number;
};

type Props = { data: SeriesRow[] };

/* ── Palette ── */
const colors = {
  created:   "#f97316",  // orange
  resolved:  "#22c55e",  // green
  open:      "#6366f1",  // indigo
  p1:        "#ef4444",  // red
  triage:    "#8b5cf6",  // violet
  updates:   "#06b6d4",  // cyan
  reminders: "#f59e0b",  // amber
};

/* ── Shared styles ── */
const axisStroke = "#4b5563";
const gridStroke = "rgba(55, 65, 81, 0.4)";

const tooltipStyle = {
  background: "rgba(10, 11, 13, 0.95)",
  border: "1px solid rgba(99, 102, 241, 0.2)",
  borderRadius: "12px",
  color: "#e5e7eb",
  fontSize: "13px",
  boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
  backdropFilter: "blur(8px)",
} as const;

const labelStyle = { color: "#f3f4f6", fontWeight: 600, fontSize: 13 } as const;
const legendStyle = { color: "#9ca3af", fontSize: 12, paddingTop: 8 } as const;

const dotStyle = { r: 3, strokeWidth: 2, fill: "#0a0b0d" };
const activeDot = { r: 5, strokeWidth: 2, fill: "#0a0b0d" };

function GradientDefs() {
  return (
    <defs>
      <linearGradient id="gradOpen" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={colors.open} stopOpacity={0.3} />
        <stop offset="100%" stopColor={colors.open} stopOpacity={0.02} />
      </linearGradient>
      <linearGradient id="gradP1" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={colors.p1} stopOpacity={0.8} />
        <stop offset="100%" stopColor={colors.p1} stopOpacity={0.4} />
      </linearGradient>
    </defs>
  );
}

export function ExecutiveCharts({ data }: Props) {
  return (
    <div className="space-y-6">
      {/* Created vs Resolved */}
      <section className="dash-chart-card">
        <div className="dash-chart-header">
          <div><h4 className="dash-chart-title">Incidents created vs resolved</h4></div>
        </div>
        <div className="h-72 w-full" style={{ cursor: "crosshair" }}>
          <ResponsiveContainer>
            <LineChart data={data}>
              <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="day" stroke={axisStroke} tick={{ fill: axisStroke, fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis stroke={axisStroke} tick={{ fill: axisStroke, fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={tooltipStyle} labelStyle={labelStyle} cursor={{ stroke: "rgba(255,255,255,0.08)", strokeWidth: 1 }} />
              <Legend wrapperStyle={legendStyle} />
              <Line type="monotone" dataKey="incidentsCreated" stroke={colors.created} strokeWidth={2.5} dot={dotStyle} activeDot={{ ...activeDot, stroke: colors.created }} name="Created" animationDuration={600} />
              <Line type="monotone" dataKey="incidentsResolved" stroke={colors.resolved} strokeWidth={2.5} dot={dotStyle} activeDot={{ ...activeDot, stroke: colors.resolved }} name="Resolved" animationDuration={600} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Open incidents */}
      <section className="dash-chart-card">
        <div className="dash-chart-header">
          <div><h4 className="dash-chart-title">Open incidents (end of day)</h4></div>
        </div>
        <div className="h-72 w-full" style={{ cursor: "crosshair" }}>
          <ResponsiveContainer>
            <AreaChart data={data}>
              <GradientDefs />
              <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="day" stroke={axisStroke} tick={{ fill: axisStroke, fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis stroke={axisStroke} tick={{ fill: axisStroke, fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={tooltipStyle} labelStyle={labelStyle} cursor={{ stroke: "rgba(255,255,255,0.08)", strokeWidth: 1 }} />
              <Legend wrapperStyle={legendStyle} />
              <Area type="monotone" dataKey="openAtEndOfDay" stroke={colors.open} fill="url(#gradOpen)" strokeWidth={2.5} dot={dotStyle} activeDot={{ ...activeDot, stroke: colors.open }} name="Open" animationDuration={600} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* P1 by day */}
      <section className="dash-chart-card">
        <div className="dash-chart-header">
          <div><h4 className="dash-chart-title">P1 incidents by day</h4></div>
        </div>
        <div className="h-72 w-full" style={{ cursor: "crosshair" }}>
          <ResponsiveContainer>
            <BarChart data={data} barCategoryGap="30%">
              <GradientDefs />
              <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="day" stroke={axisStroke} tick={{ fill: axisStroke, fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis stroke={axisStroke} tick={{ fill: axisStroke, fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} labelStyle={labelStyle} cursor={{ fill: "rgba(255,255,255,0.04)", radius: 6 }} />
              <Legend wrapperStyle={legendStyle} />
              <Bar dataKey="p1Created" fill="url(#gradP1)" name="P1 created" radius={[8, 8, 0, 0]} animationDuration={500} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Triage, updates, reminders */}
      <section className="dash-chart-card">
        <div className="dash-chart-header">
          <div><h4 className="dash-chart-title">AI triage runs &amp; customer updates</h4></div>
        </div>
        <div className="h-72 w-full" style={{ cursor: "crosshair" }}>
          <ResponsiveContainer>
            <LineChart data={data}>
              <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="day" stroke={axisStroke} tick={{ fill: axisStroke, fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis stroke={axisStroke} tick={{ fill: axisStroke, fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={tooltipStyle} labelStyle={labelStyle} cursor={{ stroke: "rgba(255,255,255,0.08)", strokeWidth: 1 }} />
              <Legend wrapperStyle={legendStyle} />
              <Line type="monotone" dataKey="triageRuns" stroke={colors.triage} strokeWidth={2.5} dot={dotStyle} activeDot={{ ...activeDot, stroke: colors.triage }} name="Triage runs" animationDuration={600} />
              <Line type="monotone" dataKey="customerUpdatesSent" stroke={colors.updates} strokeWidth={2.5} dot={dotStyle} activeDot={{ ...activeDot, stroke: colors.updates }} name="Customer updates" animationDuration={600} />
              <Line type="monotone" dataKey="reminderEmailsSent" stroke={colors.reminders} strokeWidth={2.5} dot={dotStyle} activeDot={{ ...activeDot, stroke: colors.reminders }} name="Reminder emails" animationDuration={600} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}
