import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { THEME_COOKIE_NAME, normalizeTheme } from "@/lib/theme";

const themeSchema = z.object({
  theme: z.enum(["dark", "light"]),
});

export async function GET(request: NextRequest): Promise<NextResponse> {
  const stored = request.cookies.get(THEME_COOKIE_NAME)?.value;
  return NextResponse.json({
    theme: normalizeTheme(stored),
  });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = await request.json().catch(() => null);
  const parsed = themeSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid theme payload." }, { status: 400 });
  }

  const response = NextResponse.json({
    theme: parsed.data.theme,
  });

  response.cookies.set({
    name: THEME_COOKIE_NAME,
    value: parsed.data.theme,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });

  return response;
}
