import { createHmac, randomBytes } from "crypto";
import { decryptSecret, encryptSecret, last4 } from "@/lib/encryption";
import { prisma } from "@/lib/prisma";

export const OUTBOUND_WEBHOOK_EVENTS = [
  "incident.created",
  "incident.updated",
  "incident.triaged",
  "incident.resolved",
  "incident.bulk_updated",
  "customer_update.approved",
  "customer_update.published",
] as const;

export type OutboundWebhookEvent = (typeof OUTBOUND_WEBHOOK_EVENTS)[number];

const outboundEventSet = new Set<string>(OUTBOUND_WEBHOOK_EVENTS);

export function createOutboundWebhookSecret(): string {
  return randomBytes(24).toString("base64url");
}

export function normalizeOutboundWebhookEvents(
  events: string[] | null | undefined,
): OutboundWebhookEvent[] {
  if (!events || events.length === 0) {
    return [...OUTBOUND_WEBHOOK_EVENTS];
  }

  const normalized = Array.from(
    new Set(events.map((event) => event.trim()).filter((event) => outboundEventSet.has(event))),
  ) as OutboundWebhookEvent[];

  return normalized.length > 0 ? normalized : [...OUTBOUND_WEBHOOK_EVENTS];
}

export async function listOutboundWebhooks(workspaceId: string) {
  return prisma.workspaceOutboundWebhook.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
  });
}

export async function upsertOutboundWebhook(input: {
  id?: string | null;
  workspaceId: string;
  name: string;
  url: string;
  secret: string;
  subscribedEvents?: string[] | null;
  isActive?: boolean;
}) {
  const data = {
    workspaceId: input.workspaceId,
    name: input.name.trim(),
    url: input.url.trim(),
    encryptedSecret: encryptSecret(input.secret.trim()),
    keyLast4: last4(input.secret.trim()),
    subscribedEvents: normalizeOutboundWebhookEvents(input.subscribedEvents),
    isActive: input.isActive ?? true,
  };

  if (input.id) {
    return prisma.workspaceOutboundWebhook.update({
      where: { id: input.id },
      data,
    });
  }

  return prisma.workspaceOutboundWebhook.create({
    data,
  });
}

export async function setOutboundWebhookActive(input: {
  id: string;
  workspaceId: string;
  isActive: boolean;
}) {
  return prisma.workspaceOutboundWebhook.updateMany({
    where: {
      id: input.id,
      workspaceId: input.workspaceId,
    },
    data: {
      isActive: input.isActive,
    },
  });
}

export async function deleteOutboundWebhook(input: {
  id: string;
  workspaceId: string;
}) {
  return prisma.workspaceOutboundWebhook.deleteMany({
    where: {
      id: input.id,
      workspaceId: input.workspaceId,
    },
  });
}

function buildSignature(secret: string, timestamp: string, payload: string): string {
  return createHmac("sha256", secret)
    .update(`${timestamp}.${payload}`)
    .digest("hex");
}

export async function dispatchOutboundWebhookEvent(input: {
  workspaceId: string;
  eventType: OutboundWebhookEvent;
  incidentId?: string | null;
  payload: Record<string, unknown>;
}): Promise<void> {
  const hooks = await prisma.workspaceOutboundWebhook.findMany({
    where: {
      workspaceId: input.workspaceId,
      isActive: true,
      subscribedEvents: {
        has: input.eventType,
      },
    },
  });

  if (hooks.length === 0) {
    return;
  }

  const timestamp = Math.floor(Date.now() / 1000).toString();

  await Promise.all(
    hooks.map(async (hook) => {
      const body = JSON.stringify({
        event: input.eventType,
        occurredAt: new Date().toISOString(),
        data: input.payload,
      });
      const secret = decryptSecret(hook.encryptedSecret);
      const signature = buildSignature(secret, timestamp, body);

      try {
        const response = await fetch(hook.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-trustloop-event": input.eventType,
            "x-trustloop-timestamp": timestamp,
            "x-trustloop-signature": signature,
          },
          body,
        });

        const responseBody = await response.text().catch(() => "");

        await prisma.$transaction([
          prisma.workspaceOutboundWebhook.update({
            where: { id: hook.id },
            data: {
              lastDeliveredAt: response.ok ? new Date() : hook.lastDeliveredAt,
              lastErrorAt: response.ok ? null : new Date(),
              lastErrorMessage: response.ok ? null : responseBody.slice(0, 500),
              lastStatusCode: response.status,
              failureCount: response.ok ? 0 : { increment: 1 },
            },
          }),
          prisma.outboundWebhookDelivery.create({
            data: {
              workspaceId: input.workspaceId,
              webhookId: hook.id,
              incidentId: input.incidentId ?? null,
              eventType: input.eventType,
              requestId: `${hook.id}:${timestamp}:${Math.random().toString(16).slice(2, 10)}`,
              isSuccess: response.ok,
              statusCode: response.status,
              responseBody: responseBody.slice(0, 1000),
              errorMessage: response.ok ? null : response.statusText,
            },
          }),
        ]);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await prisma.$transaction([
          prisma.workspaceOutboundWebhook.update({
            where: { id: hook.id },
            data: {
              lastErrorAt: new Date(),
              lastErrorMessage: message.slice(0, 500),
              failureCount: { increment: 1 },
            },
          }),
          prisma.outboundWebhookDelivery.create({
            data: {
              workspaceId: input.workspaceId,
              webhookId: hook.id,
              incidentId: input.incidentId ?? null,
              eventType: input.eventType,
              requestId: `${hook.id}:${timestamp}:${Math.random().toString(16).slice(2, 10)}`,
              isSuccess: false,
              errorMessage: message.slice(0, 1000),
            },
          }),
        ]);
      }
    }),
  );
}
