import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { hasRole } from "@/lib/auth";
import { recordAuditForAccess } from "@/lib/audit";
import { requireApiAuthAndRateLimit, withRateLimitHeaders } from "@/lib/api-guard";
import { badRequest, forbidden, notFound } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { ensureWorkspaceMembership } from "@/lib/workspace-membership";

const patchSchema = z.object({
  role: z.nativeEnum(Role),
});

async function ensureNotLastOwner(workspaceId: string, userId: string): Promise<boolean> {
  const owners = await prisma.workspaceMembership.count({
    where: {
      workspaceId,
      role: Role.OWNER,
    },
  });
  if (owners <= 1) {
    const target = await prisma.workspaceMembership.findFirst({
      where: {
        workspaceId,
        userId,
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
  const existing = await prisma.workspaceMembership.findFirst({
    where: {
      workspaceId: auth.workspaceId,
      userId,
    },
    select: {
      id: true,
      userId: true,
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

  const member = await prisma.$transaction(async (tx) => {
    const updatedMembership = await tx.workspaceMembership.update({
      where: { id: existing.id },
      data: {
        role: parsed.data.role,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            workspaceId: true,
          },
        },
      },
    });

    if (updatedMembership.user.workspaceId === auth.workspaceId) {
      await tx.user.update({
        where: { id: updatedMembership.user.id },
        data: {
          role: parsed.data.role,
        },
      });
    }

    return {
      id: updatedMembership.user.id,
      role: updatedMembership.role,
      name: updatedMembership.user.name,
      email: updatedMembership.user.email,
    };
  });

  await recordAuditForAccess({
    access: auth,
    request,
    action: "workspace.member_role_updated",
    targetType: "workspace_membership",
    targetId: existing.id,
    summary: `Updated member role to ${parsed.data.role}.`,
    metadata: {
      memberUserId: member.id,
      role: parsed.data.role,
    },
  });

  return withRateLimitHeaders(NextResponse.json({ member }), access.rateLimit);
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

  const target = await prisma.workspaceMembership.findFirst({
    where: {
      workspaceId: auth.workspaceId,
      userId,
    },
    select: {
      id: true,
      userId: true,
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

  await prisma.$transaction(async (tx) => {
    await tx.workspaceMembership.delete({
      where: { id: target.id },
    });

    const remainingMemberships = await tx.workspaceMembership.count({
      where: { userId: target.userId },
    });

    if (remainingMemberships === 0) {
      await tx.user.delete({
        where: { id: target.userId },
      });
      return;
    }

    const nextMembership = await tx.workspaceMembership.findFirst({
      where: { userId: target.userId },
      orderBy: { createdAt: "asc" },
    });
    if (nextMembership) {
      await tx.user.update({
        where: { id: target.userId },
        data: {
          workspaceId: nextMembership.workspaceId,
          role: nextMembership.role,
        },
      });
    }
  });

  await recordAuditForAccess({
    access: auth,
    request,
    action: "workspace.member_removed",
    targetType: "workspace_membership",
    targetId: target.id,
    summary: "Removed member from workspace.",
    metadata: {
      memberUserId: target.userId,
    },
  });

  return withRateLimitHeaders(
    NextResponse.json({ success: true }),
    access.rateLimit,
  );
}
