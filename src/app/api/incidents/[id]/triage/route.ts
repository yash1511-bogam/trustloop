import { NextRequest, NextResponse } from "next/server";
import { AiProvider, EventType, WorkflowType } from "@prisma/client";
import { requireApiAuthAndRateLimit } from "@/lib/api-guard";
import { decryptSecret } from "@/lib/encryption";
import { badRequest, notFound, quotaExceeded } from "@/lib/http";
import { generateIncidentTriage } from "@/lib/ai/service";
import { consumeWorkspaceQuota, enforceWorkspaceQuota } from "@/lib/policy";
import { enqueueReminder } from "@/lib/queue";
import { prisma } from "@/lib/prisma";
import { refreshWorkspaceReadModels } from "@/lib/read-models";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const access = await requireApiAuthAndRateLimit();
  if (access.response) {
    return access.response;
  }
  const auth = access.auth;

  const { id } = await params;

  const incident = await prisma.incident.findFirst({
    where: { id, workspaceId: auth.user.workspaceId },
  });

  if (!incident) {
    return notFound("Incident not found.");
  }

  const quota = await enforceWorkspaceQuota(auth.user.workspaceId, "triage");
  if (!quota.allowed) {
    return quotaExceeded(`Daily AI triage quota reached (${quota.limit}/day).`);
  }

  const workflow = await prisma.workflowSetting.findUnique({
    where: {
      workspaceId_workflowType: {
        workspaceId: auth.user.workspaceId,
        workflowType: WorkflowType.INCIDENT_TRIAGE,
      },
    },
  });

  const provider = workflow?.provider ?? AiProvider.OPENAI;

  const key = await prisma.aiProviderKey.findUnique({
    where: {
      workspaceId_provider: {
        workspaceId: auth.user.workspaceId,
        provider,
      },
    },
  });

  if (!key || !key.isActive) {
    return badRequest(
      `No active ${provider} API key configured. Add one in Settings before running triage.`,
    );
  }

  const apiKey = decryptSecret(key.encryptedKey);

  const triage = await generateIncidentTriage({
    provider,
    apiKey,
    model: workflow?.model,
    incidentTitle: incident.title,
    incidentDescription: incident.description,
    customerContext: [incident.customerName, incident.customerEmail]
      .filter(Boolean)
      .join(" | "),
  });

  const updated = await prisma.$transaction(async (tx) => {
    const saved = await tx.incident.update({
      where: { id: incident.id },
      data: {
        severity: triage.severity,
        category: triage.category,
        summary: triage.summary,
        triagedAt: new Date(),
        triageRunCount: { increment: 1 },
      },
    });

    await tx.incidentEvent.create({
      data: {
        incidentId: incident.id,
        actorUserId: auth.user.id,
        eventType: EventType.TRIAGE_RUN,
        body: `AI triage set severity ${triage.severity} and category ${triage.category}. Next steps: ${triage.nextSteps.join("; ")}`,
      },
    });

    return saved;
  });

  if (triage.severity === "P1" || triage.severity === "P2") {
    const messageId = await enqueueReminder({
      workspaceId: auth.user.workspaceId,
      incidentId: incident.id,
      queuedAt: new Date().toISOString(),
    });

    await prisma.reminderJobLog.create({
      data: {
        workspaceId: auth.user.workspaceId,
        incidentId: incident.id,
        queueMessageId: messageId,
      },
    });
  }

  await consumeWorkspaceQuota(auth.user.workspaceId, "triage", 1);
  await refreshWorkspaceReadModels(auth.user.workspaceId);

  return NextResponse.json({
    incident: updated,
    triage,
  });
}
