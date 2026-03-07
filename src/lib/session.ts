import { createHash, randomBytes } from "crypto";
import type { Session, User, Workspace } from "@prisma/client";
import { SESSION_DURATION_DAYS } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

export type SessionWithUser = Session & {
  user: User & { workspace: Workspace };
};

function tokenPepper(): string {
  return process.env.SESSION_TOKEN_PEPPER ?? "trustloop-dev-pepper";
}

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(`${token}:${tokenPepper()}`).digest("hex");
}

export function generateSessionToken(): string {
  return randomBytes(32).toString("hex");
}

export function computeSessionExpiry(): Date {
  const ttlMs = SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000;
  return new Date(Date.now() + ttlMs);
}

export async function createSessionForUser(userId: string): Promise<{
  token: string;
  expiresAt: Date;
}> {
  const token = generateSessionToken();
  const tokenHash = hashSessionToken(token);
  const expiresAt = computeSessionExpiry();

  await prisma.session.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
  });

  return { token, expiresAt };
}

export async function findSessionByToken(
  token: string,
): Promise<SessionWithUser | null> {
  const tokenHash = hashSessionToken(token);

  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: {
      user: {
        include: {
          workspace: true,
        },
      },
    },
  });

  if (!session) {
    return null;
  }

  if (session.expiresAt.getTime() < Date.now()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {
      // Ignore concurrent cleanup races.
    });
    return null;
  }

  return session;
}

export async function deleteSessionByToken(token: string): Promise<void> {
  const tokenHash = hashSessionToken(token);
  await prisma.session.deleteMany({ where: { tokenHash } });
}
