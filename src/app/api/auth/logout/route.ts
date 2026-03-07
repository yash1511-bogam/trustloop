import { NextRequest, NextResponse } from "next/server";
import { invalidateSessionAuthCache } from "@/lib/auth";
import { clearSessionCookie } from "@/lib/cookies";
import { SESSION_COOKIE_NAME } from "@/lib/constants";
import { revokeSessionToken } from "@/lib/stytch";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (token) {
    await revokeSessionToken(token).catch(() => {
      // Ignore revoke errors to keep logout idempotent.
    });

    await invalidateSessionAuthCache(token);
  }

  const response = NextResponse.json({ success: true });
  clearSessionCookie(response);
  return response;
}
