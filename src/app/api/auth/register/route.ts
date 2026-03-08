import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { badRequest } from "@/lib/http";
import { log } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { redisSetJson } from "@/lib/redis";
import { authChallengeErrorMessage, extractStytchError } from "@/lib/stytch-errors";
import { isPendingStytchUserId, sendEmailOtpLoginOrCreate } from "@/lib/stytch";

const registerStartSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.email().max(160),
  workspaceName: z.string().min(2).max(80),
  inviteToken: z.string().uuid().optional(),
});

type PendingRegisterPayload = {
  name: string;
  email: string;
  workspaceName: string;
  expectedStytchUserId?: string;
  inviteToken?: string;
};

function pendingRegisterKey(methodId: string): string {
  return `auth:register:${methodId}`;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = await request.json().catch(() => null);
  const parsed = registerStartSchema.safeParse(body);

  if (!parsed.success) {
    return badRequest("Invalid registration payload.");
  }

  const email = parsed.data.email.toLowerCase().trim();
  let workspaceName = parsed.data.workspaceName.trim();
  let inviteToken: string | undefined;

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
  }

  const existing = await prisma.user.findFirst({
    where: { email },
    select: { id: true },
  });

  if (existing) {
    return NextResponse.json(
      { error: "An account with that email already exists." },
      { status: 409 },
    );
  }

  try {
    const otp = await sendEmailOtpLoginOrCreate(email);

    const pendingPayload: PendingRegisterPayload = {
      name: parsed.data.name.trim(),
      email,
      workspaceName,
      expectedStytchUserId: isPendingStytchUserId(otp.stytchUserId)
        ? undefined
        : otp.stytchUserId,
      inviteToken,
    };

    await redisSetJson<PendingRegisterPayload>(
      pendingRegisterKey(otp.methodId),
      pendingPayload,
      15 * 60,
    );

    return NextResponse.json({
      methodId: otp.methodId,
      message: "A verification code has been sent to your email.",
    });
  } catch (error) {
    const stytchError = extractStytchError(error);
    log.auth.error("Failed to start registration challenge", {
      email,
      errorType: stytchError?.error_type,
      errorMessage: stytchError?.error_message,
      requestId: stytchError?.request_id,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      {
        error: authChallengeErrorMessage(
          error,
          "Unable to start registration challenge.",
        ),
      },
      { status: 400 },
    );
  }
}
