import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { verifyStripeWebhookEvent } from "@/lib/stripe";

function quotasForPlan(planTier: string): {
  incidentsPerDay: number;
  triageRunsPerDay: number;
  customerUpdatesPerDay: number;
  reminderEmailsPerDay: number;
} {
  if (planTier === "starter") {
    return {
      incidentsPerDay: 50,
      triageRunsPerDay: 100,
      customerUpdatesPerDay: 100,
      reminderEmailsPerDay: 120,
    };
  }

  if (planTier === "enterprise") {
    return {
      incidentsPerDay: 1_000_000,
      triageRunsPerDay: 1_000_000,
      customerUpdatesPerDay: 1_000_000,
      reminderEmailsPerDay: 1_000_000,
    };
  }

  return {
    incidentsPerDay: 200,
    triageRunsPerDay: 300,
    customerUpdatesPerDay: 300,
    reminderEmailsPerDay: 500,
  };
}

function planFromPriceId(priceId: string | undefined): string {
  if (!priceId) {
    return "pro";
  }
  if (priceId === process.env.STRIPE_PRICE_ID_STARTER) {
    return "starter";
  }
  if (
    process.env.STRIPE_PRICE_ID_ENTERPRISE &&
    priceId === process.env.STRIPE_PRICE_ID_ENTERPRISE
  ) {
    return "enterprise";
  }
  return "pro";
}

async function updateWorkspacePlan(input: {
  customerId: string;
  planTier: string;
}): Promise<void> {
  const workspace = await prisma.workspace.findFirst({
    where: {
      stripeCustomerId: input.customerId,
    },
    select: {
      id: true,
    },
  });
  if (!workspace) {
    return;
  }

  const quota = quotasForPlan(input.planTier);

  await prisma.$transaction(async (tx) => {
    await tx.workspace.update({
      where: { id: workspace.id },
      data: {
        planTier: input.planTier,
      },
    });

    await tx.workspaceQuota.upsert({
      where: { workspaceId: workspace.id },
      create: {
        workspaceId: workspace.id,
        ...quota,
      },
      update: {
        ...quota,
      },
    });
  });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const rawBody = await request.text();
  let event: Stripe.Event;

  try {
    event = verifyStripeWebhookEvent({
      rawBody,
      signature: request.headers.get("stripe-signature"),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Webhook signature verification failed.",
      },
      { status: 400 },
    );
  }

  if (
    event.type === "customer.subscription.created" ||
    event.type === "customer.subscription.updated"
  ) {
    const subscription = event.data.object as Stripe.Subscription;
    const priceId = subscription.items.data[0]?.price?.id;
    await updateWorkspacePlan({
      customerId: String(subscription.customer),
      planTier: planFromPriceId(priceId),
    });
  }

  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as Stripe.Subscription;
    await updateWorkspacePlan({
      customerId: String(subscription.customer),
      planTier: "starter",
    });
  }

  return NextResponse.json({ received: true });
}
