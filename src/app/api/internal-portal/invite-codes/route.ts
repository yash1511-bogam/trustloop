import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { requireInternalApiAuth, requireRole } from "@/lib/internal-auth";
import { prisma } from "@/lib/prisma";

function generateCode(): string {
  return randomBytes(6).toString("hex").toUpperCase();
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await requireInternalApiAuth(request);
  if (!auth || !requireRole(auth, ["CEO", "MARKETING"])) return NextResponse.json(null, { status: 404 });

  const url = request.nextUrl;
  const search = url.searchParams.get("search")?.trim() || "";
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit")) || 20));
  const used = url.searchParams.get("used");

  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [
      { code: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }
  if (used === "true") where.used = true;
  if (used === "false") where.used = false;

  const [total, codes] = await Promise.all([
    prisma.inviteCode.count({ where }),
    prisma.inviteCode.findMany({
      where,
      include: {
        usedByUser: { select: { name: true, email: true } },
        createdByUser: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return NextResponse.json({ total, page, limit, codes });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await requireInternalApiAuth(request);
  if (!auth || !requireRole(auth, ["CEO", "MARKETING"])) return NextResponse.json(null, { status: 404 });

  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const count = typeof body?.count === "number" ? Math.min(50, Math.max(1, body.count)) : 0;

  if (!email && !count) return NextResponse.json({ error: "Provide email or count" }, { status: 400 });

  const codes: { code: string; email: string }[] = [];
  const n = email ? 1 : count;
  for (let i = 0; i < n; i++) {
    const code = generateCode();
    await prisma.inviteCode.create({ data: { code, email: email || "" } });
    codes.push({ code, email: email || "" });
  }

  return NextResponse.json({ codes });
}
