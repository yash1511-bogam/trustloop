import { NextRequest, NextResponse } from "next/server";
import {
  AIIncidentCategory,
  IncidentChannel,
  IncidentSeverity,
  IncidentStatus,
  Prisma,
} from "@prisma/client";
import { z } from "zod";
import { recordAuditForAccess } from "@/lib/audit";
import { requireApiAuthAndRateLimit, withRateLimitHeaders } from "@/lib/api-guard";
import { badRequest, quotaExceeded } from "@/lib/http";
import { createIncidentRecord } from "@/lib/incident-service";
import {
  applyTemplateToIncidentInput,
  findPotentialDuplicateIncident,
  loadIncidentTemplate,
  normalizeTagNames,
} from "@/lib/incident-metadata";
import { enforceWorkspaceQuota } from "@/lib/policy";
import { prisma } from "@/lib/prisma";
import { refreshWorkspaceReadModels } from "@/lib/read-models";
import { notifyIncidentPush } from "@/lib/incident-push";
import { dispatchOutboundWebhookEvent } from "@/lib/outbound-webhooks";

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
  templateId: z.string().min(10).max(64).optional().nullable(),
  tagNames: z.array(z.string().max(40)).max(20).optional().default([]),
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

type IncidentListItem = Prisma.IncidentGetPayload<{
  include: {
    owner: {
      select: {
        id: true;
        name: true;
        email: true;
      };
    };
    _count: {
      select: {
        events: true;
      };
    };
  };
}>;

type IncidentSearchRow = {
  id: string;
  updatedAt: Date;
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

async function fetchIncidentPage(
  where: Prisma.IncidentWhereInput,
  limit: number,
): Promise<{
  page: IncidentListItem[];
  nextCursor: string | null;
}> {
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
    take: limit + 1,
  });

  const page = incidents.slice(0, limit);
  const nextItem = incidents.at(limit);
  const nextCursor = nextItem
    ? encodeCursor({
        updatedAt: nextItem.updatedAt.toISOString(),
        id: nextItem.id,
      })
    : null;

  return {
    page,
    nextCursor,
  };
}

