import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { badRequest } from "@/lib/http";
import { buildOAuthStartUrl, OAuthProvider } from "@/lib/stytch";

const providerSchema = z.enum(["google", "github"]);
const querySchema = z.object({
  intent: z.enum(["login", "register"]).optional(),
  workspaceName: z.string().min(2).max(80).optional(),
  inviteToken: z.string().uuid().optional(),
});

function callbackUrl(input: {
  request: NextRequest;
  provider: OAuthProvider;
  intent: "login" | "register";
  workspaceName?: string;
  inviteToken?: string;
}): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? input.request.nextUrl.origin;
  const base = appUrl.replace(/\/$/, "");

  const params = new URLSearchParams({
    provider: input.provider,
    intent: input.intent,
  });

  if (input.workspaceName?.trim()) {
    params.set("workspaceName", input.workspaceName.trim());
  }
  if (input.inviteToken) {
    params.set("inviteToken", input.inviteToken);
  }

  return `${base}/api/auth/oauth/callback?${params.toString()}`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
): Promise<NextResponse> {
  const routeParams = await params;
  const parsedProvider = providerSchema.safeParse(routeParams.provider);
  if (!parsedProvider.success) {
    return NextResponse.json({ error: "Unsupported OAuth provider." }, { status: 404 });
  }

  const query = Object.fromEntries(request.nextUrl.searchParams.entries());
  const parsedQuery = querySchema.safeParse(query);
  if (!parsedQuery.success) {
    return badRequest("Invalid OAuth start parameters.");
  }

  const intent = parsedQuery.data.intent ?? "login";
  const target = callbackUrl({
    request,
    provider: parsedProvider.data,
    intent,
    workspaceName: parsedQuery.data.workspaceName,
    inviteToken: parsedQuery.data.inviteToken,
  });

  try {
    const startUrl = buildOAuthStartUrl({
      provider: parsedProvider.data,
      loginRedirectUrl: target,
      signupRedirectUrl: target,
    });
    return NextResponse.redirect(startUrl);
  } catch {
    const fallback =
      intent === "register"
        ? "/register?error=oauth_not_configured"
        : "/login?error=oauth_not_configured";
    return NextResponse.redirect(new URL(fallback, request.nextUrl.origin));
  }
}
