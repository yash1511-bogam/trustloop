"use client";

import { useEffect, useState } from "react";
import { Loader2, Phone, PhoneOff, UserCheck } from "lucide-react";

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
      <div className="flex items-center gap-2 text-sm text-neutral-500 py-8">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading on-call schedule…
      </div>
    );
  }

  if (!data?.enabled) {
    return (
      <p className="text-sm text-neutral-500 py-4">
        On-call rotation is disabled. Enable it in the Quotas settings page.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-6 text-sm">
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-widest text-neutral-500 font-medium">Rotation interval</p>
          <p className="text-slate-200">{data.intervalHours}h</p>
        </div>
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-widest text-neutral-500 font-medium">Anchor</p>
          <p className="text-slate-200">{data.anchorAt ? new Date(data.anchorAt).toLocaleString("en-US") : "—"}</p>
        </div>
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-widest text-neutral-500 font-medium">Pool size</p>
          <p className="text-slate-200">{data.schedule.length}</p>
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
                <td className="text-neutral-400">{entry.email}</td>
                <td>
                  {entry.hasPhone ? (
                    <Phone className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <PhoneOff className="w-3.5 h-3.5 text-neutral-600" />
                  )}
                </td>
                <td>
                  {entry.isOnCall ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400">
                      <UserCheck className="w-3.5 h-3.5" /> On call
                    </span>
                  ) : (
                    <span className="text-xs text-neutral-500">Off duty</span>
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
