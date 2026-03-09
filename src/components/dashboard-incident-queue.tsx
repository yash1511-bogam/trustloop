"use client";

import Link from "next/link";
import {
  AIIncidentCategory,
  IncidentSeverity,
  IncidentStatus,
  Role,
} from "@prisma/client";
import { useEffect, useMemo, useState } from "react";
import { Loader2, ArrowRight, RefreshCcw, Download } from "lucide-react";

type Member = {
  id: string;
  name: string;
  role: Role;
};

type IncidentRow = {
  id: string;
  title: string;
  status: IncidentStatus;
  severity: IncidentSeverity;
  category: AIIncidentCategory | null;
  updatedAt: string;
  owner: { name: string } | null;
  _count: { events: number };
};

type ApiPayload = {
  incidents: IncidentRow[];
  nextCursor: string | null;
  members: Member[];
};

function severityBadgeClass(severity: IncidentSeverity): string {
  if (severity === IncidentSeverity.P1) return "text-[10px] uppercase tracking-widest font-semibold px-2 py-0.5 rounded-full border border-red-500/20 bg-red-500/10 text-red-400";
  if (severity === IncidentSeverity.P2) return "text-[10px] uppercase tracking-widest font-semibold px-2 py-0.5 rounded-full border border-amber-500/20 bg-amber-500/10 text-amber-400";
  return "text-[10px] uppercase tracking-widest font-semibold px-2 py-0.5 rounded-full border border-sky-500/20 bg-sky-500/10 text-sky-400";
}

