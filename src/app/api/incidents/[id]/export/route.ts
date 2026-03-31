import { NextRequest, NextResponse } from "next/server";
import PDFDocument from "pdfkit";
import { requireApiAuthAndRateLimit } from "@/lib/api-guard";
import { recordAuditForAccess } from "@/lib/audit";
import { notFound } from "@/lib/http";
import { prisma } from "@/lib/prisma";

async function renderIncidentPdf(input: {
  title: string;
  severity: string;
  status: string;
  category: string | null;
  createdAt: string;
  resolvedAt: string;
  summary: string | null;
  events: Array<{ type: string; body: string; at: string }>;
  statusUpdates: Array<{ body: string; at: string }>;
}): Promise<Buffer> {
  const doc = new PDFDocument({ margin: 48, size: "A4" });
  const chunks: Buffer[] = [];

  doc.on("data", (chunk) => chunks.push(chunk as Buffer));

  doc.fontSize(20).text("TrustLoop Incident Audit Report");
  doc.moveDown(0.8);
  doc.fontSize(12).text(`Title: ${input.title}`);
  doc.text(`Severity: ${input.severity}`);
  doc.text(`Status: ${input.status}`);
  doc.text(`Category: ${input.category ?? "N/A"}`);
  doc.text(`Created: ${input.createdAt}`);
  doc.text(`Resolved: ${input.resolvedAt || "N/A"}`);

  if (input.summary) {
    doc.moveDown(0.8);
    doc.fontSize(13).text("Summary");
    doc.fontSize(11).text(input.summary);
  }

  doc.moveDown(0.8);
  doc.fontSize(13).text("Timeline");
  doc.fontSize(10);
  for (const event of input.events) {
    doc.text(`[${event.at}] ${event.type}: ${event.body}`);
    doc.moveDown(0.2);
  }

  if (input.statusUpdates.length > 0) {
    doc.moveDown(0.8);
    doc.fontSize(13).text("Published Status Updates");
    doc.fontSize(10);
    for (const update of input.statusUpdates) {
      doc.text(`[${update.at}] ${update.body}`);
      doc.moveDown(0.2);
    }
  }

  doc.end();

  return await new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const access = await requireApiAuthAndRateLimit(request, { allowApiKey: true, requiredApiKeyScopes: ["incidents:read"] });
  if (access.response) {
    return access.response;
  }
  const auth = access.auth;
  const { id } = await params;

  const incident = await prisma.incident.findFirst({
    where: {
      id,
      workspaceId: auth.workspaceId,
    },
    include: {
      events: {
        orderBy: { createdAt: "asc" },
      },
      statusUpdates: {
        where: { isVisible: true },
        orderBy: { publishedAt: "asc" },
      },
    },
  });

  if (!incident) {
    return notFound("Incident not found.");
  }

  recordAuditForAccess({ access: access.auth, request, action: "incident.export_pdf", targetType: "incident", targetId: id, summary: `Exported incident ${id} as PDF` }).catch(() => {});

  const format = request.nextUrl.searchParams.get("format") ?? "pdf";
  if (format !== "pdf") {
    return NextResponse.json({ error: "Only format=pdf is supported." }, { status: 400 });
  }

  const buffer = await renderIncidentPdf({
    title: incident.title,
    severity: incident.severity,
    status: incident.status,
    category: incident.category,
    createdAt: incident.createdAt.toLocaleString(),
    resolvedAt: incident.resolvedAt?.toLocaleString() ?? "",
    summary: incident.summary,
    events: incident.events.map((event) => ({
      type: event.eventType,
      body: event.body,
      at: event.createdAt.toLocaleString(),
    })),
    statusUpdates: incident.statusUpdates.map((update) => ({
      body: update.body,
      at: update.publishedAt.toLocaleString(),
    })),
  });

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=\"incident-${incident.id}.pdf\"`,
    },
  });
}
