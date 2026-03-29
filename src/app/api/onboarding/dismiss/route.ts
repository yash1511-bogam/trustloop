import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(): Promise<NextResponse> {
  const auth = await requireAuth();
  await prisma.workspace.update({
    where: { id: auth.user.workspaceId },
    data: { onboardingDismissedAt: new Date() },
  });
  return NextResponse.json({ ok: true });
}
