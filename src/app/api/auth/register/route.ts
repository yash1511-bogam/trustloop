import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { AiProvider, Role, WorkflowType } from "@prisma/client";
import { setSessionCookie } from "@/lib/cookies";
import { badRequest } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { createSessionForUser } from "@/lib/session";
import { z } from "zod";

const registerSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.email().max(160),
  password: z.string().min(8).max(128),
  workspaceName: z.string().min(2).max(80),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = await request.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return badRequest("Invalid registration payload.");
  }

  const email = parsed.data.email.toLowerCase().trim();

  const existing = await prisma.user.findFirst({
    where: { email },
    select: { id: true },
  });

  if (existing) {
    return NextResponse.json(
      { error: "An account with that email already exists." },
      { status: 409 },
    );
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);

  const user = await prisma.$transaction(async (tx) => {
    const workspace = await tx.workspace.create({
      data: {
        name: parsed.data.workspaceName.trim(),
      },
    });

    const createdUser = await tx.user.create({
      data: {
        workspaceId: workspace.id,
        email,
        name: parsed.data.name.trim(),
        passwordHash,
        role: Role.OWNER,
      },
    });

    await tx.workflowSetting.createMany({
      data: [
        {
          workspaceId: workspace.id,
          workflowType: WorkflowType.INCIDENT_TRIAGE,
          provider: AiProvider.OPENAI,
          model: "gpt-4o-mini",
        },
        {
          workspaceId: workspace.id,
          workflowType: WorkflowType.CUSTOMER_UPDATE,
          provider: AiProvider.OPENAI,
          model: "gpt-4o-mini",
        },
      ],
    });

    return createdUser;
  });

  const session = await createSessionForUser(user.id);

  const response = NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
  });

  setSessionCookie(response, session.token, session.expiresAt);
  return response;
}
