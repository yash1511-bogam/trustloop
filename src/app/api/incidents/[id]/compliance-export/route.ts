import { NextRequest, NextResponse } from "next/server";
import { requireApiAuthAndRateLimit } from "@/lib/api-guard";
import { recordAuditForAccess } from "@/lib/audit";
import { buildEventHashChain } from "@/lib/compliance-hash";
import { featureGateError } from "@/lib/feature-gate";
import { isWorkspaceFeatureAllowed } from "@/lib/feature-gate-server";
import { forbidden, notFound } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const access = await requireApiAuthAndRateLimit(request, { allowApiKey: true });
  if (access.response) return access.response;
  const auth = access.auth;
  const { id } = await params;
  if (!(await isWorkspaceFeatureAllowed(auth.workspaceId, "compliance"))) {
    return NextResponse.json({ error: featureGateError("compliance") }, { status: 403 });
  }

  const workspace = await prisma.workspace.findUnique({
    where: { id: auth.workspaceId },
    select: { complianceMode: true },
  });
  if (!workspace?.complianceMode) {
    return forbidden();
  }

  const incident = await prisma.incident.findFirst({
    where: { id, workspaceId: auth.workspaceId },
    include: {
      events: { orderBy: { createdAt: "asc" } },
      statusUpdates: { orderBy: { publishedAt: "asc" } },
      owner: { select: { id: true, name: true, email: true } },
    },
  });
  if (!incident) return notFound("Incident not found.");

  recordAuditForAccess({ access: access.auth, request, action: "incident.compliance_export", targetType: "incident", targetId: id, summary: `Compliance export for incident ${id}` }).catch(() => {});

  const hashChain = buildEventHashChain(incident.events);
  const hashMap = new Map(hashChain.map((h) => [h.eventId, h]));

  const exportPayload = {
    exportedAt: new Date().toISOString(),
    workspaceId: auth.workspaceId,
    complianceMode: true,
    incident: {
      id: incident.id,
      title: incident.title,
      description: incident.description,
      status: incident.status,
      severity: incident.severity,
      category: incident.category,
      customerName: incident.customerName,
      customerEmail: incident.customerEmail,
      modelVersion: incident.modelVersion,
      summary: incident.summary,
      owner: incident.owner,
      createdAt: incident.createdAt.toISOString(),
      resolvedAt: incident.resolvedAt?.toISOString() ?? null,
      triagedAt: incident.triagedAt?.toISOString() ?? null,
    },
    events: incident.events.map((e) => ({
      id: e.id,
      eventType: e.eventType,
      body: e.body,
      actorUserId: e.actorUserId,
      createdAt: e.createdAt.toISOString(),
      integrityHash: hashMap.get(e.id)?.hash ?? null,
      previousHash: hashMap.get(e.id)?.previousHash ?? null,
    })),
    statusUpdates: incident.statusUpdates.map((u) => ({
      id: u.id,
      body: u.body,
      isVisible: u.isVisible,
      publishedAt: u.publishedAt.toISOString(),
      createdByUserId: u.createdByUserId,
    })),
    chainHead: hashChain.length > 0 ? hashChain[hashChain.length - 1].hash : null,
  };

  return new NextResponse(JSON.stringify(exportPayload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="compliance-${incident.id}.json"`,
    },
  });
}
