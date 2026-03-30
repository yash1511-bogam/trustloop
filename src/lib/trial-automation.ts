import { BillingSubscriptionStatus, Role } from "@prisma/client";
import { normalizePlanTier } from "@/lib/billing-plan";
import { applyWorkspacePlan } from "@/lib/billing-plan-server";
import { sendTrialExpiredEmail, sendTrialReminderEmail } from "@/lib/email";
import { log } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

/** Reminder thresholds in hours before trial end */
const REMINDER_HOURS = [48, 24, 4] as const;

function hoursBetween(a: Date, b: Date): number {
  return (b.getTime() - a.getTime()) / 3_600_000;
}

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
        take: 20,
      },
    },
  });

  let remindersSent = 0;
  let expired = 0;

  for (const ws of workspaces) {
    const trialEnd = ws.trialEndsAt!;
    const hoursLeft = hoursBetween(now, trialEnd);
    const daysLeft = daysBetween(now, trialEnd);
    const emails = ws.users.map((u) => u.email);
    const planTier = normalizePlanTier(ws.planTier);

    // Trial expired
    if (hoursLeft <= 0) {
      await prisma.workspace.update({
        where: { id: ws.id },
        data: { trialEndsAt: null },
      });
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

    // Send reminders at 48h, 24h, 4h before expiry
    const sentKeys = new Set(
      ws.emailNotifications
        .filter((n) => n.type === "TRIAL_REMINDER")
        .map((n) => {
          const h = Math.round(hoursBetween(n.createdAt, trialEnd));
          // Bucket sent notifications to the nearest threshold
          for (const threshold of REMINDER_HOURS) {
            if (Math.abs(h - threshold) <= 6) return `TRIAL_REMINDER_${threshold}h`;
          }
          return `TRIAL_REMINDER_${h}h`;
        }),
    );

    for (const thresholdHours of REMINDER_HOURS) {
      if (hoursLeft <= thresholdHours && hoursLeft > (thresholdHours === 4 ? 0 : thresholdHours - 12)) {
        const key = `TRIAL_REMINDER_${thresholdHours}h`;
        if (sentKeys.has(key)) continue;

        const daysRemaining = thresholdHours >= 24 ? Math.ceil(hoursLeft / 24) : 0;
        const urgencyLabel = thresholdHours <= 4 ? "expires in a few hours" : daysRemaining <= 1 ? "expires tomorrow" : `expires in ${daysRemaining} days`;

        for (const email of emails) {
          try {
            await sendTrialReminderEmail({
              workspaceId: ws.id,
              toEmail: email,
              workspaceName: ws.name,
              planTier,
              daysRemaining: Math.max(daysLeft, 0),
            });
            remindersSent++;
          } catch (e) {
            log.billing.error("Trial reminder email failed", {
              workspaceId: ws.id,
              toEmail: email,
              threshold: `${thresholdHours}h`,
              urgency: urgencyLabel,
              error: e instanceof Error ? e.message : String(e),
            });
          }
        }
      }
    }
  }

  log.billing.info("Completed trial automation", { checked: workspaces.length, remindersSent, expired });
  return { checked: workspaces.length, remindersSent, expired };
}
