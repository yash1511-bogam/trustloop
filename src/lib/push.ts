import webpush from "web-push";
import { log } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

type PushNotificationPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  data?: Record<string, string | number | boolean | null>;
};

type UserPushSubscription = {
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string | null;
};

let vapidConfigured = false;

function pushEnv() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() || process.env.VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  const subject = process.env.VAPID_SUBJECT?.trim();
  return {
    publicKey: publicKey || null,
    privateKey: privateKey || null,
    subject: subject || null,
  };
}

export function pushPublicVapidKey(): string | null {
  return pushEnv().publicKey;
}

export function isPushConfigured(): boolean {
  const env = pushEnv();
  return Boolean(env.publicKey && env.privateKey && env.subject);
}

function ensurePushConfigured(): boolean {
  if (vapidConfigured) {
    return true;
  }

  const env = pushEnv();
  if (!env.publicKey || !env.privateKey || !env.subject) {
    return false;
  }

  webpush.setVapidDetails(env.subject, env.publicKey, env.privateKey);
  vapidConfigured = true;
  return true;
}

export async function upsertUserPushSubscription(input: {
  workspaceId: string;
  userId: string;
  subscription: UserPushSubscription;
  userAgent?: string | null;
}): Promise<void> {
  await prisma.pushSubscription.upsert({
    where: {
      endpoint: input.subscription.endpoint,
    },
    create: {
      workspaceId: input.workspaceId,
      userId: input.userId,
      endpoint: input.subscription.endpoint,
      p256dh: input.subscription.p256dh,
      auth: input.subscription.auth,
      userAgent: input.userAgent ?? null,
      disabledAt: null,
    },
    update: {
      workspaceId: input.workspaceId,
      userId: input.userId,
      p256dh: input.subscription.p256dh,
      auth: input.subscription.auth,
      userAgent: input.userAgent ?? null,
      disabledAt: null,
    },
  });
}

export async function disableUserPushSubscription(input: {
  workspaceId: string;
  userId: string;
  endpoint: string;
}): Promise<void> {
  await prisma.pushSubscription.updateMany({
    where: {
      workspaceId: input.workspaceId,
      userId: input.userId,
      endpoint: input.endpoint,
    },
    data: {
      disabledAt: new Date(),
    },
  });
}

function toWebPushSubscription(input: UserPushSubscription): webpush.PushSubscription {
  return {
    endpoint: input.endpoint,
    keys: {
      p256dh: input.p256dh,
      auth: input.auth,
    },
  };
}

function extractPushErrorStatus(error: unknown): number | null {
  const statusCode = (error as { statusCode?: number }).statusCode;
  if (typeof statusCode === "number") {
    return statusCode;
  }
  return null;
}

export async function sendWorkspaceUserPushNotifications(input: {
  workspaceId: string;
  userIds: string[];
  payload: PushNotificationPayload;
}): Promise<{
  sent: number;
  failed: number;
  disabled: number;
  skipped: boolean;
}> {
  if (input.userIds.length === 0) {
    return {
      sent: 0,
      failed: 0,
      disabled: 0,
      skipped: true,
    };
  }

  if (!ensurePushConfigured()) {
    return {
      sent: 0,
      failed: 0,
      disabled: 0,
      skipped: true,
    };
  }

  const subscriptions = await prisma.pushSubscription.findMany({
    where: {
      workspaceId: input.workspaceId,
      userId: {
        in: input.userIds,
      },
      disabledAt: null,
    },
    select: {
      id: true,
      endpoint: true,
      p256dh: true,
      auth: true,
      userId: true,
    },
  });

  if (subscriptions.length === 0) {
    return {
      sent: 0,
      failed: 0,
      disabled: 0,
      skipped: true,
    };
  }

  const encodedPayload = JSON.stringify(input.payload);
  const succeeded: string[] = [];
  const disableIds: string[] = [];
  let failed = 0;

  const results = await Promise.allSettled(
    subscriptions.map((subscription) =>
      webpush
        .sendNotification(
          toWebPushSubscription({
            endpoint: subscription.endpoint,
            p256dh: subscription.p256dh,
            auth: subscription.auth,
          }),
          encodedPayload,
        )
        .then(() => ({ subscription, ok: true as const }))
        .catch((error: unknown) => ({ subscription, ok: false as const, error })),
    ),
  );

  for (const result of results) {
    const value = result.status === "fulfilled" ? result.value : { subscription: null, ok: false as const, error: result.reason };
    if (!value.subscription) continue;
    if (value.ok) {
      succeeded.push(value.subscription.id);
    } else {
      failed += 1;
      const statusCode = extractPushErrorStatus(value.error);
      if (statusCode === 404 || statusCode === 410) {
        disableIds.push(value.subscription.id);
      }

      log.worker.error("Push notification send failed", {
        workspaceId: input.workspaceId,
        userId: value.subscription.userId,
        endpoint: value.subscription.endpoint,
        statusCode,
        error: value.error instanceof Error ? value.error.message : String(value.error),
      });
    }
  }

  const now = new Date();

  if (succeeded.length > 0) {
    await prisma.pushSubscription.updateMany({
      where: {
        id: {
          in: succeeded,
        },
      },
      data: {
        lastNotifiedAt: now,
      },
    });
  }

  if (disableIds.length > 0) {
    await prisma.pushSubscription.updateMany({
      where: {
        id: {
          in: disableIds,
        },
      },
      data: {
        disabledAt: now,
      },
    });
  }

  return {
    sent: succeeded.length,
    failed,
    disabled: disableIds.length,
    skipped: false,
  };
}
