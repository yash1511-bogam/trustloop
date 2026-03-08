import { NextRequest, NextResponse } from "next/server";
import { AuthContext, getAuth } from "@/lib/auth";
import { ApiKeyIdentity, authenticateApiKeyRequest } from "@/lib/api-key-auth";
import { enforceWorkspaceRateLimit } from "@/lib/policy";
import { tooManyRequests, unauthorized } from "@/lib/http";

export type ApiAccessContext =
  | {
      kind: "session";
      workspaceId: string;
      actorUserId: string;
      user: AuthContext["user"];
      apiKey: null;
    }
  | {
      kind: "api_key";
      workspaceId: string;
      actorUserId: null;
      user: null;
      apiKey: ApiKeyIdentity;
    };

type RequireOptions = {
  allowApiKey?: boolean;
};

function toSessionAccess(auth: AuthContext): ApiAccessContext {
  return {
    kind: "session",
    workspaceId: auth.user.workspaceId,
    actorUserId: auth.user.id,
    user: auth.user,
    apiKey: null,
  };
}

function toApiKeyAccess(apiKey: ApiKeyIdentity): ApiAccessContext {
  return {
    kind: "api_key",
    workspaceId: apiKey.workspaceId,
    actorUserId: null,
    user: null,
    apiKey,
  };
}

export async function requireApiAuthAndRateLimit(
  request?: NextRequest,
  options?: RequireOptions,
): Promise<
  | { auth: ApiAccessContext; response: null }
  | { auth: null; response: NextResponse }
> {
  let access: ApiAccessContext | null = null;

  if (options?.allowApiKey && request) {
    const apiKey = await authenticateApiKeyRequest(request);
    if (apiKey) {
      access = toApiKeyAccess(apiKey);
    }
  }

  if (!access) {
    const auth = await getAuth();
    if (auth) {
      access = toSessionAccess(auth);
    }
  }

  if (!access) {
    return {
      auth: null,
      response: unauthorized(),
    };
  }

  const rateLimit = await enforceWorkspaceRateLimit(access.workspaceId);
  if (!rateLimit.allowed) {
    const details =
      access.kind === "api_key"
        ? {
            keyPrefix: access.apiKey.keyPrefix,
            limit: rateLimit.limit,
            remaining: rateLimit.remaining,
          }
        : {
            limit: rateLimit.limit,
            remaining: rateLimit.remaining,
          };

    return {
      auth: null,
      response: tooManyRequests(
        "Workspace request rate exceeded. Please retry shortly.",
        rateLimit.retryAfterSeconds,
        details,
      ),
    };
  }

  return {
    auth: access,
    response: null,
  };
}
