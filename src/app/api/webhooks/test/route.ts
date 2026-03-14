import { NextRequest, NextResponse } from "next/server";
import { WebhookIntegrationType } from "@prisma/client";
import { z } from "zod";
import { requireApiAuthAndRateLimit, withRateLimitHeaders } from "@/lib/api-guard";
import { featureGateError } from "@/lib/feature-gate";
import { isWorkspaceFeatureAllowed } from "@/lib/feature-gate-server";
import { badRequest, forbidden } from "@/lib/http";
import { hasRole } from "@/lib/auth";
import { Role } from "@prisma/client";
import {
  mapDatadogWebhook,
  mapPagerDutyWebhook,
  mapSentryWebhook,
  mapGenericWebhook,
  mapLangfuseWebhook,
  mapHeliconeWebhook,
  mapArizePhoenixWebhook,
  mapBraintrustWebhook,
} from "@/lib/webhook-mappers";

const mappers: Record<string, (p: Record<string, unknown>) => ReturnType<typeof mapGenericWebhook>> = {
  DATADOG: mapDatadogWebhook,
  PAGERDUTY: mapPagerDutyWebhook,
  SENTRY: mapSentryWebhook,
  GENERIC: mapGenericWebhook,
  LANGFUSE: mapLangfuseWebhook,
  HELICONE: mapHeliconeWebhook,
  ARIZE_PHOENIX: mapArizePhoenixWebhook,
  BRAINTRUST: mapBraintrustWebhook,
};

const schema = z.object({
  type: z.nativeEnum(WebhookIntegrationType),
  payload: z.record(z.string(), z.unknown()),
});

/** Dry-run: validates payload through the mapper without creating an incident */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const access = await requireApiAuthAndRateLimit(request);
  if (access.response) return access.response;
  const auth = access.auth;
  if (auth.kind !== "session") return forbidden();
  if (!(await isWorkspaceFeatureAllowed(auth.workspaceId, "webhooks"))) {
    return NextResponse.json({ error: featureGateError("webhooks") }, { status: 403 });
  }
  if (!hasRole({ user: auth.user }, [Role.OWNER, Role.MANAGER])) return forbidden();

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return badRequest("Provide { type, payload }.");

  const mapper = mappers[parsed.data.type];
  if (!mapper) return badRequest(`Unknown webhook type: ${parsed.data.type}`);

  try {
    const result = mapper(parsed.data.payload as Record<string, unknown>);
    return withRateLimitHeaders(
      NextResponse.json({ ok: true, dryRun: true, mapped: result }),
      access.rateLimit,
    );
  } catch (error) {
    return withRateLimitHeaders(
      NextResponse.json({ ok: false, error: error instanceof Error ? error.message : String(error) }, { status: 422 }),
      access.rateLimit,
    );
  }
}
