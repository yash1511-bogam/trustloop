import { NextRequest, NextResponse } from "next/server";
import { ApiKeyScope, apiKeyHasScopes } from "@/lib/api-key-scopes";
import { AuthContext, getAuth } from "@/lib/auth";
import { ApiKeyIdentity, authenticateApiKeyRequest } from "@/lib/api-key-auth";
import { enforceWorkspaceRateLimit } from "@/lib/policy";
import { applyRateLimitHeaders, forbidden, tooManyRequests, unauthorized } from "@/lib/http";
import { randomUUID } from "crypto";

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
  requiredApiKeyScopes?: ApiKeyScope[];
};

export type ApiRateLimitState = Awaited<ReturnType<typeof enforceWorkspaceRateLimit>>;

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
  | { auth: ApiAccessContext; response: null; rateLimit: ApiRateLimitState; requestId: string }
  | { auth: null; response: NextResponse; rateLimit: null; requestId: string }
> {
  const requestId = request?.headers.get("x-request-id") || randomUUID();
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
      rateLimit: null,
      requestId,
    };
  }

  if (
    access.kind === "api_key" &&
    !apiKeyHasScopes(access.apiKey.scopes, options?.requiredApiKeyScopes)
  ) {
    return {
      auth: null,
      response: forbidden(),
      rateLimit: null,
      requestId,
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
        rateLimit,
      ),
      rateLimit: null,
      requestId,
    };
  }

  return {
    auth: access,
    response: null,
    rateLimit,
    requestId,
  };
}

export function withRateLimitHeaders(
  response: NextResponse,
  rateLimit: ApiRateLimitState,
): NextResponse {
  return applyRateLimitHeaders(response, rateLimit);
}
