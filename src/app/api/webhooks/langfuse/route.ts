import { NextRequest, NextResponse } from "next/server";
import { WebhookIntegrationType } from "@prisma/client";
import { mapLangfuseWebhook } from "@/lib/webhook-mappers";
import { handleWebhookIncidentRoute } from "@/lib/webhook-route";

export async function POST(request: NextRequest): Promise<NextResponse> {
  return handleWebhookIncidentRoute(request, {
    type: WebhookIntegrationType.LANGFUSE,
    integrationName: "Langfuse",
    sourceLabel: "Langfuse webhook",
    mapPayload: mapLangfuseWebhook,
  });
}
