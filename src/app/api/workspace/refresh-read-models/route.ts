import { NextRequest, NextResponse } from "next/server";
import { requireApiAuthAndRateLimit } from "@/lib/api-guard";
import { recordAuditForAccess } from "@/lib/audit";
import { forbidden } from "@/lib/http";
import { refreshWorkspaceReadModels } from "@/lib/read-models";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const access = await requireApiAuthAndRateLimit(request);
  if (access.response) {
    return access.response;
  }
  const auth = access.auth;
  if (auth.kind !== "session") {
    return forbidden();
  }

  await refreshWorkspaceReadModels(auth.workspaceId);
  recordAuditForAccess({ access: access.auth, request, action: "workspace.refresh_read_models", targetType: "workspace", summary: "Refreshed workspace read models" }).catch(() => {});
  return NextResponse.json({ success: true });
}
