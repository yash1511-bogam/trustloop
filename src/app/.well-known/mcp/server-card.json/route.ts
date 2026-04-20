import { NextResponse } from "next/server";

const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    serverInfo: {
      name: "TrustLoop",
      version: "1.0.0",
    },
    endpoint: `${base}/mcp`,
    transport: "streamable-http",
    capabilities: {
      tools: true,
      resources: true,
      prompts: false,
    },
  });
}
