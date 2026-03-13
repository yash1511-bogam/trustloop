import { NextRequest, NextResponse } from "next/server";
import {
  AIIncidentCategory,
  EventType,
  IncidentSeverity,
  IncidentStatus,
  Role,
} from "@prisma/client";
import { z } from "zod";
import { hasRole } from "@/lib/auth";
import { recordAuditForAccess } from "@/lib/audit";
import { requireApiAuthAndRateLimit, withRateLimitHeaders } from "@/lib/api-guard";
import { badRequest, forbidden, notFound } from "@/lib/http";
import { replaceIncidentTags } from "@/lib/incident-metadata";
import { log } from "@/lib/logger";
import { dispatchOutboundWebhookEvent } from "@/lib/outbound-webhooks";
import { prisma } from "@/lib/prisma";
import { refreshWorkspaceReadModels } from "@/lib/read-models";
import { buildIncidentSlaFields, ensureWorkspaceSlaPolicy } from "@/lib/sla";
import { sendOwnerAssignedEmail } from "@/lib/email";
import { notifyIncidentPush } from "@/lib/incident-push";

const patchSchema = z.object({
  status: z.nativeEnum(IncidentStatus).optional(),
  severity: z.nativeEnum(IncidentSeverity).optional(),
  category: z.nativeEnum(AIIncidentCategory).optional().nullable(),
  summary: z.string().max(1000).optional().nullable(),
  ownerUserId: z.string().optional().nullable(),
  templateId: z.string().min(10).max(64).optional().nullable(),
  tagNames: z.array(z.string().max(40)).max(20).optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const access = await requireApiAuthAndRateLimit(_request, {
    allowApiKey: true,
    requiredApiKeyScopes: ["incidents:read"],
  });
  if (access.response) {
    return access.response;
  }
  const auth = access.auth;

  const { id } = await params;

  const incident = await prisma.incident.findFirst({
    where: { id, workspaceId: auth.workspaceId },
    include: {
      owner: {
        select: { id: true, name: true, email: true },
      },
      events: {
        include: {
          actor: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      tagAssignments: {
        include: {
          tag: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: "asc",
        },
      },
      customerUpdateDrafts: {
        orderBy: [{ updatedAt: "desc" }],
        take: 5,
        include: {
          approvals: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
          author: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
    },
  });

  if (!incident) {
    return notFound("Incident not found.");
  }

  return withRateLimitHeaders(NextResponse.json({ incident }), access.rateLimit);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const access = await requireApiAuthAndRateLimit(request, {
    allowApiKey: true,
    requiredApiKeyScopes: ["incidents:write"],
  });
  if (access.response) {
    return access.response;
  }
  const auth = access.auth;

  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);

  if (!parsed.success) {
    return badRequest("Invalid incident update payload.");
  }

  const { id } = await params;

  const existing = await prisma.incident.findFirst({
    where: { id, workspaceId: auth.workspaceId },
    include: {
      owner: {
        select: { id: true, email: true, name: true },
      },
    },
  });

  if (!existing) {
    return notFound("Incident not found.");
  }

  let nextOwnerName: string | null = null;
  if (parsed.data.ownerUserId) {
    const nextOwner = await prisma.user.findFirst({
      where: {
        id: parsed.data.ownerUserId,
        workspaceId: auth.workspaceId,
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (!nextOwner) {
      return badRequest("Owner must belong to this workspace.");
    }
    nextOwnerName = nextOwner.name;
  }

  let resolvedAtValue: Date | null | undefined = undefined;
  if (parsed.data.status !== undefined) {
    resolvedAtValue =
      parsed.data.status === IncidentStatus.RESOLVED ? new Date() : null;
  }
  const nextSeverity = parsed.data.severity ?? existing.severity;
  const policy = await ensureWorkspaceSlaPolicy(auth.workspaceId);

  const updated = await prisma.$transaction(async (tx) => {
    const incident = await tx.incident.update({
      where: { id: existing.id },
      data: {
        status: parsed.data.status,
        severity: parsed.data.severity,
        category:
          parsed.data.category !== undefined ? parsed.data.category : undefined,
        summary: parsed.data.summary?.trim() || null,
        ownerUserId: parsed.data.ownerUserId ?? undefined,
        templateId:
          parsed.data.templateId !== undefined ? parsed.data.templateId : undefined,
        resolvedAt: resolvedAtValue,
        firstRespondedAt:
          existing.firstRespondedAt ??
          (parsed.data.summary || parsed.data.status || parsed.data.ownerUserId || parsed.data.category
            ? new Date()
            : undefined),
        ...(parsed.data.severity && parsed.data.severity !== existing.severity
          ? buildIncidentSlaFields({
              createdAt: existing.createdAt,
              severity: parsed.data.severity,
              policy,
            })
          : {}),
      },
    });

    if (parsed.data.tagNames !== undefined) {
      await replaceIncidentTags(
        {
          workspaceId: auth.workspaceId,
          incidentId: incident.id,
          tagNames: parsed.data.tagNames,
          assignedByUserId: auth.actorUserId,
        },
        tx,
      );
    }

    const changed: string[] = [];
    if (parsed.data.status && parsed.data.status !== existing.status) {
      changed.push(`status ${existing.status} -> ${parsed.data.status}`);
    }
    if (parsed.data.severity && parsed.data.severity !== existing.severity) {
      changed.push(`severity ${existing.severity} -> ${parsed.data.severity}`);
    }
    if (parsed.data.category !== undefined && parsed.data.category !== existing.category) {
      changed.push(
        `category ${existing.category ?? "Uncategorized"} -> ${parsed.data.category ?? "Uncategorized"}`,
      );
    }
    if (
      parsed.data.ownerUserId !== undefined &&
      parsed.data.ownerUserId !== existing.ownerUserId
    ) {
      changed.push("owner updated");
    }
    if (parsed.data.templateId !== undefined && parsed.data.templateId !== existing.templateId) {
      changed.push("template updated");
    }
    if (parsed.data.tagNames !== undefined) {
      changed.push("tags updated");
    }

    if (
      changed.length > 0 &&
      (parsed.data.status !== undefined ||
        parsed.data.severity !== undefined ||
        parsed.data.category !== undefined)
    ) {
      await tx.incidentEvent.create({
        data: {
          incidentId: incident.id,
          actorUserId: auth.actorUserId,
          eventType: EventType.STATUS_CHANGED,
          body: `Incident updated: ${changed.join(", ")}.`,
        },
      });
    }

    if (
      parsed.data.ownerUserId !== undefined &&
      parsed.data.ownerUserId !== existing.ownerUserId
    ) {
      await tx.incidentEvent.create({
        data: {
          incidentId: incident.id,
          actorUserId: auth.actorUserId,
          eventType: EventType.OWNER_CHANGED,
          body: `Owner changed from ${existing.owner?.name ?? "Unassigned"} to ${parsed.data.ownerUserId ? (nextOwnerName ?? "Assigned owner") : "Unassigned"}.`,
        },
      });
    }

    return incident;
  });

  if (
    parsed.data.ownerUserId &&
    parsed.data.ownerUserId !== existing.ownerUserId
  ) {
    const newOwner = await prisma.user.findUnique({
      where: { id: parsed.data.ownerUserId },
      select: {
        email: true,
        name: true,
      },
    });
    if (newOwner?.email) {
      try {
        await sendOwnerAssignedEmail({
          workspaceId: auth.workspaceId,
          incidentId: existing.id,
          toEmail: newOwner.email,
          ownerName: newOwner.name,
          incidentTitle: updated.title,
        });
      } catch (error) {
        log.app.error("Failed to send owner assignment email", {
          workspaceId: auth.workspaceId,
          incidentId: existing.id,
          ownerUserId: parsed.data.ownerUserId,
          toEmail: newOwner.email,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  await refreshWorkspaceReadModels(auth.workspaceId);
  await recordAuditForAccess({
    access: auth,
    request,
    action: parsed.data.status === IncidentStatus.RESOLVED ? "incident.resolved" : "incident.updated",
    targetType: "incident",
    targetId: existing.id,
    summary:
      parsed.data.status === IncidentStatus.RESOLVED
        ? `Resolved incident ${updated.title}.`
        : `Updated incident ${updated.title}.`,
    metadata: {
      status: updated.status,
      severity: updated.severity,
      category: updated.category,
      templateId: updated.templateId,
      ownerUserId: updated.ownerUserId,
      tagNames: parsed.data.tagNames ?? null,
    },
  });

  if (parsed.data.ownerUserId && parsed.data.ownerUserId !== existing.ownerUserId) {
    notifyIncidentPush({
      workspaceId: auth.workspaceId,
      incidentId: existing.id,
      incidentTitle: updated.title,
      event: "assigned",
      assigneeUserId: parsed.data.ownerUserId,
    });
  }

  void dispatchOutboundWebhookEvent({
    workspaceId: auth.workspaceId,
    eventType:
      updated.status === IncidentStatus.RESOLVED
        ? "incident.resolved"
        : "incident.updated",
    incidentId: updated.id,
    payload: {
      incident: updated,
    },
  });

  return withRateLimitHeaders(
    NextResponse.json({ incident: updated }),
    access.rateLimit,
  );
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const access = await requireApiAuthAndRateLimit(request);
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
  const incident = await prisma.incident.findFirst({
    where: {
      id,
      workspaceId: auth.workspaceId,
    },
    select: { id: true },
  });

  if (!incident) {
    return notFound("Incident not found.");
  }

  const workspace = await prisma.workspace.findUnique({
    where: { id: auth.workspaceId },
    select: { complianceMode: true },
  });

  if (workspace?.complianceMode) {
    return NextResponse.json(
      { error: "Compliance mode prevents deletion." },
      { status: 403 },
    );
  }

  await prisma.incident.delete({
    where: { id: incident.id },
  });
  await refreshWorkspaceReadModels(auth.workspaceId);
  await recordAuditForAccess({
    access: auth,
    request,
    action: "incident.deleted",
    targetType: "incident",
    targetId: incident.id,
    summary: `Deleted incident ${incident.id}.`,
  });

  return withRateLimitHeaders(
    NextResponse.json({ deleted: true }),
    access.rateLimit,
  );
}
