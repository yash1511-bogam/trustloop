import { NextRequest, NextResponse } from "next/server";
import { AiProvider, Role, WorkflowType } from "@prisma/client";
import { z } from "zod";
import { recordAuditForAccess } from "@/lib/audit";
import { requireApiAuthAndRateLimit } from "@/lib/api-guard";
import { badRequest, forbidden } from "@/lib/http";
import { hasRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const upsertWorkflowSchema = z.object({
  workflowType: z.nativeEnum(WorkflowType),
  provider: z.nativeEnum(AiProvider),
  model: z.string().min(2).max(120),
});

export async function GET(): Promise<NextResponse> {
  const access = await requireApiAuthAndRateLimit();
  if (access.response) {
    return access.response;
  }
  const auth = access.auth;
  if (auth.kind !== "session") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const workflows = await prisma.workflowSetting.findMany({
    where: { workspaceId: auth.workspaceId },
    orderBy: { workflowType: "asc" },
  });

  return NextResponse.json({ workflows });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const access = await requireApiAuthAndRateLimit(request);
  if (access.response) {
    return access.response;
  }
  const auth = access.auth;
  if (auth.kind !== "session") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!hasRole({ user: auth.user }, [Role.OWNER, Role.MANAGER])) {
    return forbidden();
  }

  const body = await request.json().catch(() => null);
  const parsed = upsertWorkflowSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid workflow payload.");
  }

  const saved = await prisma.workflowSetting.upsert({
    where: {
      workspaceId_workflowType: {
        workspaceId: auth.workspaceId,
        workflowType: parsed.data.workflowType,
      },
    },
    create: {
      workspaceId: auth.workspaceId,
      workflowType: parsed.data.workflowType,
      provider: parsed.data.provider,
      model: parsed.data.model.trim(),
    },
    update: {
      provider: parsed.data.provider,
      model: parsed.data.model.trim(),
    },
  });

  recordAuditForAccess({ access: auth, request, action: "workflow.updated", targetType: "WorkflowSetting", summary: `Updated ${parsed.data.workflowType} workflow to ${parsed.data.provider}/${parsed.data.model}` }).catch(() => {});

  return NextResponse.json({ workflow: saved }, { status: 201 });
}
