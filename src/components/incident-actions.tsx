"use client";

import { IncidentSeverity, IncidentStatus } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  incidentId: string;
  status: IncidentStatus;
  severity: IncidentSeverity;
  category: string | null;
};

export function IncidentActions({
  incidentId,
  status,
  severity,
  category,
}: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState("");
  const [currentStatus, setCurrentStatus] = useState<IncidentStatus>(status);
  const [currentSeverity, setCurrentSeverity] =
    useState<IncidentSeverity>(severity);
  const [currentCategory, setCurrentCategory] = useState(category ?? "");
  const [draft, setDraft] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function saveMeta() {
    setSaving(true);
    setError(null);
    const response = await fetch(`/api/incidents/${incidentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: currentStatus,
        severity: currentSeverity,
        category: currentCategory || null,
      }),
    });

    setSaving(false);

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      setError(payload?.error ?? "Update failed.");
      return;
    }

    setMessage("Incident metadata updated.");
    router.refresh();
  }

  async function addNote() {
    if (!note.trim()) {
      return;
    }

    setSaving(true);
    setError(null);

    const response = await fetch(`/api/incidents/${incidentId}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: note }),
    });

    setSaving(false);

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      setError(payload?.error ?? "Could not add note.");
      return;
    }

    setMessage("Note added.");
    setNote("");
    router.refresh();
  }

  async function runTriage() {
    setSaving(true);
    setError(null);

    const response = await fetch(`/api/incidents/${incidentId}/triage`, {
      method: "POST",
    });

    setSaving(false);

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      setError(payload?.error ?? "Triage failed.");
      return;
    }

    setMessage("AI triage completed.");
    router.refresh();
  }

  async function generateCustomerUpdate() {
    setSaving(true);
    setError(null);

    const response = await fetch(`/api/incidents/${incidentId}/customer-update`, {
      method: "POST",
    });

    setSaving(false);

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      setError(payload?.error ?? "Draft generation failed.");
      return;
    }

    const payload = (await response.json()) as { draft: string };
    setDraft(payload.draft);
    setMessage("Customer update draft generated.");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        <select
          className="select"
          value={currentStatus}
          onChange={(event) =>
            setCurrentStatus(event.target.value as IncidentStatus)
          }
        >
          {Object.values(IncidentStatus).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>

        <select
          className="select"
          value={currentSeverity}
          onChange={(event) =>
            setCurrentSeverity(event.target.value as IncidentSeverity)
          }
        >
          {Object.values(IncidentSeverity).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>

        <input
          className="input"
          placeholder="Category"
          value={currentCategory}
          onChange={(event) => setCurrentCategory(event.target.value)}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <button className="btn btn-primary" disabled={saving} onClick={saveMeta} type="button">
          Save fields
        </button>
        <button className="btn btn-ghost" disabled={saving} onClick={runTriage} type="button">
          Run AI triage
        </button>
        <button
          className="btn btn-ghost"
          disabled={saving}
          onClick={generateCustomerUpdate}
          type="button"
        >
          Draft customer update
        </button>
      </div>

      <div className="space-y-2">
        <textarea
          className="textarea min-h-[84px]"
          placeholder="Add internal note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
        <button className="btn btn-ghost" disabled={saving} onClick={addNote} type="button">
          Add note
        </button>
      </div>

      {draft ? (
        <div className="space-y-1">
          <p className="kicker">Draft customer update</p>
          <textarea className="textarea min-h-[120px]" value={draft} readOnly />
        </div>
      ) : null}

      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </div>
  );
}
