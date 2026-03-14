import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const schema = z.object({ email: z.string().email().max(255) });

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

  await prisma.statusPageSubscriber.upsert({
    where: { workspaceId_email: { workspaceId: workspace.id, email: parsed.data.email } },
    create: { workspaceId: workspace.id, email: parsed.data.email },
    update: {},
  });

  return NextResponse.json({ ok: true });
}
