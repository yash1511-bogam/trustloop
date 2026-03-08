"use client";

import {
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
  p1Created: number;
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
        <h4 className="mb-4 text-sm font-semibold text-neutral-400">Incidents created vs resolved</h4>
        <div className="h-72 w-full">
          <ResponsiveContainer>
            <LineChart data={data}>
              <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" />
              <XAxis dataKey="day" stroke={axisStroke} tick={{ fill: axisStroke, fontSize: 12 }} />
              <YAxis stroke={axisStroke} tick={{ fill: axisStroke, fontSize: 12 }} />
              <Tooltip
                contentStyle={tooltipStyle}
                labelStyle={{ color: "#cbd5e1", fontWeight: 600 }}
              />
              <Legend wrapperStyle={{ color: "#cbd5e1" }} />
              <Line
                type="monotone"
                dataKey="incidentsCreated"
                stroke="#38bdf8"
                strokeWidth={2}
                dot={false}
                name="Created"
              />
              <Line
                type="monotone"
                dataKey="incidentsResolved"
                stroke="#34d399"
                strokeWidth={2}
                dot={false}
                name="Resolved"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="surface p-4">
        <h4 className="mb-4 text-sm font-semibold text-neutral-400">P1 incidents by day</h4>
        <div className="h-72 w-full">
          <ResponsiveContainer>
            <BarChart data={data}>
              <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" />
              <XAxis dataKey="day" stroke={axisStroke} tick={{ fill: axisStroke, fontSize: 12 }} />
              <YAxis stroke={axisStroke} tick={{ fill: axisStroke, fontSize: 12 }} />
              <Tooltip
                contentStyle={tooltipStyle}
                labelStyle={{ color: "#cbd5e1", fontWeight: 600 }}
              />
              <Legend wrapperStyle={{ color: "#cbd5e1" }} />
              <Bar dataKey="p1Created" fill="#fb7185" name="P1 created" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}
