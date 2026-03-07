import { NextRequest, NextResponse } from "next/server";
import { AiProvider, EventType, WorkflowType } from "@prisma/client";
import { requireApiAuthAndRateLimit } from "@/lib/api-guard";
import { decryptSecret } from "@/lib/encryption";
import { badRequest, notFound, quotaExceeded } from "@/lib/http";
import { generateCustomerUpdateDraft } from "@/lib/ai/service";
import { consumeWorkspaceQuota, enforceWorkspaceQuota } from "@/lib/policy";
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
    include: {
      events: {
        orderBy: { createdAt: "desc" },
        take: 6,
      },
    },
  });

  if (!incident) {
    return notFound("Incident not found.");
  }

  const quota = await enforceWorkspaceQuota(
    auth.user.workspaceId,
    "customer_updates",
  );
  if (!quota.allowed) {
    return quotaExceeded(
      `Daily customer update draft quota reached (${quota.limit}/day).`,
    );
  }

  const workflow =
    (await prisma.workflowSetting.findUnique({
      where: {
        workspaceId_workflowType: {
          workspaceId: auth.user.workspaceId,
          workflowType: WorkflowType.CUSTOMER_UPDATE,
        },
      },
    })) ??
    (await prisma.workflowSetting.findUnique({
      where: {
        workspaceId_workflowType: {
          workspaceId: auth.user.workspaceId,
          workflowType: WorkflowType.INCIDENT_TRIAGE,
        },
      },
    }));

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
      `No active ${provider} API key configured. Add one in Settings before drafting updates.`,
    );
  }

  const apiKey = decryptSecret(key.encryptedKey);

  const draft = await generateCustomerUpdateDraft({
    provider,
    apiKey,
    model: workflow?.model,
    incidentTitle: incident.title,
    incidentStatus: incident.status,
    incidentSummary: incident.summary ?? undefined,
    recentTimeline: incident.events
      .map((event) => `${event.eventType}: ${event.body}`)
      .reverse(),
  });

  await prisma.$transaction(async (tx) => {
    await tx.incident.update({
      where: { id: incident.id },
      data: {
        lastCustomerUpdateAt: new Date(),
        customerUpdateCount: { increment: 1 },
      },
    });

    await tx.incidentEvent.create({
      data: {
        incidentId: incident.id,
        actorUserId: auth.user.id,
        eventType: EventType.CUSTOMER_UPDATE,
        body: draft,
      },
    });
  });

  await consumeWorkspaceQuota(auth.user.workspaceId, "customer_updates", 1);
  await refreshWorkspaceReadModels(auth.user.workspaceId);

  return NextResponse.json({ draft });
}
