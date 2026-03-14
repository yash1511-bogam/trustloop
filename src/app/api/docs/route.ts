import { NextResponse } from "next/server";

const spec = {
  openapi: "3.0.3",
  info: {
    title: "TrustLoop API",
    version: "1.0.0",
    description: "Incident operations platform for AI software companies. Manage incidents, triage with AI, send customer updates, and monitor compliance.",
  },
  servers: [{ url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000" }],
  security: [{ BearerAuth: [] }],
  components: {
    securitySchemes: {
      BearerAuth: { type: "http", scheme: "bearer", description: "Workspace API key (sk-tl-...)" },
    },
    schemas: {
      Incident: {
        type: "object",
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          description: { type: "string" },
          status: { type: "string", enum: ["NEW", "INVESTIGATING", "MITIGATED", "RESOLVED"] },
          severity: { type: "string", enum: ["P1", "P2", "P3"] },
          category: { type: "string", enum: ["HALLUCINATION", "BIAS", "DATA_DRIFT", "MODEL_DEGRADATION", "PROMPT_INJECTION", "ADVERSARIAL_INPUT", "OUTPUT_FILTER_FAILURE", "LATENCY", "AVAILABILITY", "DATA_PRIVACY", "COMPLIANCE", "OTHER"] },
          ownerUserId: { type: "string", nullable: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      TriageResult: {
        type: "object",
        properties: {
          severity: { type: "string", enum: ["P1", "P2", "P3"] },
          category: { type: "string" },
          summary: { type: "string" },
          nextSteps: { type: "array", items: { type: "string" } },
        },
      },
      Error: {
        type: "object",
        properties: { error: { type: "string" } },
      },
    },
  },
  paths: {
    "/api/incidents": {
      get: {
        tags: ["Incidents"],
        summary: "List incidents",
        parameters: [
          { name: "status", in: "query", schema: { type: "string" } },
          { name: "severity", in: "query", schema: { type: "string" } },
          { name: "cursor", in: "query", schema: { type: "string" } },
          { name: "limit", in: "query", schema: { type: "integer", default: 25 } },
        ],
        responses: { "200": { description: "Paginated incident list" } },
      },
      post: {
        tags: ["Incidents"],
        summary: "Create incident",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["title", "description"],
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  severity: { type: "string", enum: ["P1", "P2", "P3"] },
                  customerName: { type: "string" },
                  customerEmail: { type: "string" },
                },
              },
            },
          },
        },
        responses: { "201": { description: "Incident created" } },
      },
    },
    "/api/incidents/{id}": {
      get: { tags: ["Incidents"], summary: "Get incident", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Incident detail" } } },
      patch: { tags: ["Incidents"], summary: "Update incident", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Incident updated" } } },
    },
    "/api/incidents/{id}/triage": {
      post: { tags: ["AI Triage"], summary: "Run AI triage on incident", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Triage result" } } },
    },
    "/api/incidents/{id}/customer-update": {
      post: { tags: ["Customer Updates"], summary: "Create/manage customer update", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Customer update processed" } } },
    },
    "/api/incidents/{id}/post-mortem": {
      post: { tags: ["Post-Mortems"], summary: "Generate AI post-mortem", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "201": { description: "Post-mortem generated" } } },
      patch: { tags: ["Post-Mortems"], summary: "Update post-mortem", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Post-mortem updated" } } },
      get: { tags: ["Post-Mortems"], summary: "Get post-mortem", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Post-mortem detail" } } },
    },
    "/api/webhooks/datadog": { post: { tags: ["Webhooks"], summary: "Datadog webhook intake", responses: { "200": { description: "Incident created from Datadog" } } } },
    "/api/webhooks/pagerduty": { post: { tags: ["Webhooks"], summary: "PagerDuty webhook intake", responses: { "200": { description: "Incident created from PagerDuty" } } } },
    "/api/webhooks/sentry": { post: { tags: ["Webhooks"], summary: "Sentry webhook intake", responses: { "200": { description: "Incident created from Sentry" } } } },
    "/api/webhooks/langfuse": { post: { tags: ["Webhooks"], summary: "Langfuse webhook intake", responses: { "200": { description: "Incident created from Langfuse" } } } },
    "/api/webhooks/helicone": { post: { tags: ["Webhooks"], summary: "Helicone webhook intake", responses: { "200": { description: "Incident created from Helicone" } } } },
    "/api/webhooks/generic": { post: { tags: ["Webhooks"], summary: "Generic webhook intake", responses: { "200": { description: "Incident created from generic webhook" } } } },
    "/api/workspace/api-keys": {
      get: { tags: ["API Keys"], summary: "List workspace API keys", responses: { "200": { description: "API key list" } } },
      post: { tags: ["API Keys"], summary: "Create workspace API key", responses: { "201": { description: "API key created (shown once)" } } },
    },
    "/api/health": { get: { tags: ["System"], summary: "Health check", security: [], responses: { "200": { description: "Service healthy" } } } },
  },
};

export async function GET(): Promise<NextResponse> {
  return NextResponse.json(spec, {
    headers: { "Access-Control-Allow-Origin": "*" },
  });
}
