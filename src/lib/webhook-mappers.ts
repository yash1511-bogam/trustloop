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

export function mapLangfuseWebhook(payload: Record<string, unknown>): WebhookIncidentInput {
  return {
    title: clamp(String(payload.title ?? payload.event ?? ""), "Langfuse anomaly"),
    description: long(
      String(payload.description ?? payload.message ?? ""),
      "Langfuse flagged anomalous trace activity.",
    ),
    severity: parseSeverity(payload.severity ?? "P2"),
    category: AIIncidentCategory.MODEL_DEGRADATION,
    sourceTicketRef:
      typeof payload.traceId === "string" ? payload.traceId.slice(0, 120) : null,
    channel: IncidentChannel.API,
  };
}

export function mapHeliconeWebhook(payload: Record<string, unknown>): WebhookIncidentInput {
  return {
    title: clamp(String(payload.title ?? payload.alert ?? ""), "Helicone alert"),
    description: long(
      String(payload.description ?? payload.message ?? ""),
      "Helicone cost/latency alert.",
    ),
    severity: parseSeverity(payload.severity ?? "P2"),
    category: AIIncidentCategory.LATENCY,
    sourceTicketRef:
      typeof payload.requestId === "string" ? payload.requestId.slice(0, 120) : null,
    channel: IncidentChannel.API,
  };
}
