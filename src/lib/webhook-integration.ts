import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { WebhookIntegrationType } from "@prisma/client";
import { decryptSecret, encryptSecret, last4 } from "@/lib/encryption";
import { prisma } from "@/lib/prisma";

const SIGNATURE_MAX_AGE_SECONDS = 300;

function normalizeSignature(raw: string): string {
  const value = raw.trim();
  if (value.startsWith("sha256=")) {
    return value.slice("sha256=".length);
  }
  if (value.startsWith("v1=")) {
    return value.slice("v1=".length);
  }
  return value;
}

function secureCompare(a: string, b: string): boolean {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  if (left.length !== right.length) {
    return false;
  }
  return timingSafeEqual(left, right);
}

export function createWebhookSecret(): string {
  return randomBytes(24).toString("base64url");
}

export async function upsertWebhookIntegrationSecret(input: {
  workspaceId: string;
  type: WebhookIntegrationType;
  secret: string;
  isActive?: boolean;
}): Promise<void> {
  const secret = input.secret.trim();

  await prisma.workspaceWebhookIntegration.upsert({
    where: {
      workspaceId_type: {
        workspaceId: input.workspaceId,
        type: input.type,
      },
    },
    create: {
      workspaceId: input.workspaceId,
      type: input.type,
      encryptedSecret: encryptSecret(secret),
      keyLast4: last4(secret),
      isActive: input.isActive ?? true,
    },
    update: {
      encryptedSecret: encryptSecret(secret),
      keyLast4: last4(secret),
      isActive: input.isActive ?? true,
    },
  });
}

export async function listWebhookIntegrations(workspaceId: string): Promise<
  Array<{
    type: WebhookIntegrationType;
    isActive: boolean;
    keyLast4: string;
    updatedAt: string;
  }>
> {
  const rows = await prisma.workspaceWebhookIntegration.findMany({
    where: { workspaceId },
    orderBy: { type: "asc" },
    select: {
      type: true,
      isActive: true,
      keyLast4: true,
      updatedAt: true,
    },
  });

  return rows.map((row) => ({
    type: row.type,
    isActive: row.isActive,
    keyLast4: row.keyLast4,
    updatedAt: row.updatedAt.toISOString(),
  }));
}

export async function setWebhookIntegrationActive(input: {
  workspaceId: string;
  type: WebhookIntegrationType;
  isActive: boolean;
}): Promise<void> {
  await prisma.workspaceWebhookIntegration.updateMany({
    where: {
      workspaceId: input.workspaceId,
      type: input.type,
    },
    data: {
      isActive: input.isActive,
    },
  });
}

export async function getWebhookIntegrationSecret(
  workspaceId: string,
  type: WebhookIntegrationType,
): Promise<string | null> {
  const row = await prisma.workspaceWebhookIntegration.findUnique({
    where: {
      workspaceId_type: {
        workspaceId,
        type,
      },
    },
    select: {
      encryptedSecret: true,
      isActive: true,
    },
  });

  if (!row || !row.isActive) {
    return null;
  }

  return decryptSecret(row.encryptedSecret);
}

export function buildWebhookSignature(input: {
  secret: string;
  timestamp?: string | null;
  rawBody: string;
}): string {
  const content = input.timestamp
    ? `${input.timestamp}.${input.rawBody}`
    : input.rawBody;

  return createHmac("sha256", input.secret).update(content).digest("hex");
}

export function verifyWebhookSignature(input: {
  secret: string;
  rawBody: string;
  signatureHeader: string | null;
  timestampHeader?: string | null;
}): boolean {
  if (!input.signatureHeader) {
    return false;
  }

  if (input.timestampHeader) {
    const timestamp = Number(input.timestampHeader);
    if (!Number.isFinite(timestamp)) {
      return false;
    }

    const ageSeconds = Math.floor(Date.now() / 1000) - Math.floor(timestamp);
    if (Math.abs(ageSeconds) > SIGNATURE_MAX_AGE_SECONDS) {
      return false;
    }
  }

  const expected = buildWebhookSignature({
    secret: input.secret,
    timestamp: input.timestampHeader,
    rawBody: input.rawBody,
  });

  const actual = normalizeSignature(input.signatureHeader);
  return secureCompare(expected, actual);
}
