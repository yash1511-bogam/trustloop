import { NextResponse } from "next/server";

const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    name: "TrustLoop",
    version: "1.0.0",
    description: "AI incident operations platform — intake, triage, customer updates, and executive analytics.",
    url: base,
    supportedInterfaces: [
      {
        url: `${base}/api`,
        protocol: "rest",
        transport: "https",
      },
    ],
    capabilities: ["incident-management", "ai-triage", "customer-updates", "analytics"],
    skills: [
      { id: "create-incident", name: "Create Incident", description: "Create a new incident with title, description, and severity." },
      { id: "triage-incident", name: "AI Triage", description: "Run AI-assisted triage on an incident to classify severity and suggest next steps." },
      { id: "customer-update", name: "Customer Update", description: "Draft and publish customer-facing incident updates." },
      { id: "list-incidents", name: "List Incidents", description: "List and filter incidents by status, severity, and date range." },
    ],
  });
}
