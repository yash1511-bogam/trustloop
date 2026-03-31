"use client";

import { useMemo } from "react";

type Update = {
  publishedAt: Date;
  incident: { severity: string };
};

export function StatusTimelineChart({ updates }: { updates: Update[] }) {
  const data = useMemo(() => {
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

  const max = Math.max(...data.map((d) => d.P1 + d.P2 + d.P3), 1);
  const ml = 60, mr = 20, mt = 10, mb = 10;
  const w = 500, h = 240;
  const plotW = w - ml - mr, plotH = h - mt - mb;
  const rowH = plotH / data.length;
  const pad = rowH * 0.15;
  const colors = { P1: "var(--color-danger)", P2: "var(--color-warning)", P3: "var(--color-info)" };

  return (
    <div className="surface mt-4 p-6 h-[320px] w-full relative">
      <h3 className="mb-4 text-sm font-semibold text-[var(--color-title)] uppercase tracking-widest">7-Day Incident Timeline</h3>
      <svg viewBox={`0 0 ${w} ${h}`} className="h-full w-full" preserveAspectRatio="xMidYMid meet">
        {data.map((day, i) => {
          const y = mt + i * rowH + pad;
          const bh = rowH - pad * 2;
          const total = day.P1 + day.P2 + day.P3;
          let x = ml;
          const segments = (["P1", "P2", "P3"] as const).map((key) => {
            const segW = (day[key] / max) * plotW;
            const seg = { x, w: segW, color: colors[key], val: day[key] };
            x += segW;
            return seg;
          });
          return (
            <g key={day.date}>
              <text x={ml - 8} y={y + bh / 2 + 4} textAnchor="end" fill="var(--color-ghost)" fontSize={12}>{day.date}</text>
              {segments.map((seg, j) => seg.val > 0 && (
                <rect key={j} x={seg.x} y={y} width={seg.w} height={bh} rx={4} fill={seg.color} />
              ))}
              {total > 0 && (
                <text x={ml + (total / max) * plotW + 6} y={y + bh / 2 + 4} fill="var(--color-subtext)" fontSize={12}>{total}</text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
