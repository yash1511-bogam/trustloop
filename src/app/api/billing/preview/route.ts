import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { PlanTier } from "@/lib/billing-plan";
import { hasRole } from "@/lib/auth";
import { requireApiAuthAndRateLimit } from "@/lib/api-guard";
import { buildBillingCheckoutPayload } from "@/lib/billing-checkout";
import { dodoClient } from "@/lib/dodo";
import { badRequest, forbidden } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  plan: z.enum(["starter", "pro", "enterprise"]),
  couponCode: z.string().trim().min(2).max(64).optional().nullable(),
});

type PreviewPlan = PlanTier;

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
    return badRequest("Invalid billing preview payload.");
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
  const plan = parsed.data.plan as PreviewPlan;

  try {
    const preview = await dodoClient().checkoutSessions.preview(
      buildBillingCheckoutPayload({
        actorUserId: auth.user.id,
        couponCode,
        customerEmail: auth.user.email,
        customerName: auth.user.name,
        dodoCustomerId: workspace.billing?.dodoCustomerId,
        plan,
        workspaceId: workspace.id,
      }),
    );

    return NextResponse.json({
      billingCountry: preview.billing_country,
      currency: preview.currency,
      totalPrice: preview.total_price,
      totalTax: preview.total_tax ?? null,
      taxIdError: preview.tax_id_err_msg ?? null,
      currentBreakdown: {
        discount: preview.current_breakup.discount,
        subtotal: preview.current_breakup.subtotal,
        tax: preview.current_breakup.tax ?? null,
        totalAmount: preview.current_breakup.total_amount,
      },
      recurringBreakdown: preview.recurring_breakup
        ? {
            discount: preview.recurring_breakup.discount,
            subtotal: preview.recurring_breakup.subtotal,
            tax: preview.recurring_breakup.tax ?? null,
            totalAmount: preview.recurring_breakup.total_amount,
          }
        : null,
      productCart: preview.product_cart.map((item) => ({
        productId: item.product_id,
        name: item.name ?? null,
        description: item.description ?? null,
        quantity: item.quantity,
        currency: item.currency,
        originalCurrency: item.og_currency,
        originalPrice: item.og_price,
        discountedPrice: item.discounted_price,
        discountAmount: item.discount_amount ?? null,
        discountCycle: item.discount_cycle ?? null,
        isSubscription: item.is_subscription,
        isUsageBased: item.is_usage_based,
        tax: item.tax ?? null,
        taxRate: item.tax_rate,
        addons: (item.addons ?? []).map((addon) => ({
          addonId: addon.addon_id,
          name: addon.name,
          description: addon.description ?? null,
          quantity: addon.quantity,
          currency: addon.currency,
          originalCurrency: addon.og_currency,
          originalPrice: addon.og_price,
          discountedPrice: addon.discounted_price,
          discountAmount: addon.discount_amount ?? null,
          tax: addon.tax ?? null,
        })),
        creditEntitlements: item.credit_entitlements.map((credit) => ({
          creditEntitlementId: credit.credit_entitlement_id,
          name: credit.credit_entitlement_name,
          unit: credit.credit_entitlement_unit,
          amount: credit.credits_amount,
        })),
        meters: item.meters.map((meter) => ({
          description: meter.description ?? null,
          freeThreshold: meter.free_threshold ?? null,
          measurementUnit: meter.measurement_unit,
          name: meter.name,
          pricePerUnit: meter.price_per_unit,
        })),
      })),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? `Could not calculate billing preview: ${error.message}`
            : "Could not calculate billing preview.",
      },
      { status: 400 },
    );
  }
}
