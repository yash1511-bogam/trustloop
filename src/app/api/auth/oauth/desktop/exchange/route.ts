import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { redisGetJson, redisDelete } from "@/lib/redis";
import { prisma } from "@/lib/prisma";

const schema = z.object({ key: z.string().uuid() });

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const redisKey = `desktop:oauth-exchange:${parsed.data.key}`;
  const data = await redisGetJson(redisKey) as {
    sessionToken: string;
    expiresAt: string;
    stytchUserId: string;
  } | null;

  if (!data) {
    return NextResponse.json({ error: "Session expired or already used." }, { status: 404 });
  }

  // One-time use — delete immediately
  await redisDelete(redisKey);

  const user = await prisma.user.findFirst({
    where: { stytchUserId: data.stytchUserId },
    include: { workspace: { select: { name: true } } },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  return NextResponse.json({
    sessionToken: data.sessionToken,
    expiresAt: data.expiresAt,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      workspaceId: user.workspaceId,
      workspaceName: user.workspace.name,
      stytchUserId: user.stytchUserId,
    },
  });
}
