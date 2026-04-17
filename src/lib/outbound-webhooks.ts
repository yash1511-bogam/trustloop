import { createHmac, randomBytes } from "crypto";
import { Prisma } from "@prisma/client";
import { decryptSecret, encryptSecret, last4 } from "@/lib/encryption";
import { isWorkspaceFeatureAllowed } from "@/lib/feature-gate-server";
import { prisma } from "@/lib/prisma";

const BLOCKED_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "[::1]",
  "metadata.google.internal",
]);

const BLOCKED_IP_PREFIXES = [
  "10.",
  "172.16.", "172.17.", "172.18.", "172.19.",
  "172.20.", "172.21.", "172.22.", "172.23.",
  "172.24.", "172.25.", "172.26.", "172.27.",
  "172.28.", "172.29.", "172.30.", "172.31.",
  "192.168.",
  "169.254.",
  "0.",
  "fd",
  "fe80:",
];

export function validateWebhookUrl(url: string): { valid: boolean; reason?: string } {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { valid: false, reason: "Invalid URL." };
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return { valid: false, reason: "Only HTTP(S) URLs are allowed." };
  }

  const hostname = parsed.hostname.toLowerCase();

  if (BLOCKED_HOSTS.has(hostname)) {
    return { valid: false, reason: "Localhost and loopback addresses are not allowed." };
  }

  if (BLOCKED_IP_PREFIXES.some((prefix) => hostname.startsWith(prefix))) {
    return { valid: false, reason: "Private and link-local IP addresses are not allowed." };
  }

  if (hostname.endsWith(".internal") || hostname.endsWith(".local")) {
    return { valid: false, reason: "Internal hostnames are not allowed." };
  }

  return { valid: true };
}

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
  const urlCheck = validateWebhookUrl(input.url);
  if (!urlCheck.valid) {
    throw new Error(`Invalid webhook URL: ${urlCheck.reason}`);
  }

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
  if (!(await isWorkspaceFeatureAllowed(input.workspaceId, "webhooks"))) return;
  await prisma.outboundWebhookOutbox.create({
    data: {
      workspaceId: input.workspaceId,
      eventType: input.eventType,
      incidentId: input.incidentId ?? null,
      payload: input.payload as unknown as Prisma.InputJsonValue,
    },
  });
}

export async function processOutboundWebhookOutbox(batchSize = 20): Promise<number> {
  const now = new Date();
  const items = await prisma.$queryRaw<Array<{
    id: string;
    workspaceId: string;
    eventType: string;
    incidentId: string | null;
    payload: Record<string, unknown>;
    attempts: number;
    maxAttempts: number;
  }>>`
    SELECT "id", "workspaceId", "eventType", "incidentId", "payload", "attempts", "maxAttempts"
    FROM "OutboundWebhookOutbox"
    WHERE "processAt" <= ${now} AND "attempts" < "maxAttempts"
    ORDER BY "processAt" ASC
    LIMIT ${batchSize}
  `;

  let processed = 0;

  for (const item of items) {
    try {
      await deliverOutboundWebhookEvent({
        workspaceId: item.workspaceId,
        eventType: item.eventType as OutboundWebhookEvent,
        incidentId: item.incidentId,
        payload: item.payload as Record<string, unknown>,
      });
      await prisma.outboundWebhookOutbox.delete({ where: { id: item.id } });
      processed++;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const nextAttempt = item.attempts + 1;
      const backoffMs = Math.min(30_000, 1000 * Math.pow(2, nextAttempt));
      await prisma.outboundWebhookOutbox.update({
        where: { id: item.id },
        data: {
          attempts: nextAttempt,
          lastError: message.slice(0, 500),
          processAt: new Date(Date.now() + backoffMs),
        },
      });
    }
  }

  return processed;
}

async function deliverOutboundWebhookEvent(input: {
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

  const errors: string[] = [];

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
          signal: AbortSignal.timeout(10_000),
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

        if (!response.ok) {
          errors.push(`${hook.name}: HTTP ${response.status}`);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        errors.push(`${hook.name}: ${message}`);
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

  if (errors.length > 0) {
    throw new Error(`Webhook delivery failed: ${errors.join("; ")}`);
  }
}
