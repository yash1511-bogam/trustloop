import { NextRequest, NextResponse } from "next/server";
import { requireInternalApiAuth, requireRole } from "@/lib/internal-auth";
import { sendEarlyAccessInviteEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await requireInternalApiAuth(request);
  if (!auth || !requireRole(auth, ["CEO", "MARKETING"])) return NextResponse.json(null, { status: 404 });

  const body = await request.json().catch(() => null);
  const code = typeof body?.code === "string" ? body.code.trim() : "";
  if (!code) return NextResponse.json({ error: "Code is required" }, { status: 400 });

  const invite = await prisma.inviteCode.findUnique({ where: { code } });
  if (!invite) return NextResponse.json({ error: "Code not found" }, { status: 404 });
  if (!invite.email) return NextResponse.json({ error: "Code has no email" }, { status: 400 });

  await sendEarlyAccessInviteEmail({
    toEmail: invite.email,
    userName: invite.email.split("@")[0] ?? "there",
    inviteCode: invite.code,
  });

  await prisma.inviteCode.update({ where: { code }, data: { inviteSentAt: new Date() } });

  return NextResponse.json({ ok: true });
}
