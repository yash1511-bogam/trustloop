"use client";

import { AIIncidentCategory, IncidentChannel, IncidentSeverity } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Plus } from "lucide-react";

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
    <form className="space-y-6 max-w-4xl" onSubmit={onSubmit}>
      <div className="grid gap-6 md:grid-cols-[1fr_auto]">
        <label className="block space-y-2">
          <span className="text-[10px] uppercase tracking-widest text-neutral-500 font-medium">Incident Title *</span>
          <input
            className="w-full bg-transparent border-b border-white/20 pb-1.5 text-slate-100 focus:outline-none focus:border-sky-400 transition-colors placeholder:text-neutral-600"
            placeholder="e.g. API latency spike on inference endpoint"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
            disabled={loading}
          />
        </label>
        
        <label className="block space-y-2">
          <span className="text-[10px] uppercase tracking-widest text-neutral-500 font-medium">Channel</span>
          <select
            className="w-full bg-transparent border-b border-white/20 pb-1.5 text-sm text-slate-300 focus:outline-none focus:border-sky-400 transition-colors cursor-pointer appearance-none pr-6"
            value={channel}
            onChange={(event) => setChannel(event.target.value as IncidentChannel)}
            disabled={loading}
          >
            {Object.values(IncidentChannel).map((option) => (
              <option className="bg-slate-900" key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="block space-y-2">
        <span className="text-[10px] uppercase tracking-widest text-neutral-500 font-medium">Description *</span>
        <textarea
          className="w-full min-h-[80px] bg-white/5 border border-transparent rounded-xl p-4 text-sm text-slate-100 focus:outline-none focus:border-sky-500/50 focus:bg-white/10 transition-all placeholder:text-neutral-600 resize-y"
          placeholder="What failed, who was impacted, and what customer-visible risk exists?"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          required
          disabled={loading}
        />
      </label>

      <div className="grid gap-6 md:grid-cols-2">
        <label className="block space-y-2">
          <span className="text-[10px] uppercase tracking-widest text-neutral-500 font-medium">Customer Name</span>
          <input
            className="w-full bg-transparent border-b border-white/20 pb-1.5 text-sm text-slate-100 focus:outline-none focus:border-sky-400 transition-colors placeholder:text-neutral-600"
            placeholder="e.g. Acme Corp"
            value={customerName}
            onChange={(event) => setCustomerName(event.target.value)}
            disabled={loading}
          />
        </label>
        <label className="block space-y-2">
          <span className="text-[10px] uppercase tracking-widest text-neutral-500 font-medium">Customer Email</span>
          <input
            className="w-full bg-transparent border-b border-white/20 pb-1.5 text-sm text-slate-100 focus:outline-none focus:border-sky-400 transition-colors placeholder:text-neutral-600"
            placeholder="support@acme.com"
            type="email"
            value={customerEmail}
            onChange={(event) => setCustomerEmail(event.target.value)}
            disabled={loading}
          />
        </label>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <label className="block space-y-2">
          <span className="text-[10px] uppercase tracking-widest text-neutral-500 font-medium">Severity</span>
          <select
            className="w-full bg-transparent border-b border-white/20 pb-1.5 text-sm text-slate-300 focus:outline-none focus:border-sky-400 transition-colors cursor-pointer appearance-none pr-6"
            value={severity}
            onChange={(event) => setSeverity(event.target.value as IncidentSeverity)}
            disabled={loading}
          >
            {Object.values(IncidentSeverity).map((option) => (
              <option className="bg-slate-900" key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-2">
          <span className="text-[10px] uppercase tracking-widest text-neutral-500 font-medium">AI Category</span>
          <select
            className="w-full bg-transparent border-b border-white/20 pb-1.5 text-sm text-slate-300 focus:outline-none focus:border-sky-400 transition-colors cursor-pointer appearance-none pr-6"
            value={category}
            onChange={(event) => setCategory(event.target.value ? (event.target.value as AIIncidentCategory) : "")}
            disabled={loading}
          >
            <option className="bg-slate-900" value="">Uncategorized</option>
            {Object.values(AIIncidentCategory).map((option) => (
              <option className="bg-slate-900" key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-2">
          <span className="text-[10px] uppercase tracking-widest text-neutral-500 font-medium">Model/Version</span>
          <input
            className="w-full bg-transparent border-b border-white/20 pb-1.5 text-sm text-slate-100 focus:outline-none focus:border-sky-400 transition-colors placeholder:text-neutral-600"
            placeholder="e.g. gpt-4o"
            value={modelVersion}
            onChange={(event) => setModelVersion(event.target.value)}
            disabled={loading}
          />
        </label>

        <label className="block space-y-2">
          <span className="text-[10px] uppercase tracking-widest text-neutral-500 font-medium">Ticket Reference</span>
          <input
            className="w-full bg-transparent border-b border-white/20 pb-1.5 text-sm text-slate-100 focus:outline-none focus:border-sky-400 transition-colors placeholder:text-neutral-600"
            placeholder="e.g. ZD-10293"
            value={sourceTicketRef}
            onChange={(event) => setSourceTicketRef(event.target.value)}
            disabled={loading}
          />
        </label>
      </div>

      {error ? <p className="text-sm text-red-400 p-3 rounded-lg bg-red-500/10 border border-red-500/20">{error}</p> : null}

      <div className="pt-2">
        <button className="btn btn-primary" disabled={loading} type="submit">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Create incident
        </button>
      </div>
    </form>
  );
}
