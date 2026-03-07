import { NextRequest, NextResponse } from "next/server";
import { AiProvider, EventType, WorkflowType } from "@prisma/client";
import { getAuth } from "@/lib/auth";
import { decryptSecret } from "@/lib/encryption";
import { badRequest, notFound, unauthorized } from "@/lib/http";
import { generateIncidentTriage } from "@/lib/ai/service";
import { enqueueReminder } from "@/lib/queue";
import { prisma } from "@/lib/prisma";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const auth = await getAuth();
  if (!auth) {
    return unauthorized();
  }

  const { id } = await params;

  const incident = await prisma.incident.findFirst({
    where: { id, workspaceId: auth.user.workspaceId },
  });

  if (!incident) {
    return notFound("Incident not found.");
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

  return NextResponse.json({
    incident: updated,
    triage,
  });
}
