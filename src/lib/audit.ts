import { NextRequest } from "next/server";
import type { ApiAccessContext } from "@/lib/api-guard";
import { requestIpAddress } from "@/lib/api-key-scopes";
import { prisma } from "@/lib/prisma";

type JsonRecord = Record<string, unknown>;

export type AuditLogInput = {
  workspaceId: string;
  action: string;
  targetType: string;
  targetId?: string | null;
  summary: string;
  metadata?: JsonRecord | null;
  actorUserId?: string | null;
  actorApiKeyId?: string | null;
  ipAddress?: string | null;
};

function safeMetadataJson(value: JsonRecord | null | undefined): string | null {
  if (!value) {
    return null;
  }

  try {
    return JSON.stringify(value);
  } catch {
    return JSON.stringify({ serializationError: true });
  }
}

export async function recordAuditLog(input: AuditLogInput): Promise<void> {
  await prisma.auditLog.create({
    data: {
      workspaceId: input.workspaceId,
      actorUserId: input.actorUserId ?? null,
      actorApiKeyId: input.actorApiKeyId ?? null,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId ?? null,
      summary: input.summary,
      metadataJson: safeMetadataJson(input.metadata),
      ipAddress: input.ipAddress ?? null,
    },
  });
}

export async function recordAuditForAccess(input: {
  access: ApiAccessContext;
  request?: NextRequest;
  action: string;
  targetType: string;
  targetId?: string | null;
  summary: string;
  metadata?: JsonRecord | null;
}): Promise<void> {
  await recordAuditLog({
    workspaceId: input.access.workspaceId,
    actorUserId: input.access.kind === "session" ? input.access.actorUserId : null,
    actorApiKeyId: input.access.kind === "api_key" ? input.access.apiKey.id : null,
    ipAddress: input.request ? requestIpAddress(input.request) : null,
    action: input.action,
    targetType: input.targetType,
    targetId: input.targetId ?? null,
    summary: input.summary,
    metadata: input.metadata ?? null,
  });
}

export async function listAuditLogs(workspaceId: string, limit = 50) {
  return prisma.auditLog.findMany({
    where: { workspaceId },
    include: {
      actorUser: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      actorApiKey: {
        select: {
          id: true,
          name: true,
          keyPrefix: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: Math.max(1, Math.min(limit, 200)),
  });
}
