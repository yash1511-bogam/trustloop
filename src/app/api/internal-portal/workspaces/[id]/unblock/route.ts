import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { requireInternalApiAuth, requireRole } from "@/lib/internal-auth";
import { sendWorkspaceUnblockedEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { redisDelete } from "@/lib/redis";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const auth = await requireInternalApiAuth(request);
  if (!auth || !requireRole(auth, ["CEO"])) return NextResponse.json(null, { status: 404 });

  const { id } = await params;
  const workspace = await prisma.workspace.findUnique({
    where: { id },
    select: { id: true, name: true, blockedAt: true },
  });
  if (!workspace) return NextResponse.json(null, { status: 404 });
  if (!workspace.blockedAt) return NextResponse.json({ error: "Not blocked" }, { status: 409 });

  await prisma.workspace.update({
    where: { id },
    data: { blockedAt: null, blockReason: null, blockedByEmail: null },
  });

  await redisDelete(`workspace:blocked:${id}`);

  const recipients = await prisma.user.findMany({
    where: { workspaceId: id, role: { in: [Role.OWNER, Role.MANAGER] } },
    select: { email: true },
  });
  for (const r of recipients) {
    await sendWorkspaceUnblockedEmail({
      workspaceId: id, toEmail: r.email, workspaceName: workspace.name,
    }).catch(() => {});
  }

  return NextResponse.json({ ok: true });
}
