import { NextRequest, NextResponse } from "next/server";
import { decryptSecret } from "@/lib/encryption";
import { recordAuditLog } from "@/lib/audit";
import { unauthorized } from "@/lib/http";
import { log } from "@/lib/logger";
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
      id: true,
      slackBotToken: true,
    },
  });

  if (!workspace?.slackBotToken) {
    return NextResponse.json({
      response_type: "ephemeral",
      text: "Slack app is not connected to a TrustLoop workspace yet.",
    });
  }

  try {
    await openSlackIncidentModal({
      botToken: decryptSecret(workspace.slackBotToken),
      triggerId,
    });
    recordAuditLog({ workspaceId: workspace.id, action: "slack.incident_command", targetType: "slack", summary: `Slack /incident command from team ${teamId}` }).catch(() => {});
  } catch (error) {
    log.app.error("Failed to open Slack incident modal", {
      teamId,
      triggerId,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({
      response_type: "ephemeral",
      text: "Unable to open TrustLoop incident modal right now. Please try again.",
    });
  }

  return new NextResponse("", { status: 200 });
}
