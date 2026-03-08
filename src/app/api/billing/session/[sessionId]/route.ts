import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { hasRole } from "@/lib/auth";
import { requireApiAuthAndRateLimit } from "@/lib/api-guard";
import { dodoClient } from "@/lib/dodo";
import { forbidden, notFound } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
): Promise<NextResponse> {
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

  const routeParams = await params;
  const sessionId = routeParams.sessionId?.trim();
  if (!sessionId) {
    return notFound();
  }

  const workspaceBilling = await prisma.workspaceBilling.findUnique({
    where: { workspaceId: auth.workspaceId },
    select: {
      dodoCheckoutSessionId: true,
      status: true,
      updatedAt: true,
    },
  });

  if (!workspaceBilling || workspaceBilling.dodoCheckoutSessionId !== sessionId) {
    return notFound("Billing session not found.");
  }

  try {
    const session = await dodoClient().checkoutSessions.retrieve(sessionId);

    return NextResponse.json({
      customerEmail: session.customer_email ?? null,
      customerName: session.customer_name ?? null,
      id: session.id,
      paymentId: session.payment_id ?? null,
      paymentStatus: session.payment_status ?? null,
      providerStatus: workspaceBilling.status,
      sessionCreatedAt: session.created_at,
      workspaceBillingUpdatedAt: workspaceBilling.updatedAt.toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? `Could not load checkout status: ${error.message}`
            : "Could not load checkout status.",
      },
      { status: 400 },
    );
  }
}
