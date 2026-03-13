import { BillingSubscriptionStatus, Role } from "@prisma/client";
import { applyWorkspacePlan, normalizePlanTier } from "@/lib/billing-plan";
import { sendTrialExpiredEmail, sendTrialReminderEmail } from "@/lib/email";
import { log } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

const REMINDER_DAYS = [7, 3, 1] as const;

function daysBetween(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / 86_400_000);
}

export async function processTrialAutomation(input?: { now?: Date }): Promise<{
  checked: number;
  remindersSent: number;
  expired: number;
}> {
  const now = input?.now ?? new Date();
  log.billing.info("Starting trial automation", { now: now.toISOString() });

  const workspaces = await prisma.workspace.findMany({
    where: {
      trialEndsAt: { not: null },
      billing: { status: BillingSubscriptionStatus.TRIALING },
    },
    select: {
      id: true,
      name: true,
      planTier: true,
      trialEndsAt: true,
      users: {
        where: { role: { in: [Role.OWNER, Role.MANAGER] } },
        select: { email: true, name: true },
      },
      emailNotifications: {
        where: { type: { in: ["TRIAL_REMINDER", "TRIAL_EXPIRED"] } },
        select: { type: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });

  let remindersSent = 0;
  let expired = 0;

  for (const ws of workspaces) {
    const trialEnd = ws.trialEndsAt!;
    const daysLeft = daysBetween(now, trialEnd);
    const emails = ws.users.map((u) => u.email);
    const planTier = normalizePlanTier(ws.planTier);

    // Trial expired
    if (daysLeft <= 0) {
      await applyWorkspacePlan({ prisma, workspaceId: ws.id, planTier: "starter" });
      await prisma.workspaceBilling.update({
        where: { workspaceId: ws.id },
        data: { status: BillingSubscriptionStatus.CANCELED, canceledAt: now, cancelReason: "trial_expired" },
      });

      for (const email of emails) {
        try {
          await sendTrialExpiredEmail({ workspaceId: ws.id, toEmail: email, workspaceName: ws.name, previousPlanTier: planTier });
        } catch (e) {
          log.billing.error("Trial expired email failed", { workspaceId: ws.id, toEmail: email, error: e instanceof Error ? e.message : String(e) });
        }
      }
      expired++;
      continue;
    }

    // Send reminders at 7, 3, 1 days
    const sentTypes = new Set(ws.emailNotifications.map((n) => `${n.type}_${daysBetween(n.createdAt, trialEnd)}`));

    for (const reminderDay of REMINDER_DAYS) {
      if (daysLeft <= reminderDay && daysLeft > reminderDay - 1) {
        const key = `TRIAL_REMINDER_${reminderDay}`;
        if (sentTypes.has(key)) continue;

        for (const email of emails) {
          try {
            await sendTrialReminderEmail({ workspaceId: ws.id, toEmail: email, workspaceName: ws.name, planTier, daysRemaining: daysLeft });
            remindersSent++;
          } catch (e) {
            log.billing.error("Trial reminder email failed", { workspaceId: ws.id, toEmail: email, error: e instanceof Error ? e.message : String(e) });
          }
        }
      }
    }
  }

  log.billing.info("Completed trial automation", { checked: workspaces.length, remindersSent, expired });
  return { checked: workspaces.length, remindersSent, expired };
}
