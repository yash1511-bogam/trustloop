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
  return (
    <div className="space-y-5">
      <section className="surface p-4">
        <h4 className="mb-3 text-sm font-semibold text-slate-700">Incidents created vs resolved</h4>
        <div className="h-72 w-full">
          <ResponsiveContainer>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="incidentsCreated"
                stroke="#a16207"
                strokeWidth={2}
                dot={false}
                name="Created"
              />
              <Line
                type="monotone"
                dataKey="incidentsResolved"
                stroke="#0f766e"
                strokeWidth={2}
                dot={false}
                name="Resolved"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="surface p-4">
        <h4 className="mb-3 text-sm font-semibold text-slate-700">P1 incidents by day</h4>
        <div className="h-72 w-full">
          <ResponsiveContainer>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="p1Created" fill="#b42318" name="P1 created" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}
