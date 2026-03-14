import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { recordAuditLog } from "@/lib/audit";
import { encryptSecret } from "@/lib/encryption";
import { prisma } from "@/lib/prisma";
import { exchangeSlackOAuthCode } from "@/lib/slack";

function appBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

function stateSigningKey(): string {
  return process.env.KEY_ENCRYPTION_SECRET ?? "fallback-dev-key";
}

export function signState(workspaceId: string): string {
  const sig = createHmac("sha256", stateSigningKey())
    .update(workspaceId)
    .digest("hex")
    .slice(0, 16);
  return `${workspaceId}.${sig}`;
}

function verifyAndParseState(state: string): string | null {
  const dotIndex = state.lastIndexOf(".");
  if (dotIndex === -1) {
    return null;
  }

  const workspaceId = state.slice(0, dotIndex);
  const providedSig = state.slice(dotIndex + 1);

  const expectedSig = createHmac("sha256", stateSigningKey())
    .update(workspaceId)
    .digest("hex")
    .slice(0, 16);

  const a = Buffer.from(providedSig, "utf8");
  const b = Buffer.from(expectedSig, "utf8");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return null;
  }

  return workspaceId;
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

  const workspaceId = verifyAndParseState(state);
  if (!workspaceId) {
    return NextResponse.redirect(`${appBaseUrl()}/settings?slack=invalid_state`);
  }

  try {
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
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

    recordAuditLog({ workspaceId: workspace.id, action: "slack.connected", targetType: "Workspace", summary: `Slack workspace ${oauth.teamId} connected` }).catch(() => {});

    return NextResponse.redirect(`${appBaseUrl()}/settings?slack=connected`);
  } catch {
    return NextResponse.redirect(`${appBaseUrl()}/settings?slack=error`);
  }
}
