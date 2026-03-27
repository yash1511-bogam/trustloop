"use client";

import Link from "next/link";
import {
  AIIncidentCategory,
  IncidentSeverity,
  IncidentStatus,
  Role,
} from "@prisma/client";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowsClockwise,
  ArrowRight,
  CaretLeft,
  CaretRight,
  CheckCircle,
  CircleNotch,
  DownloadSimple,
} from "@phosphor-icons/react";
import { EmptyState } from "@/components/empty-state";

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
  if (severity === IncidentSeverity.P1) return "badge badge-p1 badge-sm";
  if (severity === IncidentSeverity.P2) return "badge badge-p2 badge-sm";
  return "badge badge-p3 badge-sm";
}

function statusBadgeClass(status: IncidentStatus): string {
  if (status === IncidentStatus.RESOLVED) return "badge badge-success badge-sm";
  if (status === IncidentStatus.MITIGATED) return "badge badge-warning badge-sm";
  if (status === IncidentStatus.NEW) return "badge badge-info badge-sm";
  return "badge badge-danger badge-sm";
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
    <section className="section-enter">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <div className="section-heading">
          <h2 className="section-title">Incident queue</h2>
          <p className="section-description">
            Primary responder view with live filters and severity-first sorting.
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-ghost btn-sm" onClick={() => void refreshReadModels()} title="Refresh read models and recalculate metrics" type="button">
            <ArrowsClockwise size={16} weight="regular" />
            Sync models
          </button>
          <Link className="btn btn-ghost btn-sm" href="/api/incidents/export?format=csv">
            <DownloadSimple size={16} weight="regular" />
            Export CSV
          </Link>
        </div>
      </div>

      <div className="surface mb-6 p-4">
        <div className="grid gap-4 lg:grid-cols-[repeat(4,minmax(0,1fr))_1.4fr_auto]">
          <label className="field">
            <span className="field-label">Status</span>
            <select className="select" onChange={(event) => setStatus(event.target.value)} value={status}>
              <option value="">All</option>
              {Object.values(IncidentStatus).map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </label>

          <label className="field">
            <span className="field-label">Severity</span>
            <select className="select" onChange={(event) => setSeverity(event.target.value)} value={severity}>
              <option value="">All</option>
              {Object.values(IncidentSeverity).map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </label>

          <label className="field">
            <span className="field-label">Category</span>
            <select className="select" onChange={(event) => setCategory(event.target.value)} value={category}>
              <option value="">All</option>
              {Object.values(AIIncidentCategory).map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </label>

          <label className="field">
            <span className="field-label">Owner</span>
            <select className="select" onChange={(event) => setOwner(event.target.value)} value={owner}>
              <option value="">All</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>{member.name}</option>
              ))}
            </select>
          </label>

          <label className="field">
            <span className="field-label">Search</span>
            <input
              className="input"
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && applyFilters()}
              placeholder="Search incidents, tickets, or customers"
              value={search}
            />
          </label>

          <div className="flex items-end gap-2">
            <button className="btn btn-primary btn-sm" onClick={applyFilters} type="button">
              Apply
            </button>
            {(status || severity || category || owner || search || appliedSearch) ? (
              <button className="btn btn-ghost btn-sm" onClick={resetFilters} type="button">
                Clear
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {loading && items.length === 0 ? (
        <div className="table-shell overflow-hidden">
          <table>
            <thead>
              <tr>
                <th>Severity</th>
                <th>Status</th>
                <th>Title</th>
                <th>AI category</th>
                <th>Owner</th>
                <th>Updated</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 5 }).map((_, index) => (
                <tr key={`skel-${index}`}>
                  <td><div className="h-5 w-12 rounded bg-[var(--color-rim)]" /></td>
                  <td><div className="h-5 w-16 rounded bg-[var(--color-rim)]" /></td>
                  <td><div className="h-4 w-56 rounded bg-[var(--color-rim)]" /></td>
                  <td><div className="h-4 w-24 rounded bg-[var(--color-rim)]" /></td>
                  <td><div className="h-4 w-20 rounded bg-[var(--color-rim)]" /></td>
                  <td><div className="h-4 w-20 rounded bg-[var(--color-rim)]" /></td>
                  <td><div className="h-4 w-4 rounded bg-[var(--color-rim)]" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : items.length === 0 ? (
        <div className="surface">
          <EmptyState
            action={appliedSearch || status || severity || category || owner ? { label: "Clear filters", onClick: resetFilters } : undefined}
            description="No open incidents."
            icon={CheckCircle}
            title="All clear"
          />
        </div>
      ) : (
        <div className="table-shell overflow-hidden">
          <table>
            <thead>
              <tr>
                <th>Severity</th>
                <th>Status</th>
                <th>Title</th>
                <th>AI category</th>
                <th>Owner</th>
                <th>Updated</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((incident) => (
                <tr
                  key={incident.id}
                  style={incident.severity === IncidentSeverity.P1 ? { boxShadow: "inset 0 0 0 1px var(--color-danger)", background: "rgba(232,66,66,0.04)" } : undefined}
                >
                  <td><span className={severityBadgeClass(incident.severity)}>{incident.severity}</span></td>
                  <td><span className={statusBadgeClass(incident.status)}>{incident.status}</span></td>
                  <td>
                    <Link className="font-medium text-[var(--color-title)] transition-colors hover:text-[var(--color-bright)]" href={`/incidents/${incident.id}`}>
                      {incident.title}
                    </Link>
                  </td>
                  <td className="text-[var(--color-ghost)]">{incident.category ?? "Uncategorized"}</td>
                  <td>{incident.owner?.name ?? "Unassigned"}</td>
                  <td className="text-[var(--color-subtext)]">
                    {new Date(incident.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </td>
                  <td>
                    <Link className="inline-flex items-center text-[var(--color-subtext)] transition-colors hover:text-[var(--color-bright)]" href={`/incidents/${incident.id}`}>
                      <ArrowRight size={16} weight="regular" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between gap-4">
        <button
          className="btn btn-ghost btn-sm"
          disabled={loading || cursorStack.length === 0}
          onClick={goPrevious}
          type="button"
        >
          <CaretLeft size={14} weight="regular" />
          Previous
        </button>
        {loading ? <CircleNotch className="animate-spin" color="var(--color-subtext)" size={16} weight="regular" /> : null}
        <button
          className="btn btn-ghost btn-sm"
          disabled={loading || !nextCursor}
          onClick={goNext}
          type="button"
        >
          Next
          <CaretRight size={14} weight="regular" />
        </button>
      </div>

      {error ? <p className="mt-3 text-sm text-[var(--color-danger)]">{error}</p> : null}
    </section>
  );
}
