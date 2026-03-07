import { NextRequest, NextResponse } from "next/server";
import { AiProvider, WorkflowType } from "@prisma/client";
import { z } from "zod";
import { requireApiAuthAndRateLimit } from "@/lib/api-guard";
import { badRequest } from "@/lib/http";
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

  const workflows = await prisma.workflowSetting.findMany({
    where: { workspaceId: auth.user.workspaceId },
    orderBy: { workflowType: "asc" },
  });

  return NextResponse.json({ workflows });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const access = await requireApiAuthAndRateLimit();
  if (access.response) {
    return access.response;
  }
  const auth = access.auth;

  const body = await request.json().catch(() => null);
  const parsed = upsertWorkflowSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid workflow payload.");
  }

  const saved = await prisma.workflowSetting.upsert({
    where: {
      workspaceId_workflowType: {
        workspaceId: auth.user.workspaceId,
        workflowType: parsed.data.workflowType,
      },
    },
    create: {
      workspaceId: auth.user.workspaceId,
      workflowType: parsed.data.workflowType,
      provider: parsed.data.provider,
      model: parsed.data.model.trim(),
    },
    update: {
      provider: parsed.data.provider,
      model: parsed.data.model.trim(),
    },
  });

  return NextResponse.json({ workflow: saved }, { status: 201 });
}
