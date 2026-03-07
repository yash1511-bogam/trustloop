import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { SESSION_COOKIE_NAME } from "@/lib/constants";
import { findSessionByToken } from "@/lib/session";

export type AuthContext = {
  user: {
    id: string;
    name: string;
    email: string;
    role: Role;
    workspaceId: string;
    workspaceName: string;
  };
  sessionId: string;
};

export async function getAuth(): Promise<AuthContext | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return null;
  }

  const session = await findSessionByToken(token);
  if (!session) {
    return null;
  }

  return {
    sessionId: session.id,
    user: {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      role: session.user.role,
      workspaceId: session.user.workspaceId,
      workspaceName: session.user.workspace.name,
    },
  };
}

export async function requireAuth(): Promise<AuthContext> {
  const auth = await getAuth();
  if (!auth) {
    redirect("/login");
  }
  return auth;
}

export function hasRole(
  auth: AuthContext,
  allowedRoles: Role[],
): boolean {
  return allowedRoles.includes(auth.user.role);
}
