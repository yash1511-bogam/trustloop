"use client";

import { AIIncidentCategory, IncidentChannel, IncidentSeverity } from "@prisma/client";
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
    <form className="space-y-3" onSubmit={onSubmit}>
      <div className="grid gap-3 md:grid-cols-2">
        <input
          className="input"
          placeholder="Incident title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          required
        />
        <select
          className="select"
          value={channel}
          onChange={(event) => setChannel(event.target.value as IncidentChannel)}
        >
          {Object.values(IncidentChannel).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      <textarea
        className="textarea min-h-[100px]"
        placeholder="What failed, who was impacted, and what customer-visible risk exists?"
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        required
      />

      <div className="grid gap-3 md:grid-cols-2">
        <input
          className="input"
          placeholder="Customer name"
          value={customerName}
          onChange={(event) => setCustomerName(event.target.value)}
        />
        <input
          className="input"
          placeholder="Customer email"
          type="email"
          value={customerEmail}
          onChange={(event) => setCustomerEmail(event.target.value)}
        />
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <select
          className="select"
          value={severity}
          onChange={(event) =>
            setSeverity(event.target.value as IncidentSeverity)
          }
        >
          {Object.values(IncidentSeverity).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <select
          className="select"
          value={category}
          onChange={(event) =>
            setCategory(
              event.target.value
                ? (event.target.value as AIIncidentCategory)
                : "",
            )
          }
        >
          <option value="">Uncategorized</option>
          {Object.values(AIIncidentCategory).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <input
          className="input"
          placeholder="Model/version"
          value={modelVersion}
          onChange={(event) => setModelVersion(event.target.value)}
        />
        <input
          className="input"
          placeholder="Ticket ref"
          value={sourceTicketRef}
          onChange={(event) => setSourceTicketRef(event.target.value)}
        />
      </div>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <button className="btn btn-primary" disabled={loading} type="submit">
        {loading ? "Creating..." : "Create incident"}
      </button>
    </form>
  );
}
