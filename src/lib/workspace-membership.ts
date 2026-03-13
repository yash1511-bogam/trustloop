import { Prisma, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type PrismaExecutor = Prisma.TransactionClient | typeof prisma;

export async function ensureWorkspaceMembership(
  executor: PrismaExecutor,
  input: {
    workspaceId: string;
    userId: string;
    role: Role;
  },
): Promise<void> {
  await executor.workspaceMembership.upsert({
    where: {
      workspaceId_userId: {
        workspaceId: input.workspaceId,
        userId: input.userId,
      },
    },
    create: {
      workspaceId: input.workspaceId,
      userId: input.userId,
      role: input.role,
    },
    update: {
      role: input.role,
    },
  });
}

export async function setActiveWorkspaceForUser(
  executor: PrismaExecutor,
  input: {
    userId: string;
    workspaceId: string;
  },
) {
  const membership = await executor.workspaceMembership.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId: input.workspaceId,
        userId: input.userId,
      },
    },
    include: {
      workspace: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
  });

  if (!membership) {
    return null;
  }

  const user = await executor.user.update({
    where: { id: input.userId },
    data: {
      workspaceId: membership.workspaceId,
      role: membership.role,
    },
    select: {
      id: true,
      workspaceId: true,
      role: true,
    },
  });

  return {
    user,
    workspace: membership.workspace,
    membershipRole: membership.role,
  };
}

export async function listUserWorkspaceMemberships(userId: string) {
  return prisma.workspaceMembership.findMany({
    where: { userId },
    include: {
      workspace: {
        select: {
          id: true,
          name: true,
          slug: true,
          planTier: true,
          complianceMode: true,
        },
      },
    },
    orderBy: [
      { workspace: { name: "asc" } },
      { createdAt: "asc" },
    ],
  });
}
