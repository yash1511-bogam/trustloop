"use client";

import { ResponsiveBar } from "@nivo/bar";
import { useMemo } from "react";

type Update = {
  publishedAt: Date;
  incident: { severity: string };
};

export function StatusTimelineChart({ updates }: { updates: Update[] }) {
  const data = useMemo(() => {
    // Generate last 7 days
    const days: Record<string, { date: string; P1: number; P2: number; P3: number }> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      days[dateStr] = { date: dateStr, P1: 0, P2: 0, P3: 0 };
    }

    updates.forEach((update) => {
      const dateStr = new Date(update.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" });
      if (days[dateStr]) {
        if (update.incident.severity === "P1") days[dateStr].P1 += 1;
        else if (update.incident.severity === "P2") days[dateStr].P2 += 1;
        else days[dateStr].P3 += 1;
      }
    });

    return Object.values(days);
  }, [updates]);

  return (
    <div className="surface mt-4 p-6 h-[320px] w-full relative">
      <h3 className="mb-4 text-sm font-semibold text-[var(--color-title)] uppercase tracking-widest">7-Day Incident Timeline</h3>
      <ResponsiveBar
        data={data}
        keys={["P1", "P2", "P3"]}
        indexBy="date"
        layout="horizontal"
        margin={{ top: 10, right: 20, bottom: 40, left: 60 }}
        padding={0.3}
        valueScale={{ type: "linear" }}
        indexScale={{ type: "band", round: true }}
        colors={({ id }) => {
          if (id === "P1") return "var(--color-danger)";
          if (id === "P2") return "var(--color-warning)";
          return "var(--color-info)";
        }}
        borderRadius={4}
        borderWidth={0}
        theme={{
          text: { fill: "var(--color-subtext)", fontSize: 12, fontFamily: "var(--font-ui)" },
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
          tickPadding: 12,
          tickRotation: 0,
          tickValues: 4,
        }}
        axisLeft={{
          tickSize: 0,
          tickPadding: 12,
          tickRotation: 0,
        }}
        labelSkipWidth={12}
        labelSkipHeight={12}
        labelTextColor="var(--color-void)"
        animate={true}
        motionConfig="wobbly"
      />
    </div>
  );
}
