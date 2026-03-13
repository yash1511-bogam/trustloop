import { WebhookIntegrationType } from "@prisma/client";
import { NextRequest } from "next/server";
import { authenticateApiKeyRequest } from "@/lib/api-key-auth";
import { apiKeyHasScopes } from "@/lib/api-key-scopes";
import { prisma } from "@/lib/prisma";
import {
  getWebhookIntegrationSecret,
  verifyWebhookSignature,
} from "@/lib/webhook-integration";

export type WebhookAccess = {
  workspaceId: string;
  mode: "api_key" | "signed_secret";
};

export async function resolveWebhookAccess(input: {
  request: NextRequest;
  rawBody: string;
  type: WebhookIntegrationType;
}): Promise<WebhookAccess | null> {
  const apiKey = await authenticateApiKeyRequest(input.request);
  if (apiKey && apiKeyHasScopes(apiKey.scopes, ["webhooks:ingest"])) {
    return {
      workspaceId: apiKey.workspaceId,
      mode: "api_key",
    };
  }

  const workspaceHint = input.request.headers.get("x-trustloop-workspace");
  if (!workspaceHint) {
    return null;
  }

  const workspace = await prisma.workspace.findFirst({
    where: {
      OR: [{ id: workspaceHint }, { slug: workspaceHint }],
    },
    select: { id: true },
  });
  if (!workspace) {
    return null;
  }

  const secret = await getWebhookIntegrationSecret(workspace.id, input.type);
  if (!secret) {
    return null;
  }

  const signature =
    input.request.headers.get("x-trustloop-signature") ??
    input.request.headers.get("x-signature");
  const timestamp =
    input.request.headers.get("x-trustloop-timestamp") ??
    input.request.headers.get("x-timestamp");

  if (
    !verifyWebhookSignature({
      secret,
      rawBody: input.rawBody,
      signatureHeader: signature,
      timestampHeader: timestamp,
    })
  ) {
    return null;
  }

  return {
    workspaceId: workspace.id,
    mode: "signed_secret",
  };
}
