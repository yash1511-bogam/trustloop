import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { hasRole } from "@/lib/auth";
import { requireApiAuthAndRateLimit } from "@/lib/api-guard";
import { badRequest, forbidden } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { stripeClient, stripePriceIdForPlan } from "@/lib/stripe";

const schema = z.object({
  plan: z.enum(["starter", "pro", "enterprise"]),
});

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
      stripeCustomerId: true,
    },
  });
  if (!workspace) {
    return forbidden();
  }

  const stripe = stripeClient();

  let customerId = workspace.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      name: workspace.name,
      email: auth.user.email,
      metadata: {
        workspaceId: workspace.id,
      },
    });
    customerId = customer.id;

    await prisma.workspace.update({
      where: { id: workspace.id },
      data: {
        stripeCustomerId: customerId,
      },
    });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [
      {
        price: stripePriceIdForPlan(parsed.data.plan),
        quantity: 1,
      },
    ],
    success_url: `${appUrl.replace(/\/$/, "")}/settings?billing=success`,
    cancel_url: `${appUrl.replace(/\/$/, "")}/settings?billing=cancel`,
    metadata: {
      workspaceId: workspace.id,
      plan: parsed.data.plan,
    },
  });

  return NextResponse.json({ checkoutUrl: session.url });
}
