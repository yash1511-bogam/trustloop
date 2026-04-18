import { NextRequest, NextResponse } from "next/server";
import { requireInternalApiAuth, requireRole } from "@/lib/internal-auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await requireInternalApiAuth(request);
  if (!auth || !requireRole(auth, ["CEO", "MARKETING"])) return NextResponse.json(null, { status: 404 });

  const codes = await prisma.promoCode.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ codes });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await requireInternalApiAuth(request);
  if (!auth || !requireRole(auth, ["CEO"])) return NextResponse.json(null, { status: 404 });

  const body = await request.json().catch(() => null);
  const code = typeof body?.code === "string" ? body.code.trim().toUpperCase() : "";
  if (!code) return NextResponse.json({ error: "Code is required" }, { status: 400 });

  const existing = await prisma.promoCode.findUnique({ where: { code } });
  if (existing) return NextResponse.json({ error: "Code already exists" }, { status: 409 });

  const promoCode = await prisma.promoCode.create({
    data: {
      code,
      description: body?.description?.trim() || null,
      discountPercent: body?.discountPercent ?? null,
      discountAmount: body?.discountAmount ?? null,
      currency: body?.currency?.trim() || "USD",
      maxUses: body?.maxUses ?? null,
      validUntil: body?.validUntil ? new Date(body.validUntil) : null,
      createdByEmail: auth.user.email,
    },
  });

  return NextResponse.json({ promoCode });
}
