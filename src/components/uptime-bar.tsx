"use client";

import { useState } from "react";

export type DayStatus = {
  date: string;
  label: string;
  status: "operational" | "incident" | "degraded" | "maintenance" | "nodata";
};

const STATUS_COLORS: Record<DayStatus["status"], string> = {
  operational: "var(--color-resolve)",
  incident: "var(--color-danger)",
  degraded: "var(--color-warning)",
  maintenance: "var(--color-signal)",
  nodata: "var(--color-rim)",
};

export function UptimeBar({ days, uptime }: { days: DayStatus[]; uptime: string }) {
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <div className="relative">
      <div className="flex gap-[2px] items-end h-8">
        {days.map((day, i) => (
          <div
            key={day.date}
            className="relative flex-1 min-w-[2px]"
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
          >
            <div
              className="w-full h-8 rounded-[1px] transition-all duration-150"
              style={{
                backgroundColor: STATUS_COLORS[day.status],
                opacity: hovered === i ? 1 : 0.85,
                transform: hovered === i ? "scaleY(1.3)" : "scaleY(1)",
                transformOrigin: "bottom",
              }}
            />
            {hovered === i && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none">
                <div className="px-2.5 py-1.5 rounded-md bg-[var(--color-void)] border border-[var(--color-rim)] shadow-lg whitespace-nowrap">
                  <p className="text-[11px] font-medium text-[var(--color-title)]">{day.date}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: STATUS_COLORS[day.status] }}>{day.label}</p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between mt-1.5">
        <span className="text-[10px] text-[var(--color-ghost)]">{days.length} days ago</span>
        <span className="text-[10px] text-[var(--color-ghost)]">{uptime}% uptime</span>
        <span className="text-[10px] text-[var(--color-ghost)]">Today</span>
      </div>
    </div>
  );
}
