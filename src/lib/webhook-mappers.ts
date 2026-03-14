import { IncidentChannel, IncidentSeverity } from "@prisma/client";
import { AIIncidentCategory } from "@prisma/client";

export type WebhookIncidentInput = {
  title: string;
  description: string;
  severity: IncidentSeverity;
  category?: AIIncidentCategory | null;
  modelVersion?: string | null;
  sourceTicketRef?: string | null;
  channel?: IncidentChannel;
};

function clamp(value: string | undefined, fallback: string, max = 180): string {
  if (!value || !value.trim()) {
    return fallback.slice(0, max);
  }
  return value.trim().slice(0, max);
}

function long(value: string | undefined, fallback: string, max = 5000): string {
  if (!value || !value.trim()) {
    return fallback.slice(0, max);
  }
  return value.trim().slice(0, max);
}

function parseSeverity(raw: unknown): IncidentSeverity {
  const normalized = String(raw ?? "").trim().toUpperCase();
  if (normalized === "P1" || normalized === "CRITICAL" || normalized === "SEV1") {
    return IncidentSeverity.P1;
  }
  if (normalized === "P2" || normalized === "HIGH" || normalized === "SEV2") {
    return IncidentSeverity.P2;
  }
  return IncidentSeverity.P3;
}

export function mapGenericWebhook(payload: Record<string, unknown>): WebhookIncidentInput {
  return {
    title: clamp(String(payload.title ?? ""), "Webhook incident"),
    description: long(
      String(payload.description ?? payload.message ?? ""),
      "Webhook incident received from generic integration.",
    ),
    severity: parseSeverity(payload.severity),
    modelVersion:
      typeof payload.modelVersion === "string" ? payload.modelVersion.slice(0, 100) : null,
    sourceTicketRef:
      typeof payload.sourceRef === "string" ? payload.sourceRef.slice(0, 120) : null,
    channel: IncidentChannel.API,
  };
}

export function mapDatadogWebhook(payload: Record<string, unknown>): WebhookIncidentInput {
  const title = clamp(
    String(payload["event_title"] ?? payload.title ?? payload.alert_type ?? ""),
    "Datadog alert",
  );
  const description = long(
    String(payload["event_msg"] ?? payload.text ?? payload.message ?? ""),
    "Datadog alert webhook payload.",
  );
  const severity = parseSeverity(
    payload["priority"] ?? payload["alert_type"] ?? payload["severity"],
  );

  return {
    title,
    description,
    severity,
    sourceTicketRef:
      typeof payload["event_id"] === "string" ? payload["event_id"].slice(0, 120) : null,
    channel: IncidentChannel.API,
  };
}

export function mapPagerDutyWebhook(payload: Record<string, unknown>): WebhookIncidentInput {
  const event = Array.isArray(payload.messages)
    ? (payload.messages[0] as Record<string, unknown> | undefined)
    : undefined;
  const incident = event?.incident as Record<string, unknown> | undefined;
  const title = clamp(
    String(incident?.title ?? event?.event ?? payload.summary ?? ""),
    "PagerDuty incident trigger",
  );
  const description = long(
    String(incident?.html_url ?? incident?.description ?? event?.event ?? ""),
    "PagerDuty webhook incident payload.",
  );

  const urgency = String(incident?.urgency ?? "").toLowerCase();
  const severity = urgency === "high" ? IncidentSeverity.P1 : IncidentSeverity.P2;

  return {
    title,
    description,
    severity,
    sourceTicketRef:
      typeof incident?.id === "string" ? incident.id.slice(0, 120) : null,
    channel: IncidentChannel.API,
  };
}

export function mapSentryWebhook(payload: Record<string, unknown>): WebhookIncidentInput {
  const data = payload.data as Record<string, unknown> | undefined;
  const metadata = data?.metadata as Record<string, unknown> | undefined;
  const title = clamp(
    String(payload.issue_title ?? data?.title ?? payload.action ?? ""),
    "Sentry issue",
  );
  const description = long(
    String(data?.culprit ?? metadata?.value ?? payload.triggered_rule ?? ""),
    "Sentry webhook issue payload.",
  );

  const level = String(data?.level ?? payload.level ?? "").toLowerCase();
  const severity =
    level === "fatal" || level === "error" ? IncidentSeverity.P1 : IncidentSeverity.P2;

  return {
    title,
    description,
    severity,
    sourceTicketRef: typeof payload.issue_id === "string" ? payload.issue_id.slice(0, 120) : null,
    channel: IncidentChannel.API,
  };
}

function inferLangfuseCategory(payload: Record<string, unknown>): AIIncidentCategory {
  const eventType = String(payload.eventType ?? payload.event ?? payload.type ?? "").toLowerCase();
  const title = String(payload.title ?? "").toLowerCase();
  const desc = String(payload.description ?? payload.message ?? "").toLowerCase();
  const combined = `${eventType} ${title} ${desc}`;

  if (combined.includes("hallucin")) return AIIncidentCategory.HALLUCINATION;
  if (combined.includes("latency") || combined.includes("slow") || combined.includes("timeout")) return AIIncidentCategory.LATENCY;
  if (combined.includes("drift") || combined.includes("data")) return AIIncidentCategory.DATA_DRIFT;
  if (combined.includes("bias") || combined.includes("fairness")) return AIIncidentCategory.BIAS;
  if (combined.includes("injection") || combined.includes("prompt")) return AIIncidentCategory.PROMPT_INJECTION;
  if (combined.includes("error") || combined.includes("degrad") || combined.includes("quality")) return AIIncidentCategory.MODEL_DEGRADATION;
  return AIIncidentCategory.MODEL_DEGRADATION;
}

