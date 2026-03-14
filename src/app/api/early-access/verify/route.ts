import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authenticateEmailOtp } from "@/lib/stytch";
import { redisDelete, redisGetJson } from "@/lib/redis";
import { log } from "@/lib/logger";
import { sendEarlyAccessConfirmationEmail } from "@/lib/email";
import { earlyAccessKey, type PendingEarlyAccess } from "../route";

const schema = z.object({
  methodId: z.string().min(6).max(200),
  code: z.string().min(4).max(12),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid verification payload." }, { status: 400 });
  }

  const pending = await redisGetJson<PendingEarlyAccess>(earlyAccessKey(parsed.data.methodId));
  if (!pending) {
    return NextResponse.json({ error: "Session expired. Request access again." }, { status: 400 });
  }

  try {
    await authenticateEmailOtp({
      methodId: parsed.data.methodId,
      code: parsed.data.code.trim(),
      intent: "login",
    });

    await prisma.earlyAccessRequest.upsert({
      where: { email: pending.email },
      create: {
        name: pending.name,
        email: pending.email,
        companyName: pending.companyName,
        emailVerified: true,
      },
      update: {
        name: pending.name,
        companyName: pending.companyName,
        emailVerified: true,
      },
    });

    await redisDelete(earlyAccessKey(parsed.data.methodId));

    sendEarlyAccessConfirmationEmail({
      toEmail: pending.email,
      userName: pending.name,
    }).catch((e) => {
      log.auth.error("Failed to send early access confirmation email", {
        email: pending.email,
        error: e instanceof Error ? e.message : String(e),
      });
    });

    return NextResponse.json({ success: true, message: "You're on the list! We'll reach out when your invite is ready." });
  } catch (error) {
    log.auth.error("Failed to verify early access OTP", {
      methodId: parsed.data.methodId,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "Invalid or expired verification code." }, { status: 401 });
  }
}
