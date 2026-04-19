import { NextResponse } from "next/server";
import { ACTIVE_SLUG_COOKIE_NAME, SESSION_COOKIE_NAME } from "@/lib/constants";

function secureCookie(): boolean {
  return process.env.NODE_ENV === "production";
}

function cookieDomain(): string | undefined {
  const root = process.env.NEXT_PUBLIC_ROOT_DOMAIN;
  if (!root || root.startsWith("localhost")) return undefined;
  return `.${root}`;
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
    sameSite: "lax",
    secure: secureCookie(),
    expires: expiresAt,
    path: "/",
    domain: cookieDomain(),
  });
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: secureCookie(),
    expires: new Date(0),
    path: "/",
    domain: cookieDomain(),
  });
}

export function setActiveSlugCookie(response: NextResponse, slug: string): void {
  response.cookies.set({
    name: ACTIVE_SLUG_COOKIE_NAME,
    value: slug,
    httpOnly: true,
    sameSite: "lax",
    secure: secureCookie(),
    path: "/",
    domain: cookieDomain(),
  });
}

export function clearActiveSlugCookie(response: NextResponse): void {
  response.cookies.set({
    name: ACTIVE_SLUG_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: secureCookie(),
    expires: new Date(0),
    path: "/",
    domain: cookieDomain(),
  });
}
