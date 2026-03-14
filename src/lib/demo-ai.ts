import {
  AIIncidentCategory,
  AiProvider,
  IncidentSeverity,
} from "@prisma/client";
import { type TriageResult } from "@/lib/ai/service";

function normalizedSource(input: string): string {
  return input.toLowerCase();
}

function containsAny(source: string, terms: string[]): boolean {
  return terms.some((term) => source.includes(term));
}

export function demoSharedAiConfig():
  | { provider: AiProvider; apiKey: string; model?: string }
  | null {
  const apiKey = process.env.TRUSTLOOP_SHARED_DEMO_AI_KEY?.trim();
  if (!apiKey) {
    return null;
  }

  const rawProvider =
    process.env.TRUSTLOOP_SHARED_DEMO_AI_PROVIDER?.trim().toUpperCase() ??
    AiProvider.OPENAI;
  const provider =
    rawProvider in AiProvider
      ? (rawProvider as AiProvider)
      : AiProvider.OPENAI;

  const model = process.env.TRUSTLOOP_SHARED_DEMO_AI_MODEL?.trim() || undefined;

  return {
    provider,
    apiKey,
    model,
  };
}

export function buildMockIncidentTriage(input: {
  incidentTitle: string;
  incidentDescription: string;
  customerContext?: string;
}): TriageResult {
  const source = normalizedSource(
    [input.incidentTitle, input.incidentDescription, input.customerContext ?? ""].join(" "),
  );

  let severity: IncidentSeverity = IncidentSeverity.P3;
  if (
    containsAny(source, [
      "privacy",
      "pii",
      "leak",
      "breach",
      "503",
      "down",
      "outage",
      "security",
      "bias",
    ])
  ) {
    severity = IncidentSeverity.P1;
  } else if (
    containsAny(source, [
      "latency",
      "degraded",
      "timeout",
      "fallback",
      "stale",
      "error rate",
    ])
  ) {
    severity = IncidentSeverity.P2;
  }

  let category: AIIncidentCategory = AIIncidentCategory.OTHER;
  if (containsAny(source, ["hallucination", "made up", "unsupported promise"])) {
    category = AIIncidentCategory.HALLUCINATION;
  } else if (containsAny(source, ["bias", "fairness", "disparate"])) {
    category = AIIncidentCategory.BIAS;
  } else if (containsAny(source, ["drift", "stale", "outdated"])) {
    category = AIIncidentCategory.DATA_DRIFT;
  } else if (containsAny(source, ["latency", "slow"])) {
    category = AIIncidentCategory.LATENCY;
  } else if (containsAny(source, ["503", "outage", "down", "availability"])) {
    category = AIIncidentCategory.AVAILABILITY;
  } else if (containsAny(source, ["privacy", "pii", "leak"])) {
    category = AIIncidentCategory.DATA_PRIVACY;
  } else if (containsAny(source, ["filter", "moderation", "blocked"])) {
    category = AIIncidentCategory.OUTPUT_FILTER_FAILURE;
  } else if (containsAny(source, ["degradation", "quality regression"])) {
    category = AIIncidentCategory.MODEL_DEGRADATION;
  }

  return {
    severity,
    category,
    summary:
      "Demo triage generated locally. Review the proposed severity, confirm customer impact, and assign an owner before publishing an external update.",
    nextSteps: [
      "Confirm the customer-visible blast radius and affected workflow.",
      "Assign a single accountable incident owner and capture the mitigation plan.",
      "Prepare a customer-safe update with next checkpoint timing.",
    ],
  };
}

export function buildMockCustomerUpdateDraft(input: {
  incidentTitle: string;
  incidentStatus: string;
  incidentSummary?: string;
}): string {
  const summary = input.incidentSummary?.trim()
    ? input.incidentSummary.trim()
    : "We have identified the issue and the team is actively working through mitigation steps.";

  return [
    `We’re aware of an issue affecting ${input.incidentTitle} and are actively investigating.`,
    `Current status: ${input.incidentStatus}. ${summary}`,
    "Next update: we’ll share another checkpoint as soon as mitigation progress is confirmed.",
  ].join(" ");
}
