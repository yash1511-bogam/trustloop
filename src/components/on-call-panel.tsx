"use client";

import { useEffect, useState } from "react";
import { Loader2, Phone, PhoneOff, UserCheck } from "@/components/icon-compat";

type ScheduleEntry = {
  userId: string;
  name: string;
  email: string;
  hasPhone: boolean;
  isOnCall: boolean;
};

type OnCallData = {
  enabled: boolean;
  intervalHours?: number;
  anchorAt?: string;
  currentIndex?: number;
  schedule: ScheduleEntry[];
};

export function OnCallPanel() {
  const [data, setData] = useState<OnCallData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/settings/on-call")
      .then((res) => res.json())
      .then((d: OnCallData) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-[var(--color-ghost)] py-8">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading on-call schedule…
      </div>
    );
  }

  if (!data?.enabled) {
    return (
      <p className="text-sm text-[var(--color-ghost)] py-4">
        On-call rotation is disabled. Enable it in the Quotas settings page.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-6 text-sm">
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-widest text-[var(--color-ghost)] font-medium">Rotation interval</p>
          <p className="text-[var(--color-body)]">{data.intervalHours}h</p>
        </div>
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-widest text-[var(--color-ghost)] font-medium">Anchor</p>
          <p className="text-[var(--color-body)]">{data.anchorAt ? new Date(data.anchorAt).toLocaleString("en-US") : "—"}</p>
        </div>
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-widest text-[var(--color-ghost)] font-medium">Pool size</p>
          <p className="text-[var(--color-body)]">{data.schedule.length}</p>
        </div>
      </div>

      <div className="surface overflow-hidden">
        <table>
          <thead>
            <tr>
              <th>Member</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {data.schedule.map((entry) => (
              <tr key={entry.userId}>
                <td className="font-medium">{entry.name}</td>
                <td className="text-[var(--color-subtext)]">{entry.email}</td>
                <td>
                  {entry.hasPhone ? (
                    <Phone className="w-3.5 h-3.5 text-[var(--color-resolve)]" />
                  ) : (
                    <PhoneOff className="w-3.5 h-3.5 text-[var(--color-ghost)]" />
                  )}
                </td>
                <td>
                  {entry.isOnCall ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--color-resolve)]">
                      <UserCheck className="w-3.5 h-3.5" /> On call
                    </span>
                  ) : (
                    <span className="text-xs text-[var(--color-ghost)]">Off duty</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
