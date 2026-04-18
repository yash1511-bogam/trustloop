import { NextRequest, NextResponse } from "next/server";
import { requireInternalApiAuth, requireRole } from "@/lib/internal-auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const auth = await requireInternalApiAuth(request);
  if (!auth || !requireRole(auth, ["CEO"])) return NextResponse.json(null, { status: 404 });

  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (typeof body?.isActive !== "boolean") return NextResponse.json({ error: "isActive required" }, { status: 400 });

  const code = await prisma.promoCode.findUnique({ where: { id } });
  if (!code) return NextResponse.json(null, { status: 404 });

  await prisma.promoCode.update({ where: { id }, data: { isActive: body.isActive } });
  return NextResponse.json({ ok: true });
}
