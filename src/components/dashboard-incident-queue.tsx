"use client";

import Link from "next/link";
import {
  AIIncidentCategory,
  IncidentSeverity,
  IncidentStatus,
  Role,
} from "@prisma/client";
import { useEffect, useMemo, useState } from "react";

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
  if (severity === IncidentSeverity.P1) return "badge badge-p1";
  if (severity === IncidentSeverity.P2) return "badge badge-p2";
  return "badge badge-p3";
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
    <section className="surface overflow-hidden">
      <div className="border-b border-slate-200 p-4">
        <h2 className="text-xl font-semibold">Incident queue</h2>
      </div>

      <div className="grid gap-2 border-b border-slate-200 bg-slate-50 p-4 md:grid-cols-6">
        <select className="select" value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">All status</option>
          {Object.values(IncidentStatus).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <select
          className="select"
          value={severity}
          onChange={(event) => setSeverity(event.target.value)}
        >
          <option value="">All severity</option>
          {Object.values(IncidentSeverity).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <select
          className="select"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
        >
          <option value="">All categories</option>
          {Object.values(AIIncidentCategory).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <select className="select" value={owner} onChange={(event) => setOwner(event.target.value)}>
          <option value="">All owners</option>
          {members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name}
            </option>
          ))}
        </select>
        <input
          className="input md:col-span-2"
          placeholder="Search title, description, ticket ref"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <div className="flex flex-wrap gap-2 md:col-span-6">
          <button className="btn btn-primary" onClick={applyFilters} type="button">
            Apply filters
          </button>
          <button className="btn btn-ghost" onClick={resetFilters} type="button">
            Reset
          </button>
          <Link className="btn btn-ghost" href="/api/incidents/export?format=csv">
            Export CSV
          </Link>
          <button className="btn btn-ghost" onClick={() => void refreshReadModels()} type="button">
            Refresh read models
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[780px] text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3">Severity</th>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Owner</th>
              <th className="px-4 py-3">Events</th>
              <th className="px-4 py-3">Updated</th>
            </tr>
          </thead>
          <tbody>
            {items.map((incident) => (
              <tr className="border-t border-slate-100" key={incident.id}>
                <td className="px-4 py-3">
                  <span className={severityBadgeClass(incident.severity)}>{incident.severity}</span>
                </td>
                <td className="px-4 py-3">
                  <Link className="font-medium text-teal-800 underline" href={`/incidents/${incident.id}`}>
                    {incident.title}
                  </Link>
                  <p className="mt-1 text-xs text-slate-500">{incident.category ?? "Uncategorized"}</p>
                </td>
                <td className="px-4 py-3">{incident.status}</td>
                <td className="px-4 py-3">{incident.owner?.name ?? "Unassigned"}</td>
                <td className="px-4 py-3">{incident._count.events}</td>
                <td className="px-4 py-3">{new Date(incident.updatedAt).toLocaleString()}</td>
              </tr>
            ))}

            {items.length === 0 && !loading ? (
              <tr>
                <td className="px-4 py-8 text-slate-500" colSpan={6}>
                  No incidents found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between border-t border-slate-200 p-4">
        <button
          className="btn btn-ghost"
          disabled={loading || cursorStack.length === 0}
          onClick={goPrevious}
          type="button"
        >
          Previous
        </button>
        <button
          className="btn btn-primary"
          disabled={loading || !nextCursor}
          onClick={goNext}
          type="button"
        >
          Next
        </button>
      </div>

      {loading ? <p className="px-4 pb-4 text-sm text-slate-500">Loading incidents...</p> : null}
      {error ? <p className="px-4 pb-4 text-sm text-red-700">{error}</p> : null}
    </section>
  );
}
