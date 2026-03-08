import { NextRequest, NextResponse } from "next/server";
import { WebhookIntegrationType } from "@prisma/client";
import { mapPagerDutyWebhook } from "@/lib/webhook-mappers";
import { handleWebhookIncidentRoute } from "@/lib/webhook-route";

export async function POST(request: NextRequest): Promise<NextResponse> {
  return handleWebhookIncidentRoute(request, {
    type: WebhookIntegrationType.PAGERDUTY,
    integrationName: "PagerDuty",
    sourceLabel: "PagerDuty webhook",
    mapPayload: mapPagerDutyWebhook,
  });
}
