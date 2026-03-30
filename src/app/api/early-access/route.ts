import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sendEarlyAccessConfirmationEmail } from "@/lib/email";
import { log } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { createHash } from "crypto";

export type PendingEarlyAccess = {
  name: string;
  email: string;
  companyName?: string;
  otpHash: string;
  resendAvailableAt: number;
};

export function earlyAccessKey(methodId: string): string {
  return `early-access:${methodId}`;
}

export function earlyAccessEmailKey(email: string): string {
  const emailHash = createHash("sha256").update(email).digest("hex").slice(0, 24);
  return `early-access:email:${emailHash}`;
}

export async function hashOtp(otp: string): Promise<string> {
  return createHash("sha256").update(otp).digest("hex");
}

const schema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().max(200),
  companyName: z.string().max(100).optional(),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Full name and a valid email are required." }, { status: 400 });
  }

  const { name, email, companyName } = parsed.data;
  const normalizedEmail = email.trim().toLowerCase();

  const existing = await prisma.earlyAccessRequest.findUnique({
    where: { email: normalizedEmail },
  });

  if (existing) {
    return NextResponse.json({ ok: true, message: "You're already on the waitlist!" });
  }

  await prisma.earlyAccessRequest.create({
    data: {
      name: name.trim(),
      email: normalizedEmail,
      companyName: companyName?.trim() || null,
    },
  });

  try {
    await sendEarlyAccessConfirmationEmail({
      toEmail: normalizedEmail,
      userName: name.trim(),
    });
  } catch (e) {
    log.auth.error("Early access confirmation email failed", {
      email: normalizedEmail,
      error: e instanceof Error ? e.message : String(e),
    });
  }

  return NextResponse.json({ ok: true, message: "You're on the list! Check your email for confirmation." });
}