export function mapLangfuseWebhook(payload: Record<string, unknown>): WebhookIncidentInput {
  return {
    title: clamp(String(payload.title ?? payload.event ?? ""), "Langfuse anomaly"),
    description: long(
      String(payload.description ?? payload.message ?? ""),
      "Langfuse flagged anomalous trace activity.",
    ),
    severity: parseSeverity(payload.severity ?? "P2"),
    category: inferLangfuseCategory(payload),
    sourceTicketRef:
      typeof payload.traceId === "string" ? payload.traceId.slice(0, 120) : null,
    channel: IncidentChannel.API,
  };
}

function inferHeliconeCategory(payload: Record<string, unknown>): AIIncidentCategory {
  const alertType = String(payload.alertType ?? payload.alert ?? payload.type ?? "").toLowerCase();
  const title = String(payload.title ?? "").toLowerCase();
  const desc = String(payload.description ?? payload.message ?? "").toLowerCase();
  const combined = `${alertType} ${title} ${desc}`;

  if (combined.includes("cost") || combined.includes("spend") || combined.includes("budget")) return AIIncidentCategory.OTHER;
  if (combined.includes("error") || combined.includes("rate") || combined.includes("fail")) return AIIncidentCategory.MODEL_DEGRADATION;
  if (combined.includes("latency") || combined.includes("slow") || combined.includes("timeout")) return AIIncidentCategory.LATENCY;
  if (combined.includes("availability") || combined.includes("down")) return AIIncidentCategory.AVAILABILITY;
  return AIIncidentCategory.LATENCY;
}

export function mapHeliconeWebhook(payload: Record<string, unknown>): WebhookIncidentInput {
  return {
    title: clamp(String(payload.title ?? payload.alert ?? ""), "Helicone alert"),
    description: long(
      String(payload.description ?? payload.message ?? ""),
      "Helicone cost/latency alert.",
    ),
    severity: parseSeverity(payload.severity ?? "P2"),
    category: inferHeliconeCategory(payload),
    sourceTicketRef:
      typeof payload.requestId === "string" ? payload.requestId.slice(0, 120) : null,
    channel: IncidentChannel.API,
  };
}

function inferArizeCategory(payload: Record<string, unknown>): AIIncidentCategory {
  const combined = `${String(payload.type ?? "")} ${String(payload.title ?? "")} ${String(payload.description ?? payload.message ?? "")}`.toLowerCase();
  if (combined.includes("hallucin")) return AIIncidentCategory.HALLUCINATION;
  if (combined.includes("drift")) return AIIncidentCategory.DATA_DRIFT;
  if (combined.includes("latency") || combined.includes("slow")) return AIIncidentCategory.LATENCY;
  if (combined.includes("bias")) return AIIncidentCategory.BIAS;
  if (combined.includes("toxicity") || combined.includes("safety")) return AIIncidentCategory.OUTPUT_FILTER_FAILURE;
  return AIIncidentCategory.MODEL_DEGRADATION;
}

export function mapArizePhoenixWebhook(payload: Record<string, unknown>): WebhookIncidentInput {
  return {
    title: clamp(String(payload.title ?? payload.alert_name ?? ""), "Arize Phoenix alert"),
    description: long(String(payload.description ?? payload.message ?? ""), "Arize Phoenix model observability alert."),
    severity: parseSeverity(payload.severity ?? payload.priority ?? "P2"),
    category: inferArizeCategory(payload),
    sourceTicketRef: typeof payload.id === "string" ? payload.id.slice(0, 120) : null,
    channel: IncidentChannel.API,
  };
}

function inferBraintrustCategory(payload: Record<string, unknown>): AIIncidentCategory {
  const combined = `${String(payload.type ?? "")} ${String(payload.title ?? "")} ${String(payload.description ?? "")}`.toLowerCase();
  if (combined.includes("hallucin")) return AIIncidentCategory.HALLUCINATION;
  if (combined.includes("regression") || combined.includes("score")) return AIIncidentCategory.MODEL_DEGRADATION;
  if (combined.includes("latency")) return AIIncidentCategory.LATENCY;
  if (combined.includes("safety") || combined.includes("toxicity")) return AIIncidentCategory.OUTPUT_FILTER_FAILURE;
  return AIIncidentCategory.MODEL_DEGRADATION;
}

export function mapBraintrustWebhook(payload: Record<string, unknown>): WebhookIncidentInput {
  return {
    title: clamp(String(payload.title ?? payload.experiment_name ?? ""), "Braintrust eval alert"),
    description: long(String(payload.description ?? payload.message ?? ""), "Braintrust evaluation alert."),
    severity: parseSeverity(payload.severity ?? "P2"),
    category: inferBraintrustCategory(payload),
    sourceTicketRef: typeof payload.experiment_id === "string" ? payload.experiment_id.slice(0, 120) : null,
    channel: IncidentChannel.API,
  };
}
