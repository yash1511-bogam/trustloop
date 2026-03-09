"use client";

import { AiProvider, WorkflowType } from "@prisma/client";
import { useState } from "react";
import { Loader2, CheckCircle2, AlertCircle, KeyRound, Workflow } from "lucide-react";

type KeyRecord = {
  provider: AiProvider;
  keyLast4: string;
  isActive: boolean;
  healthStatus: "UNKNOWN" | "OK" | "FAILED";
  lastVerifiedAt: string | null;
  lastVerificationError: string | null;
  updatedAt: string;
};

type WorkflowRecord = {
  workflowType: WorkflowType;
  provider: AiProvider;
  model: string;
};

type Props = {
  keys: KeyRecord[];
  workflows: WorkflowRecord[];
};

const providers: AiProvider[] = [
  AiProvider.OPENAI,
  AiProvider.GEMINI,
  AiProvider.ANTHROPIC,
];

export function AiSettingsPanel({ keys, workflows }: Props) {
  const [keyInputs, setKeyInputs] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [workflowState, setWorkflowState] = useState<Record<string, WorkflowRecord>>(
    () => {
      const state: Record<string, WorkflowRecord> = {};
      for (const workflow of workflows) {
        state[workflow.workflowType] = workflow;
      }
      return state;
    },
  );

  function keyRecord(provider: AiProvider): KeyRecord | undefined {
    return keys.find((item) => item.provider === provider);
  }

  function showMessage(msg: string) {
    setStatus(msg);
    setTimeout(() => setStatus(null), 3000);
  }

  async function testKey(provider: AiProvider) {
    const apiKey = (keyInputs[provider] ?? "").trim();
    if (!apiKey) {
      setError(`Enter a ${provider} API key first.`);
      return;
    }

    setLoading(true);
    setError(null);
    setStatus(null);

    const response = await fetch("/api/settings/ai-keys/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, apiKey }),
    });

    const payload = (await response.json().catch(() => null)) as
      | { message?: string }
      | null;

    setLoading(false);

    if (!response.ok) {
      setError(payload?.message ?? `${provider} key test failed.`);
      return;
    }

    showMessage(payload?.message ?? `${provider} key is valid.`);
  }

  async function saveKey(provider: AiProvider) {
    const apiKey = (keyInputs[provider] ?? "").trim();
    if (!apiKey) {
      setError(`Enter a ${provider} API key first.`);
      return;
    }

    setLoading(true);
    setError(null);
    setStatus(null);

    const response = await fetch("/api/settings/ai-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, apiKey, isActive: true }),
    });

    setLoading(false);

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      setError(payload?.error ?? "Failed to save key.");
      return;
    }

    showMessage(`${provider} key saved securely.`);
    setKeyInputs((prev) => ({ ...prev, [provider]: "" }));
  }

  async function saveWorkflow(workflowType: WorkflowType) {
    const workflow = workflowState[workflowType];

    setLoading(true);
    setError(null);
    setStatus(null);

    const response = await fetch("/api/settings/workflows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(workflow),
    });

    setLoading(false);

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      setError(payload?.error ?? "Failed to save workflow settings.");
      return;
    }

    showMessage(`${workflowType} routing saved.`);
  }

  return (
    <div className="space-y-12">
      {(status || error) && (
        <div className={`p-4 text-sm rounded-xl border flex items-center gap-2 ${error ? "bg-red-500/10 border-red-500/20 text-red-400" : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"}`}>
          {error ? <AlertCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
          <span>{error || status}</span>
        </div>
      )}

      <section className="space-y-8">
        <div className="flex items-center gap-2 text-slate-100">
          <KeyRound className="w-5 h-5 text-sky-400" />
          <h2 className="text-lg font-medium">Provider keys</h2>
        </div>
        <p className="text-sm text-neutral-400">
          Keys are encrypted at rest, never shown in full after save, and only used
          server-side for AI workflows.
        </p>

        <div className="grid gap-6 md:grid-cols-3">
          {providers.map((provider) => {
            const record = keyRecord(provider);
            const isHealthy = record?.healthStatus === "OK";

            return (
              <div className="group relative p-5 rounded-2xl border border-white/5 bg-white/5 transition-colors hover:border-white/10" key={provider}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium text-slate-100">{provider}</h3>
                  {record && (
                    <span className={`text-[10px] uppercase tracking-widest font-semibold px-2 py-0.5 rounded-full border ${isHealthy ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400" : "border-amber-500/20 bg-amber-500/10 text-amber-400"}`}>
                      {isHealthy ? "Healthy" : record.healthStatus}
                    </span>
                  )}
                </div>

                <div className="space-y-1 mb-6">
                  {record ? (
                    <>
                      <p className="text-xs text-neutral-400">
                        Ends in <span className="font-mono text-slate-300">{record.keyLast4}</span>
                      </p>
                      {record.lastVerifiedAt && (
                        <p className="text-[10px] text-neutral-500">
                          Verified {new Date(record.lastVerifiedAt).toLocaleString("en-US")}
                        </p>
                      )}
                      {record?.lastVerificationError && (
                        <p className="text-xs text-red-400 mt-2">{record.lastVerificationError}</p>
                      )}
                    </>
                  ) : (
                    <p className="text-xs text-neutral-500">No key configured</p>
                  )}
                </div>

                <div className="space-y-3">
                  <input
                    className="w-full bg-transparent border-b border-white/20 pb-2 text-slate-100 focus:outline-none focus:border-sky-400 transition-colors placeholder:text-neutral-600 text-sm"
                    placeholder={`Enter ${provider} API key`}
                    type="password"
                    value={keyInputs[provider] ?? ""}
                    onChange={(event) =>
                      setKeyInputs((prev) => ({
                        ...prev,
                        [provider]: event.target.value,
                      }))
                    }
                  />

                  <div className="flex gap-2 pt-2">
                    <button
                      className="btn btn-primary flex-1 !min-h-[32px] text-xs"
                      disabled={loading || !keyInputs[provider]}
                      onClick={() => saveKey(provider)}
                      type="button"
                    >
                      Save Key
                    </button>
                    <button
                      className="btn btn-ghost flex-1 !min-h-[32px] text-xs"
                      disabled={loading || !keyInputs[provider]}
                      onClick={() => testKey(provider)}
                      type="button"
                    >
                      Test
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="space-y-8 pt-8 border-t border-white/5">
        <div className="flex items-center gap-2 text-slate-100">
          <Workflow className="w-5 h-5 text-sky-400" />
          <h2 className="text-lg font-medium">Workflow routing</h2>
        </div>
        
        <div className="space-y-4">
          {(Object.values(WorkflowType) as WorkflowType[]).map((workflowType) => {
            const workflow = workflowState[workflowType] ?? {
              workflowType,
              provider: AiProvider.OPENAI,
              model: "gpt-4o-mini",
            };

            const isChanged = workflows.find(w => w.workflowType === workflowType)?.model !== workflow.model || 
                              workflows.find(w => w.workflowType === workflowType)?.provider !== workflow.provider;

            return (
              <div className="group flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-2xl border border-transparent hover:bg-white/5 hover:border-white/5 transition-colors" key={workflowType}>
                <div className="flex-1">
                  <p className="font-medium text-slate-200">{workflowType}</p>
                  <p className="text-xs text-neutral-500 mt-1">
                    Route this specific task to a dedicated provider and model.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <select
                    className="bg-transparent text-sm text-slate-300 focus:outline-none focus:text-sky-400 transition-colors cursor-pointer appearance-none border-b border-white/20 hover:border-white/40 pb-1 w-32"
                    value={workflow.provider}
                    onChange={(event) =>
                      setWorkflowState((prev) => ({
                        ...prev,
                        [workflowType]: {
                          ...workflow,
                          provider: event.target.value as AiProvider,
                        },
                      }))
                    }
                  >
                    {providers.map((provider) => (
                      <option className="bg-slate-900" key={provider} value={provider}>
                        {provider}
                      </option>
                    ))}
                  </select>

                  <input
                    className="bg-transparent border-b border-white/20 pb-1 text-slate-100 focus:outline-none focus:border-sky-400 transition-colors placeholder:text-neutral-600 text-sm w-40"
                    value={workflow.model}
                    placeholder="Model ID"
                    onChange={(event) =>
                      setWorkflowState((prev) => ({
                        ...prev,
                        [workflowType]: {
                          ...workflow,
                          model: event.target.value,
                        },
                      }))
                    }
                  />

                  <button
                    className="btn btn-primary !min-h-[32px] text-xs px-4"
                    disabled={loading || !isChanged}
                    onClick={() => saveWorkflow(workflowType)}
                    type="button"
                  >
                    {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Save"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
