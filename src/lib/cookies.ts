import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/constants";

function secureCookie(): boolean {
  return process.env.NODE_ENV === "production";
}

export function setSessionCookie(
  response: NextResponse,
  sessionToken: string,
  expiresAt: Date,
): void {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: sessionToken,
    httpOnly: true,
    sameSite: "strict",
    secure: secureCookie(),
    expires: expiresAt,
    path: "/",
  });
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "strict",
    secure: secureCookie(),
    expires: new Date(0),
    path: "/",
  });
}
