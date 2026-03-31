import {
  AiProvider,
  CustomerUpdateApprovalDecision,
  CustomerUpdateDraftStatus,
  Role,
  WorkflowType,
} from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { hasRole } from "@/lib/auth";
import { recordAuditForAccess } from "@/lib/audit";
import { requireApiAuthAndRateLimit, withRateLimitHeaders } from "@/lib/api-guard";
import { decryptSecret } from "@/lib/encryption";
import { badRequest, forbidden, notFound, quotaExceeded } from "@/lib/http";
import { AiProviderError, generateCustomerUpdateDraft } from "@/lib/ai/service";
import {
  createCustomerUpdateDraft,
  decideCustomerUpdateDraft,
  latestCustomerUpdateDraftForIncident,
  submitCustomerUpdateDraft,
  updateCustomerUpdateDraft,
} from "@/lib/customer-updates";
import { enforceWorkspaceQuota } from "@/lib/policy";
import { log } from "@/lib/logger";
import { dispatchOutboundWebhookEvent } from "@/lib/outbound-webhooks";
import { prisma } from "@/lib/prisma";
import { notifyIncidentPush } from "@/lib/incident-push";
import { postSlackMessage } from "@/lib/slack";
import {
  buildMockCustomerUpdateDraft,
  demoSharedAiConfig,
} from "@/lib/demo-ai";
import {
  DEMO_TRIAGE_LIMIT,
  countWorkspaceTriageRuns,
} from "@/lib/onboarding-demo";

const patchSchema = z.object({
  draftId: z.string().min(10).max(64).optional(),
  body: z.string().min(8).max(4000),
  customerEmail: z.email().max(160).optional().nullable(),
  action: z.enum(["save", "submit"]).default("save"),
  publishToStatusPage: z.boolean().optional(),
});

const decisionSchema = z.object({
  draftId: z.string().min(10).max(64),
  decision: z.nativeEnum(CustomerUpdateApprovalDecision),
  comment: z.string().max(1000).optional().nullable(),
});

function serializeDraft(
  draft:
    | (Awaited<ReturnType<typeof latestCustomerUpdateDraftForIncident>>)
    | Awaited<ReturnType<typeof createCustomerUpdateDraft>>
    | Awaited<ReturnType<typeof updateCustomerUpdateDraft>>
    | Awaited<ReturnType<typeof decideCustomerUpdateDraft>>
    | Awaited<ReturnType<typeof submitCustomerUpdateDraft>>
    | null,
) {
  if (!draft) {
    return null;
  }

  return {
    ...draft,
    submittedAt: draft.submittedAt?.toISOString() ?? null,
    approvedAt: draft.approvedAt?.toISOString() ?? null,
    rejectedAt: draft.rejectedAt?.toISOString() ?? null,
    publishedAt: draft.publishedAt?.toISOString() ?? null,
    emailedAt: draft.emailedAt?.toISOString() ?? null,
    createdAt: draft.createdAt.toISOString(),
    updatedAt: draft.updatedAt.toISOString(),
    approvals:
      "approvals" in draft
        ? draft.approvals.map((approval) => ({
            ...approval,
            decidedAt: approval.decidedAt.toISOString(),
            createdAt: approval.createdAt.toISOString(),
          }))
        : [],
    author:
      "author" in draft
        ? draft.author
        : null,
  };
}

async function loadIncident(workspaceId: string, id: string) {
  return prisma.incident.findFirst({
    where: { id, workspaceId },
    include: {
      events: {
        orderBy: { createdAt: "desc" },
        take: 6,
      },
    },
  });
}

