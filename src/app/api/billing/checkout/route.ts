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
  couponCode: z
    .string()
    .trim()
    .min(2)
    .max(64)
    .optional()
    .nullable(),
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
        },
      },
    },
  });

  if (!workspace) {
    return forbidden();
  }

  const couponCode = parsed.data.couponCode?.trim() || null;
  const plan = parsed.data.plan;

  // Idempotency: prevent duplicate checkout sessions from rapid clicks.
  // Cache key scoped to workspace + plan + coupon for a short window.
  const idempotencyKey = `checkout:idem:${workspace.id}:${plan}:${couponCode ?? "none"}`;
  type CachedSession = { checkoutUrl: string; sessionId: string };
  const cached = await redisGetJson<CachedSession>(idempotencyKey);
  if (cached) {
    log.billing.info("Returning cached checkout session (idempotency)", {
      workspaceId: workspace.id,
      plan,
      sessionId: cached.sessionId,
    });
    return NextResponse.json({
      checkoutUrl: cached.checkoutUrl,
      sessionId: cached.sessionId,
    });
  }

  try {
    const session = await dodoClient().checkoutSessions.create(
      buildBillingCheckoutPayload({
        actorUserId: auth.user.id,
        couponCode,
        customerEmail: auth.user.email,
        customerName: auth.user.name,
        dodoCustomerId: workspace.billing?.dodoCustomerId,
        plan,
        returnUrl: `${appUrl()}/settings/billing?billing=return`,
        workspaceId: workspace.id,
      }),
    );

    // Cache the session for 60 seconds to deduplicate rapid retries.
    if (session.checkout_url && session.session_id) {
      await redisSetJson<CachedSession>(
        idempotencyKey,
        { checkoutUrl: session.checkout_url, sessionId: session.session_id },
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
        dodoProductId: dodoProductIdForPlan(plan),
        discountCode: couponCode,
        status: BillingSubscriptionStatus.PENDING,
      },
      update: {
        dodoCheckoutSessionId: session.session_id,
        dodoProductId: dodoProductIdForPlan(plan),
        discountCode: couponCode,
        status: BillingSubscriptionStatus.PENDING,
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
      sessionId: session.session_id,
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
