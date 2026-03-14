import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireApiAuthAndRateLimit } from "@/lib/api-guard";
import { recordAuditForAccess } from "@/lib/audit";
import { badRequest, forbidden } from "@/lib/http";
import { sendWorkspaceUserPushNotifications } from "@/lib/push";

const testSchema = z
  .object({
    title: z.string().min(2).max(120).optional(),
    body: z.string().min(2).max(280).optional(),
  })
  .optional();

export async function POST(request: NextRequest): Promise<NextResponse> {
  const access = await requireApiAuthAndRateLimit(request);
  if (access.response) {
    return access.response;
  }

  const auth = access.auth;
  if (auth.kind !== "session") {
    return forbidden();
  }

  const body = await request.json().catch(() => null);
  const parsed = testSchema.safeParse(body === null ? undefined : body);
  if (!parsed.success) {
    return badRequest("Invalid push test payload.");
  }

  const result = await sendWorkspaceUserPushNotifications({
    workspaceId: auth.workspaceId,
    userIds: [auth.user.id],
    payload: {
      title: parsed.data?.title ?? "TrustLoop push test",
      body: parsed.data?.body ?? "Push notifications are active for your workspace account.",
      url: "/dashboard",
      tag: "trustloop-push-test",
      data: {
        source: "push-test",
      },
    },
  });

  recordAuditForAccess({ access: access.auth, request, action: "notifications.push_test", targetType: "push", summary: "Sent test push notification" }).catch(() => {});

  return NextResponse.json({
    ok: true,
    ...result,
  });
}
