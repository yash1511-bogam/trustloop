import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { requireApiAuthAndRateLimit } from "@/lib/api-guard";
import { recordAuditForAccess } from "@/lib/audit";
import { featureGateError } from "@/lib/feature-gate";
import { isWorkspaceFeatureAllowed } from "@/lib/feature-gate-server";
import { forbidden } from "@/lib/http";
import { prisma } from "@/lib/prisma";

function onCallIndex(anchorAt: Date, intervalHours: number, poolSize: number): number {
  if (poolSize <= 1) return 0;
  const intervalMs = Math.max(1, Math.floor(intervalHours)) * 3_600_000;
  const elapsed = Date.now() - anchorAt.getTime();
  return Math.max(0, Math.floor(elapsed / intervalMs)) % poolSize;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const access = await requireApiAuthAndRateLimit(request);
  if (access.response) return access.response;
  const auth = access.auth;
  if (auth.kind !== "session") return forbidden();
  if (!(await isWorkspaceFeatureAllowed(auth.workspaceId, "on_call"))) {
    return NextResponse.json({ error: featureGateError("on_call") }, { status: 403 });
  }

  recordAuditForAccess({ access: access.auth, request, action: "settings.on_call_view", targetType: "workspace", targetId: auth.workspaceId, summary: "Viewed on-call schedule" }).catch(() => {});

  const [quota, managers] = await Promise.all([
    prisma.workspaceQuota.findUnique({
      where: { workspaceId: auth.workspaceId },
      select: {
        onCallRotationEnabled: true,
        onCallRotationIntervalHours: true,
        onCallRotationAnchorAt: true,
      },
    }),
    prisma.user.findMany({
      where: { workspaceId: auth.workspaceId, role: { in: [Role.OWNER, Role.MANAGER] } },
      select: { id: true, name: true, email: true, phone: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  if (!quota?.onCallRotationEnabled) {
    return NextResponse.json({ enabled: false, schedule: [], currentIndex: null });
  }

  const currentIndex = onCallIndex(
    quota.onCallRotationAnchorAt,
    quota.onCallRotationIntervalHours,
    managers.length,
  );

  const schedule = managers.map((m, i) => ({
    userId: m.id,
    name: m.name,
    email: m.email,
    hasPhone: Boolean(m.phone),
    isOnCall: i === currentIndex,
  }));

  return NextResponse.json({
    enabled: true,
    intervalHours: quota.onCallRotationIntervalHours,
    anchorAt: quota.onCallRotationAnchorAt.toISOString(),
    currentIndex,
    schedule,
  });
}
