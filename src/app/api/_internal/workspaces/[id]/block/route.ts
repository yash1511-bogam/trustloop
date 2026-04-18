import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { requireInternalApiAuth, requireRole } from "@/lib/internal-auth";
import { sendWorkspaceBlockedEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { redisSetJson } from "@/lib/redis";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const auth = await requireInternalApiAuth(request);
  if (!auth || !requireRole(auth, ["CEO"])) return NextResponse.json(null, { status: 404 });

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const reason = typeof body?.reason === "string" ? body.reason.trim() : "";
  if (!reason) return NextResponse.json({ error: "Reason is required" }, { status: 400 });

  const workspace = await prisma.workspace.findUnique({
    where: { id },
    select: { id: true, name: true, blockedAt: true },
  });
  if (!workspace) return NextResponse.json(null, { status: 404 });
  if (workspace.blockedAt) return NextResponse.json({ error: "Already blocked" }, { status: 409 });

  await prisma.workspace.update({
    where: { id },
    data: { blockedAt: new Date(), blockReason: reason, blockedByEmail: auth.user.email },
  });

  // Set Redis key so cached sessions are invalidated instantly
  await redisSetJson(`workspace:blocked:${id}`, true, 86400 * 30);

  // Notify workspace owners/managers
  const recipients = await prisma.user.findMany({
    where: { workspaceId: id, role: { in: [Role.OWNER, Role.MANAGER] } },
    select: { email: true },
  });
  for (const r of recipients) {
    await sendWorkspaceBlockedEmail({
      workspaceId: id, toEmail: r.email, workspaceName: workspace.name, reason,
    }).catch(() => {});
  }

  return NextResponse.json({ ok: true });
}
