"use client";

import { useState } from "react";

export type DayStatus = "operational" | "incident" | "degraded" | "no-data";

export interface UptimeDay {
  date: string;
  status: DayStatus;
  label?: string;
}

interface Props {
  days: UptimeDay[];
  componentName: string;
  currentStatus: "Operational" | "Degraded" | "Incident";
}

const STATUS_COLORS: Record<DayStatus, string> = {
  operational: "var(--color-resolve)",
  degraded: "var(--color-warning)",
  incident: "var(--color-danger)",
  "no-data": "var(--color-rim)",
};

const CURRENT_DOT: Record<string, string> = {
  Operational: "var(--color-resolve)",
  Degraded: "var(--color-warning)",
  Incident: "var(--color-danger)",
};

export function UptimeBars({ days, componentName, currentStatus }: Props) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  return (
    <div className="group relative py-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-[var(--color-bright)]">{componentName}</span>
        <span className="flex items-center gap-2 text-xs" style={{ color: CURRENT_DOT[currentStatus] }}>
          <span
            className="inline-block w-[3px] h-4 rounded-full"
            style={{ background: CURRENT_DOT[currentStatus] }}
          />
          {currentStatus}
        </span>
      </div>

      <div className="flex items-end gap-[2px]" style={{ height: 32 }}>
        {days.map((day, i) => (
          <div
            key={day.date}
            className="relative flex-1 h-full cursor-pointer flex items-end"
            onMouseEnter={() => setHoveredIdx(i)}
            onMouseLeave={() => setHoveredIdx(null)}
          >
            <div
              className="w-full rounded-sm transition-all duration-150"
              style={{
                background: STATUS_COLORS[day.status],
                height: hoveredIdx === i ? 32 : 22,
                opacity: hoveredIdx !== null && hoveredIdx !== i ? 0.4 : 1,
              }}
            />

            {hoveredIdx === i && (
              <div
                className="absolute z-50 px-3 py-2 rounded-lg text-xs whitespace-nowrap pointer-events-none"
                style={{
                  bottom: "calc(100% + 8px)",
                  left: "50%",
                  transform: "translateX(-50%)",
                  background: "var(--color-raised)",
                  border: "1px solid var(--color-rim)",
                  color: "var(--color-bright)",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
                }}
              >
                <div className="font-medium">{day.date}</div>
                <div className="mt-0.5" style={{ color: STATUS_COLORS[day.status] }}>
                  {day.label ?? day.status.charAt(0).toUpperCase() + day.status.slice(1)}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex justify-between mt-1.5 text-[10px] text-[var(--color-ghost)]">
        <span>{days.length} days ago</span>
        <span>Today</span>
      </div>
    </div>
  );
}
