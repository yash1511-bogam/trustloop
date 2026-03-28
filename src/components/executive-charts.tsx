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
  const axisStroke = "#5a5b63";
  const gridStroke = "rgba(35, 36, 40, 0.8)";
  const tooltipStyle = {
    background: "rgba(16, 17, 19, 0.96)",
    border: "1px solid rgba(35, 36, 40, 1)",
    borderRadius: "10px",
    color: "#c6c7d0",
    fontSize: "13px",
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
              <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "#ecedf1", fontWeight: 600, fontSize: 13 }} />
              <Legend wrapperStyle={{ color: "#8a8b95", fontSize: 12 }} />
              <Line type="monotone" dataKey="incidentsCreated" stroke="#6b7fbf" strokeWidth={2} dot={false} name="Created" animationDuration={600} animationEasing="ease-out" />
              <Line type="monotone" dataKey="incidentsResolved" stroke="#16a34a" strokeWidth={2} dot={false} name="Resolved" animationDuration={600} animationEasing="ease-out" />
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
              <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "#ecedf1", fontWeight: 600, fontSize: 13 }} />
              <Legend wrapperStyle={{ color: "#8a8b95", fontSize: 12 }} />
              <Area type="monotone" dataKey="openAtEndOfDay" stroke="#d97706" fill="rgba(217, 119, 6, 0.1)" strokeWidth={2} name="Open" animationDuration={600} animationEasing="ease-out" />
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
              <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "#ecedf1", fontWeight: 600, fontSize: 13 }} />
              <Legend wrapperStyle={{ color: "#8a8b95", fontSize: 12 }} />
              <Bar dataKey="p1Created" fill="#e84242" name="P1 created" radius={[6, 6, 0, 0]} animationDuration={500} animationEasing="ease-out" />
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
              <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "#ecedf1", fontWeight: 600, fontSize: 13 }} />
              <Legend wrapperStyle={{ color: "#8a8b95", fontSize: 12 }} />
              <Line type="monotone" dataKey="triageRuns" stroke="#6b7fbf" strokeWidth={2} dot={false} name="Triage runs" animationDuration={600} animationEasing="ease-out" />
              <Line type="monotone" dataKey="customerUpdatesSent" stroke="#16a34a" strokeWidth={2} dot={false} name="Customer updates" animationDuration={600} animationEasing="ease-out" />
              <Line type="monotone" dataKey="reminderEmailsSent" stroke="#d4622b" strokeWidth={2} dot={false} name="Reminder emails" animationDuration={600} animationEasing="ease-out" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}
