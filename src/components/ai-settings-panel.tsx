"use client";

import { AiProvider, WorkflowType } from "@prisma/client";
import { useState } from "react";

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

    setStatus(payload?.message ?? `${provider} key is valid.`);
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

    setStatus(`${provider} key saved securely.`);
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

    setStatus(`${workflowType} settings saved.`);
  }

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <p className="kicker">Provider keys</p>
        <p className="text-sm text-neutral-400">
          Keys are encrypted at rest, never shown in full after save, and only used
          server-side for AI workflows.
        </p>

        <div className="grid gap-4 md:grid-cols-3">
          {providers.map((provider) => {
            const record = keyRecord(provider);

            return (
              <div className="surface p-4" key={provider}>
                <h3 className="text-lg font-semibold">{provider}</h3>
                <p className="mt-1 text-xs text-neutral-400">
                  {record
                    ? `Saved key ending in ${record.keyLast4} • updated ${new Date(
                        record.updatedAt,
                      ).toLocaleString()}`
                    : "No key saved yet."}
                </p>
                {record ? (
                  <p className="mt-1 text-xs text-neutral-400">
                    Health: {record.healthStatus}
                    {record.lastVerifiedAt
                      ? ` • last checked ${new Date(record.lastVerifiedAt).toLocaleString()}`
                      : ""}
                  </p>
                ) : null}
                {record?.lastVerificationError ? (
                  <p className="mt-1 text-xs text-red-700">{record.lastVerificationError}</p>
                ) : null}

                <input
                  className="input mt-4"
                  placeholder={`Enter ${provider} API key`}
                  value={keyInputs[provider] ?? ""}
                  onChange={(event) =>
                    setKeyInputs((prev) => ({
                      ...prev,
                      [provider]: event.target.value,
                    }))
                  }
                />

                <div className="mt-4 flex gap-2">
                  <button
                    className="btn btn-ghost"
                    disabled={loading}
                    onClick={() => testKey(provider)}
                    type="button"
                  >
                    Test
                  </button>
                  <button
                    className="btn btn-primary"
                    disabled={loading}
                    onClick={() => saveKey(provider)}
                    type="button"
                  >
                    Save
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="space-y-4">
        <p className="kicker">Workflow routing</p>
        <div className="space-y-4">
          {(Object.values(WorkflowType) as WorkflowType[]).map((workflowType) => {
            const workflow = workflowState[workflowType] ?? {
              workflowType,
              provider: AiProvider.OPENAI,
              model: "gpt-4o-mini",
            };

            return (
              <div className="surface grid gap-4 p-4 md:grid-cols-[1fr_1fr_1fr_auto]" key={workflowType}>
                <div>
                  <p className="font-semibold">{workflowType}</p>
                  <p className="text-xs text-neutral-400">
                    Select provider + model used for this workflow.
                  </p>
                </div>

                <select
                  className="select"
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
                    <option key={provider} value={provider}>
                      {provider}
                    </option>
                  ))}
                </select>

                <input
                  className="input"
                  value={workflow.model}
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
                  className="btn btn-primary"
                  disabled={loading}
                  onClick={() => saveWorkflow(workflowType)}
                  type="button"
                >
                  Save
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {status ? <p className="text-sm text-emerald-700">{status}</p> : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </div>
  );
}
