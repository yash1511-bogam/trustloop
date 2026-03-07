import "server-only";

import { AiProvider, IncidentSeverity } from "@prisma/client";
import { DEFAULT_MODELS } from "@/lib/constants";

type SupportedProvider = AiProvider;

export type TriageResult = {
  severity: IncidentSeverity;
  category: string;
  summary: string;
  nextSteps: string[];
};

export function defaultModelForProvider(provider: SupportedProvider): string {
  return DEFAULT_MODELS[provider];
}

function normalizeSeverity(value: string): IncidentSeverity {
  const normalized = value.trim().toUpperCase();
  if (normalized === "P1") return IncidentSeverity.P1;
  if (normalized === "P2") return IncidentSeverity.P2;
  return IncidentSeverity.P3;
}

function extractJsonCandidate(text: string): string {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Model response did not include JSON.");
  }
  return text.slice(start, end + 1);
}

function parseTriageResult(rawText: string): TriageResult {
  const jsonText = extractJsonCandidate(rawText);
  const parsed = JSON.parse(jsonText) as {
    severity?: string;
    category?: string;
    summary?: string;
    nextSteps?: string[];
  };

  return {
    severity: normalizeSeverity(parsed.severity ?? "P3"),
    category: (parsed.category ?? "Uncategorized").slice(0, 80),
    summary: (parsed.summary ?? "No summary provided.").slice(0, 1000),
    nextSteps:
      Array.isArray(parsed.nextSteps) && parsed.nextSteps.length > 0
        ? parsed.nextSteps.slice(0, 6).map((step) => step.slice(0, 200))
        : ["Review incident details and confirm owner."],
  };
}

async function extractOpenAIText(response: Response): Promise<string> {
  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string | Array<{ text?: string }> } }>;
    error?: { message?: string };
  };

  if (!response.ok) {
    const message = payload.error?.message ?? "OpenAI request failed.";
    throw new Error(message);
  }

  const content = payload.choices?.[0]?.message?.content;
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content.map((part) => part.text ?? "").join("\n");
  }

  throw new Error("OpenAI response did not include text content.");
}

async function extractGeminiText(response: Response): Promise<string> {
  const payload = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    error?: { message?: string };
  };

  if (!response.ok) {
    const message = payload.error?.message ?? "Gemini request failed.";
    throw new Error(message);
  }

  const parts = payload.candidates?.[0]?.content?.parts ?? [];
  const text = parts.map((part) => part.text ?? "").join("\n").trim();
  if (!text) {
    throw new Error("Gemini response did not include text content.");
  }

  return text;
}

async function extractAnthropicText(response: Response): Promise<string> {
  const payload = (await response.json()) as {
    content?: Array<{ type?: string; text?: string }>;
    error?: { message?: string };
  };

  if (!response.ok) {
    const message = payload.error?.message ?? "Anthropic request failed.";
    throw new Error(message);
  }

  const text =
    payload.content
      ?.filter((item) => item.type === "text")
      .map((item) => item.text ?? "")
      .join("\n")
      .trim() ?? "";

  if (!text) {
    throw new Error("Anthropic response did not include text content.");
  }

  return text;
}

async function generateWithOpenAI(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  return extractOpenAIText(response);
}

async function generateWithGemini(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }],
          },
        ],
        generationConfig: {
          temperature: 0,
        },
      }),
    },
  );

  return extractGeminiText(response);
}

async function generateWithAnthropic(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 700,
      temperature: 0,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  return extractAnthropicText(response);
}

async function runModel(
  provider: SupportedProvider,
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  if (provider === "OPENAI") {
    return generateWithOpenAI(apiKey, model, systemPrompt, userPrompt);
  }
  if (provider === "GEMINI") {
    return generateWithGemini(apiKey, model, systemPrompt, userPrompt);
  }
  return generateWithAnthropic(apiKey, model, systemPrompt, userPrompt);
}

export async function generateIncidentTriage(input: {
  provider: SupportedProvider;
  apiKey: string;
  model?: string;
  incidentTitle: string;
  incidentDescription: string;
  customerContext?: string;
}): Promise<TriageResult> {
  const model = input.model?.trim() || defaultModelForProvider(input.provider);
  const systemPrompt =
    "You are an AI incident operations analyst for an AI software company. Return strict JSON only.";

  const userPrompt = [
    "Classify this incident and return JSON with keys: severity (P1|P2|P3), category, summary, nextSteps (array of 3-6 concise actions).",
    "Use severity rules:",
    "- P1: customer harm, major trust/compliance risk, wide blast radius.",
    "- P2: significant user impact but workaround exists.",
    "- P3: limited impact or informational issue.",
    `Title: ${input.incidentTitle}`,
    `Description: ${input.incidentDescription}`,
    input.customerContext ? `Customer context: ${input.customerContext}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const raw = await runModel(
    input.provider,
    input.apiKey,
    model,
    systemPrompt,
    userPrompt,
  );

  return parseTriageResult(raw);
}

export async function generateCustomerUpdateDraft(input: {
  provider: SupportedProvider;
  apiKey: string;
  model?: string;
  incidentTitle: string;
  incidentStatus: string;
  incidentSummary?: string;
  recentTimeline: string[];
}): Promise<string> {
  const model = input.model?.trim() || defaultModelForProvider(input.provider);

  const systemPrompt =
    "You write concise, trustworthy customer incident updates. Be factual, avoid speculation, and do not expose internal-only details.";

  const userPrompt = [
    "Draft a customer update in under 140 words with this structure:",
    "1) Acknowledgement",
    "2) Current status",
    "3) Next step + expected timing",
    "Tone: calm, accountable, clear.",
    `Incident title: ${input.incidentTitle}`,
    `Status: ${input.incidentStatus}`,
    input.incidentSummary ? `Summary: ${input.incidentSummary}` : "",
    "Recent timeline:",
    ...input.recentTimeline.map((line) => `- ${line}`),
  ]
    .filter(Boolean)
    .join("\n");

  return runModel(input.provider, input.apiKey, model, systemPrompt, userPrompt);
}

async function assertOk(response: Response, fallbackMessage: string): Promise<void> {
  if (response.ok) {
    return;
  }

  let detail = "";
  try {
    detail = await response.text();
  } catch {
    detail = "";
  }

  throw new Error(
    detail ? `${fallbackMessage} ${detail.slice(0, 280)}` : fallbackMessage,
  );
}

export async function testProviderKey(input: {
  provider: SupportedProvider;
  apiKey: string;
}): Promise<{ success: boolean; message: string }> {
  try {
    if (input.provider === "OPENAI") {
      const response = await fetch("https://api.openai.com/v1/models", {
        headers: { Authorization: `Bearer ${input.apiKey}` },
      });
      await assertOk(response, "OpenAI key test failed.");
      return { success: true, message: "OpenAI key is valid." };
    }

    if (input.provider === "GEMINI") {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(input.apiKey)}`,
      );
      await assertOk(response, "Gemini key test failed.");
      return { success: true, message: "Gemini key is valid." };
    }

    const response = await fetch("https://api.anthropic.com/v1/models", {
      headers: {
        "x-api-key": input.apiKey,
        "anthropic-version": "2023-06-01",
      },
    });
    await assertOk(response, "Anthropic key test failed.");
    return { success: true, message: "Anthropic key is valid." };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Key test failed.",
    };
  }
}
