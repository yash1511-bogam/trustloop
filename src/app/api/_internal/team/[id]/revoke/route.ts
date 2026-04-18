import { NextRequest, NextResponse } from "next/server";
import { requireInternalApiAuth, requireRole } from "@/lib/internal-auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const auth = await requireInternalApiAuth(request);
  if (!auth || !requireRole(auth, ["CEO"])) return NextResponse.json(null, { status: 404 });

  const { id } = await params;
  const member = await prisma.internalTeamMember.findUnique({ where: { id } });
  if (!member) return NextResponse.json(null, { status: 404 });
  if (member.role === "CEO") return NextResponse.json({ error: "Cannot revoke CEO" }, { status: 403 });

  await prisma.internalTeamMember.update({
    where: { id },
    data: { status: "REVOKED", revokedAt: new Date(), inviteToken: null },
  });
  return NextResponse.json({ ok: true });
}
