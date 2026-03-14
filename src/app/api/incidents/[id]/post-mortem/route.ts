import { NextRequest, NextResponse } from "next/server";
import { EventType, PostMortemStatus, WorkflowType } from "@prisma/client";
import { requireApiAuthAndRateLimit, withRateLimitHeaders } from "@/lib/api-guard";
import { decryptSecret } from "@/lib/encryption";
import { badRequest, notFound } from "@/lib/http";
import { AiProviderError } from "@/lib/ai/service";
import { prisma } from "@/lib/prisma";
import { recordAuditForAccess } from "@/lib/audit";

async function generatePostMortemBody(input: {
  provider: string;
  apiKey: string;
  model?: string;
  incidentTitle: string;
  incidentDescription: string;
  summary?: string | null;
  events: Array<{ eventType: string; body: string; createdAt: Date }>;
}): Promise<string> {
  const systemPrompt = [
    "You write structured post-mortem reports for AI incidents.",
    "Use markdown format with these sections:",
    "## Summary",
    "## Timeline",
    "## Root Cause",
    "## Impact",
    "## Lessons Learned",
    "## Action Items",
    "Be factual, concise, and actionable.",
  ].join("\n");

  const timeline = input.events
    .map((e) => `- [${e.eventType}] ${e.body}`)
    .join("\n");

  const userPrompt = [
    `Incident: ${input.incidentTitle}`,
    `Description: ${input.incidentDescription}`,
    input.summary ? `Triage Summary: ${input.summary}` : "",
    "Event Timeline:",
    timeline || "No events recorded.",
  ].filter(Boolean).join("\n");

  // We reuse the provider infrastructure but with a custom prompt
  const model = input.model?.trim() || "";

  const response = await fetch(
    input.provider === "OPENAI"
      ? "https://api.openai.com/v1/chat/completions"
      : input.provider === "GEMINI"
        ? `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model || "gemini-2.0-flash")}:generateContent?key=${encodeURIComponent(input.apiKey)}`
        : "https://api.anthropic.com/v1/messages",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(input.provider === "OPENAI" && { Authorization: `Bearer ${input.apiKey}` }),
        ...(input.provider === "ANTHROPIC" && {
          "x-api-key": input.apiKey,
          "anthropic-version": "2023-06-01",
        }),
      },
      body: JSON.stringify(
        input.provider === "OPENAI"
          ? {
              model: model || "gpt-4o-mini",
              temperature: 0,
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
              ],
            }
          : input.provider === "GEMINI"
            ? {
                contents: [{ role: "user", parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
                generationConfig: { temperature: 0 },
              }
            : {
                model: model || "claude-sonnet-4-20250514",
                max_tokens: 2000,
                temperature: 0,
                system: systemPrompt,
                messages: [{ role: "user", content: userPrompt }],
              },
      ),
    },
  );

  if (!response.ok) {
    throw new AiProviderError("PROVIDER_REQUEST_FAILED", `AI provider returned ${response.status}`);
  }

  const payload = await response.json();

  if (input.provider === "OPENAI") {
    return payload.choices?.[0]?.message?.content ?? "Post-mortem generation failed.";
  }
  if (input.provider === "GEMINI") {
    return payload.candidates?.[0]?.content?.parts?.[0]?.text ?? "Post-mortem generation failed.";
  }
  return payload.content?.find((c: { type: string }) => c.type === "text")?.text ?? "Post-mortem generation failed.";
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const access = await requireApiAuthAndRateLimit(request);
  if (access.response) return access.response;
  const auth = access.auth;
  const { id } = await params;

  const incident = await prisma.incident.findFirst({
    where: { id, workspaceId: auth.workspaceId },
    include: {
      events: { orderBy: { createdAt: "asc" }, take: 50 },
      postMortem: true,
    },
  });

  if (!incident) return notFound("Incident not found.");
  if (incident.postMortem) {
    return badRequest("Post-mortem already exists for this incident. Use PATCH to update.");
  }

  const workflow = await prisma.workflowSetting.findUnique({
    where: {
      workspaceId_workflowType: {
        workspaceId: auth.workspaceId,
        workflowType: WorkflowType.INCIDENT_TRIAGE,
      },
    },
  });

  const providerKey = workflow
    ? await prisma.aiProviderKey.findFirst({
        where: { workspaceId: auth.workspaceId, provider: workflow.provider, isActive: true },
      })
    : await prisma.aiProviderKey.findFirst({
        where: { workspaceId: auth.workspaceId, isActive: true },
      });

  if (!providerKey) {
    return badRequest("No active AI provider key configured. Add one in Settings → AI.");
  }

  const apiKey = decryptSecret(providerKey.encryptedKey);

  let body: string;
  try {
    body = await generatePostMortemBody({
      provider: providerKey.provider,
      apiKey,
      model: workflow?.model,
      incidentTitle: incident.title,
      incidentDescription: incident.description,
      summary: incident.summary,
      events: incident.events,
    });
  } catch (error) {
    if (error instanceof AiProviderError) {
      return NextResponse.json(
        { error: error.message, code: error.code, retryAfterSeconds: error.retryAfterSeconds },
        { status: error.code === "PROVIDER_RATE_LIMITED" ? 429 : 502 },
      );
    }
    throw error;
  }

  const postMortem = await prisma.postMortem.create({
    data: {
      incidentId: id,
      title: `Post-Mortem: ${incident.title}`,
      body,
      authorUserId: auth.actorUserId,
    },
  });

  await prisma.incidentEvent.create({
    data: {
      incidentId: id,
      eventType: EventType.NOTE,
      body: "AI-generated post-mortem created.",
      actorUserId: auth.actorUserId,
    },
  });

  await recordAuditForAccess({
    access: auth,
    request,
    action: "post_mortem.created",
    targetType: "PostMortem",
    targetId: postMortem.id,
    summary: `Post-mortem generated for incident ${incident.title}`,
  });

  return withRateLimitHeaders(NextResponse.json(postMortem, { status: 201 }), access.rateLimit);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const access = await requireApiAuthAndRateLimit(request);
  if (access.response) return access.response;
  const auth = access.auth;
  const { id } = await params;

  const existing = await prisma.postMortem.findFirst({
    where: { incidentId: id, incident: { workspaceId: auth.workspaceId } },
  });

  if (!existing) return notFound("Post-mortem not found for this incident.");

  const body = await request.json();
  const updates: Record<string, unknown> = {};

  if (typeof body.title === "string") updates.title = body.title.trim().slice(0, 300);
  if (typeof body.body === "string") updates.body = body.body;
  if (body.status === "PUBLISHED" && existing.status === "DRAFT") {
    updates.status = PostMortemStatus.PUBLISHED;
    updates.publishedAt = new Date();
  }

  const updated = await prisma.postMortem.update({
    where: { id: existing.id },
    data: updates,
  });

  await recordAuditForAccess({
    access: auth,
    request,
    action: "post_mortem.updated",
    targetType: "PostMortem",
    targetId: updated.id,
    summary: `Post-mortem updated${updates.status ? " and published" : ""}`,
  });

  return withRateLimitHeaders(NextResponse.json(updated), access.rateLimit);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const access = await requireApiAuthAndRateLimit(request);
  if (access.response) return access.response;
  const auth = access.auth;
  const { id } = await params;

  const postMortem = await prisma.postMortem.findFirst({
    where: { incidentId: id, incident: { workspaceId: auth.workspaceId } },
    include: { author: { select: { id: true, name: true, email: true } } },
  });

  if (!postMortem) return notFound("Post-mortem not found.");

  return withRateLimitHeaders(NextResponse.json(postMortem), access.rateLimit);
}
