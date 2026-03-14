import { NextRequest, NextResponse } from "next/server";
import { WebhookIntegrationType } from "@prisma/client";
import { mapArizePhoenixWebhook } from "@/lib/webhook-mappers";
import { handleWebhookIncidentRoute } from "@/lib/webhook-route";

export async function POST(request: NextRequest): Promise<NextResponse> {
  return handleWebhookIncidentRoute(request, {
    type: WebhookIntegrationType.ARIZE_PHOENIX,
    integrationName: "Arize Phoenix",
    sourceLabel: "Arize Phoenix webhook",
    mapPayload: mapArizePhoenixWebhook,
  });
}
