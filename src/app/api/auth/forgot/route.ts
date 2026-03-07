import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sendAuthOtpNoticeEmail, sendRecoveryInstructionsEmail } from "@/lib/email";
import { badRequest } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { sendEmailOtpLoginOrCreate } from "@/lib/stytch";

const forgotStartSchema = z.object({
  email: z.email().max(160),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = await request.json().catch(() => null);
  const parsed = forgotStartSchema.safeParse(body);

  if (!parsed.success) {
    return badRequest("Invalid forgot-access payload.");
  }

  const email = parsed.data.email.toLowerCase().trim();

  const user = await prisma.user.findFirst({
    where: { email },
    select: {
      id: true,
      name: true,
      email: true,
      workspaceId: true,
      workspace: { select: { name: true } },
    },
  });

  if (!user) {
    return NextResponse.json({
      methodId: null,
      message: "If an account exists for that email, a recovery code has been sent.",
    });
  }

  try {
    const otp = await sendEmailOtpLoginOrCreate(email);

    await sendRecoveryInstructionsEmail({
      workspaceId: user.workspaceId,
      toEmail: user.email,
      workspaceName: user.workspace.name,
      userName: user.name,
    }).catch(() => null);

    await sendAuthOtpNoticeEmail({
      workspaceId: user.workspaceId,
      toEmail: user.email,
      workspaceName: user.workspace.name,
      userName: user.name,
    }).catch(() => null);

    return NextResponse.json({
      methodId: otp.methodId,
      message: "If an account exists for that email, a recovery code has been sent.",
    });
  } catch {
    return NextResponse.json({ error: "Unable to start recovery challenge." }, { status: 400 });
  }
}
