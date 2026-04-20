import { NextResponse } from "next/server";

const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    {
      linkset: [
        {
          anchor: `${base}/api`,
          "service-desc": [{ href: `${base}/api/docs`, type: "application/openapi+json" }],
          "service-doc": [{ href: `${base}/docs`, type: "text/html" }],
          status: [{ href: `${base}/api/health`, type: "application/json" }],
        },
      ],
    },
    {
      headers: { "Content-Type": "application/linkset+json" },
    },
  );
}