export function DashboardIncidentQueue() {
  const [items, setItems] = useState<IncidentRow[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [cursorStack, setCursorStack] = useState<string[]>([]);
  const [activeCursor, setActiveCursor] = useState<string | null>(null);

  const [status, setStatus] = useState<string>("");
  const [severity, setSeverity] = useState<string>("");
  const [category, setCategory] = useState<string>("");
  const [owner, setOwner] = useState<string>("");
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set("limit", "20");
    if (status) params.set("status", status);
    if (severity) params.set("severity", severity);
    if (category) params.set("category", category);
    if (owner) params.set("owner", owner);
    if (appliedSearch) params.set("q", appliedSearch);
    if (activeCursor) params.set("cursor", activeCursor);
    return params.toString();
  }, [status, severity, category, owner, appliedSearch, activeCursor]);

  async function load() {
    setLoading(true);
    setError(null);

    const response = await fetch(`/api/incidents?${queryString}`);
    setLoading(false);

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      setError(payload?.error ?? "Failed to load incidents.");
      return;
    }

    const payload = (await response.json()) as ApiPayload;
    setItems(payload.incidents);
    setMembers(payload.members);
    setNextCursor(payload.nextCursor);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryString]);

  function applyFilters() {
    setCursorStack([]);
    setActiveCursor(null);
    setAppliedSearch(search.trim());
  }

  function resetFilters() {
    setStatus("");
    setSeverity("");
    setCategory("");
    setOwner("");
    setSearch("");
    setAppliedSearch("");
    setCursorStack([]);
    setActiveCursor(null);
  }

  function goNext() {
    if (!nextCursor) {
      return;
    }
    setCursorStack((prev) => (activeCursor ? [...prev, activeCursor] : prev));
    setActiveCursor(nextCursor);
  }

  function goPrevious() {
    setCursorStack((prev) => {
      const next = [...prev];
      const cursor = next.pop() ?? null;
      setActiveCursor(cursor);
      return next;
    });
  }

  async function refreshReadModels() {
    await fetch("/api/workspace/refresh-read-models", { method: "POST" }).catch(() => null);
    await load();
  }

  return (
    <section className="pt-4">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-xl font-medium text-slate-100">Incident queue</h2>
        <div className="flex gap-2">
          <button className="btn btn-ghost text-xs !min-h-[32px] px-3" onClick={() => void refreshReadModels()} type="button">
            <RefreshCcw className="w-3 h-3" /> Sync models
          </button>
          <Link className="btn btn-ghost text-xs !min-h-[32px] px-3" href="/api/incidents/export?format=csv">
            <Download className="w-3 h-3" /> CSV
          </Link>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[auto_auto_auto_auto_1fr_auto] mb-8 items-end p-4 rounded-2xl bg-white/5 border border-white/5">
        <label className="block space-y-1.5">
          <span className="text-[10px] uppercase tracking-widest text-neutral-500 font-medium">Status</span>
          <select className="w-full bg-transparent border-b border-white/20 pb-1.5 text-sm text-slate-300 focus:outline-none focus:border-sky-400 transition-colors cursor-pointer appearance-none pr-6" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option className="bg-slate-900" value="">All</option>
            {Object.values(IncidentStatus).map((option) => (
              <option className="bg-slate-900" key={option} value={option}>{option}</option>
            ))}
          </select>
        </label>
        
        <label className="block space-y-1.5">
          <span className="text-[10px] uppercase tracking-widest text-neutral-500 font-medium">Severity</span>
          <select className="w-full bg-transparent border-b border-white/20 pb-1.5 text-sm text-slate-300 focus:outline-none focus:border-sky-400 transition-colors cursor-pointer appearance-none pr-6" value={severity} onChange={(event) => setSeverity(event.target.value)}>
            <option className="bg-slate-900" value="">All</option>
            {Object.values(IncidentSeverity).map((option) => (
              <option className="bg-slate-900" key={option} value={option}>{option}</option>
            ))}
          </select>
        </label>

        <label className="block space-y-1.5">
          <span className="text-[10px] uppercase tracking-widest text-neutral-500 font-medium">Category</span>
          <select className="w-full bg-transparent border-b border-white/20 pb-1.5 text-sm text-slate-300 focus:outline-none focus:border-sky-400 transition-colors cursor-pointer appearance-none pr-6" value={category} onChange={(event) => setCategory(event.target.value)}>
            <option className="bg-slate-900" value="">All</option>
            {Object.values(AIIncidentCategory).map((option) => (
              <option className="bg-slate-900" key={option} value={option}>{option}</option>
            ))}
          </select>
        </label>

        <label className="block space-y-1.5">
          <span className="text-[10px] uppercase tracking-widest text-neutral-500 font-medium">Owner</span>
          <select className="w-full bg-transparent border-b border-white/20 pb-1.5 text-sm text-slate-300 focus:outline-none focus:border-sky-400 transition-colors cursor-pointer appearance-none pr-6" value={owner} onChange={(event) => setOwner(event.target.value)}>
            <option className="bg-slate-900" value="">All</option>
            {members.map((member) => (
              <option className="bg-slate-900" key={member.id} value={member.id}>{member.name}</option>
            ))}
          </select>
        </label>

        <label className="block space-y-1.5">
          <span className="text-[10px] uppercase tracking-widest text-neutral-500 font-medium">Search</span>
          <input
            className="w-full bg-transparent border-b border-white/20 pb-1.5 text-sm text-slate-100 focus:outline-none focus:border-sky-400 transition-colors placeholder:text-neutral-600"
            placeholder="Search keywords or tickets..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
          />
        </label>

        <div className="flex gap-2">
          <button className="btn btn-primary !min-h-[32px] text-xs px-4" onClick={applyFilters} type="button">
            Apply
          </button>
          {(status || severity || category || owner || search || appliedSearch) && (
            <button className="btn btn-ghost !min-h-[32px] text-xs px-3" onClick={resetFilters} type="button">
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {items.map((incident) => (
          <div className="group flex flex-col md:flex-row md:items-center justify-between p-4 rounded-2xl border border-transparent hover:border-white/5 hover:bg-white/5 transition-all" key={incident.id}>
            <div className="flex-1 min-w-0 pr-4">
              <div className="flex items-center gap-3 mb-1">
                <span className={severityBadgeClass(incident.severity)}>{incident.severity}</span>
                <span className="text-xs font-medium text-slate-300">{incident.status}</span>
                <span className="text-xs text-neutral-500">• {incident.category ?? "Uncategorized"}</span>
              </div>
              <Link className="text-base font-medium text-slate-100 hover:text-sky-400 transition-colors truncate block" href={`/incidents/${incident.id}`}>
                {incident.title}
              </Link>
            </div>

            <div className="mt-3 md:mt-0 flex items-center gap-8 text-sm">
              <div className="flex flex-col items-start md:items-end">
                <span className="text-neutral-400">{incident.owner?.name ?? "Unassigned"}</span>
                <span className="text-[10px] text-neutral-500">Owner</span>
              </div>
              
              <div className="flex flex-col items-start md:items-end w-16">
                <span className="text-neutral-300">{incident._count.events}</span>
                <span className="text-[10px] text-neutral-500">Events</span>
              </div>

              <div className="flex flex-col items-start md:items-end w-28">
                <span className="text-neutral-400">{new Date(incident.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                <span className="text-[10px] text-neutral-500">Updated</span>
              </div>
              
              <Link className="opacity-0 group-hover:opacity-100 transition-opacity text-sky-400 hover:text-sky-300 p-2" href={`/incidents/${incident.id}`}>
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        ))}

        {items.length === 0 && !loading ? (
          <div className="p-8 text-center text-sm text-neutral-500 border border-dashed border-white/10 rounded-2xl">
            No incidents match your criteria.
          </div>
        ) : null}
      </div>

      <div className="mt-6 flex items-center justify-between pt-6 border-t border-white/5">
        <button
          className="text-sm font-medium text-sky-400 hover:text-sky-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          disabled={loading || cursorStack.length === 0}
          onClick={goPrevious}
          type="button"
        >
          &larr; Previous Page
        </button>
        {loading && <Loader2 className="w-4 h-4 animate-spin text-sky-400" />}
        <button
          className="text-sm font-medium text-sky-400 hover:text-sky-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          disabled={loading || !nextCursor}
          onClick={goNext}
          type="button"
        >
          Next Page &rarr;
        </button>
      </div>

      {error ? <p className="mt-4 text-sm text-red-400">{error}</p> : null}
    </section>
  );
}
