import { createHash } from "crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  sanitizeEmail,
  sanitizeLongText,
  sanitizeSingleLine,
} from "@/lib/sanitize";

type PrismaExecutor = Prisma.TransactionClient | typeof prisma;

export function normalizeTagNames(input: string[] | null | undefined): string[] {
  if (!input || input.length === 0) {
    return [];
  }

  return Array.from(
    new Set(
      input
        .flatMap((entry) => entry.split(","))
        .map((entry) => (sanitizeSingleLine(entry, 40) ?? "").toLowerCase())
        .filter(Boolean),
    ),
  ).slice(0, 20);
}

export function buildIncidentDuplicateFingerprint(input: {
  title: string;
  customerEmail?: string | null;
  modelVersion?: string | null;
}): string {
  const normalized = [
    (sanitizeSingleLine(input.title, 180) ?? "").toLowerCase(),
    sanitizeEmail(input.customerEmail)?.toLowerCase() ?? "",
    (sanitizeSingleLine(input.modelVersion, 100) ?? "").toLowerCase(),
  ].join("|");

  return createHash("sha256").update(normalized).digest("hex");
}

export async function findPotentialDuplicateIncident(input: {
  workspaceId: string;
  title: string;
  customerEmail?: string | null;
  modelVersion?: string | null;
  sourceTicketRef?: string | null;
  excludeIncidentId?: string | null;
  tx?: PrismaExecutor;
}): Promise<{ id: string } | null> {
  const executor = input.tx ?? prisma;
  const sourceTicketRef = sanitizeSingleLine(input.sourceTicketRef, 120);

  if (sourceTicketRef) {
    const sourceMatch = await executor.incident.findFirst({
      where: {
        workspaceId: input.workspaceId,
        sourceTicketRef,
        id: input.excludeIncidentId ? { not: input.excludeIncidentId } : undefined,
      },
      select: { id: true },
      orderBy: { createdAt: "desc" },
    });
    if (sourceMatch) {
      return sourceMatch;
    }
  }

  const duplicateFingerprint = buildIncidentDuplicateFingerprint({
    title: input.title,
    customerEmail: input.customerEmail,
    modelVersion: input.modelVersion,
  });

  return executor.incident.findFirst({
    where: {
      workspaceId: input.workspaceId,
      duplicateFingerprint,
      status: {
        not: "RESOLVED",
      },
      id: input.excludeIncidentId ? { not: input.excludeIncidentId } : undefined,
    },
    select: { id: true },
    orderBy: { updatedAt: "desc" },
  });
}

export async function replaceIncidentTags(
  input: {
    workspaceId: string;
    incidentId: string;
    tagNames: string[];
    assignedByUserId?: string | null;
  },
  tx?: PrismaExecutor,
): Promise<void> {
  const executor = tx ?? prisma;
  const tagNames = normalizeTagNames(input.tagNames);

  await executor.incidentTagAssignment.deleteMany({
    where: { incidentId: input.incidentId },
  });

  if (tagNames.length === 0) {
    return;
  }

  await Promise.all(
    tagNames.map((name) =>
      executor.incidentTag.upsert({
        where: {
          workspaceId_name: {
            workspaceId: input.workspaceId,
            name,
          },
        },
        create: {
          workspaceId: input.workspaceId,
          name,
        },
        update: {},
      }),
    ),
  );

  const tags = await executor.incidentTag.findMany({
    where: {
      workspaceId: input.workspaceId,
      name: { in: tagNames },
    },
    select: { id: true },
  });

  if (tags.length === 0) {
    return;
  }

  await executor.incidentTagAssignment.createMany({
    data: tags.map((tag) => ({
      incidentId: input.incidentId,
      tagId: tag.id,
      assignedByUserId: input.assignedByUserId ?? null,
    })),
    skipDuplicates: true,
  });
}

export async function loadIncidentTemplate(
  workspaceId: string,
  templateId: string | null | undefined,
) {
  if (!templateId) {
    return null;
  }

  return prisma.incidentTemplate.findFirst({
    where: {
      id: templateId,
      workspaceId,
      archivedAt: null,
    },
  });
}

export function applyTemplateToIncidentInput<
  T extends {
    title?: string | null;
    description?: string | null;
    severity?: unknown;
    category?: unknown;
    channel?: unknown;
    modelVersion?: string | null;
    tagNames?: string[];
  },
>(
  template:
    | {
        titleTemplate: string;
        descriptionTemplate: string;
        defaultSeverity: T["severity"];
        defaultCategory: T["category"];
        defaultChannel: T["channel"];
        defaultModelVersion: string | null;
        defaultTags: string[];
      }
    | null,
  input: T,
): T {
  if (!template) {
    return input;
  }

  return {
    ...input,
    title: sanitizeSingleLine(input.title || template.titleTemplate, 180),
    description: sanitizeLongText(input.description || template.descriptionTemplate, 5000),
    severity: input.severity ?? template.defaultSeverity,
    category: input.category ?? template.defaultCategory,
    channel: input.channel ?? template.defaultChannel,
    modelVersion: sanitizeSingleLine(input.modelVersion || template.defaultModelVersion, 100),
    tagNames:
      normalizeTagNames([...(template.defaultTags ?? []), ...(input.tagNames ?? [])]),
  };
}
