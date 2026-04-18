import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@/lib/auth";
import { sendInternalTeamWelcomeEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (process.env.INTERNAL_PORTAL_ENABLED !== "true") return NextResponse.json(null, { status: 404 });
  if (process.env.TRUSTLOOP_STUB_AUTH === "1") return NextResponse.json(null, { status: 404 });

  const auth = await getAuth({ skipDevFallback: true });
  if (!auth) return NextResponse.json(null, { status: 404 });

  const body = await request.json().catch(() => null);
  const token = typeof body?.token === "string" ? body.token.trim() : "";
  if (!token) return NextResponse.json(null, { status: 404 });

  const member = await prisma.internalTeamMember.findUnique({ where: { inviteToken: token } });
  if (!member || member.status !== "INVITED") return NextResponse.json(null, { status: 404 });
  if (member.email.toLowerCase() !== auth.user.email.toLowerCase()) return NextResponse.json(null, { status: 404 });

  await prisma.internalTeamMember.update({
    where: { id: member.id },
    data: { status: "ACTIVE", acceptedAt: new Date(), inviteToken: null, name: member.name || auth.user.name },
  });

  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  await sendInternalTeamWelcomeEmail({
    toEmail: member.email, name: member.name || auth.user.name,
    role: member.role, portalUrl: `${baseUrl}/_internal`,
  }).catch(() => {});

  return NextResponse.json({ ok: true, role: member.role });
}
