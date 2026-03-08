import { NextRequest, NextResponse } from "next/server";
import {
  AIIncidentCategory,
  IncidentChannel,
  IncidentSeverity,
  IncidentStatus,
  Prisma,
} from "@prisma/client";
import { z } from "zod";
import { requireApiAuthAndRateLimit } from "@/lib/api-guard";
import { badRequest, quotaExceeded } from "@/lib/http";
import { createIncidentRecord } from "@/lib/incident-service";
import { consumeWorkspaceQuota, enforceWorkspaceQuota } from "@/lib/policy";
import { prisma } from "@/lib/prisma";
import { refreshWorkspaceReadModels } from "@/lib/read-models";

const createIncidentSchema = z.object({
  title: z.string().min(3).max(180),
  description: z.string().min(8).max(5000),
  customerName: z.string().max(120).optional().nullable(),
  customerEmail: z.email().max(160).optional().nullable(),
  channel: z.nativeEnum(IncidentChannel).optional(),
  severity: z.nativeEnum(IncidentSeverity).optional(),
  category: z.nativeEnum(AIIncidentCategory).optional().nullable(),
  modelVersion: z.string().max(100).optional().nullable(),
  sourceTicketRef: z.string().max(120).optional().nullable(),
});

const querySchema = z.object({
  status: z.nativeEnum(IncidentStatus).optional(),
  severity: z.nativeEnum(IncidentSeverity).optional(),
  category: z.nativeEnum(AIIncidentCategory).optional(),
  owner: z.string().optional(),
  q: z.string().max(200).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

type CursorShape = {
  updatedAt: string;
  id: string;
};

function encodeCursor(payload: CursorShape): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function decodeCursor(raw: string | undefined): { updatedAt: Date; id: string } | null {
  if (!raw) {
    return null;
  }

  try {
    const decoded = JSON.parse(
      Buffer.from(raw, "base64url").toString("utf8"),
    ) as CursorShape;
    if (!decoded.id || !decoded.updatedAt) {
      return null;
    }
    const updatedAt = new Date(decoded.updatedAt);
    if (Number.isNaN(updatedAt.getTime())) {
      return null;
    }
    return {
      id: decoded.id,
      updatedAt,
    };
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const access = await requireApiAuthAndRateLimit(request, { allowApiKey: true });
  if (access.response) {
    return access.response;
  }
  const auth = access.auth;

  const searchParams = Object.fromEntries(request.nextUrl.searchParams.entries());
  const parsedQuery = querySchema.safeParse(searchParams);
  if (!parsedQuery.success) {
    return badRequest("Invalid incident query parameters.");
  }

  const cursor = decodeCursor(parsedQuery.data.cursor);
  if (parsedQuery.data.cursor && !cursor) {
    return badRequest("Invalid cursor.");
  }

  const workspaceId = auth.workspaceId;
  const where: Prisma.IncidentWhereInput = {
    workspaceId,
    status: parsedQuery.data.status,
    severity: parsedQuery.data.severity,
    category: parsedQuery.data.category,
    ownerUserId: parsedQuery.data.owner ?? undefined,
  };

  const andClauses: Prisma.IncidentWhereInput[] = [];
  if (parsedQuery.data.q) {
    andClauses.push({
      OR: [
        {
          title: { contains: parsedQuery.data.q, mode: "insensitive" },
        },
        {
          description: {
            contains: parsedQuery.data.q,
            mode: "insensitive",
          },
        },
        {
          sourceTicketRef: {
            contains: parsedQuery.data.q,
            mode: "insensitive",
          },
        },
      ],
    });
  }

  if (cursor) {
    andClauses.push({
      OR: [
        { updatedAt: { lt: cursor.updatedAt } },
        {
          AND: [{ updatedAt: cursor.updatedAt }, { id: { lt: cursor.id } }],
        },
      ],
    });
  }

  if (andClauses.length > 0) {
    where.AND = andClauses;
  }

  const incidents = await prisma.incident.findMany({
    where,
    include: {
      owner: {
        select: { id: true, name: true, email: true },
      },
      _count: {
        select: { events: true },
      },
    },
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    take: parsedQuery.data.limit + 1,
  });

  const page = incidents.slice(0, parsedQuery.data.limit);
  const nextItem = incidents.at(parsedQuery.data.limit);
  const nextCursor = nextItem
    ? encodeCursor({
        updatedAt: nextItem.updatedAt.toISOString(),
        id: nextItem.id,
      })
    : null;

  const members = await prisma.user.findMany({
    where: { workspaceId },
    select: { id: true, name: true, role: true },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });

  return NextResponse.json({
    incidents: page,
    nextCursor,
    members,
  });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const access = await requireApiAuthAndRateLimit(request, { allowApiKey: true });
  if (access.response) {
    return access.response;
  }
  const auth = access.auth;

  const body = await request.json().catch(() => null);
  const parsed = createIncidentSchema.safeParse(body);

  if (!parsed.success) {
    return badRequest("Invalid incident payload.");
  }

  const quota = await enforceWorkspaceQuota(auth.workspaceId, "incidents");
  if (!quota.allowed) {
    return quotaExceeded(
      `Daily incident creation quota reached (${quota.limit}/day).`,
    );
  }

  const incident = await prisma.$transaction(async (tx) =>
    createIncidentRecord(
      {
        workspaceId: auth.workspaceId,
        actorUserId: auth.actorUserId,
        title: parsed.data.title,
        description: parsed.data.description,
        customerName: parsed.data.customerName,
        customerEmail: parsed.data.customerEmail,
        channel: parsed.data.channel ?? IncidentChannel.EMAIL,
        severity: parsed.data.severity ?? IncidentSeverity.P3,
        category: parsed.data.category ?? null,
        modelVersion: parsed.data.modelVersion,
        sourceTicketRef: parsed.data.sourceTicketRef,
        ownerUserId: auth.kind === "session" ? auth.actorUserId : undefined,
        sourceLabel: auth.kind === "api_key" ? `API key ${auth.apiKey.name}` : "web",
      },
      tx,
    ),
  );

  await consumeWorkspaceQuota(auth.workspaceId, "incidents", 1);
  await refreshWorkspaceReadModels(auth.workspaceId);

  return NextResponse.json({ incident }, { status: 201 });
}
