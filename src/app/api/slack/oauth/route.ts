import { NextRequest, NextResponse } from "next/server";
import { encryptSecret } from "@/lib/encryption";
import { prisma } from "@/lib/prisma";
import { exchangeSlackOAuthCode } from "@/lib/slack";

function appBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const error = request.nextUrl.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(`${appBaseUrl()}/settings?slack=denied`);
  }

  if (!code || !state) {
    return NextResponse.redirect(`${appBaseUrl()}/settings?slack=invalid`);
  }

  try {
    const workspace = await prisma.workspace.findUnique({
      where: { id: state },
      select: { id: true },
    });
    if (!workspace) {
      return NextResponse.redirect(`${appBaseUrl()}/settings?slack=workspace_missing`);
    }

    const oauth = await exchangeSlackOAuthCode(code);

    await prisma.workspace.update({
      where: { id: workspace.id },
      data: {
        slackBotToken: encryptSecret(oauth.botToken),
        slackTeamId: oauth.teamId,
      },
    });

    return NextResponse.redirect(`${appBaseUrl()}/settings?slack=connected`);
  } catch {
    return NextResponse.redirect(`${appBaseUrl()}/settings?slack=error`);
  }
}
