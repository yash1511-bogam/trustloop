import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { setSessionCookie } from "@/lib/cookies";
import { badRequest } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { createSessionForUser } from "@/lib/session";
import { z } from "zod";

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid login payload.");
  }

  const user = await prisma.user.findFirst({
    where: { email: parsed.data.email.toLowerCase().trim() },
  });

  if (!user) {
    return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
  }

  const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!ok) {
    return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
  }

  const session = await createSessionForUser(user.id);
  const response = NextResponse.json({ success: true });
  setSessionCookie(response, session.token, session.expiresAt);
  return response;
}
