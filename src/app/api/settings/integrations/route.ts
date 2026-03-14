import { NextRequest, NextResponse } from "next/server";
import { Role, WebhookIntegrationType } from "@prisma/client";
import { z } from "zod";
import { hasRole } from "@/lib/auth";
import { recordAuditForAccess } from "@/lib/audit";
import { requireApiAuthAndRateLimit } from "@/lib/api-guard";
import { featureGateError } from "@/lib/feature-gate";
import { isWorkspaceFeatureAllowed } from "@/lib/feature-gate-server";
import { badRequest, forbidden } from "@/lib/http";
import {
  createWebhookSecret,
  listWebhookIntegrations,
  setWebhookIntegrationActive,
  upsertWebhookIntegrationSecret,
} from "@/lib/webhook-integration";

const upsertSchema = z.object({
  type: z.nativeEnum(WebhookIntegrationType),
  secret: z.string().min(8).max(256).optional(),
  isActive: z.boolean().optional(),
  rotate: z.boolean().optional(),
});

export async function GET(request: NextRequest): Promise<NextResponse> {
  const access = await requireApiAuthAndRateLimit(request);
  if (access.response) {
    return access.response;
  }
  const auth = access.auth;
  if (auth.kind !== "session") {
    return forbidden();
  }
  if (!(await isWorkspaceFeatureAllowed(auth.workspaceId, "webhooks"))) {
    return NextResponse.json({ error: featureGateError("webhooks") }, { status: 403 });
  }

  const integrations = await listWebhookIntegrations(auth.workspaceId);
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  return NextResponse.json({
    integrations,
    endpoints: {
      DATADOG: `${baseUrl}/api/webhooks/datadog`,
      PAGERDUTY: `${baseUrl}/api/webhooks/pagerduty`,
      SENTRY: `${baseUrl}/api/webhooks/sentry`,
      GENERIC: `${baseUrl}/api/webhooks/generic`,
      LANGFUSE: `${baseUrl}/api/webhooks/langfuse`,
      HELICONE: `${baseUrl}/api/webhooks/helicone`,
    },
    signatureHeaders: {
      workspace: "x-trustloop-workspace",
      signature: "x-trustloop-signature",
      timestamp: "x-trustloop-timestamp",
    },
  });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const access = await requireApiAuthAndRateLimit(request);
  if (access.response) {
    return access.response;
  }
  const auth = access.auth;
  if (auth.kind !== "session") {
    return forbidden();
  }
  if (!(await isWorkspaceFeatureAllowed(auth.workspaceId, "webhooks"))) {
    return NextResponse.json({ error: featureGateError("webhooks") }, { status: 403 });
  }
  if (!hasRole({ user: auth.user }, [Role.OWNER, Role.MANAGER])) {
    return forbidden();
  }

  const body = await request.json().catch(() => null);
  const parsed = upsertSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid integration payload.");
  }

  if (parsed.data.isActive !== undefined && !parsed.data.secret && !parsed.data.rotate) {
    await setWebhookIntegrationActive({
      workspaceId: auth.workspaceId,
      type: parsed.data.type,
      isActive: parsed.data.isActive,
    });
    recordAuditForAccess({ access: auth, request, action: "integration.updated", targetType: "Integration", summary: `Set ${parsed.data.type} integration active=${parsed.data.isActive}` }).catch(() => {});
    return NextResponse.json({ success: true });
  }

  const generatedSecret = parsed.data.rotate ? createWebhookSecret() : undefined;
  const secret = parsed.data.secret?.trim() || generatedSecret;
  if (!secret) {
    return badRequest("Provide secret or enable rotate.");
  }

  await upsertWebhookIntegrationSecret({
    workspaceId: auth.workspaceId,
    type: parsed.data.type,
    secret,
    isActive: parsed.data.isActive ?? true,
  });

  recordAuditForAccess({ access: auth, request, action: "integration.secret_updated", targetType: "Integration", summary: `Updated ${parsed.data.type} webhook secret${generatedSecret ? " (rotated)" : ""}` }).catch(() => {});

  return NextResponse.json({
    success: true,
    secret: generatedSecret ?? null,
    message: generatedSecret
      ? "Secret rotated. Copy it now; it is shown only once."
      : "Integration secret updated.",
  });
}
