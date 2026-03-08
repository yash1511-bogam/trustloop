import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { hasRole } from "@/lib/auth";
import { requireApiAuthAndRateLimit } from "@/lib/api-guard";
import { badRequest, forbidden, notFound } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const patchSchema = z.object({
  role: z.nativeEnum(Role),
});

async function ensureNotLastOwner(workspaceId: string, userId: string): Promise<boolean> {
  const owners = await prisma.user.count({
    where: {
      workspaceId,
      role: Role.OWNER,
    },
  });
  if (owners <= 1) {
    const target = await prisma.user.findFirst({
      where: {
        id: userId,
        workspaceId,
        role: Role.OWNER,
      },
      select: { id: true },
    });
    return !target;
  }
  return true;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
): Promise<NextResponse> {
  const access = await requireApiAuthAndRateLimit(request);
  if (access.response) {
    return access.response;
  }
  const auth = access.auth;
  if (auth.kind !== "session") {
    return forbidden();
  }
  if (!hasRole({ user: auth.user }, [Role.OWNER])) {
    return forbidden();
  }

  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid member role payload.");
  }

  const { userId } = await params;
  const existing = await prisma.user.findFirst({
    where: {
      id: userId,
      workspaceId: auth.workspaceId,
    },
    select: {
      id: true,
      role: true,
    },
  });
  if (!existing) {
    return notFound("Member not found.");
  }

  if (existing.role === Role.OWNER && parsed.data.role !== Role.OWNER) {
    const allowed = await ensureNotLastOwner(auth.workspaceId, existing.id);
    if (!allowed) {
      return badRequest("Workspace must have at least one owner.");
    }
  }

  const member = await prisma.user.update({
    where: { id: existing.id },
    data: {
      role: parsed.data.role,
    },
    select: {
      id: true,
      role: true,
      name: true,
      email: true,
    },
  });

  return NextResponse.json({ member });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
): Promise<NextResponse> {
  const access = await requireApiAuthAndRateLimit(request);
  if (access.response) {
    return access.response;
  }
  const auth = access.auth;
  if (auth.kind !== "session") {
    return forbidden();
  }
  if (!hasRole({ user: auth.user }, [Role.OWNER])) {
    return forbidden();
  }

  const { userId } = await params;
  if (userId === auth.user.id) {
    return badRequest("Use role transfer before removing yourself.");
  }

  const target = await prisma.user.findFirst({
    where: {
      id: userId,
      workspaceId: auth.workspaceId,
    },
    select: {
      id: true,
      role: true,
    },
  });
  if (!target) {
    return notFound("Member not found.");
  }

  if (target.role === Role.OWNER) {
    const allowed = await ensureNotLastOwner(auth.workspaceId, target.id);
    if (!allowed) {
      return badRequest("Workspace must have at least one owner.");
    }
  }

  await prisma.user.delete({
    where: { id: target.id },
  });

  return NextResponse.json({ success: true });
}
