import { NextResponse } from "next/server";

const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    $schema: "https://schemas.agentskills.io/discovery/0.2.0/schema.json",
    skills: [
      {
        name: "incident-management",
        type: "skill-md",
        description: "Create, update, and list incidents via the TrustLoop API.",
        url: `${base}/.well-known/agent-skills/incident-management/SKILL.md`,
        digest: "sha256:placeholder",
      },
      {
        name: "ai-triage",
        type: "skill-md",
        description: "Run AI-assisted triage on incidents to classify severity and recommend next steps.",
        url: `${base}/.well-known/agent-skills/ai-triage/SKILL.md`,
        digest: "sha256:placeholder",
      },
      {
        name: "customer-updates",
        type: "skill-md",
        description: "Draft and publish customer-facing incident status updates.",
        url: `${base}/.well-known/agent-skills/customer-updates/SKILL.md`,
        digest: "sha256:placeholder",
      },
    ],
  });
}
