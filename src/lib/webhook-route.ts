import { WebhookIntegrationType } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { badRequest, quotaExceeded, unauthorized } from "@/lib/http";
import {
  createIncidentRecord,
  findIncidentBySourceTicketRef,
} from "@/lib/incident-service";
import { log } from "@/lib/logger";
import { enforceWorkspaceQuota } from "@/lib/policy";
import { prisma } from "@/lib/prisma";
import { refreshWorkspaceReadModels } from "@/lib/read-models";
import { resolveWebhookAccess } from "@/lib/webhook-intake";
import type { WebhookIncidentInput } from "@/lib/webhook-mappers";

type WebhookIncidentRouteConfig = {
  type: WebhookIntegrationType;
  integrationName: string;
  sourceLabel: string;
  mapPayload: (payload: Record<string, unknown>) => WebhookIncidentInput;
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function parsePayload(rawBody: string): Record<string, unknown> | null {
  if (!rawBody.trim()) {
    return {};
  }

  try {
    const parsed = JSON.parse(rawBody) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function handleWebhookIncidentRoute(
  request: NextRequest,
  config: WebhookIncidentRouteConfig,
): Promise<NextResponse> {
  const rawBody = await request.text();
  const access = await resolveWebhookAccess({
    request,
    rawBody,
    type: config.type,
  });

  if (!access) {
    log.app.warn("Webhook access denied", {
      integration: config.type,
      reason: "unauthorized",
    });
    return unauthorized();
  }

  const payload = parsePayload(rawBody);
  if (!payload) {
    log.app.warn("Webhook payload parse failed", {
      integration: config.type,
      workspaceId: access.workspaceId,
      reason: "invalid_json_object",
    });
    return badRequest("Webhook payload must be a valid JSON object.");
  }

  const mapped = config.mapPayload(payload);

  const existing = await findIncidentBySourceTicketRef({
    workspaceId: access.workspaceId,
    sourceTicketRef: mapped.sourceTicketRef,
  });
  if (existing) {
    log.app.info("Webhook incident deduplicated", {
      integration: config.type,
      workspaceId: access.workspaceId,
      incidentId: existing.id,
      sourceTicketRef: mapped.sourceTicketRef ?? null,
    });
    return NextResponse.json(
      { incidentId: existing.id, deduplicated: true },
      { status: 200 },
    );
  }

  const quota = await enforceWorkspaceQuota(access.workspaceId, "incidents");
  if (!quota.allowed) {
    log.app.warn("Webhook incident blocked by quota", {
      integration: config.type,
      workspaceId: access.workspaceId,
      quotaMetric: "incidents",
      quotaLimit: quota.limit,
    });
    return quotaExceeded(
      `Daily incident creation quota reached (${quota.limit}/day).`,
    );
  }

  let incident: { id: string } | null = null;
  try {
    incident = await prisma.$transaction(async (tx) =>
      createIncidentRecord(
        {
          workspaceId: access.workspaceId,
          title: mapped.title,
          description: mapped.description,
          severity: mapped.severity,
          category: mapped.category,
          channel: mapped.channel,
          modelVersion: mapped.modelVersion,
          sourceTicketRef: mapped.sourceTicketRef,
          sourceLabel: config.sourceLabel,
        },
        tx,
      ),
    );
  } catch (error) {
    log.app.error("Webhook incident creation failed", {
      integration: config.type,
      workspaceId: access.workspaceId,
      sourceTicketRef: mapped.sourceTicketRef ?? null,
      error: errorMessage(error),
    });
    return badRequest(`Unable to create incident from ${config.integrationName} payload.`);
  }

  const [refreshResult] = await Promise.allSettled([
    refreshWorkspaceReadModels(access.workspaceId),
  ]);

  if (refreshResult.status === "rejected") {
    log.app.error("Webhook read model refresh failed", {
      integration: config.type,
      workspaceId: access.workspaceId,
      incidentId: incident.id,
      error: errorMessage(refreshResult.reason),
    });
  }

  log.app.info("Webhook incident created", {
    integration: config.type,
    workspaceId: access.workspaceId,
    incidentId: incident.id,
    sourceTicketRef: mapped.sourceTicketRef ?? null,
    accessMode: access.mode,
  });

  return NextResponse.json({ incidentId: incident.id }, { status: 201 });
}
