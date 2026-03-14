import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { startAuthEmailOtp } from "@/lib/auth-email-otp";
import { recordAuditLog } from "@/lib/audit";
import { enforceAuthRateLimit } from "@/lib/auth-rate-limit";
import { badRequest } from "@/lib/http";
import { log } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { checkSlugAvailable } from "@/lib/workspace-slug";

const registerStartSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.email().max(160),
  workspaceName: z.string().min(2).max(80),
  inviteToken: z.string().uuid().optional(),
  inviteCode: z.string().min(1).max(40).optional(),
  turnstileToken: z.string().min(1).optional().nullable(),
});

type PendingRegisterPayload = {
  name: string;
  email: string;
  workspaceName: string;
  inviteToken?: string;
  inviteCode?: string;
};

export async function POST(request: NextRequest): Promise<NextResponse> {
  const rateLimited = await enforceAuthRateLimit(request, "register");
  if (rateLimited) return rateLimited;

  const body = await request.json().catch(() => null);
  const parsed = registerStartSchema.safeParse(body);

  if (!parsed.success) {
    return badRequest("Invalid registration payload.");
  }

  const email = parsed.data.email.toLowerCase().trim();
  const turnstile = await verifyTurnstileToken({
    request,
    token: parsed.data.turnstileToken,
  });
  if (!turnstile.success) {
    return NextResponse.json(
      { error: "Security verification failed. Try again." },
      { status: 400 },
    );
  }
  let workspaceName = parsed.data.workspaceName.trim();
  let inviteToken: string | undefined;

  // Validate invite code from InviteCode table (early access gating)
  if (!parsed.data.inviteToken) {
    const inviteCodeValue = parsed.data.inviteCode?.trim();
    if (!inviteCodeValue) {
      return NextResponse.json({ error: "An invite code is required to register." }, { status: 400 });
    }
    const inviteCodeRecord = await prisma.inviteCode.findUnique({
      where: { code: inviteCodeValue },
    });
    if (!inviteCodeRecord) {
      return NextResponse.json({ error: "Invalid invite code." }, { status: 400 });
    }
    if (inviteCodeRecord.used) {
      return NextResponse.json({ error: "This invite code has already been used." }, { status: 400 });
    }
    if (inviteCodeRecord.email.toLowerCase() !== email) {
      return NextResponse.json({ error: "This invite code is not associated with your email." }, { status: 400 });
    }
  }

  if (parsed.data.inviteToken) {
    const invite = await prisma.workspaceInvite.findFirst({
      where: {
        token: parsed.data.inviteToken,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: {
        workspace: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!invite) {
      return NextResponse.json({ error: "Invite is invalid or expired." }, { status: 400 });
    }

    if (invite.email.toLowerCase() !== email) {
      return NextResponse.json(
        { error: "Invite email does not match this registration email." },
        { status: 400 },
      );
    }

    workspaceName = invite.workspace.name;
    inviteToken = invite.token;
    recordAuditLog({ workspaceId: invite.workspaceId, action: "auth.register_start", targetType: "invite", targetId: invite.token, summary: `Registration via invite for ${email}` }).catch(() => {});
  }

  const existing = await prisma.user.findFirst({
    where: { email },
    select: { id: true },
  });
  if (existing) {
    log.auth.info("Starting registration flow for existing user", {
      email,
      inviteToken: inviteToken ?? null,
    });
  }

  if (!inviteToken) {
    const available = await checkSlugAvailable(prisma, workspaceName);
    if (!available) {
      return NextResponse.json(
        { error: "A company with this name is already registered. Please choose a different company name." },
        { status: 409 },
      );
    }
  }

  let otp: Awaited<ReturnType<typeof startAuthEmailOtp>>;
  try {
    otp = await startAuthEmailOtp<PendingRegisterPayload>({
      scope: "register",
      purpose: "register",
      email,
      payload: {
        name: parsed.data.name.trim(),
        email,
        workspaceName,
        inviteToken,
        inviteCode: parsed.data.inviteCode?.trim(),
      },
    });
  } catch (error) {
    log.auth.error("Failed to start registration challenge", {
      email,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Unable to start registration challenge." },
      { status: 500 },
    );
  }
  if (!otp.success) {
    log.auth.error("Failed to send registration OTP", { email, error: otp.error });
    return NextResponse.json({ error: otp.error }, { status: 502 });
  }

  // OTP was sent — always return success from here so the UI never
  // shows an error that would cause the user to retry and receive
  // duplicate codes.
  return NextResponse.json({
    methodId: otp.methodId,
    message: "A verification code has been sent to your email.",
    cooldownSeconds: otp.cooldownSeconds,
  });
}
