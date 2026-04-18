import { NextRequest, NextResponse } from "next/server";
import { requireInternalApiAuth, requireRole } from "@/lib/internal-auth";
import { prisma } from "@/lib/prisma";

const VALID_ROLES = ["SUPPORT", "TECH", "MARKETING"] as const;

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const auth = await requireInternalApiAuth(request);
  if (!auth || !requireRole(auth, ["CEO"])) return NextResponse.json(null, { status: 404 });

  const { id } = await params;
  const member = await prisma.internalTeamMember.findUnique({ where: { id } });
  if (!member) return NextResponse.json(null, { status: 404 });
  if (member.role === "CEO") return NextResponse.json({ error: "Cannot modify CEO" }, { status: 403 });

  const body = await request.json().catch(() => null);
  const data: Record<string, unknown> = {};
  if (body?.role && VALID_ROLES.includes(body.role)) data.role = body.role;
  if (typeof body?.name === "string") data.name = body.name.trim() || null;
  if (Object.keys(data).length === 0) return NextResponse.json({ error: "Nothing to update" }, { status: 400 });

  await prisma.internalTeamMember.update({ where: { id }, data });
  return NextResponse.json({ ok: true });
}
