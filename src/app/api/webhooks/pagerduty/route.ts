import { NextRequest, NextResponse } from "next/server";
import { WebhookIntegrationType } from "@prisma/client";
import { createIncidentRecord } from "@/lib/incident-service";
import { badRequest, quotaExceeded, unauthorized } from "@/lib/http";
import { mapPagerDutyWebhook } from "@/lib/webhook-mappers";
import { consumeWorkspaceQuota, enforceWorkspaceQuota } from "@/lib/policy";
import { prisma } from "@/lib/prisma";
import { refreshWorkspaceReadModels } from "@/lib/read-models";
import { resolveWebhookAccess } from "@/lib/webhook-intake";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const rawBody = await request.text();
  const access = await resolveWebhookAccess({
    request,
    rawBody,
    type: WebhookIntegrationType.PAGERDUTY,
  });
  if (!access) {
    return unauthorized();
  }

  const payload = JSON.parse(rawBody || "{}") as Record<string, unknown>;
  const mapped = mapPagerDutyWebhook(payload);

  const quota = await enforceWorkspaceQuota(access.workspaceId, "incidents");
  if (!quota.allowed) {
    return quotaExceeded(`Daily incident creation quota reached (${quota.limit}/day).`);
  }

  const incident = await prisma.$transaction(async (tx) =>
    createIncidentRecord(
      {
        workspaceId: access.workspaceId,
        title: mapped.title,
        description: mapped.description,
        severity: mapped.severity,
        category: mapped.category,
        channel: mapped.channel,
        sourceTicketRef: mapped.sourceTicketRef,
        sourceLabel: "PagerDuty webhook",
      },
      tx,
    ),
  ).catch(() => null);

  if (!incident) {
    return badRequest("Unable to create incident from PagerDuty payload.");
  }

  await consumeWorkspaceQuota(access.workspaceId, "incidents", 1);
  await refreshWorkspaceReadModels(access.workspaceId);

  return NextResponse.json({ incidentId: incident.id }, { status: 201 });
}
