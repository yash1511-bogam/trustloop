import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { badRequest } from "@/lib/http";
import { sendAuthOtpNoticeEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { sendEmailOtpLoginOrCreate } from "@/lib/stytch";

const loginStartSchema = z.object({
  email: z.email().max(160),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = await request.json().catch(() => null);
  const parsed = loginStartSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid login payload.");
  }

  const email = parsed.data.email.toLowerCase().trim();

  try {
    const otp = await sendEmailOtpLoginOrCreate(email);

    const account = await prisma.user.findFirst({
      where: {
        OR: [
          { stytchUserId: otp.stytchUserId },
          { email },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        workspaceId: true,
        workspace: { select: { name: true } },
      },
    });

    if (!account) {
      return NextResponse.json(
        { error: "No workspace account found for that email. Create a workspace first." },
        { status: 404 },
      );
    }

    await sendAuthOtpNoticeEmail({
      workspaceId: account.workspaceId,
      toEmail: account.email,
      workspaceName: account.workspace.name,
      userName: account.name,
    }).catch(() => null);

    return NextResponse.json({
      methodId: otp.methodId,
      message: "A verification code has been sent to your email.",
    });
  } catch {
    return NextResponse.json({ error: "Unable to start login challenge." }, { status: 400 });
  }
}
