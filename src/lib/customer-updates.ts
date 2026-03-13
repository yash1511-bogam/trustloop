import {
  CustomerUpdateApprovalDecision,
  CustomerUpdateDraftStatus,
  EventType,
  Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sanitizeEmail, sanitizeLongText, sanitizeSingleLine } from "@/lib/sanitize";

type PrismaExecutor = Prisma.TransactionClient | typeof prisma;

export async function latestCustomerUpdateDraftForIncident(
  workspaceId: string,
  incidentId: string,
) {
  return prisma.customerUpdateDraft.findFirst({
    where: {
      workspaceId,
      incidentId,
    },
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
        orderBy: { decidedAt: "asc" },
      },
      author: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      statusUpdate: {
        select: {
          id: true,
          publishedAt: true,
        },
      },
    },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
  });
}

export async function createCustomerUpdateDraft(
  input: {
    workspaceId: string;
    incidentId: string;
    authorUserId?: string | null;
    body: string;
    sourceLabel?: string | null;
    customerEmail?: string | null;
    approvalsRequired: number;
  },
  tx?: PrismaExecutor,
) {
  const executor = tx ?? prisma;

  return executor.customerUpdateDraft.create({
    data: {
      workspaceId: input.workspaceId,
      incidentId: input.incidentId,
      authorUserId: input.authorUserId ?? null,
      body: sanitizeLongText(input.body, 4000) ?? "",
      sourceLabel: sanitizeSingleLine(input.sourceLabel, 120),
      customerEmail: sanitizeEmail(input.customerEmail),
      approvalsRequired: Math.max(1, Math.min(5, Math.floor(input.approvalsRequired))),
    },
  });
}

export async function updateCustomerUpdateDraft(
  input: {
    draftId: string;
    workspaceId: string;
    actorUserId?: string | null;
    body: string;
    customerEmail?: string | null;
  },
  tx?: PrismaExecutor,
) {
  const executor = tx ?? prisma;

  const updated = await executor.customerUpdateDraft.update({
    where: { id: input.draftId },
    data: {
      body: sanitizeLongText(input.body, 4000) ?? "",
      customerEmail: sanitizeEmail(input.customerEmail),
      status: CustomerUpdateDraftStatus.DRAFT,
      submittedAt: null,
      approvedAt: null,
      rejectedAt: null,
      rejectionReason: null,
      publishedAt: null,
    },
  });

  await executor.customerUpdateApproval.deleteMany({
    where: { draftId: updated.id },
  });

  return updated;
}

export async function submitCustomerUpdateDraft(
  input: {
    draftId: string;
    actorUserId?: string | null;
    incidentId: string;
  },
  tx?: PrismaExecutor,
) {
  const executor = tx ?? prisma;
  const submittedAt = new Date();

  const draft = await executor.customerUpdateDraft.update({
    where: { id: input.draftId },
    data: {
      status: CustomerUpdateDraftStatus.PENDING_APPROVAL,
      submittedAt,
      approvedAt: null,
      rejectedAt: null,
      rejectionReason: null,
    },
  });

  await executor.incidentEvent.create({
    data: {
      incidentId: input.incidentId,
      actorUserId: input.actorUserId ?? null,
      eventType: EventType.CUSTOMER_UPDATE_SUBMITTED,
      body: "Customer update draft submitted for approval.",
    },
  });

  return draft;
}

export async function decideCustomerUpdateDraft(
  input: {
    draftId: string;
    incidentId: string;
    actorUserId: string;
    decision: CustomerUpdateApprovalDecision;
    comment?: string | null;
  },
  tx?: PrismaExecutor,
) {
  const executor = tx ?? prisma;
  const decidedAt = new Date();

  const draft = await executor.customerUpdateDraft.findUniqueOrThrow({
    where: { id: input.draftId },
    select: {
      id: true,
      approvalsRequired: true,
      status: true,
      authorUserId: true,
    },
  });

  await executor.customerUpdateApproval.upsert({
    where: {
      draftId_userId: {
        draftId: input.draftId,
        userId: input.actorUserId,
      },
    },
    create: {
      draftId: input.draftId,
      userId: input.actorUserId,
      decision: input.decision,
      comment: sanitizeLongText(input.comment, 1000),
      decidedAt,
    },
    update: {
      decision: input.decision,
      comment: sanitizeLongText(input.comment, 1000),
      decidedAt,
    },
  });

  const approvals = await executor.customerUpdateApproval.findMany({
    where: {
      draftId: input.draftId,
      decision: CustomerUpdateApprovalDecision.APPROVED,
    },
    select: { id: true },
  });

  const nextStatus =
    input.decision === CustomerUpdateApprovalDecision.REJECTED
      ? CustomerUpdateDraftStatus.REJECTED
      : approvals.length >= draft.approvalsRequired
        ? CustomerUpdateDraftStatus.APPROVED
        : CustomerUpdateDraftStatus.PENDING_APPROVAL;

  const updated = await executor.customerUpdateDraft.update({
    where: { id: input.draftId },
    data: {
      status: nextStatus,
      approvedAt:
        nextStatus === CustomerUpdateDraftStatus.APPROVED ? decidedAt : null,
      rejectedAt:
        nextStatus === CustomerUpdateDraftStatus.REJECTED ? decidedAt : null,
      rejectionReason:
        nextStatus === CustomerUpdateDraftStatus.REJECTED
          ? sanitizeLongText(input.comment, 1000)
          : null,
    },
  });

  await executor.incidentEvent.create({
    data: {
      incidentId: input.incidentId,
      actorUserId: input.actorUserId,
      eventType:
        input.decision === CustomerUpdateApprovalDecision.APPROVED
          ? EventType.CUSTOMER_UPDATE_APPROVED
          : EventType.CUSTOMER_UPDATE_REJECTED,
      body:
        input.decision === CustomerUpdateApprovalDecision.APPROVED
          ? "Customer update draft approved."
          : `Customer update draft rejected${input.comment?.trim() ? `: ${sanitizeLongText(input.comment, 1000)}` : "."}`,
    },
  });

  return updated;
}
