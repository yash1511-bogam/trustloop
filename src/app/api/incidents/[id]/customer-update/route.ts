import { NextRequest, NextResponse } from "next/server";
import { AiProvider, EventType, WorkflowType } from "@prisma/client";
import { requireApiAuthAndRateLimit } from "@/lib/api-guard";
import { decryptSecret } from "@/lib/encryption";
import { badRequest, notFound, quotaExceeded } from "@/lib/http";
import { AiProviderError, generateCustomerUpdateDraft } from "@/lib/ai/service";
import { consumeWorkspaceQuota, enforceWorkspaceQuota } from "@/lib/policy";
import { log } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { refreshWorkspaceReadModels } from "@/lib/read-models";
import { postSlackMessage } from "@/lib/slack";

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
    auth.workspaceId,
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
          workspaceId: auth.workspaceId,
          workflowType: WorkflowType.CUSTOMER_UPDATE,
        },
      },
    })) ??
    (await prisma.workflowSetting.findUnique({
      where: {
        workspaceId_workflowType: {
          workspaceId: auth.workspaceId,
          workflowType: WorkflowType.INCIDENT_TRIAGE,
        },
      },
    }));

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
      `No active ${provider} API key configured. Add one in Settings before drafting updates.`,
    );
  }

  const apiKey = decryptSecret(key.encryptedKey);

  let draft: string;
  try {
    draft = await generateCustomerUpdateDraft({
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
  } catch (error) {
    if (error instanceof AiProviderError) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
          retryAfterSeconds: error.retryAfterSeconds,
        },
        { status: error.code === "PROVIDER_RATE_LIMITED" ? 429 : 502 },
      );
    }
    throw error;
  }

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
        actorUserId: auth.actorUserId,
        eventType: EventType.CUSTOMER_UPDATE,
        body: draft,
      },
    });
  });

  const workspace = await prisma.workspace.findUnique({
    where: { id: auth.workspaceId },
    select: {
      slackBotToken: true,
      slackChannelId: true,
    },
  });

  if (workspace?.slackBotToken && workspace.slackChannelId) {
    const threadEvent = incident.events.find((event) => {
      if (!event.metadataJson) {
        return false;
      }
      try {
        const metadata = JSON.parse(event.metadataJson) as {
          slackThreadTs?: string;
        };
        return Boolean(metadata.slackThreadTs);
      } catch {
        return false;
      }
    });

    let threadTs: string | undefined;
    if (threadEvent?.metadataJson) {
      const parsed = JSON.parse(threadEvent.metadataJson) as {
        slackThreadTs?: string;
      };
      threadTs = parsed.slackThreadTs;
    }

    try {
      await postSlackMessage({
        botToken: decryptSecret(workspace.slackBotToken),
        channelId: workspace.slackChannelId,
        threadTs,
        text: `Customer update draft for *${incident.title}*:\n${draft}`,
      });
    } catch (error) {
      log.app.error("Failed to post Slack customer update draft", {
        workspaceId: auth.workspaceId,
        incidentId: incident.id,
        channelId: workspace.slackChannelId,
        threadTs: threadTs ?? null,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  await consumeWorkspaceQuota(auth.workspaceId, "customer_updates", 1);
  await refreshWorkspaceReadModels(auth.workspaceId);

  return NextResponse.json({ draft });
}
