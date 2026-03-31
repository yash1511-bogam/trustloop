import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { hasRole } from "@/lib/auth";
import { requireApiAuthAndRateLimit } from "@/lib/api-guard";
import { recordAuditForAccess } from "@/lib/audit";
import { forbidden } from "@/lib/http";
import { prisma } from "@/lib/prisma";

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  const text = String(value);
  const escaped = text.replace(/"/g, '""');
  return /[",\n]/.test(escaped) ? `"${escaped}"` : escaped;
}

function toDate(value: string | null): Date | null {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const access = await requireApiAuthAndRateLimit(request);
  if (access.response) {
    return access.response;
  }
  const auth = access.auth;
  if (auth.kind !== "session") {
    return forbidden();
  }
  if (!hasRole({ user: auth.user }, [Role.OWNER, Role.MANAGER])) {
    return forbidden();
  }

  recordAuditForAccess({ access: access.auth, request, action: "incidents.export", targetType: "incident", summary: "Exported incidents CSV" }).catch(() => {});

  const format = request.nextUrl.searchParams.get("format") ?? "csv";
  if (format !== "csv") {
    return NextResponse.json({ error: "Only format=csv is currently supported." }, { status: 400 });
  }

  const fromDate = toDate(request.nextUrl.searchParams.get("from"));
  const toDateValue = toDate(request.nextUrl.searchParams.get("to"));
  const toExclusive = toDateValue ? new Date(toDateValue.getTime() + 24 * 60 * 60 * 1000) : null;

  const where = {
    workspaceId: auth.workspaceId,
    createdAt: {
      gte: fromDate ?? undefined,
      lt: toExclusive ?? undefined,
    },
  };

  const rows: string[] = [];
  rows.push(
    [
      "incident_id",
      "title",
      "severity",
      "status",
      "category",
      "owner_name",
      "owner_email",
      "created_at",
      "resolved_at",
      "event_type",
      "event_body",
      "event_created_at",
      "status_update_body",
      "status_update_published_at",
      "email_type",
      "email_to",
      "email_status",
      "email_created_at",
    ]
      .map(csvEscape)
      .join(","),
  );

  const BATCH = 500;
  let cursor: string | undefined;

  for (;;) {
    const batch = await prisma.incident.findMany({
      where,
      include: {
        events: { orderBy: { createdAt: "asc" } },
        statusUpdates: { orderBy: { publishedAt: "asc" } },
        emailNotifications: { orderBy: { createdAt: "asc" } },
        owner: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: BATCH,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });

    if (batch.length === 0) break;
    cursor = batch[batch.length - 1].id;

    for (const incident of batch) {
    const maxRows = Math.max(
      incident.events.length,
      incident.statusUpdates.length,
      incident.emailNotifications.length,
      1,
    );

    for (let i = 0; i < maxRows; i += 1) {
      const event = incident.events[i];
      const statusUpdate = incident.statusUpdates[i];
      const email = incident.emailNotifications[i];

      rows.push(
        [
          incident.id,
          incident.title,
          incident.severity,
          incident.status,
          incident.category ?? "",
          incident.owner?.name ?? "",
          incident.owner?.email ?? "",
          incident.createdAt.toISOString(),
          incident.resolvedAt?.toISOString() ?? "",
          event?.eventType ?? "",
          event?.body ?? "",
          event?.createdAt.toISOString() ?? "",
          statusUpdate?.body ?? "",
          statusUpdate?.publishedAt.toISOString() ?? "",
          email?.type ?? "",
          email?.toEmail ?? "",
          email?.status ?? "",
          email?.createdAt.toISOString() ?? "",
        ]
          .map(csvEscape)
          .join(","),
      );
    }
    }

    if (batch.length < BATCH) break;
  }

  return new NextResponse(rows.join("\n"), {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename=\"trustloop-incidents-${new Date().toISOString().slice(0, 10)}.csv\"`,
    },
  });
}
