import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { requireInternalApiAuth, requireRole } from "@/lib/internal-auth";
import { sendInternalTeamInviteEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";

const VALID_ROLES = ["SUPPORT", "TECH", "MARKETING"] as const;

export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await requireInternalApiAuth(request);
  if (!auth || !requireRole(auth, ["CEO"])) return NextResponse.json(null, { status: 404 });

  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const role = body?.role as string;
  const name = typeof body?.name === "string" ? body.name.trim() || null : null;

  if (!email || !email.includes("@")) return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  if (!role || !VALID_ROLES.includes(role as typeof VALID_ROLES[number])) {
    return NextResponse.json({ error: "Role must be SUPPORT, TECH, or MARKETING" }, { status: 400 });
  }

  const existing = await prisma.internalTeamMember.findUnique({ where: { email } });
  if (existing && (existing.status === "ACTIVE" || existing.status === "INVITED")) {
    return NextResponse.json({ error: "Email already has an active or pending invite" }, { status: 409 });
  }

  const inviteToken = randomBytes(16).toString("hex");
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const acceptUrl = `${baseUrl}/_internal/accept-invite?token=${inviteToken}`;

  if (existing && existing.status === "REVOKED") {
    await prisma.internalTeamMember.update({
      where: { email },
      data: { role: role as typeof VALID_ROLES[number], status: "INVITED", inviteToken, invitedBy: auth.user.email, name, revokedAt: null },
    });
  } else {
    await prisma.internalTeamMember.create({
      data: { email, name, role: role as typeof VALID_ROLES[number], invitedBy: auth.user.email, inviteToken },
    });
  }

  await sendInternalTeamInviteEmail({
    toEmail: email, inviterName: auth.user.name, role, acceptUrl,
  }).catch(() => {});

  return NextResponse.json({ ok: true, email, role });
}
