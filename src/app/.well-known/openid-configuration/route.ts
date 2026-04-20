import { NextResponse } from "next/server";

const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    issuer: base,
    authorization_endpoint: `${base}/login`,
    token_endpoint: `${base}/api/auth/login/verify`,
    jwks_uri: `${base}/.well-known/jwks.json`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code"],
    scopes_supported: ["openid", "incidents:read", "incidents:write"],
    token_endpoint_auth_methods_supported: ["client_secret_post"],
  });
}
