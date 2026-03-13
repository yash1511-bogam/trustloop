import {
  AiProvider,
  EventType,
  IncidentStatus,
  Role,
  WorkflowType,
} from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { hasRole } from "@/lib/auth";
import { recordAuditForAccess } from "@/lib/audit";
import { apiKeyHasScopes } from "@/lib/api-key-scopes";
import { requireApiAuthAndRateLimit, withRateLimitHeaders } from "@/lib/api-guard";
import { decryptSecret } from "@/lib/encryption";
import { badRequest, forbidden } from "@/lib/http";
import { AiProviderError, generateIncidentTriage } from "@/lib/ai/service";
import { consumeWorkspaceQuota, enforceWorkspaceQuota } from "@/lib/policy";
import { prisma } from "@/lib/prisma";
import { refreshWorkspaceReadModels } from "@/lib/read-models";
import { sanitizeLongText } from "@/lib/sanitize";

const bulkSchema = z.object({
  incidentIds: z.array(z.string().min(10).max(64)).min(1).max(100),
  action: z.enum(["assign", "close", "triage", "delete"]),
  ownerUserId: z.string().min(10).max(64).optional().nullable(),
});

function requireScopesOrRole(input: {
  requestAction: z.infer<typeof bulkSchema>["action"];
  access: Awaited<ReturnType<typeof requireApiAuthAndRateLimit>> extends {
    auth: infer T;
  }
    ? T
    : never;
}): boolean {
  const scopeMap = {
    assign: ["incidents:write"] as const,
    close: ["incidents:write"] as const,
    triage: ["incidents:triage"] as const,
    delete: ["incidents:delete"] as const,
  };

  if (!input.access) return false;

  if (input.access.kind === "session") {
    if (input.requestAction === "delete") {
      return hasRole({ user: input.access.user }, [Role.OWNER, Role.MANAGER]);
    }
    return true;
  }

  return apiKeyHasScopes(input.access.apiKey.scopes, [...scopeMap[input.requestAction]]);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const access = await requireApiAuthAndRateLimit(request, {
    allowApiKey: true,
  });
  if (access.response) {
    return access.response;
  }
  const auth = access.auth;

  const body = await request.json().catch(() => null);
  const parsed = bulkSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid bulk incident payload.");
  }

  if (!requireScopesOrRole({ requestAction: parsed.data.action, access: auth })) {
    return forbidden();
  }

  const incidents = await prisma.incident.findMany({
    where: {
      workspaceId: auth.workspaceId,
      id: { in: parsed.data.incidentIds },
    },
    select: {
      id: true,
      title: true,
      description: true,
      customerName: true,
      customerEmail: true,
      summary: true,
      status: true,
    },
  });

  if (incidents.length === 0) {
    return badRequest("No incidents matched the selected IDs.");
  }

  if (
    parsed.data.action === "assign" &&
    !parsed.data.ownerUserId
  ) {
    return badRequest("ownerUserId is required for bulk assign.");
  }

  if (parsed.data.action === "delete") {
    const workspace = await prisma.workspace.findUnique({
      where: { id: auth.workspaceId },
      select: { complianceMode: true },
    });

    if (workspace?.complianceMode) {
      return forbidden();
    }
  }

  let ownerUserId: string | null = null;
  if (parsed.data.action === "assign" && parsed.data.ownerUserId) {
    const owner = await prisma.user.findFirst({
      where: {
        id: parsed.data.ownerUserId,
        workspaceId: auth.workspaceId,
      },
      select: { id: true },
    });
    if (!owner) {
      return badRequest("Owner must belong to this workspace.");
    }
    ownerUserId = owner.id;
  }

  let triageWorkflow:
    | {
        provider: AiProvider;
        model: string;
        apiKey: string;
      }
    | null = null;

  if (parsed.data.action === "triage") {
    const quota = await enforceWorkspaceQuota(auth.workspaceId, "triage");
    if (quota.used + incidents.length > quota.limit) {
      return badRequest(
        `Bulk triage would exceed the daily triage quota (${quota.limit}/day).`,
      );
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

    triageWorkflow = {
      provider,
      model: workflow?.model ?? "gpt-4o-mini",
      apiKey: decryptSecret(key.encryptedKey),
    };
  }

  const updatedIds: string[] = [];
  const failed: Array<{ incidentId: string; error: string }> = [];

  for (const incident of incidents) {
    try {
      if (parsed.data.action === "assign") {
        await prisma.$transaction(async (tx) => {
          await tx.incident.update({
            where: { id: incident.id },
            data: {
              ownerUserId,
              firstRespondedAt: new Date(),
            },
          });
          await tx.incidentEvent.create({
            data: {
              incidentId: incident.id,
              actorUserId: auth.actorUserId,
              eventType: EventType.BULK_OPERATION,
              body: `Bulk operation assigned owner ${ownerUserId ?? "unassigned"}.`,
            },
          });
        });
      } else if (parsed.data.action === "close") {
        await prisma.$transaction(async (tx) => {
          await tx.incident.update({
            where: { id: incident.id },
            data: {
              status: IncidentStatus.RESOLVED,
              resolvedAt: new Date(),
              firstRespondedAt: incident.status === IncidentStatus.RESOLVED ? undefined : new Date(),
            },
          });
          await tx.incidentEvent.create({
            data: {
              incidentId: incident.id,
              actorUserId: auth.actorUserId,
              eventType: EventType.BULK_OPERATION,
              body: "Bulk operation resolved incident.",
            },
          });
        });
      } else if (parsed.data.action === "delete") {
        await prisma.incident.delete({
          where: { id: incident.id },
        });
      } else if (parsed.data.action === "triage" && triageWorkflow) {
        const triage = await generateIncidentTriage({
          provider: triageWorkflow.provider,
          apiKey: triageWorkflow.apiKey,
          model: triageWorkflow.model,
          incidentTitle: incident.title,
          incidentDescription: incident.description,
          customerContext: [incident.customerName, incident.customerEmail]
            .filter(Boolean)
            .join(" | "),
        });

        await prisma.$transaction(async (tx) => {
          await tx.incident.update({
            where: { id: incident.id },
            data: {
              severity: triage.severity,
              category: triage.category,
              summary: triage.summary,
              triagedAt: new Date(),
              triageRunCount: { increment: 1 },
              firstRespondedAt: new Date(),
            },
          });
          await tx.incidentEvent.create({
            data: {
              incidentId: incident.id,
              actorUserId: auth.actorUserId,
              eventType: EventType.BULK_OPERATION,
              body: `Bulk triage set severity ${triage.severity} and category ${triage.category}. Next steps: ${sanitizeLongText(triage.nextSteps.join("; "), 500)}`,
            },
          });
        });
      }

      updatedIds.push(incident.id);
    } catch (error) {
      const message =
        error instanceof AiProviderError
          ? error.message
          : error instanceof Error
            ? error.message
            : String(error);
      failed.push({
        incidentId: incident.id,
        error: message,
      });
    }
  }

  if (parsed.data.action === "triage" && updatedIds.length > 0) {
    await consumeWorkspaceQuota(auth.workspaceId, "triage", updatedIds.length);
  }

  await refreshWorkspaceReadModels(auth.workspaceId);
  await recordAuditForAccess({
    access: auth,
    request,
    action: `incident.bulk_${parsed.data.action}`,
    targetType: "incident_bulk_operation",
    summary: `Bulk ${parsed.data.action} processed ${updatedIds.length} incidents.`,
    metadata: {
      requestedCount: parsed.data.incidentIds.length,
      updatedIds,
      failed,
      ownerUserId,
    },
  });

  return withRateLimitHeaders(
    NextResponse.json({
      action: parsed.data.action,
      requestedCount: parsed.data.incidentIds.length,
      succeededCount: updatedIds.length,
      failedCount: failed.length,
      updatedIds,
      failed,
    }),
    access.rateLimit,
  );
}
