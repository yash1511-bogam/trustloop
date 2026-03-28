"use client";

import { AIIncidentCategory, IncidentChannel, IncidentSeverity } from "@prisma/client";
import { CircleNotch, Plus } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function CreateIncidentForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [channel, setChannel] = useState<IncidentChannel>(IncidentChannel.EMAIL);
  const [severity, setSeverity] = useState<IncidentSeverity>(IncidentSeverity.P3);
  const [category, setCategory] = useState<AIIncidentCategory | "">("");
  const [modelVersion, setModelVersion] = useState("");
  const [sourceTicketRef, setSourceTicketRef] = useState("");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const response = await fetch("/api/incidents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description,
        customerName: customerName || null,
        customerEmail: customerEmail || null,
        channel,
        severity,
        category: category || null,
        modelVersion: modelVersion || null,
        sourceTicketRef: sourceTicketRef || null,
      }),
    });

    setLoading(false);

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      setError(payload?.error ?? "Could not create incident.");
      return;
    }

    const payload = (await response.json()) as { incident: { id: string } };

    setTitle("");
    setDescription("");
    setCustomerName("");
    setCustomerEmail("");
    setCategory("");
    setModelVersion("");
    setSourceTicketRef("");

    router.push(`/incidents/${payload.incident.id}`);
    router.refresh();
  }

  return (
    <form className="field-grid max-w-4xl" onSubmit={onSubmit}>
      <div className="grid gap-5 md:grid-cols-[1fr_180px]">
        <label className="field">
          <span className="field-label">Incident Title</span>
          <input
            className="input"
            disabled={loading}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="e.g. API latency spike on inference endpoint"
            required
            value={title}
          />
        </label>

        <label className="field">
          <span className="field-label">Channel</span>
          <select
            className="select"
            disabled={loading}
            onChange={(event) => setChannel(event.target.value as IncidentChannel)}
            value={channel}
          >
            {Object.values(IncidentChannel).map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="field">
        <span className="field-label">Description</span>
        <textarea
          className="textarea min-h-[120px]"
          disabled={loading}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="What failed, who was impacted, and what customer-visible risk exists?"
          required
          value={description}
        />
        <span className="field-help">
          Be specific about customer impact. This record anchors the timeline and follow-up.
        </span>
      </label>

      <div className="grid gap-5 md:grid-cols-2">
        <label className="field">
          <span className="field-label">Customer Name</span>
          <input
            className="input"
            disabled={loading}
            onChange={(event) => setCustomerName(event.target.value)}
            placeholder="e.g. Acme Corp"
            value={customerName}
          />
        </label>
        <label className="field">
          <span className="field-label">Customer Email</span>
          <input
            className="input"
            disabled={loading}
            onChange={(event) => setCustomerEmail(event.target.value)}
            placeholder="support@acme.com"
            type="email"
            value={customerEmail}
          />
        </label>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <label className="field">
          <span className="field-label">Severity</span>
          <select
            className="select"
            disabled={loading}
            onChange={(event) => setSeverity(event.target.value as IncidentSeverity)}
            value={severity}
          >
            {Object.values(IncidentSeverity).map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field-label">AI Category</span>
          <select
            className="select"
            disabled={loading}
            onChange={(event) => setCategory(event.target.value ? (event.target.value as AIIncidentCategory) : "")}
            value={category}
          >
            <option value="">Uncategorized</option>
            {Object.values(AIIncidentCategory).map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field-label">Model / Version</span>
          <input
            className="input"
            disabled={loading}
            onChange={(event) => setModelVersion(event.target.value)}
            placeholder="e.g. gpt-4o"
            value={modelVersion}
          />
        </label>

        <label className="field">
          <span className="field-label">Ticket Reference</span>
          <input
            className="input"
            disabled={loading}
            onChange={(event) => setSourceTicketRef(event.target.value)}
            placeholder="e.g. ZD-10293"
            value={sourceTicketRef}
          />
        </label>
      </div>

      {error ? (
        <p aria-live="assertive" className="field-help field-error rounded-[var(--radius-sm)] border border-[rgba(232,66,66,0.24)] bg-[rgba(232,66,66,0.08)] px-3 py-2">
          {error}
        </p>
      ) : null}

      <div className="flex items-center justify-between gap-3 pt-1">
        <p className="field-help">No customer communication is sent automatically from this form.</p>
        <button className="btn btn-primary" disabled={loading} type="submit">
          {loading ? <CircleNotch className="animate-spin" size={16} /> : <Plus size={16} weight="regular" />}
          Create incident
        </button>
      </div>
    </form>
  );
}
