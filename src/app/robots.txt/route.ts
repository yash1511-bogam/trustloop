import { NextResponse } from "next/server";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://trustloop.yashbogam.me";

export async function GET(): Promise<NextResponse> {
  const body = `User-agent: *
Content-Signal: search=yes, ai-train=no, ai-input=no
Allow: /
Allow: /login
Allow: /register
Allow: /forgot-access
Disallow: /api/
Disallow: /dashboard
Disallow: /workspace
Disallow: /account
Disallow: /integrations
Disallow: /security
Disallow: /analytics
Disallow: /incidents/
Disallow: /internal-portal

Host: ${appUrl}
Sitemap: ${appUrl}/sitemap.xml
`;

  return new NextResponse(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