async function maybePostDraftToSlack(input: {
  workspaceId: string;
  incidentId: string;
  incidentTitle: string;
  draftBody: string;
  events: Array<{ metadataJson: string | null }>;
}) {
  const workspace = await prisma.workspace.findUnique({
    where: { id: input.workspaceId },
    select: {
      slackBotToken: true,
      slackChannelId: true,
    },
  });

  if (!workspace?.slackBotToken || !workspace.slackChannelId) {
    return;
  }

  const threadEvent = input.events.find((event) => {
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
      text: `Customer update draft for *${input.incidentTitle}*:\n${input.draftBody}`,
    });
  } catch (error) {
    log.app.error("Failed to post Slack customer update draft", {
      workspaceId: input.workspaceId,
      incidentId: input.incidentId,
      channelId: workspace.slackChannelId,
      threadTs: threadTs ?? null,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const access = await requireApiAuthAndRateLimit(request, {
    allowApiKey: true,
    requiredApiKeyScopes: ["incidents:read"],
  });
  if (access.response) {
    return access.response;
  }

  const { id } = await params;
  const incident = await loadIncident(access.auth.workspaceId, id);
  if (!incident) {
    return notFound("Incident not found.");
  }

  const draft = await latestCustomerUpdateDraftForIncident(access.auth.workspaceId, incident.id);
  return withRateLimitHeaders(
    NextResponse.json({ draft: serializeDraft(draft) }),
    access.rateLimit,
  );
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const access = await requireApiAuthAndRateLimit(request, {
    allowApiKey: true,
    requiredApiKeyScopes: ["customer-updates:write"],
  });
  if (access.response) {
    return access.response;
  }
  const auth = access.auth;
  const { id } = await params;

  const incident = await loadIncident(auth.workspaceId, id);
  if (!incident) {
    return notFound("Incident not found.");
  }

  const quota = await enforceWorkspaceQuota(auth.workspaceId, "customer_updates");
  if (!quota.allowed) {
    return quotaExceeded(`Daily customer update draft quota reached (${quota.limit}/day).`);
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

  let draftBody: string;
  let draftSource = "workspace_key";
  let draftProvider: string = provider;
  let draftModel: string | null = workflow?.model ?? null;
  try {
    if (key?.isActive) {
      draftBody = await generateCustomerUpdateDraft({
        provider,
        apiKey: decryptSecret(key.encryptedKey),
        model: workflow?.model,
        incidentTitle: incident.title,
        incidentStatus: incident.status,
        incidentSummary: incident.summary ?? undefined,
        recentTimeline: incident.events
          .map((event) => `${event.eventType}: ${event.body}`)
          .reverse(),
      });
    } else {
      const priorTriageRuns = await countWorkspaceTriageRuns(
        prisma,
        auth.workspaceId,
      );

      if (priorTriageRuns >= DEMO_TRIAGE_LIMIT) {
        return badRequest(
          `No active ${provider} API key configured. Add one in Settings before drafting updates.`,
        );
      }

      const sharedDemo = demoSharedAiConfig();
      if (sharedDemo) {
        draftBody = await generateCustomerUpdateDraft({
          provider: sharedDemo.provider,
          apiKey: sharedDemo.apiKey,
          model: sharedDemo.model,
          incidentTitle: incident.title,
          incidentStatus: incident.status,
          incidentSummary: incident.summary ?? undefined,
          recentTimeline: incident.events
            .map((event) => `${event.eventType}: ${event.body}`)
            .reverse(),
        });
        draftSource = "shared_demo_key";
        draftProvider = sharedDemo.provider;
        draftModel = sharedDemo.model ?? null;
      } else {
        draftBody = buildMockCustomerUpdateDraft({
          incidentTitle: incident.title,
          incidentStatus: incident.status,
          incidentSummary: incident.summary ?? undefined,
        });
        draftSource = "mock_demo";
        draftProvider = "DEMO_MOCK";
        draftModel = null;
      }
    }
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

  const workspace = await prisma.workspace.findUniqueOrThrow({
    where: { id: auth.workspaceId },
    select: { customerUpdateApprovalsRequired: true },
  });
  const existingDraft = await latestCustomerUpdateDraftForIncident(auth.workspaceId, incident.id);

  const draft = await prisma.$transaction(async (tx) => {
    if (existingDraft && existingDraft.status !== CustomerUpdateDraftStatus.PUBLISHED) {
      return updateCustomerUpdateDraft(
        {
          draftId: existingDraft.id,
          workspaceId: auth.workspaceId,
          actorUserId: auth.actorUserId,
          body: draftBody,
          customerEmail: incident.customerEmail,
        },
        tx,
      );
    }

    return createCustomerUpdateDraft(
      {
        workspaceId: auth.workspaceId,
        incidentId: incident.id,
        authorUserId: auth.actorUserId,
        body: draftBody,
        sourceLabel: `${provider}${workflow?.model ? `:${workflow.model}` : ""}`,
        customerEmail: incident.customerEmail,
        approvalsRequired: workspace.customerUpdateApprovalsRequired,
      },
      tx,
    );
  });

  await recordAuditForAccess({
    access: auth,
    request,
    action: "customer_update.draft_generated",
    targetType: "incident",
    targetId: incident.id,
    summary: `Generated customer update draft for ${incident.title}.`,
    metadata: {
      draftId: draft.id,
      provider: draftProvider,
      model: draftModel,
      draftSource,
    },
  });

  await maybePostDraftToSlack({
    workspaceId: auth.workspaceId,
    incidentId: incident.id,
    incidentTitle: incident.title,
    draftBody,
    events: incident.events,
  });

  notifyIncidentPush({
    workspaceId: auth.workspaceId,
    incidentId: incident.id,
    incidentTitle: incident.title,
    event: "customer_update",
  });

  return withRateLimitHeaders(
    NextResponse.json({ draft: serializeDraft(draft) }),
    access.rateLimit,
  );
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const access = await requireApiAuthAndRateLimit(request, {
    allowApiKey: true,
    requiredApiKeyScopes: ["customer-updates:write"],
  });
  if (access.response) {
    return access.response;
  }
  const auth = access.auth;
  const { id } = await params;

  const incident = await loadIncident(auth.workspaceId, id);
  if (!incident) {
    return notFound("Incident not found.");
  }

  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid customer update payload.");
  }

  const workspace = await prisma.workspace.findUniqueOrThrow({
    where: { id: auth.workspaceId },
    select: { customerUpdateApprovalsRequired: true },
  });
  const existingDraft =
    (parsed.data.draftId
      ? await prisma.customerUpdateDraft.findFirst({
          where: {
            id: parsed.data.draftId,
            workspaceId: auth.workspaceId,
            incidentId: incident.id,
          },
        })
      : null) ?? (await latestCustomerUpdateDraftForIncident(auth.workspaceId, incident.id));

  let draft =
    existingDraft && existingDraft.status !== CustomerUpdateDraftStatus.PUBLISHED
      ? await prisma.$transaction(async (tx) =>
          updateCustomerUpdateDraft(
            {
              draftId: existingDraft.id,
              workspaceId: auth.workspaceId,
              actorUserId: auth.actorUserId,
              body: parsed.data.body,
              customerEmail: parsed.data.customerEmail ?? incident.customerEmail,
            },
            tx,
          ),
        )
      : await prisma.$transaction(async (tx) =>
          createCustomerUpdateDraft(
            {
              workspaceId: auth.workspaceId,
              incidentId: incident.id,
              authorUserId: auth.actorUserId,
              body: parsed.data.body,
              customerEmail: parsed.data.customerEmail ?? incident.customerEmail,
              approvalsRequired: workspace.customerUpdateApprovalsRequired,
            },
            tx,
          ),
        );

  if (parsed.data.action === "submit") {
    draft = await prisma.$transaction((tx) =>
      submitCustomerUpdateDraft(
        {
          draftId: draft.id,
          actorUserId: auth.actorUserId,
          incidentId: incident.id,
        },
        tx,
      ),
    );

    if (parsed.data.publishToStatusPage) {
      const ws = await prisma.workspace.findUnique({
        where: { id: auth.workspaceId },
        select: { statusPageEnabled: true, slug: true },
      });
      if (ws?.statusPageEnabled && ws.slug) {
        await prisma.statusUpdate.create({
          data: {
            workspaceId: auth.workspaceId,
            incidentId: incident.id,
            body: parsed.data.body.trim(),
            publishedAt: new Date(),
            isVisible: true,
            createdByUserId: auth.actorUserId,
          },
        });
      }
    }
  }

  const loaded = await latestCustomerUpdateDraftForIncident(auth.workspaceId, incident.id);

  await recordAuditForAccess({
    access: auth,
    request,
    action:
      parsed.data.action === "submit"
        ? "customer_update.submitted"
        : "customer_update.saved",
    targetType: "customer_update_draft",
    targetId: draft.id,
    summary:
      parsed.data.action === "submit"
        ? `Submitted customer update draft for ${incident.title}.`
        : `Saved customer update draft for ${incident.title}.`,
    metadata: {
      incidentId: incident.id,
    },
  });

  return withRateLimitHeaders(
    NextResponse.json({ draft: serializeDraft(loaded) }),
    access.rateLimit,
  );
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const access = await requireApiAuthAndRateLimit(request, {
    allowApiKey: false,
  });
  if (access.response) {
    return access.response;
  }
  const auth = access.auth;
  if (auth.kind !== "session") {
    return forbidden();
  }
  if (!hasRole({ user: auth.user }, [Role.OWNER, Role.MANAGER])) {
    return forbidden();
  }

  const { id } = await params;
  const incident = await loadIncident(auth.workspaceId, id);
  if (!incident) {
    return notFound("Incident not found.");
  }

  const body = await request.json().catch(() => null);
  const parsed = decisionSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid approval payload.");
  }

  const draft = await prisma.customerUpdateDraft.findFirst({
    where: {
      id: parsed.data.draftId,
      workspaceId: auth.workspaceId,
      incidentId: incident.id,
    },
    select: {
      id: true,
      authorUserId: true,
      status: true,
    },
  });
  if (!draft) {
    return notFound("Customer update draft not found.");
  }
  if (draft.status !== CustomerUpdateDraftStatus.PENDING_APPROVAL) {
    return badRequest("Draft must be pending approval.");
  }

  const membershipCount = await prisma.workspaceMembership.count({
    where: { workspaceId: auth.workspaceId },
  });
  if (draft.authorUserId === auth.user.id && membershipCount > 1) {
    return badRequest("Draft author cannot approve their own update when another approver is available.");
  }

  const updated = await prisma.$transaction((tx) =>
    decideCustomerUpdateDraft(
      {
        draftId: draft.id,
        incidentId: incident.id,
        actorUserId: auth.user.id,
        decision: parsed.data.decision,
        comment: parsed.data.comment,
      },
      tx,
    ),
  );
  const loaded = await latestCustomerUpdateDraftForIncident(auth.workspaceId, incident.id);

  await recordAuditForAccess({
    access: auth,
    request,
    action:
      parsed.data.decision === CustomerUpdateApprovalDecision.APPROVED
        ? "customer_update.approved"
        : "customer_update.rejected",
    targetType: "customer_update_draft",
    targetId: updated.id,
    summary:
      parsed.data.decision === CustomerUpdateApprovalDecision.APPROVED
        ? `Approved customer update draft for ${incident.title}.`
        : `Rejected customer update draft for ${incident.title}.`,
    metadata: {
      incidentId: incident.id,
      comment: parsed.data.comment ?? null,
    },
  });

  if (updated.status === CustomerUpdateDraftStatus.APPROVED) {
    void dispatchOutboundWebhookEvent({
      workspaceId: auth.workspaceId,
      eventType: "customer_update.approved",
      incidentId: incident.id,
      payload: {
        draftId: updated.id,
        incidentId: incident.id,
      },
    });
  }

  return withRateLimitHeaders(
    NextResponse.json({ draft: serializeDraft(loaded) }),
    access.rateLimit,
  );
}
