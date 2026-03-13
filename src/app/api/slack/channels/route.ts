import { NextRequest, NextResponse } from "next/server";
import { requireApiAuthAndRateLimit } from "@/lib/api-guard";
import { decryptSecret } from "@/lib/encryption";
import { forbidden } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { listSlackChannels } from "@/lib/slack";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const access = await requireApiAuthAndRateLimit(request);
  if (access.response) {
    return access.response;
  }
  const auth = access.auth;
  if (auth.kind !== "session") {
    return forbidden();
  }

  const workspace = await prisma.workspace.findUnique({
    where: { id: auth.workspaceId },
    select: { slackBotToken: true, slackTeamId: true },
  });

  if (!workspace?.slackBotToken || !workspace.slackTeamId) {
    return NextResponse.json({ channels: [] });
  }

  try {
    const channels = await listSlackChannels(decryptSecret(workspace.slackBotToken));
    return NextResponse.json({ channels });
  } catch {
    return NextResponse.json({ channels: [] });
  }
}
