import { NextResponse } from "next/server";

const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    resource: base,
    authorization_servers: [base],
    scopes_supported: ["openid", "incidents:read", "incidents:write"],
    bearer_methods_supported: ["header"],
  });
}
