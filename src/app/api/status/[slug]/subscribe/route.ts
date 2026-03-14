import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { recordAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { verifyTurnstileToken } from "@/lib/turnstile";

const schema = z.object({
  email: z.string().email().max(255),
  turnstileToken: z.string().min(1).optional().nullable(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
): Promise<NextResponse> {
  const { slug } = await params;
  const workspace = await prisma.workspace.findFirst({
    where: { slug, statusPageEnabled: true },
    select: { id: true },
  });
  if (!workspace) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  const turnstile = await verifyTurnstileToken({
    request,
    token: parsed.data.turnstileToken,
  });
  if (!turnstile.success) {
    return NextResponse.json({ error: "Security verification failed." }, { status: 403 });
  }

  await prisma.statusPageSubscriber.upsert({
    where: { workspaceId_email: { workspaceId: workspace.id, email: parsed.data.email } },
    create: { workspaceId: workspace.id, email: parsed.data.email },
    update: {},
  });

  recordAuditLog({ workspaceId: workspace.id, action: "status.subscribe", targetType: "status_page", summary: `Status page subscription for ${parsed.data.email}` }).catch(() => {});

  return NextResponse.json({ ok: true });
}
