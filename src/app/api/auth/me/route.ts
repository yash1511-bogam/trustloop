import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth";

export async function GET(): Promise<NextResponse> {
  const auth = await getAuth();
  if (!auth) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  return NextResponse.json({ user: auth.user });
}
