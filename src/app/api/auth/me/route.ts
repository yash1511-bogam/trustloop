import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit";

export async function GET(): Promise<NextResponse> {
  const auth = await getAuth();
  if (!auth) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  recordAuditLog({ workspaceId: auth.user.workspaceId, actorUserId: auth.user.id, action: "auth.session_check", targetType: "user", targetId: auth.user.id, summary: "Session check via /auth/me" }).catch(() => {});

  return NextResponse.json({ user: auth.user });
}
