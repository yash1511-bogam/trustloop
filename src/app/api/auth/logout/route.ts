import { NextRequest, NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/cookies";
import { SESSION_COOKIE_NAME } from "@/lib/constants";
import { deleteSessionByToken } from "@/lib/session";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (token) {
    await deleteSessionByToken(token);
  }

  const response = NextResponse.json({ success: true });
  clearSessionCookie(response);
  return response;
}
