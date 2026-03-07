import { NextResponse } from "next/server";
import { AuthContext, getAuth } from "@/lib/auth";
import { enforceWorkspaceRateLimit } from "@/lib/policy";
import { tooManyRequests, unauthorized } from "@/lib/http";

export async function requireApiAuthAndRateLimit(): Promise<
  | { auth: AuthContext; response: null }
  | { auth: null; response: NextResponse }
> {
  const auth = await getAuth();
  if (!auth) {
    return {
      auth: null,
      response: unauthorized(),
    };
  }

  const rateLimit = await enforceWorkspaceRateLimit(auth.user.workspaceId);
  if (!rateLimit.allowed) {
    return {
      auth: null,
      response: tooManyRequests(
        "Workspace request rate exceeded. Please retry shortly.",
        rateLimit.retryAfterSeconds,
      ),
    };
  }

  return {
    auth,
    response: null,
  };
}
