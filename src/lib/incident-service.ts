import {
  AIIncidentCategory,
  EventType,
  IncidentChannel,
  IncidentSeverity,
  IncidentStatus,
  Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  sanitizeCustomerName,
  sanitizeEmail,
  sanitizeLongText,
  sanitizeSingleLine,
} from "@/lib/sanitize";
import {
  buildIncidentDuplicateFingerprint,
  replaceIncidentTags,
} from "@/lib/incident-metadata";
import { buildIncidentSlaFields, ensureWorkspaceSlaPolicy } from "@/lib/sla";

export type IncidentCreateInput = {
  workspaceId: string;
  actorUserId?: string | null;
  title: string;
  description: string;
  customerName?: string | null;
  customerEmail?: string | null;
  channel?: IncidentChannel;
  severity?: IncidentSeverity;
  category?: AIIncidentCategory | null;
  modelVersion?: string | null;
  sourceTicketRef?: string | null;
  sourceLabel?: string;
  ownerUserId?: string | null;
  templateId?: string | null;
  tagNames?: string[];
};

async function defaultOwnerUserId(workspaceId: string): Promise<string | null> {
  const owner = await prisma.user.findFirst({
    where: {
      workspaceId,
      role: { in: ["OWNER", "MANAGER", "AGENT"] },
    },
    select: { id: true },
    orderBy: [
      { role: "asc" },
      { createdAt: "asc" },
    ],
  });
  return owner?.id ?? null;
}

export async function createIncidentRecord(
  input: IncidentCreateInput,
  tx?: Prisma.TransactionClient,
) {
  const executor = tx ?? prisma;
  const title = sanitizeSingleLine(input.title, 180);
  const description = sanitizeLongText(input.description, 5000);

  if (!title || !description) {
    throw new Error("Incident title and description are required.");
  }

  const ownerUserId =
    input.ownerUserId !== undefined ? input.ownerUserId : await defaultOwnerUserId(input.workspaceId);
  const customerEmail = sanitizeEmail(input.customerEmail);
  const modelVersion = sanitizeSingleLine(input.modelVersion, 100);
  const policy = await ensureWorkspaceSlaPolicy(input.workspaceId, executor);

  const created = await executor.incident.create({
    data: {
      workspaceId: input.workspaceId,
      title,
      description,
      customerName: sanitizeCustomerName(input.customerName),
      customerEmail,
      channel: input.channel ?? IncidentChannel.EMAIL,
      severity: input.severity ?? IncidentSeverity.P3,
      status: IncidentStatus.NEW,
      category: input.category ?? null,
      ownerUserId: ownerUserId ?? null,
      templateId: input.templateId ?? null,
      modelVersion,
      sourceTicketRef: sanitizeSingleLine(input.sourceTicketRef, 120),
      duplicateFingerprint: buildIncidentDuplicateFingerprint({
        title,
        customerEmail,
        modelVersion,
      }),
      ...buildIncidentSlaFields({
        severity: input.severity ?? IncidentSeverity.P3,
        policy,
      }),
    },
  });

  await replaceIncidentTags(
    {
      workspaceId: input.workspaceId,
      incidentId: created.id,
      tagNames: input.tagNames ?? [],
      assignedByUserId: input.actorUserId ?? null,
    },
    executor,
  );

  const source = input.sourceLabel ? ` via ${input.sourceLabel}` : "";
  await executor.incidentEvent.create({
    data: {
      incidentId: created.id,
      actorUserId: input.actorUserId ?? null,
      eventType: EventType.CREATED,
      body: `Incident created${source}.`,
    },
  });

  return created;
}

export async function findIncidentBySourceTicketRef(input: {
  workspaceId: string;
  sourceTicketRef?: string | null;
  tx?: Prisma.TransactionClient;
}): Promise<{ id: string } | null> {
  const executor = input.tx ?? prisma;
  const sourceTicketRef = sanitizeSingleLine(input.sourceTicketRef, 120);
  if (!sourceTicketRef) {
    return null;
  }

  return executor.incident.findFirst({
    where: {
      workspaceId: input.workspaceId,
      sourceTicketRef,
    },
    select: {
      id: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });
}

export async function addIncidentNote(input: {
  incidentId: string;
  actorUserId?: string | null;
  eventType: EventType;
  body: string;
  metadataJson?: string | null;
}): Promise<void> {
  await prisma.incidentEvent.create({
    data: {
      incidentId: input.incidentId,
      actorUserId: input.actorUserId ?? null,
      eventType: input.eventType,
      body: input.body,
      metadataJson: input.metadataJson ?? null,
    },
  });
}
