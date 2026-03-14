import { NextRequest, NextResponse } from "next/server";
import { IncidentChannel, IncidentSeverity } from "@prisma/client";
import { createIncidentRecord } from "@/lib/incident-service";
import { recordAuditLog } from "@/lib/audit";
import { unauthorized } from "@/lib/http";
import { consumeWorkspaceQuota, enforceWorkspaceQuota } from "@/lib/policy";
import { prisma } from "@/lib/prisma";
import { refreshWorkspaceReadModels } from "@/lib/read-models";
import { verifySlackRequestSignature } from "@/lib/slack";

function valueFromModal(payload: Record<string, unknown>, blockId: string): string {
  const view = payload.view as Record<string, unknown> | undefined;
  const state = view?.state as Record<string, unknown> | undefined;
  const values = state?.values as Record<string, Record<string, unknown>> | undefined;
  const block = values?.[blockId];
  const action = block ? (Object.values(block)[0] as Record<string, unknown>) : undefined;
  if (!action) {
    return "";
  }

  if (typeof action.value === "string") {
    return action.value;
  }

  const selectedOption = action.selected_option as { value?: string } | undefined;
  return selectedOption?.value ?? "";
}

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

  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const payload = JSON.parse(rawBody) as {
      type?: string;
      challenge?: string;
    };

    if (payload.type === "url_verification" && payload.challenge) {
      return NextResponse.json({ challenge: payload.challenge });
    }

    return NextResponse.json({ ok: true });
  }

  const form = new URLSearchParams(rawBody);
  const payloadRaw = form.get("payload");
  if (!payloadRaw) {
    return NextResponse.json({ ok: true });
  }

  const interactivePayload = JSON.parse(payloadRaw) as Record<string, unknown>;
  if (
    interactivePayload.type !== "view_submission" ||
    (interactivePayload.view as Record<string, unknown> | undefined)?.callback_id !==
      "trustloop_incident_create"
  ) {
    return NextResponse.json({ response_action: "clear" });
  }

  const team = interactivePayload.team as { id?: string } | undefined;
  if (!team?.id) {
    return NextResponse.json({ response_action: "clear" });
  }

  const workspace = await prisma.workspace.findFirst({
    where: { slackTeamId: team.id },
    select: { id: true },
  });
  if (!workspace) {
    return NextResponse.json({ response_action: "clear" });
  }

  const quota = await enforceWorkspaceQuota(workspace.id, "incidents");
  if (!quota.allowed) {
    return NextResponse.json(
      {
        response_action: "errors",
        errors: {
          incident_title: `Daily incident quota reached (${quota.limit}/day).`,
        },
      },
      { status: 200 },
    );
  }

  const title = valueFromModal(interactivePayload, "incident_title");
  const description = valueFromModal(interactivePayload, "incident_description");
  const modelVersion = valueFromModal(interactivePayload, "model_version");
  const severity = valueFromModal(interactivePayload, "severity");

  await prisma.$transaction(async (tx) => {
    await createIncidentRecord(
      {
        workspaceId: workspace.id,
        title,
        description,
        channel: IncidentChannel.SLACK,
        severity:
          severity === "P1" || severity === "P2" || severity === "P3"
            ? (severity as IncidentSeverity)
            : IncidentSeverity.P3,
        modelVersion: modelVersion || null,
        sourceLabel: "Slack modal",
      },
      tx,
    );
  });

  await consumeWorkspaceQuota(workspace.id, "incidents", 1);
  await refreshWorkspaceReadModels(workspace.id);

  recordAuditLog({ workspaceId: workspace.id, action: "slack.incident_created", targetType: "incident", summary: `Incident created via Slack modal: "${title}"` }).catch(() => {});

  return NextResponse.json({ response_action: "clear" });
}
