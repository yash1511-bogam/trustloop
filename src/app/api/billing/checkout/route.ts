import { NextRequest, NextResponse } from "next/server";
import { BillingSubscriptionStatus, Role } from "@prisma/client";
import { z } from "zod";
import { hasRole } from "@/lib/auth";
import { requireApiAuthAndRateLimit } from "@/lib/api-guard";
import { recordAuditForAccess } from "@/lib/audit";
import { buildBillingCheckoutPayload } from "@/lib/billing-checkout";
import { badRequest, forbidden } from "@/lib/http";
import { dodoClient, dodoProductIdForPlan } from "@/lib/dodo";
import { fireAndForget } from "@/lib/fire-and-forget";
import { prisma } from "@/lib/prisma";
import { redisGetJson, redisSetJson } from "@/lib/redis";
import { log } from "@/lib/logger";

const schema = z.object({
  plan: z.enum(["starter", "pro", "enterprise"]),
  interval: z.enum(["monthly", "annual"]).optional().default("monthly"),
  couponCode: z
    .string()
    .trim()
    .min(2)
    .max(64)
    .optional()
    .nullable(),
  billingName: z.string().trim().min(1).max(128).optional(),
  billingEmail: z.string().email().optional(),
  billingCountry: z.string().trim().length(2).optional(),
  billingZip: z.string().trim().max(20).optional(),
  billingStreet: z.string().trim().max(256).optional(),
  billingCity: z.string().trim().max(128).optional(),
  billingState: z.string().trim().max(128).optional(),
  billingPhone: z.string().trim().max(20).optional(),
});

function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
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

  if (!hasRole({ user: auth.user }, [Role.OWNER, Role.MANAGER])) {
    return forbidden();
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid checkout payload.");
  }

  const workspace = await prisma.workspace.findUnique({
    where: { id: auth.workspaceId },
    select: {
      id: true,
      billing: {
        select: {
          dodoCustomerId: true,
          dodoSubscriptionId: true,
          status: true,
        },
      },
    },
  });

  if (!workspace) {
    return forbidden();
  }

  if (workspace.billing?.dodoSubscriptionId && workspace.billing.status === "ACTIVE") {
    return NextResponse.json(
      { error: "You already have an active subscription. Use plan change instead of a new checkout." },
      { status: 409 },
    );
  }

  const couponCode = parsed.data.couponCode?.trim() || null;
  const plan = parsed.data.plan;
  const interval = parsed.data.interval;

  // Idempotency: prevent duplicate checkout sessions from rapid clicks.
  const idempotencyKey = `checkout:idem:${workspace.id}:${plan}:${interval}:${couponCode ?? "none"}`;
  type CachedSession = { checkoutUrl: string };
  const cached = await redisGetJson<CachedSession>(idempotencyKey);
  if (cached) {
    log.billing.info("Returning cached checkout session (idempotency)", {
      workspaceId: workspace.id,
      plan,
    });
    return NextResponse.json({
      checkoutUrl: cached.checkoutUrl,
    });
  }

  try {
    const session = await dodoClient().checkoutSessions.create(
      buildBillingCheckoutPayload({
        actorUserId: auth.user.id,
        couponCode,
        customerEmail: parsed.data.billingEmail || auth.user.email,
        customerName: parsed.data.billingName || auth.user.name,
        customerPhone: parsed.data.billingPhone || undefined,
        dodoCustomerId: workspace.billing?.dodoCustomerId,
        interval,
        plan,
        returnUrl: `${appUrl()}/workspace/billing?billing=return`,
        workspaceId: workspace.id,
        billingCountry: parsed.data.billingCountry,
        billingZip: parsed.data.billingZip,
        billingStreet: parsed.data.billingStreet,
        billingCity: parsed.data.billingCity,
        billingState: parsed.data.billingState,
      }),
    );

    // Cache the session for 60 seconds to deduplicate rapid retries.
    if (session.checkout_url && session.session_id) {
      await redisSetJson<CachedSession>(
        idempotencyKey,
        { checkoutUrl: session.checkout_url },
        60,
      ).catch((e: unknown) => {
        log.billing.warn("Failed to cache checkout session", {
          workspaceId: workspace.id,
          error: e instanceof Error ? e.message : String(e),
        });
      });
    }

    await prisma.workspaceBilling.upsert({
      where: { workspaceId: workspace.id },
      create: {
        workspaceId: workspace.id,
        dodoCustomerId: workspace.billing?.dodoCustomerId ?? undefined,
        dodoCheckoutSessionId: session.session_id,
        dodoProductId: dodoProductIdForPlan(plan, interval),
        discountCode: couponCode,
        status: BillingSubscriptionStatus.PENDING,
      },
      update: {
        dodoCheckoutSessionId: session.session_id,
        dodoProductId: dodoProductIdForPlan(plan, interval),
        discountCode: couponCode,
      },
    });

    fireAndForget(
      recordAuditForAccess({
        access: auth,
        request,
        action: "billing.checkout_started",
        targetType: "WorkspaceBilling",
        targetId: workspace.id,
        summary: `Checkout started for ${plan} plan`,
      }),
      "billing.checkout_started audit",
    );

    return NextResponse.json({
      checkoutUrl: session.checkout_url,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? `Dodo checkout session failed: ${error.message}`
            : "Dodo checkout session failed.",
      },
      { status: 400 },
    );
  }
}
