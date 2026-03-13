import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type PrismaExecutor = Prisma.TransactionClient | typeof prisma;

export async function deleteWorkspaceAndRehomeUsers(
  executor: PrismaExecutor,
  workspaceId: string,
): Promise<{ deletedWorkspaceId: string; deletedUserIds: string[]; rehomedUserIds: string[] }> {
  const memberships = await executor.workspaceMembership.findMany({
    where: { workspaceId },
    select: {
      userId: true,
    },
  });

  const deletedUserIds: string[] = [];
  const rehomedUserIds: string[] = [];

  for (const membership of memberships) {
    const user = await executor.user.findUnique({
      where: { id: membership.userId },
      select: {
        id: true,
        workspaceId: true,
      },
    });

    if (!user || user.workspaceId !== workspaceId) {
      continue;
    }

    const nextMembership = await executor.workspaceMembership.findFirst({
      where: {
        userId: user.id,
        workspaceId: {
          not: workspaceId,
        },
      },
      orderBy: { createdAt: "asc" },
      select: {
        workspaceId: true,
        role: true,
      },
    });

    if (!nextMembership) {
      await executor.user.delete({
        where: { id: user.id },
      });
      deletedUserIds.push(user.id);
      continue;
    }

    await executor.user.update({
      where: { id: user.id },
      data: {
        workspaceId: nextMembership.workspaceId,
        role: nextMembership.role,
      },
    });
    rehomedUserIds.push(user.id);
  }

  await executor.workspace.delete({
    where: { id: workspaceId },
  });

  return {
    deletedWorkspaceId: workspaceId,
    deletedUserIds,
    rehomedUserIds,
  };
}
