import {
  CustomerUpdateDraftStatus,
  EventType,
  Role,
} from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { hasRole } from "@/lib/auth";
import { recordAuditForAccess } from "@/lib/audit";
import { requireApiAuthAndRateLimit, withRateLimitHeaders } from "@/lib/api-guard";
import { createCustomerUpdateDraft } from "@/lib/customer-updates";
import { sendCustomerUpdateEmail } from "@/lib/email";
import { badRequest, forbidden, notFound } from "@/lib/http";
import { dispatchOutboundWebhookEvent } from "@/lib/outbound-webhooks";
import { prisma } from "@/lib/prisma";
import { refreshWorkspaceReadModels } from "@/lib/read-models";
import { sanitizeLongText } from "@/lib/sanitize";

const publishSchema = z.object({
  draftId: z.string().min(10).max(64).optional(),
  body: z.string().min(8).max(4000).optional(),
  isVisible: z.boolean().optional(),
  deliverEmail: z.boolean().optional().default(true),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const access = await requireApiAuthAndRateLimit(request, {
    allowApiKey: true,
    requiredApiKeyScopes: ["status-updates:write"],
  });
  if (access.response) {
    return access.response;
  }
  const auth = access.auth;
  const { id } = await params;

  const incident = await prisma.incident.findFirst({
    where: { id, workspaceId: auth.workspaceId },
    select: {
      id: true,
      workspaceId: true,
      title: true,
      customerName: true,
      customerEmail: true,
    },
  });

  if (!incident) {
    return notFound("Incident not found.");
  }

  const body = await request.json().catch(() => null);
  const parsed = publishSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid status update payload.");
  }

  const workspace = await prisma.workspace.findUniqueOrThrow({
    where: { id: auth.workspaceId },
    select: { customerUpdateApprovalsRequired: true },
  });

  const existingDraft = parsed.data.draftId
    ? await prisma.customerUpdateDraft.findFirst({
        where: {
          id: parsed.data.draftId,
          workspaceId: auth.workspaceId,
          incidentId: incident.id,
        },
      })
    : null;

  if (!existingDraft && !parsed.data.body) {
    return badRequest("Provide an approved draft or a status update body.");
  }

  if (
    !existingDraft &&
    workspace.customerUpdateApprovalsRequired > 1
  ) {
    return badRequest("This workspace requires an approved draft before publishing.");
  }

  if (
    !existingDraft &&
    auth.kind !== "session"
  ) {
    return forbidden();
  }

  if (
    !existingDraft &&
    auth.kind === "session" &&
    !hasRole({ user: auth.user }, [Role.OWNER, Role.MANAGER])
  ) {
    return forbidden();
  }

  if (existingDraft && existingDraft.status !== CustomerUpdateDraftStatus.APPROVED) {
    return badRequest("Draft must be approved before publishing.");
  }

  const draft =
    existingDraft ??
    (await prisma.$transaction((tx) =>
      createCustomerUpdateDraft(
        {
          workspaceId: auth.workspaceId,
          incidentId: incident.id,
          authorUserId: auth.kind === "session" ? auth.actorUserId : null,
          body: parsed.data.body ?? "",
          customerEmail: incident.customerEmail,
          approvalsRequired: 1,
        },
        tx,
      ),
    ));

  const published = await prisma.$transaction(async (tx) => {
    const statusUpdate = await tx.statusUpdate.create({
      data: {
        workspaceId: incident.workspaceId,
        incidentId: incident.id,
        body: sanitizeLongText(draft.body ?? "", 2000) ?? "",
        publishedAt: new Date(),
        isVisible: parsed.data.isVisible ?? true,
        createdByUserId: auth.actorUserId,
      },
    });

    await tx.customerUpdateDraft.update({
      where: { id: draft.id },
      data: {
        status: CustomerUpdateDraftStatus.PUBLISHED,
        publishedAt: new Date(),
        statusUpdateId: statusUpdate.id,
      },
    });

    await tx.incident.update({
      where: { id: incident.id },
      data: {
        lastCustomerUpdateAt: new Date(),
        customerUpdateCount: { increment: 1 },
        firstCustomerUpdateAt: new Date(),
        firstRespondedAt: new Date(),
      },
    });

    await tx.incidentEvent.create({
      data: {
        incidentId: incident.id,
        actorUserId: auth.actorUserId,
        eventType: EventType.CUSTOMER_UPDATE,
        body: `Published customer update: ${sanitizeLongText(draft.body, 1000)}`,
      },
    });

    return statusUpdate;
  });

  let emailDelivery: { success: boolean; error?: string | undefined } | null = null;
  const deliveryAddress = draft.customerEmail ?? incident.customerEmail;

  if (parsed.data.deliverEmail !== false && deliveryAddress) {
    const result = await sendCustomerUpdateEmail({
      workspaceId: auth.workspaceId,
      incidentId: incident.id,
      toEmail: deliveryAddress,
      customerName: incident.customerName,
      incidentTitle: incident.title,
      body: draft.body,
    });

    emailDelivery = {
      success: result.success,
      error: result.error,
    };

    if (result.success) {
      await prisma.customerUpdateDraft.update({
        where: { id: draft.id },
        data: {
          emailedAt: new Date(),
          emailMessageId: result.providerMessageId ?? null,
        },
      });
    }
  }

  await refreshWorkspaceReadModels(auth.workspaceId);

  await recordAuditForAccess({
    access: auth,
    request,
    action: "customer_update.published",
    targetType: "customer_update_draft",
    targetId: draft.id,
    summary: `Published customer update for ${incident.title}.`,
    metadata: {
      incidentId: incident.id,
      statusUpdateId: published.id,
      emailed: emailDelivery?.success ?? false,
      emailedTo: deliveryAddress ?? null,
    },
  });

  await dispatchOutboundWebhookEvent({
    workspaceId: auth.workspaceId,
    eventType: "customer_update.published",
    incidentId: incident.id,
    payload: {
      incidentId: incident.id,
      draftId: draft.id,
      statusUpdateId: published.id,
      emailed: emailDelivery?.success ?? false,
    },
  });

  return withRateLimitHeaders(
    NextResponse.json(
      {
        statusUpdate: {
          ...published,
          publishedAt: published.publishedAt.toISOString(),
          createdAt: published.createdAt.toISOString(),
        },
        emailDelivery,
      },
      { status: 201 },
    ),
    access.rateLimit,
  );
}
