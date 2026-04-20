import { NextResponse } from "next/server";

const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://trustloop.yashbogam.me";

const body = `# TrustLoop

> AI incident operations platform for software teams shipping customer-facing AI.

TrustLoop helps teams detect incidents, triage with AI, coordinate responders, publish customer updates, and keep leadership informed.

## Docs

- [Documentation](${base}/docs)
- [API Reference (OpenAPI)](${base}/api/docs)
- [Getting Started](${base}/docs/guides/getting-started)
- [Incident Operations](${base}/docs/guides/incident-operations)
- [Integrations & Ingestion](${base}/docs/guides/integrations-and-ingestion)
- [Identity & Access](${base}/docs/guides/identity-and-access)
- [Workspace Administration](${base}/docs/guides/workspace-administration)
- [Billing & Automation](${base}/docs/guides/billing-and-automation)

## Pages

- [Homepage](${base}/)
- [About](${base}/about)
- [Blog](${base}/blog)
- [Changelog](${base}/changelog)
- [Security](${base}/security)
- [Status](${base}/status)
- [Contact Sales](${base}/contact-sales)
- [Terms](${base}/terms)
- [Privacy](${base}/privacy)
- [DPA](${base}/dpa)

## API

- Health: ${base}/api/health
- OpenAPI spec: ${base}/api/docs
- Incidents: ${base}/api/incidents
- Webhooks: ${base}/api/webhooks/{provider}

## Discovery

- API Catalog: ${base}/.well-known/api-catalog
- Agent Card (A2A): ${base}/.well-known/agent-card.json
- MCP Server Card: ${base}/.well-known/mcp/server-card.json
- Agent Skills: ${base}/.well-known/agent-skills/index.json
`;

export async function GET(): Promise<NextResponse> {
  return new NextResponse(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
