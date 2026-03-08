import { NextRequest, NextResponse } from "next/server";
import { WebhookIntegrationType } from "@prisma/client";
import { mapGenericWebhook } from "@/lib/webhook-mappers";
import { handleWebhookIncidentRoute } from "@/lib/webhook-route";

export async function POST(request: NextRequest): Promise<NextResponse> {
  return handleWebhookIncidentRoute(request, {
    type: WebhookIntegrationType.GENERIC,
    integrationName: "Generic",
    sourceLabel: "generic webhook",
    mapPayload: mapGenericWebhook,
  });
}
