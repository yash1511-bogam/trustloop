import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireApiAuthAndRateLimit } from "@/lib/api-guard";
import { badRequest, forbidden } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import {
  disableUserPushSubscription,
  isPushConfigured,
  pushPublicVapidKey,
  upsertUserPushSubscription,
} from "@/lib/push";

const subscriptionSchema = z.object({
  endpoint: z.url().max(2000),
  keys: z.object({
    p256dh: z.string().min(16).max(512),
    auth: z.string().min(8).max(512),
  }),
});

const createSchema = z.object({
  subscription: subscriptionSchema,
  userAgent: z.string().max(500).optional(),
});

const deleteSchema = z.object({
  endpoint: z.url().max(2000),
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

  const activeCount = await prisma.pushSubscription.count({
    where: {
      workspaceId: auth.workspaceId,
      userId: auth.user.id,
      disabledAt: null,
    },
  });

  return NextResponse.json({
    configured: isPushConfigured(),
    vapidPublicKey: pushPublicVapidKey(),
    activeSubscriptions: activeCount,
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

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid push subscription payload.");
  }

  if (!isPushConfigured()) {
    return badRequest("Push notifications are not configured in this environment.");
  }

  await upsertUserPushSubscription({
    workspaceId: auth.workspaceId,
    userId: auth.user.id,
    subscription: {
      endpoint: parsed.data.subscription.endpoint,
      p256dh: parsed.data.subscription.keys.p256dh,
      auth: parsed.data.subscription.keys.auth,
    },
    userAgent: parsed.data.userAgent ?? request.headers.get("user-agent"),
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const access = await requireApiAuthAndRateLimit(request);
  if (access.response) {
    return access.response;
  }

  const auth = access.auth;
  if (auth.kind !== "session") {
    return forbidden();
  }

  const body = await request.json().catch(() => null);
  const parsed = deleteSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid push unsubscribe payload.");
  }

  await disableUserPushSubscription({
    workspaceId: auth.workspaceId,
    userId: auth.user.id,
    endpoint: parsed.data.endpoint,
  });

  return NextResponse.json({ ok: true });
}
