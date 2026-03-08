import { NextRequest, NextResponse } from "next/server";
import { WebhookIntegrationType } from "@prisma/client";
import { mapSentryWebhook } from "@/lib/webhook-mappers";
import { handleWebhookIncidentRoute } from "@/lib/webhook-route";

export async function POST(request: NextRequest): Promise<NextResponse> {
  return handleWebhookIncidentRoute(request, {
    type: WebhookIntegrationType.SENTRY,
    integrationName: "Sentry",
    sourceLabel: "Sentry webhook",
    mapPayload: mapSentryWebhook,
  });
}
