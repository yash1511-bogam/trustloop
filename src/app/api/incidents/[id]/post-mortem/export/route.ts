import { NextRequest, NextResponse } from "next/server";
import PDFDocument from "pdfkit";
import { requireApiAuthAndRateLimit } from "@/lib/api-guard";
import { notFound } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const access = await requireApiAuthAndRateLimit(request, { allowApiKey: true });
  if (access.response) return access.response;
  const auth = access.auth;
  const { id } = await params;

  const postMortem = await prisma.postMortem.findFirst({
    where: { incidentId: id, incident: { workspaceId: auth.workspaceId } },
    include: {
      author: { select: { name: true, email: true } },
      incident: {
        select: { title: true, severity: true, status: true, createdAt: true, resolvedAt: true },
      },
    },
  });

  if (!postMortem) return notFound("Post-mortem not found.");

  const doc = new PDFDocument({ margin: 48, size: "A4" });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk) => chunks.push(chunk as Buffer));

  doc.fontSize(20).text("TrustLoop Post-Mortem Report");
  doc.moveDown(0.8);
  doc.fontSize(12).text(`Title: ${postMortem.title}`);
  doc.text(`Incident: ${postMortem.incident.title}`);
  doc.text(`Severity: ${postMortem.incident.severity}`);
  doc.text(`Status: ${postMortem.status}`);
  doc.text(`Author: ${postMortem.author?.name ?? postMortem.author?.email ?? "N/A"}`);
  doc.text(`Created: ${postMortem.createdAt.toLocaleString()}`);
  if (postMortem.publishedAt) doc.text(`Published: ${postMortem.publishedAt.toLocaleString()}`);

  doc.moveDown(0.8);
  doc.fontSize(13).text("Post-Mortem Body");
  doc.fontSize(10).text(postMortem.body);

  doc.end();

  const buffer = await new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="post-mortem-${id}.pdf"`,
    },
  });
}
