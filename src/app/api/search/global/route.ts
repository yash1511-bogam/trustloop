import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { requireApiAuthAndRateLimit } from "@/lib/api-guard";
import { recordAuditForAccess } from "@/lib/audit";
import { badRequest } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const searchSchema = z.object({
  q: z.string().min(1).max(200),
  limit: z.coerce.number().int().min(1).max(20).default(10),
});

type IncidentSearchResult = {
  id: string;
  title: string;
  severity: string;
  status: string;
  updatedAt: Date;
};

export async function GET(request: NextRequest): Promise<NextResponse> {
  const access = await requireApiAuthAndRateLimit(request, { allowApiKey: true });
  if (access.response) return access.response;
  const auth = access.auth;

  const params = Object.fromEntries(request.nextUrl.searchParams.entries());
  const parsed = searchSchema.safeParse(params);
  if (!parsed.success) return badRequest("Invalid search query.");

  recordAuditForAccess({ access: access.auth, request, action: "search.global", targetType: "search", summary: `Global search: "${parsed.data.q}"` }).catch(() => {});

  const query = parsed.data.q.trim();
  const limit = parsed.data.limit;

  // Search incidents via full-text search
  let incidents: IncidentSearchResult[] = [];
  try {
    incidents = await prisma.$queryRaw<IncidentSearchResult[]>(Prisma.sql`
      SELECT i."id", i."title", i."severity"::text, i."status"::text, i."updatedAt"
      FROM "Incident" i
      WHERE i."workspaceId" = ${auth.workspaceId}
        AND i."search_vector" @@ websearch_to_tsquery('english', ${query})
      ORDER BY ts_rank(i."search_vector", websearch_to_tsquery('english', ${query})) DESC
      LIMIT ${limit}
    `);
  } catch {
    // Fallback to ILIKE if full-text search fails
    incidents = await prisma.incident.findMany({
      where: {
        workspaceId: auth.workspaceId,
        OR: [
          { title: { contains: query, mode: "insensitive" } },
          { description: { contains: query, mode: "insensitive" } },
        ],
      },
      select: { id: true, title: true, severity: true, status: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: limit,
    });
  }

  // Search docs via the Fumadocs search API (internal fetch)
  let docs: Array<{ title: string; url: string }> = [];
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const docsRes = await fetch(`${appUrl}/api/search?query=${encodeURIComponent(query)}`, {
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(3000),
    });
    if (docsRes.ok) {
      const docsData = (await docsRes.json()) as Array<{ content: string; url: string }>;
      docs = docsData.slice(0, 5).map((d) => ({
        title: d.content?.slice(0, 120) ?? d.url,
        url: d.url,
      }));
    }
  } catch {
    // Docs search is best-effort
  }

  return NextResponse.json({
    incidents: incidents.map((i) => ({
      id: i.id,
      title: i.title,
      severity: i.severity,
      status: i.status,
      updatedAt: i.updatedAt,
      type: "incident" as const,
    })),
    docs,
  });
}
