import { NextRequest, NextResponse } from "next/server";
import { getAuth, invalidateSessionAuthCache } from "@/lib/auth";
import { isAppSessionToken, revokeAppSession } from "@/lib/app-session";
import { recordAuditLog } from "@/lib/audit";
import { requestIpAddress } from "@/lib/api-key-scopes";
import { clearSessionCookie } from "@/lib/cookies";
import { SESSION_COOKIE_NAME } from "@/lib/constants";
import { revokeSessionToken } from "@/lib/stytch";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  // Try to get auth context before revoking for audit log
  const auth = await getAuth().catch(() => null);

  if (token) {
    if (isAppSessionToken(token)) {
      await revokeAppSession(token).catch(() => {});
    } else {
      await revokeSessionToken(token).catch(() => {});
    }
    await invalidateSessionAuthCache(token);
  }

  if (auth?.user) {
    recordAuditLog({
      workspaceId: auth.user.workspaceId,
      action: "auth.logout",
      targetType: "User",
      targetId: auth.user.id,
      summary: `User ${auth.user.email} logged out`,
      actorUserId: auth.user.id,
      ipAddress: requestIpAddress(request),
    }).catch(() => {});
  }

  const response = NextResponse.json({ success: true });
  clearSessionCookie(response);
  return response;
}
