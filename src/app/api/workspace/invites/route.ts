import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { hasRole } from "@/lib/auth";
import { requireApiAuthAndRateLimit } from "@/lib/api-guard";
import { sendWorkspaceInviteEmail } from "@/lib/email";
import { badRequest, forbidden, notFound } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  email: z.email().max(160),
  role: z.nativeEnum(Role).default(Role.AGENT),
});

const deleteSchema = z.object({
  id: z.string().min(10).max(40),
});

export async function GET(request: NextRequest): Promise<NextResponse> {
  const access = await requireApiAuthAndRateLimit(request);
  if (access.response) {
    return access.response;
  }
  const auth = access.auth;
  if (auth.kind !== "session") {
    return forbidden();
  }

  const invites = await prisma.workspaceInvite.findMany({
    where: {
      workspaceId: auth.workspaceId,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      role: true,
      token: true,
      createdAt: true,
      expiresAt: true,
    },
  });

  return NextResponse.json({
    invites: invites.map((invite) => ({
      ...invite,
      createdAt: invite.createdAt.toISOString(),
      expiresAt: invite.expiresAt.toISOString(),
    })),
  });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const access = await requireApiAuthAndRateLimit(request);
  if (access.response) {
    return access.response;
  }
  const auth = access.auth;
  if (auth.kind !== "session") {
    return forbidden();
  }
  if (!hasRole({ user: auth.user }, [Role.OWNER, Role.MANAGER])) {
    return forbidden();
  }

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid invite payload.");
  }

  const email = parsed.data.email.trim().toLowerCase();

  const existingMember = await prisma.user.findFirst({
    where: {
      workspaceId: auth.workspaceId,
      email,
    },
    select: { id: true },
  });
  if (existingMember) {
    return badRequest("User is already a member of this workspace.");
  }

  const token = randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const invite = await prisma.workspaceInvite.create({
    data: {
      workspaceId: auth.workspaceId,
      email,
      role: parsed.data.role,
      token,
      expiresAt,
      createdByUserId: auth.user.id,
    },
    select: {
      id: true,
      email: true,
      role: true,
      token: true,
      expiresAt: true,
      createdAt: true,
    },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const joinUrl = `${appUrl.replace(/\/$/, "")}/join?token=${encodeURIComponent(token)}`;

  await sendWorkspaceInviteEmail({
    workspaceId: auth.workspaceId,
    toEmail: invite.email,
    inviterName: auth.user.name,
    workspaceName: auth.user.workspaceName,
    role: invite.role,
    joinUrl,
  }).catch(() => null);

  return NextResponse.json(
    {
      invite: {
        ...invite,
        createdAt: invite.createdAt.toISOString(),
        expiresAt: invite.expiresAt.toISOString(),
      },
    },
    { status: 201 },
  );
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const access = await requireApiAuthAndRateLimit(request);
  if (access.response) {
    return access.response;
  }
  const auth = access.auth;
  if (auth.kind !== "session") {
    return forbidden();
  }
  if (!hasRole({ user: auth.user }, [Role.OWNER, Role.MANAGER])) {
    return forbidden();
  }

  const body = await request.json().catch(() => null);
  const parsed = deleteSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid invite revoke payload.");
  }

  const deleted = await prisma.workspaceInvite.deleteMany({
    where: {
      id: parsed.data.id,
      workspaceId: auth.workspaceId,
      usedAt: null,
    },
  });
  if (deleted.count === 0) {
    return notFound("Invite not found.");
  }

  return NextResponse.json({ success: true });
}
