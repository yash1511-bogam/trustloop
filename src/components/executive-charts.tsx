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

type Props = {
  data: SeriesRow[];
};

export function ExecutiveCharts({ data }: Props) {
  const axisStroke = "#6b7c99";
  const gridStroke = "rgba(148, 163, 184, 0.2)";
  const tooltipStyle = {
    background: "rgba(15, 23, 42, 0.95)",
    border: "1px solid rgba(148, 163, 184, 0.35)",
    borderRadius: "12px",
    color: "#e5edf8",
  } as const;

  return (
    <div className="space-y-6">
      <section className="surface p-4">
        <h4 className="mb-4 text-sm font-semibold text-[var(--color-subtext)]">Incidents created vs resolved</h4>
        <div className="h-72 w-full">
          <ResponsiveContainer>
            <LineChart data={data}>
              <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" />
              <XAxis dataKey="day" stroke={axisStroke} tick={{ fill: axisStroke, fontSize: 12 }} />
              <YAxis stroke={axisStroke} tick={{ fill: axisStroke, fontSize: 12 }} />
              <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "#cbd5e1", fontWeight: 600 }} />
              <Legend wrapperStyle={{ color: "#cbd5e1" }} />
              <Line type="monotone" dataKey="incidentsCreated" stroke="#38bdf8" strokeWidth={2} dot={false} name="Created" />
              <Line type="monotone" dataKey="incidentsResolved" stroke="#34d399" strokeWidth={2} dot={false} name="Resolved" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="surface p-4">
        <h4 className="mb-4 text-sm font-semibold text-[var(--color-subtext)]">Open incidents (end of day)</h4>
        <div className="h-72 w-full">
          <ResponsiveContainer>
            <AreaChart data={data}>
              <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" />
              <XAxis dataKey="day" stroke={axisStroke} tick={{ fill: axisStroke, fontSize: 12 }} />
              <YAxis stroke={axisStroke} tick={{ fill: axisStroke, fontSize: 12 }} />
              <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "#cbd5e1", fontWeight: 600 }} />
              <Legend wrapperStyle={{ color: "#cbd5e1" }} />
              <Area type="monotone" dataKey="openAtEndOfDay" stroke="#f59e0b" fill="rgba(245, 158, 11, 0.15)" strokeWidth={2} name="Open" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="surface p-4">
        <h4 className="mb-4 text-sm font-semibold text-[var(--color-subtext)]">P1 incidents by day</h4>
        <div className="h-72 w-full">
          <ResponsiveContainer>
            <BarChart data={data}>
              <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" />
              <XAxis dataKey="day" stroke={axisStroke} tick={{ fill: axisStroke, fontSize: 12 }} />
              <YAxis stroke={axisStroke} tick={{ fill: axisStroke, fontSize: 12 }} />
              <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "#cbd5e1", fontWeight: 600 }} />
              <Legend wrapperStyle={{ color: "#cbd5e1" }} />
              <Bar dataKey="p1Created" fill="#fb7185" name="P1 created" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="surface p-4">
        <h4 className="mb-4 text-sm font-semibold text-[var(--color-subtext)]">AI triage runs &amp; customer updates</h4>
        <div className="h-72 w-full">
          <ResponsiveContainer>
            <LineChart data={data}>
              <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" />
              <XAxis dataKey="day" stroke={axisStroke} tick={{ fill: axisStroke, fontSize: 12 }} />
              <YAxis stroke={axisStroke} tick={{ fill: axisStroke, fontSize: 12 }} />
              <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "#cbd5e1", fontWeight: 600 }} />
              <Legend wrapperStyle={{ color: "#cbd5e1" }} />
              <Line type="monotone" dataKey="triageRuns" stroke="#a78bfa" strokeWidth={2} dot={false} name="Triage runs" />
              <Line type="monotone" dataKey="customerUpdatesSent" stroke="#2dd4bf" strokeWidth={2} dot={false} name="Customer updates" />
              <Line type="monotone" dataKey="reminderEmailsSent" stroke="#f97316" strokeWidth={2} dot={false} name="Reminder emails" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}
