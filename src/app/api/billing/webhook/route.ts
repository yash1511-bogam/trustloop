import { NextRequest, NextResponse } from "next/server";
import { processDodoWebhookEvent } from "@/lib/billing";
import { dodoClient } from "@/lib/dodo";

function requiredHeader(request: NextRequest, name: string): string {
  const value = request.headers.get(name);
  if (!value?.trim()) {
    throw new Error(`Missing ${name} header.`);
  }
  return value.trim();
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const rawBody = await request.text();
  let eventId: string;
  let event: Parameters<typeof processDodoWebhookEvent>[0]["event"];

  try {
    const webhookId = requiredHeader(request, "webhook-id");
    const webhookSignature = requiredHeader(request, "webhook-signature");
    const webhookTimestamp = requiredHeader(request, "webhook-timestamp");

    eventId = webhookId;
    event = dodoClient().webhooks.unwrap(rawBody, {
      headers: {
        "webhook-id": webhookId,
        "webhook-signature": webhookSignature,
        "webhook-timestamp": webhookTimestamp,
      },
      key: process.env.DODO_PAYMENTS_WEBHOOK_KEY?.trim() || undefined,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Webhook signature verification failed.",
      },
      { status: 400 },
    );
  }

  try {
    const processed = await processDodoWebhookEvent({
      event,
      eventId,
    });

    return NextResponse.json({
      received: true,
      status: processed.status,
      workspaceId: processed.workspaceId,
      reason: processed.reason,
      eventType: event.type,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Webhook processing failed.",
      },
      { status: 500 },
    );
  }
}
