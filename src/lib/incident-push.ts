import { Role } from "@prisma/client";
import { log } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { sendWorkspaceUserPushNotifications } from "@/lib/push";

export async function notifyIncidentPush(input: {
  workspaceId: string;
  incidentId: string;
  incidentTitle: string;
  event: "created" | "triaged" | "assigned" | "customer_update";
  severity?: string;
  assigneeUserId?: string | null;
}): Promise<void> {
  const labels: Record<string, string> = {
    created: "New incident",
    triaged: "Incident triaged",
    assigned: "Incident assigned to you",
    customer_update: "Customer update drafted",
  };

  let userIds: string[];

  if (input.event === "assigned" && input.assigneeUserId) {
    userIds = [input.assigneeUserId];
  } else {
    const managers = await prisma.user.findMany({
      where: { workspaceId: input.workspaceId, role: { in: [Role.OWNER, Role.MANAGER] } },
      select: { id: true },
    });
    userIds = managers.map((m) => m.id);
  }

  if (userIds.length === 0) return;

  try {
    await sendWorkspaceUserPushNotifications({
      workspaceId: input.workspaceId,
      userIds,
      payload: {
        title: labels[input.event] ?? "Incident update",
        body: `${input.severity ? `[${input.severity}] ` : ""}${input.incidentTitle}`,
        url: `/incidents/${input.incidentId}`,
        tag: `incident-${input.incidentId}`,
        data: { incidentId: input.incidentId, event: input.event },
      },
    });
  } catch (error) {
    log.app.error("Incident push notification failed", {
      workspaceId: input.workspaceId,
      incidentId: input.incidentId,
      event: input.event,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