async function searchIncidentIdsWithFullText(input: {
  workspaceId: string;
  query: string;
  status?: IncidentStatus;
  severity?: IncidentSeverity;
  category?: AIIncidentCategory;
  ownerUserId?: string;
  cursor: { updatedAt: Date; id: string } | null;
  limit: number;
}): Promise<IncidentSearchRow[]> {
  const conditions: Prisma.Sql[] = [
    Prisma.sql`i."workspaceId" = ${input.workspaceId}`,
    Prisma.sql`i."search_vector" @@ websearch_to_tsquery('english', ${input.query})`,
  ];

  if (input.status) {
    conditions.push(Prisma.sql`i."status"::text = ${input.status}`);
  }
  if (input.severity) {
    conditions.push(Prisma.sql`i."severity"::text = ${input.severity}`);
  }
  if (input.category) {
    conditions.push(Prisma.sql`i."category"::text = ${input.category}`);
  }
  if (input.ownerUserId) {
    conditions.push(Prisma.sql`i."ownerUserId" = ${input.ownerUserId}`);
  }
  if (input.cursor) {
    conditions.push(
      Prisma.sql`(i."updatedAt" < ${input.cursor.updatedAt} OR (i."updatedAt" = ${input.cursor.updatedAt} AND i."id" < ${input.cursor.id}))`,
    );
  }

  return prisma.$queryRaw<IncidentSearchRow[]>(Prisma.sql`
    SELECT i."id", i."updatedAt"
    FROM "Incident" i
    WHERE ${Prisma.join(conditions, " AND ")}
    ORDER BY i."updatedAt" DESC, i."id" DESC
    LIMIT ${input.limit}
  `);
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const access = await requireApiAuthAndRateLimit(request, {
    allowApiKey: true,
    requiredApiKeyScopes: ["incidents:read"],
  });
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
  const queryTerm = parsedQuery.data.q?.trim();

  const where: Prisma.IncidentWhereInput = {
    workspaceId,
    status: parsedQuery.data.status,
    severity: parsedQuery.data.severity,
    category: parsedQuery.data.category,
    ownerUserId: parsedQuery.data.owner ?? undefined,
  };

  const andClauses: Prisma.IncidentWhereInput[] = [];

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

  let page: IncidentListItem[] = [];
  let nextCursor: string | null = null;

  if (queryTerm) {
    try {
      const rows = await searchIncidentIdsWithFullText({
        workspaceId,
        query: queryTerm,
        status: parsedQuery.data.status,
        severity: parsedQuery.data.severity,
        category: parsedQuery.data.category,
        ownerUserId: parsedQuery.data.owner,
        cursor,
        limit: parsedQuery.data.limit + 1,
      });

      const pageRows = rows.slice(0, parsedQuery.data.limit);
      const nextItem = rows.at(parsedQuery.data.limit);
      nextCursor = nextItem
        ? encodeCursor({
            updatedAt: new Date(nextItem.updatedAt).toISOString(),
            id: nextItem.id,
          })
        : null;

      if (pageRows.length > 0) {
        const idsInOrder = pageRows.map((row) => row.id);
        const incidents = await prisma.incident.findMany({
          where: {
            workspaceId,
            id: {
              in: idsInOrder,
            },
          },
          include: {
            owner: {
              select: { id: true, name: true, email: true },
            },
            _count: {
              select: { events: true },
            },
          },
        });

        const byId = new Map(incidents.map((item) => [item.id, item]));
        page = idsInOrder
          .map((id) => byId.get(id))
          .filter((item): item is IncidentListItem => Boolean(item));
      }
    } catch {
      const fallbackWhere: Prisma.IncidentWhereInput = {
        ...where,
        AND: [
          ...andClauses,
          {
            OR: [
              {
                title: { contains: queryTerm, mode: "insensitive" },
              },
              {
                description: {
                  contains: queryTerm,
                  mode: "insensitive",
                },
              },
              {
                sourceTicketRef: {
                  contains: queryTerm,
                  mode: "insensitive",
                },
              },
            ],
          },
        ],
      };

      const result = await fetchIncidentPage(fallbackWhere, parsedQuery.data.limit);
      page = result.page;
      nextCursor = result.nextCursor;
    }
  } else {
    const result = await fetchIncidentPage(where, parsedQuery.data.limit);
    page = result.page;
    nextCursor = result.nextCursor;
  }

  const members = await prisma.user.findMany({
    where: { workspaceId },
    select: { id: true, name: true, role: true },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });

  return withRateLimitHeaders(
    NextResponse.json({
      incidents: page,
      nextCursor,
      members,
    }),
    access.rateLimit,
  );
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const access = await requireApiAuthAndRateLimit(request, {
    allowApiKey: true,
    requiredApiKeyScopes: ["incidents:write"],
  });
  if (access.response) {
    return access.response;
  }
  const auth = access.auth;

  const body = await request.json().catch(() => null);
  const parsed = createIncidentSchema.safeParse(body);

  if (!parsed.success) {
    return badRequest("Invalid incident payload.");
  }

  const template = await loadIncidentTemplate(auth.workspaceId, parsed.data.templateId);
  const templatedInput = applyTemplateToIncidentInput(template, {
    title: parsed.data.title,
    description: parsed.data.description,
    severity: parsed.data.severity ?? IncidentSeverity.P3,
    category: parsed.data.category ?? null,
    channel: parsed.data.channel ?? IncidentChannel.EMAIL,
    modelVersion: parsed.data.modelVersion,
    tagNames: normalizeTagNames(parsed.data.tagNames),
  });

  const duplicate = await findPotentialDuplicateIncident({
    workspaceId: auth.workspaceId,
    title: templatedInput.title ?? parsed.data.title,
    customerEmail: parsed.data.customerEmail,
    modelVersion: templatedInput.modelVersion,
    sourceTicketRef: parsed.data.sourceTicketRef,
  });
  if (duplicate) {
    return NextResponse.json(
      {
        error: "A matching open incident already exists.",
        duplicateIncidentId: duplicate.id,
      },
      { status: 409 },
    );
  }

  const quota = await enforceWorkspaceQuota(auth.workspaceId, "incidents");
  if (!quota.allowed) {
    return quotaExceeded(
      `Daily incident creation quota reached (${quota.limit}/day).`,
    );
  }

  let incident;
  try {
    incident = await prisma.$transaction(async (tx) =>
      createIncidentRecord(
        {
          workspaceId: auth.workspaceId,
          actorUserId: auth.actorUserId,
          title: templatedInput.title ?? parsed.data.title,
          description: templatedInput.description ?? parsed.data.description,
          customerName: parsed.data.customerName,
          customerEmail: parsed.data.customerEmail,
          channel: templatedInput.channel ?? IncidentChannel.EMAIL,
          severity: templatedInput.severity ?? IncidentSeverity.P3,
          category: templatedInput.category ?? null,
          modelVersion: templatedInput.modelVersion,
          sourceTicketRef: parsed.data.sourceTicketRef,
          templateId: template?.id ?? null,
          tagNames: templatedInput.tagNames,
          ownerUserId: auth.kind === "session" ? auth.actorUserId : undefined,
          sourceLabel: auth.kind === "api_key" ? `API key ${auth.apiKey.name}` : "web",
        },
        tx,
      ),
    );
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { error: "A matching open incident already exists." },
        { status: 409 },
      );
    }
    throw error;
  }

  await refreshWorkspaceReadModels(auth.workspaceId);
  await recordAuditForAccess({
    access: auth,
    request,
    action: "incident.created",
    targetType: "incident",
    targetId: incident.id,
    summary: `Created incident ${incident.title}.`,
    metadata: {
      templateId: template?.id ?? null,
      tagNames: templatedInput.tagNames,
      severity: incident.severity,
      category: incident.category,
    },
  });

  notifyIncidentPush({
    workspaceId: auth.workspaceId,
    incidentId: incident.id,
    incidentTitle: incident.title,
    event: "created",
    severity: incident.severity,
  });

  await dispatchOutboundWebhookEvent({
    workspaceId: auth.workspaceId,
    eventType: "incident.created",
    incidentId: incident.id,
    payload: {
      incident,
    },
  });

  return withRateLimitHeaders(
    NextResponse.json({ incident }, { status: 201 }),
    access.rateLimit,
  );
}
