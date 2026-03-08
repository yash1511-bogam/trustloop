import { NextRequest, NextResponse } from "next/server";
import { BillingSubscriptionStatus, Role } from "@prisma/client";
import { z } from "zod";
import { hasRole } from "@/lib/auth";
import { requireApiAuthAndRateLimit } from "@/lib/api-guard";
import { badRequest, forbidden } from "@/lib/http";
import { dodoClient, dodoProductIdForPlan } from "@/lib/dodo";
import { prisma } from "@/lib/prisma";

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
      name: true,
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

  try {
    const session = await dodoClient().checkoutSessions.create({
      product_cart: [
        {
          product_id: dodoProductIdForPlan(plan),
          quantity: 1,
        },
      ],
      customer: workspace.billing?.dodoCustomerId
        ? {
            customer_id: workspace.billing.dodoCustomerId,
          }
        : {
            email: auth.user.email,
            name: auth.user.name,
          },
      return_url: `${appUrl()}/settings?billing=success`,
      discount_code: couponCode ?? undefined,
      feature_flags: {
        allow_discount_code: true,
      },
      metadata: {
        workspaceId: workspace.id,
        plan,
        actorUserId: auth.user.id,
      },
    });

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
