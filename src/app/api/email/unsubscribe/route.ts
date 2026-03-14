import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Missing token." }, { status: 400 });

  const sub = await prisma.emailSubscription.findUnique({
    where: { unsubscribeToken: token },
    select: { email: true, subscribed: true },
  });

  if (!sub) return NextResponse.json({ error: "Invalid token." }, { status: 404 });

  return NextResponse.json({ email: sub.email, subscribed: sub.subscribed });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = await request.json().catch(() => null);
  const token = body?.token;
  if (!token || typeof token !== "string") {
    return NextResponse.json({ error: "Missing token." }, { status: 400 });
  }

  const sub = await prisma.emailSubscription.findUnique({
    where: { unsubscribeToken: token },
    select: { id: true },
  });

  if (!sub) return NextResponse.json({ error: "Invalid token." }, { status: 404 });

  await prisma.emailSubscription.update({
    where: { id: sub.id },
    data: { subscribed: false, unsubscribedAt: new Date() },
  });

  return NextResponse.json({ success: true });
}
