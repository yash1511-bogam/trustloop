import { createHmac, timingSafeEqual } from "crypto";

const SLACK_API_BASE = "https://slack.com/api";
const SLACK_SIGNATURE_MAX_AGE_SECONDS = 300;

type SlackApiResponse = {
  ok: boolean;
  error?: string;
  [key: string]: unknown;
};

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required for Slack integration.`);
  }
  return value;
}

function safeCompare(left: string, right: string): boolean {
  const a = Buffer.from(left, "utf8");
  const b = Buffer.from(right, "utf8");
  if (a.length !== b.length) {
    return false;
  }
  return timingSafeEqual(a, b);
}

export function slackOAuthRedirectUri(): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${appUrl.replace(/\/$/, "")}/api/slack/oauth`;
}

export function slackInstallUrl(state?: string): string {
  const clientId = requiredEnv("SLACK_CLIENT_ID");
  const redirectUri = slackOAuthRedirectUri();
  const scope = [
    "commands",
    "chat:write",
    "chat:write.public",
    "channels:read",
    "groups:read",
  ].join(",");

  const params = new URLSearchParams({
    client_id: clientId,
    scope,
    redirect_uri: redirectUri,
  });
  if (state) {
    params.set("state", state);
  }

  return `https://slack.com/oauth/v2/authorize?${params.toString()}`;
}

export function verifySlackRequestSignature(input: {
  rawBody: string;
  timestamp: string | null;
  signature: string | null;
}): boolean {
  if (!input.signature || !input.timestamp) {
    return false;
  }

  const timestamp = Number(input.timestamp);
  if (!Number.isFinite(timestamp)) {
    return false;
  }

  const ageSeconds = Math.floor(Date.now() / 1000) - Math.floor(timestamp);
  if (Math.abs(ageSeconds) > SLACK_SIGNATURE_MAX_AGE_SECONDS) {
    return false;
  }

  const signingSecret = requiredEnv("SLACK_SIGNING_SECRET");
  const baseString = `v0:${input.timestamp}:${input.rawBody}`;
  const expected = `v0=${createHmac("sha256", signingSecret).update(baseString).digest("hex")}`;
  return safeCompare(expected, input.signature);
}

async function slackApiCall<T extends SlackApiResponse>(
  path: string,
  token: string,
  body: Record<string, unknown>,
): Promise<T> {
  const response = await fetch(`${SLACK_API_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  const payload = (await response.json()) as T;
  if (!response.ok || !payload.ok) {
    throw new Error(
      `Slack API error (${path}): ${payload.error ?? response.statusText}`,
    );
  }

  return payload;
}

export async function exchangeSlackOAuthCode(code: string): Promise<{
  botToken: string;
  teamId: string;
  teamName: string;
}> {
  const params = new URLSearchParams({
    client_id: requiredEnv("SLACK_CLIENT_ID"),
    client_secret: requiredEnv("SLACK_CLIENT_SECRET"),
    code,
    redirect_uri: slackOAuthRedirectUri(),
  });

  const response = await fetch(`${SLACK_API_BASE}/oauth.v2.access`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  const payload = (await response.json()) as {
    ok: boolean;
    error?: string;
    access_token?: string;
    team?: { id?: string; name?: string };
  };

  if (!response.ok || !payload.ok || !payload.access_token || !payload.team?.id) {
    throw new Error(payload.error ?? "Slack OAuth exchange failed.");
  }

  return {
    botToken: payload.access_token,
    teamId: payload.team.id,
    teamName: payload.team.name ?? payload.team.id,
  };
}

export async function openSlackIncidentModal(input: {
  botToken: string;
  triggerId: string;
}): Promise<void> {
  await slackApiCall("/views.open", input.botToken, {
    trigger_id: input.triggerId,
    view: {
      type: "modal",
      callback_id: "trustloop_incident_create",
      title: { type: "plain_text", text: "Create Incident" },
      submit: { type: "plain_text", text: "Create" },
      close: { type: "plain_text", text: "Cancel" },
      blocks: [
        {
          type: "input",
          block_id: "incident_title",
          label: { type: "plain_text", text: "Title" },
          element: {
            type: "plain_text_input",
            action_id: "value",
            max_length: 180,
          },
        },
        {
          type: "input",
          block_id: "incident_description",
          label: { type: "plain_text", text: "Description" },
          element: {
            type: "plain_text_input",
            action_id: "value",
            multiline: true,
            max_length: 3000,
          },
        },
        {
          type: "input",
          optional: true,
          block_id: "model_version",
          label: { type: "plain_text", text: "Model/version" },
          element: {
            type: "plain_text_input",
            action_id: "value",
            max_length: 100,
          },
        },
        {
          type: "input",
          optional: true,
          block_id: "severity",
          label: { type: "plain_text", text: "Initial severity" },
          element: {
            type: "static_select",
            action_id: "value",
            options: [
              {
                text: { type: "plain_text", text: "P1" },
                value: "P1",
              },
              {
                text: { type: "plain_text", text: "P2" },
                value: "P2",
              },
              {
                text: { type: "plain_text", text: "P3" },
                value: "P3",
              },
            ],
          },
        },
      ],
    },
  });
}

export async function postSlackMessage(input: {
  botToken: string;
  channelId: string;
  text: string;
  threadTs?: string;
}): Promise<{ ts: string | null }> {
  const payload = (await slackApiCall("/chat.postMessage", input.botToken, {
    channel: input.channelId,
    text: input.text,
    thread_ts: input.threadTs,
    mrkdwn: true,
  })) as {
    ok: boolean;
    ts?: string;
  };

  return { ts: payload.ts ?? null };
}

export async function postIncidentAlert(input: {
  botToken: string;
  channelId: string;
  incidentTitle: string;
  incidentId: string;
  severity: string;
  summary?: string | null;
  url: string;
}): Promise<{ ts: string | null }> {
  const textLines = [
    `:rotating_light: *${input.severity} incident triaged*`,
    `*${input.incidentTitle}*`,
    input.summary ? `Summary: ${input.summary}` : null,
    `<${input.url}|Open incident>`,
  ].filter(Boolean);

  return postSlackMessage({
    botToken: input.botToken,
    channelId: input.channelId,
    text: textLines.join("\n"),
  });
}
