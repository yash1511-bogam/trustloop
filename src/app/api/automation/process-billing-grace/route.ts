import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { hasRole } from "@/lib/auth";
import { verifyCronSecret } from "@/lib/cron-auth";
import { requireApiAuthAndRateLimit } from "@/lib/api-guard";
import { processPastDueBillingAutomation } from "@/lib/billing";
import { forbidden } from "@/lib/http";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const cronSecret = process.env.BILLING_AUTOMATION_CRON_SECRET;
  const cronHeader = request.headers.get("x-cron-secret");
  const isCron = verifyCronSecret(cronSecret, cronHeader);

  if (!isCron) {
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
  }

  const result = await processPastDueBillingAutomation();

  return NextResponse.json({
    ok: true,
    ...result,
  });
}
