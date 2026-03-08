import { NextRequest, NextResponse } from "next/server";
import { AiProvider, EventType, WorkflowType } from "@prisma/client";
import { requireApiAuthAndRateLimit } from "@/lib/api-guard";
import { decryptSecret } from "@/lib/encryption";
import { badRequest, notFound, quotaExceeded } from "@/lib/http";
import { AiProviderError, generateIncidentTriage } from "@/lib/ai/service";
import { consumeWorkspaceQuota, enforceWorkspaceQuota } from "@/lib/policy";
import { enqueueReminder } from "@/lib/queue";
import { prisma } from "@/lib/prisma";
import { refreshWorkspaceReadModels } from "@/lib/read-models";
import { postIncidentAlert } from "@/lib/slack";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const access = await requireApiAuthAndRateLimit(request, { allowApiKey: true });
  if (access.response) {
    return access.response;
  }
  const auth = access.auth;

  const { id } = await params;

  const incident = await prisma.incident.findFirst({
    where: { id, workspaceId: auth.workspaceId },
  });

  if (!incident) {
    return notFound("Incident not found.");
  }

  const quota = await enforceWorkspaceQuota(auth.workspaceId, "triage");
  if (!quota.allowed) {
    return quotaExceeded(`Daily AI triage quota reached (${quota.limit}/day).`);
  }

  const workflow = await prisma.workflowSetting.findUnique({
    where: {
      workspaceId_workflowType: {
        workspaceId: auth.workspaceId,
        workflowType: WorkflowType.INCIDENT_TRIAGE,
      },
    },
  });

  const provider = workflow?.provider ?? AiProvider.OPENAI;

  const key = await prisma.aiProviderKey.findUnique({
    where: {
      workspaceId_provider: {
        workspaceId: auth.workspaceId,
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

  let triage: Awaited<ReturnType<typeof generateIncidentTriage>>;
  try {
    triage = await generateIncidentTriage({
      provider,
      apiKey,
      model: workflow?.model,
      incidentTitle: incident.title,
      incidentDescription: incident.description,
      customerContext: [incident.customerName, incident.customerEmail]
        .filter(Boolean)
        .join(" | "),
    });
  } catch (error) {
    if (error instanceof AiProviderError) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
          retryAfterSeconds: error.retryAfterSeconds,
        },
        {
          status: error.code === "PROVIDER_RATE_LIMITED" ? 429 : 502,
        },
      );
    }
    throw error;
  }

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
        actorUserId: auth.actorUserId,
        eventType: EventType.TRIAGE_RUN,
        body: `AI triage set severity ${triage.severity} and category ${triage.category}. Next steps: ${triage.nextSteps.join("; ")}`,
      },
    });

    return saved;
  });

  if (triage.severity === "P1" || triage.severity === "P2") {
    const quotaPolicy = await prisma.workspaceQuota.findUnique({
      where: { workspaceId: auth.workspaceId },
      select: {
        reminderIntervalHoursP1: true,
        reminderIntervalHoursP2: true,
      },
    });

    const reminderHours =
      triage.severity === "P1"
        ? (quotaPolicy?.reminderIntervalHoursP1 ?? 4)
        : (quotaPolicy?.reminderIntervalHoursP2 ?? 24);
    const dueAt = new Date(Date.now() + reminderHours * 3_600_000);
    const delaySeconds = Math.min(
      900,
      Math.max(60, Math.ceil((dueAt.getTime() - Date.now()) / 1000)),
    );

    const messageId = await enqueueReminder({
      workspaceId: auth.workspaceId,
      incidentId: incident.id,
      queuedAt: new Date().toISOString(),
      dueAt: dueAt.toISOString(),
      delaySeconds,
    });

    await prisma.reminderJobLog.create({
      data: {
        workspaceId: auth.workspaceId,
        incidentId: incident.id,
        queueMessageId: messageId,
      },
    });
  }

  const workspace = await prisma.workspace.findUnique({
    where: { id: auth.workspaceId },
    select: {
      slackBotToken: true,
      slackChannelId: true,
    },
  });

  if (workspace?.slackBotToken && workspace.slackChannelId) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const alert = await postIncidentAlert({
      botToken: decryptSecret(workspace.slackBotToken),
      channelId: workspace.slackChannelId,
      incidentTitle: incident.title,
      incidentId: incident.id,
      severity: triage.severity,
      summary: triage.summary,
      url: `${appUrl.replace(/\/$/, "")}/incidents/${incident.id}`,
    }).catch(() => null);

    if (alert?.ts) {
      await prisma.incidentEvent.create({
        data: {
          incidentId: incident.id,
          actorUserId: auth.actorUserId,
          eventType: EventType.NOTE,
          body: "Slack incident alert posted.",
          metadataJson: JSON.stringify({
            slackThreadTs: alert.ts,
            slackChannelId: workspace.slackChannelId,
          }),
        },
      });
    }
  }

  await consumeWorkspaceQuota(auth.workspaceId, "triage", 1);
  await refreshWorkspaceReadModels(auth.workspaceId);

  return NextResponse.json({
    incident: updated,
    triage,
  });
}
