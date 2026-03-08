import { NextRequest, NextResponse } from "next/server";
import { decryptSecret } from "@/lib/encryption";
import { unauthorized } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { openSlackIncidentModal, verifySlackRequestSignature } from "@/lib/slack";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const rawBody = await request.text();
  const isValid = verifySlackRequestSignature({
    rawBody,
    timestamp: request.headers.get("x-slack-request-timestamp"),
    signature: request.headers.get("x-slack-signature"),
  });

  if (!isValid) {
    return unauthorized();
  }

  const form = new URLSearchParams(rawBody);
  const teamId = form.get("team_id");
  const triggerId = form.get("trigger_id");

  if (!teamId || !triggerId) {
    return NextResponse.json({ text: "Missing team or trigger context." });
  }

  const workspace = await prisma.workspace.findFirst({
    where: {
      slackTeamId: teamId,
    },
    select: {
      slackBotToken: true,
    },
  });

  if (!workspace?.slackBotToken) {
    return NextResponse.json({
      response_type: "ephemeral",
      text: "Slack app is not connected to a TrustLoop workspace yet.",
    });
  }

  await openSlackIncidentModal({
    botToken: decryptSecret(workspace.slackBotToken),
    triggerId,
  }).catch(() => null);

  return new NextResponse("", { status: 200 });
}
