import { NextRequest, NextResponse } from "next/server";
import { requireInternalApiAuth, requireRole } from "@/lib/internal-auth";
import { prisma } from "@/lib/prisma";
import { deleteWorkspaceAndRehomeUsers } from "@/lib/workspace-admin";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const auth = await requireInternalApiAuth(request);
  if (!auth || !requireRole(auth, ["CEO"])) return NextResponse.json(null, { status: 404 });

  const { id } = await params;
  const workspace = await prisma.workspace.findUnique({ where: { id }, select: { id: true } });
  if (!workspace) return NextResponse.json(null, { status: 404 });

  const result = await deleteWorkspaceAndRehomeUsers(prisma, id);
  return NextResponse.json(result);
}
