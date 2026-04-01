import { ipcMain, shell } from "electron";
import { createCipheriv, hkdfSync, randomBytes } from "crypto";
import { prisma } from "./db";
import { sendOtp, verifyOtp, authenticateSession, getOAuthStartUrl, registerUser, verifyRegisterOtp, AuthUser } from "./auth";
import { IncidentStatus, IncidentSeverity, IncidentChannel, EventType, Role } from "@prisma/client";

function encryptSecret(plaintext: string): string {
  const secret = process.env.KEY_ENCRYPTION_SECRET;
  if (!secret) throw new Error("KEY_ENCRYPTION_SECRET is required");
  const key = Buffer.from(hkdfSync("sha256", secret, "trustloop-key-encryption-v1", "aes-256-gcm-key", 32));
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return `${iv.toString("base64")}:${ct.toString("base64")}:${cipher.getAuthTag().toString("base64")}`;
}

function last4(s: string): string { return s.trim().length <= 4 ? s.trim() : s.trim().slice(-4); }

let currentSession: { token: string; user: AuthUser } | null = null;
export function getSession() { return currentSession; }
export function setCurrentSession(s: { token: string; user: AuthUser }) { currentSession = s; }

export function registerIpcHandlers(): void {

  ipcMain.handle("open-external", async (_e, url: string) => shell.openExternal(url));

  // ── Auth: same flow as src/app/api/auth/login ──

  ipcMain.handle("auth:send-otp", async (_e, email: string) => sendOtp(email));

  ipcMain.handle("auth:verify-otp", async (_e, methodId: string, code: string) => {
    const result = await verifyOtp(methodId, code);
    const user = await prisma.user.findFirst({
      where: { stytchUserId: result.stytchUserId },
      include: { workspace: { select: { name: true } } },
    });
    if (!user) return { success: false, user: null };
    currentSession = {
      token: result.sessionToken,
      user: {
        id: user.id, name: user.name, email: user.email,
        role: user.role, workspaceId: user.workspaceId,
        workspaceName: user.workspace.name, stytchUserId: user.stytchUserId,
      },
    };
    return { success: true, user: currentSession.user };
  });

  ipcMain.handle("auth:session", async () => {
    if (!currentSession) return null;
    const user = await authenticateSession(currentSession.token);
    if (!user) { currentSession = null; return null; }
    return user;
  });

  ipcMain.handle("auth:logout", async () => { currentSession = null; return true; });

  ipcMain.handle("auth:oauth-start", async (_e, provider: "google" | "github", intent?: "login" | "register", workspaceName?: string) => {
    const url = await getOAuthStartUrl(provider, intent, workspaceName);
    shell.openExternal(url);
    return true;
  });


  // ── Registration: same flow as src/app/api/auth/register ──

  ipcMain.handle("auth:register-start", async (_e, opts: { name: string; email: string; workspaceName: string }) => {
    // Check slug availability
    const slug = opts.workspaceName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const taken = await prisma.workspace.findUnique({ where: { slug }, select: { id: true } });
    if (taken) return { error: "A company with this name is already registered." };
    const result = await registerUser(opts);
    return { methodId: result.methodId };
  });

  ipcMain.handle("auth:register-verify", async (_e, methodId: string, code: string) => {
    try {
      const result = await verifyRegisterOtp(methodId, code);
      // Create workspace + user (same as register/verify/route.ts)
      const existing = await prisma.user.findFirst({ where: { email: result.email }, select: { id: true } });
      const created = await prisma.$transaction(async (tx: any) => {
        const slug = result.workspaceName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
        const workspace = await tx.workspace.create({ data: { name: result.workspaceName, slug, planTier: "starter" } });
        const user = existing
          ? await tx.user.update({ where: { id: existing.id }, data: { workspaceId: workspace.id, role: Role.OWNER } })
          : await tx.user.create({ data: { workspaceId: workspace.id, email: result.email, name: result.name, role: Role.OWNER, stytchUserId: result.stytchUserId } });
        await tx.workspaceMembership.create({ data: { workspaceId: workspace.id, userId: user.id, role: Role.OWNER } });
        return { user, workspace };
      });
      currentSession = {
        token: result.sessionToken,
        user: {
          id: created.user.id, name: created.user.name, email: created.user.email,
          role: created.user.role, workspaceId: created.user.workspaceId,
          workspaceName: created.workspace.name, stytchUserId: created.user.stytchUserId,
        },
      };
      return { success: true, user: currentSession.user };
    } catch (e: any) {
      return { success: false, error: e.message || "Verification failed" };
    }
  });

  // ── Dashboard: exact same queries as src/app/(app)/dashboard/page.tsx ──

  ipcMain.handle("dashboard:data", async () => {
    if (!currentSession) return null;
    const wid = currentSession.user.workspaceId;

    // Same parallel queries as DashboardPage
    const [
      snapshot,
      totalIncidents,
      workspace,
      aiKeyCount,
      triagedCount,
      webhookCount,
    ] = await Promise.all([
      prisma.workspaceExecutiveSnapshot.findUnique({ where: { workspaceId: wid } }),
      prisma.incident.count({ where: { workspaceId: wid } }),
      prisma.workspace.findUniqueOrThrow({
        where: { id: wid },
        select: { slackBotToken: true, onboardingDismissedAt: true },
      }),
      prisma.aiProviderKey.count({ where: { workspaceId: wid } }),
      prisma.incident.count({ where: { workspaceId: wid, triagedAt: { not: null } } }),
      prisma.workspaceWebhookIntegration.count({ where: { workspaceId: wid } }),
    ]);

    // Same shape as DashboardPageClient props
    const counts = {
      total: totalIncidents,
      p1: snapshot?.p1OpenIncidents ?? 0,
      open: snapshot?.openIncidents ?? 0,
      resolved: snapshot?.incidentsResolvedLast7d ?? 0,
      created7d: snapshot?.incidentsCreatedLast7d ?? 0,
      avgResolutionHours: snapshot?.avgResolutionHoursLast30d ?? 0,
    };

    const onboarding = {
      dismissed: workspace.onboardingDismissedAt != null,
      hasIncident: totalIncidents > 0,
      hasTriaged: triagedCount > 0,
      hasAiKey: aiKeyCount > 0,
      hasSlack: workspace.slackBotToken !== null,
      hasWebhook: webhookCount > 0,
    };

    const snapshotData = snapshot ? {
      triageCoveragePct: snapshot.triageCoveragePct ?? 0,
      customerUpdateCoveragePct: snapshot.customerUpdateCoveragePct ?? 0,
      updatedAt: snapshot.updatedAt?.toISOString() ?? null,
    } : null;

    // Recent incidents for the dashboard list
    const recentIncidents = await prisma.incident.findMany({
      where: { workspaceId: wid },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true, title: true, status: true, severity: true,
        createdAt: true, resolvedAt: true, customerName: true,
        owner: { select: { name: true } },
      },
    });

    return { counts, snapshot: snapshotData, onboarding, recentIncidents };
  });

  // ── Incidents list: same as src/app/(app)/incidents/page.tsx ──

  ipcMain.handle("incidents:counts", async () => {
    if (!currentSession) return null;
    const wid = currentSession.user.workspaceId;
    const cutoff = new Date(Date.now() - 7 * 86400000);

    const [total, open, p1, resolved7d] = await Promise.all([
      prisma.incident.count({ where: { workspaceId: wid } }),
      prisma.incident.count({ where: { workspaceId: wid, status: { not: IncidentStatus.RESOLVED } } }),
      prisma.incident.count({ where: { workspaceId: wid, severity: IncidentSeverity.P1, status: { not: IncidentStatus.RESOLVED } } }),
      prisma.incident.count({ where: { workspaceId: wid, status: IncidentStatus.RESOLVED, updatedAt: { gte: cutoff } } }),
    ]);
    return { total, open, p1, resolved7d };
  });

  ipcMain.handle("incidents:list", async (_e, opts?: { status?: string; severity?: string; category?: string; owner?: string; q?: string; page?: number }) => {
    if (!currentSession) return null;
    const wid = currentSession.user.workspaceId;
    const page = opts?.page ?? 1;
    const take = 20;
    const where: any = { workspaceId: wid };
    if (opts?.status) where.status = opts.status;
    if (opts?.severity) where.severity = opts.severity;
    if (opts?.category) where.category = opts.category;
    if (opts?.owner) where.ownerUserId = opts.owner;
    if (opts?.q) where.OR = [
      { title: { contains: opts.q, mode: "insensitive" } },
      { customerName: { contains: opts.q, mode: "insensitive" } },
      { sourceTicketRef: { contains: opts.q, mode: "insensitive" } },
    ];

    const [items, count, members] = await Promise.all([
      prisma.incident.findMany({
        where, orderBy: [{ severity: "asc" }, { createdAt: "desc" }], take, skip: (page - 1) * take,
        select: {
          id: true, title: true, status: true, severity: true, category: true, channel: true,
          createdAt: true, updatedAt: true, resolvedAt: true, customerName: true, customerEmail: true,
          owner: { select: { id: true, name: true } },
          _count: { select: { events: true } },
        },
      }),
      prisma.incident.count({ where }),
      prisma.user.findMany({
        where: { workspaceId: wid },
        select: { id: true, name: true, role: true },
        orderBy: [{ role: "asc" }, { name: "asc" }],
      }),
    ]);
    return { items, total: count, page, pages: Math.ceil(count / take), members };
  });

  ipcMain.handle("incidents:get", async (_e, id: string) => {
    if (!currentSession) return null;
    return prisma.incident.findFirst({
      where: { id, workspaceId: currentSession.user.workspaceId },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        events: {
          include: { actor: { select: { name: true, email: true } } },
          orderBy: { createdAt: "desc" },
        },
      },
    });
  });

  ipcMain.handle("incidents:update-status", async (_e, id: string, status: string) => {
    if (!currentSession) return null;
    const data: any = { status };
    if (status === "RESOLVED") data.resolvedAt = new Date();
    return prisma.incident.update({
      where: { id, workspaceId: currentSession.user.workspaceId },
      data,
    });
  });

  // ── Workspace info ──
  ipcMain.handle("workspace:info", async () => {
    if (!currentSession) return null;
    return prisma.workspace.findUnique({
      where: { id: currentSession.user.workspaceId },
      include: {
        users: { select: { id: true, name: true, email: true, role: true } },
      },
    });
  });

  // ── Analytics: same as src/app/(app)/analytics/page.tsx ──
  ipcMain.handle("analytics:summary", async () => {
    if (!currentSession) return null;
    const wid = currentSession.user.workspaceId;
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);

    // 14-day window: today + 13 days back (same as web app's addDays(startOfUtcDay(), -13))
    const now = new Date();
    const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const fourteenDaysAgo = new Date(startOfToday.getTime() - 13 * 86400000);

    const [seriesRows, snapshot, failedReminders7d] = await Promise.all([
      prisma.incidentAnalyticsDaily.findMany({
        where: { workspaceId: wid, day: { gte: fourteenDaysAgo } },
        orderBy: { day: "asc" },
      }),
      prisma.workspaceExecutiveSnapshot.findUnique({ where: { workspaceId: wid } }),
      prisma.reminderJobLog.count({
        where: { workspaceId: wid, status: "FAILED", createdAt: { gte: sevenDaysAgo } },
      }).catch(() => 0),
    ]);

    // Build full 14-day series with zero-filled gaps (same shape as web app)
    const seriesMap = new Map<string, typeof seriesRows[0]>();
    for (const row of seriesRows) {
      seriesMap.set(row.day.toISOString().slice(0, 10), row);
    }
    const series: Array<{day:string;incidentsCreated:number;incidentsResolved:number;openAtEndOfDay:number;p1Created:number;triageRuns:number;customerUpdatesSent:number;reminderEmailsSent:number}> = [];
    for (let i = 0; i < 14; i++) {
      const d = new Date(fourteenDaysAgo.getTime() + i * 86400000);
      const key = d.toISOString().slice(0, 10);
      const row = seriesMap.get(key);
      series.push({
        day: key,
        incidentsCreated: row?.incidentsCreated ?? 0,
        incidentsResolved: row?.incidentsResolved ?? 0,
        openAtEndOfDay: row?.openAtEndOfDay ?? 0,
        p1Created: row?.p1Created ?? 0,
        triageRuns: row?.triageRuns ?? 0,
        customerUpdatesSent: row?.customerUpdatesSent ?? 0,
        reminderEmailsSent: row?.reminderEmailsSent ?? 0,
      });
    }

    return { series, snapshot, failedReminders7d };
  });

  // ── Profile ──
  ipcMain.handle("workspace:refresh-read-models", async () => {
    if (!currentSession) return null;
    const wid = currentSession.user.workspaceId;
    const now = new Date();
    const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const tomorrowStart = new Date(todayStart.getTime() + 86400000);
    const d7 = new Date(todayStart.getTime() - 7 * 86400000);
    const d30 = new Date(todayStart.getTime() - 30 * 86400000);

    const [created, resolved, openCount, p1Created, triageRuns, custUpdates, remindersSent, resolvedToday, openAll, p1Open, created7d, resolved7d, resolved30d, incidents30d] = await Promise.all([
      prisma.incident.count({ where: { workspaceId: wid, createdAt: { gte: todayStart, lt: tomorrowStart } } }),
      prisma.incident.count({ where: { workspaceId: wid, resolvedAt: { gte: todayStart, lt: tomorrowStart } } }),
      prisma.incident.count({ where: { workspaceId: wid, status: { not: IncidentStatus.RESOLVED } } }),
      prisma.incident.count({ where: { workspaceId: wid, severity: "P1", createdAt: { gte: todayStart, lt: tomorrowStart } } }),
      prisma.incidentEvent.count({ where: { incident: { workspaceId: wid }, eventType: EventType.TRIAGE_RUN, createdAt: { gte: todayStart, lt: tomorrowStart } } }),
      prisma.incidentEvent.count({ where: { incident: { workspaceId: wid }, eventType: EventType.CUSTOMER_UPDATE, createdAt: { gte: todayStart, lt: tomorrowStart } } }),
      prisma.emailNotificationLog.count({ where: { workspaceId: wid, type: "REMINDER", status: "SENT", createdAt: { gte: todayStart, lt: tomorrowStart } } }).catch(() => 0),
      prisma.incident.findMany({ where: { workspaceId: wid, resolvedAt: { gte: todayStart, lt: tomorrowStart } }, select: { createdAt: true, resolvedAt: true } }),
      prisma.incident.count({ where: { workspaceId: wid, status: { not: IncidentStatus.RESOLVED } } }),
      prisma.incident.count({ where: { workspaceId: wid, status: { not: IncidentStatus.RESOLVED }, severity: "P1" } }),
      prisma.incident.count({ where: { workspaceId: wid, createdAt: { gte: d7 } } }),
      prisma.incident.count({ where: { workspaceId: wid, resolvedAt: { gte: d7 } } }),
      prisma.incident.findMany({ where: { workspaceId: wid, resolvedAt: { gte: d30 } }, select: { createdAt: true, resolvedAt: true } }),
      prisma.incident.findMany({ where: { workspaceId: wid, createdAt: { gte: d30 } }, select: { triageRunCount: true, customerUpdateCount: true } }),
    ]);

    const mttr = resolvedToday.length > 0 ? Math.round(resolvedToday.reduce((s, i) => s + ((i.resolvedAt?.getTime() ?? 0) - i.createdAt.getTime()) / 60000, 0) / resolvedToday.length) : null;
    await prisma.incidentAnalyticsDaily.upsert({
      where: { workspaceId_day: { workspaceId: wid, day: todayStart } },
      create: { workspaceId: wid, day: todayStart, incidentsCreated: created, incidentsResolved: resolved, openAtEndOfDay: openCount, p1Created, triageRuns, customerUpdatesSent: custUpdates, reminderEmailsSent: remindersSent, mttrMinutesAvg: mttr },
      update: { incidentsCreated: created, incidentsResolved: resolved, openAtEndOfDay: openCount, p1Created, triageRuns, customerUpdatesSent: custUpdates, reminderEmailsSent: remindersSent, mttrMinutesAvg: mttr },
    });

    const avgH = resolved30d.length > 0 ? Number((resolved30d.reduce((s, i) => s + ((i.resolvedAt?.getTime() ?? 0) - i.createdAt.getTime()) / 3600000, 0) / resolved30d.length).toFixed(2)) : 0;
    const triagePct = incidents30d.length > 0 ? Math.round((incidents30d.filter(i => i.triageRunCount > 0).length / incidents30d.length) * 100) : 0;
    const updatePct = incidents30d.length > 0 ? Math.round((incidents30d.filter(i => i.customerUpdateCount > 0).length / incidents30d.length) * 100) : 0;
    await prisma.workspaceExecutiveSnapshot.upsert({
      where: { workspaceId: wid },
      create: { workspaceId: wid, openIncidents: openAll, p1OpenIncidents: p1Open, incidentsCreatedLast7d: created7d, incidentsResolvedLast7d: resolved7d, avgResolutionHoursLast30d: avgH, triageCoveragePct: triagePct, customerUpdateCoveragePct: updatePct },
      update: { openIncidents: openAll, p1OpenIncidents: p1Open, incidentsCreatedLast7d: created7d, incidentsResolvedLast7d: resolved7d, avgResolutionHoursLast30d: avgH, triageCoveragePct: triagePct, customerUpdateCoveragePct: updatePct },
    });
    return { success: true };
  });

  ipcMain.handle("onboarding:dismiss", async () => {
    if (!currentSession) return null;
    await prisma.workspace.update({
      where: { id: currentSession.user.workspaceId },
      data: { onboardingDismissedAt: new Date() },
    });
    return { ok: true };
  });

  ipcMain.handle("profile:get", async () => {
    if (!currentSession) return null;
    return prisma.user.findUnique({
      where: { id: currentSession.user.id },
      select: { id: true, name: true, email: true, phone: true, role: true, createdAt: true },
    });
  });

  ipcMain.handle("profile:update", async (_e, data: { name?: string; phone?: string }) => {
    if (!currentSession) return null;
    const user = await prisma.user.update({
      where: { id: currentSession.user.id },
      data,
      select: { id: true, name: true, email: true, phone: true, role: true },
    });
    if (data.name) currentSession.user.name = user.name;
    return user;
  });

  // ── Workspace general ──
  ipcMain.handle("workspace:general", async () => {
    if (!currentSession) return null;
    return prisma.workspace.findUnique({
      where: { id: currentSession.user.workspaceId },
      select: {
        id: true, name: true, slug: true, planTier: true, statusPageEnabled: true,
        slackChannelId: true, slackTeamId: true, complianceMode: true, createdAt: true,
        trialEndsAt: true, customDomain: true, customDomainVerified: true,
        billing: { select: { status: true } },
      },
    });
  });

  ipcMain.handle("workspace:update", async (_e, data: { name?: string; slug?: string; complianceMode?: boolean; statusPageEnabled?: boolean; slackChannelId?: string | null }) => {
    if (!currentSession) return null;
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.slug !== undefined) updateData.slug = data.slug.toLowerCase();
    if (data.statusPageEnabled !== undefined) updateData.statusPageEnabled = data.statusPageEnabled;
    if (data.slackChannelId !== undefined) updateData.slackChannelId = data.slackChannelId;
    if (data.complianceMode !== undefined) updateData.complianceMode = data.complianceMode;
    return prisma.workspace.update({
      where: { id: currentSession.user.workspaceId },
      data: updateData,
      select: { id: true, name: true, slug: true, planTier: true, complianceMode: true, statusPageEnabled: true },
    });
  });

  // ── Team ──
  ipcMain.handle("workspace:team", async () => {
    if (!currentSession) return null;
    const wid = currentSession.user.workspaceId;
    const [members, invites] = await Promise.all([
      prisma.workspaceMembership.findMany({
        where: { workspaceId: wid },
        include: { user: { select: { id: true, name: true, email: true, phone: true, createdAt: true } } },
        orderBy: [{ role: "asc" }, { createdAt: "asc" }],
      }),
      prisma.workspaceInvite.findMany({
        where: { workspaceId: wid, usedAt: null, expiresAt: { gt: new Date() } },
        select: { id: true, email: true, role: true, token: true, createdAt: true, expiresAt: true },
        orderBy: { createdAt: "desc" },
      }),
    ]);
    return {
      members: members.map(m => ({ id: m.user.id, name: m.user.name, email: m.user.email, phone: m.user.phone, role: m.role, createdAt: m.user.createdAt })),
      invites,
      currentUserId: currentSession.user.id,
      canManageRoles: currentSession.user.role === "OWNER",
    };
  });

  ipcMain.handle("team:invite", async (_e, data: { email: string; role: string }) => {
    if (!currentSession) return null;
    const wid = currentSession.user.workspaceId;
    const token = require("crypto").randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 86400000);
    return prisma.workspaceInvite.create({
      data: { workspaceId: wid, email: data.email, role: data.role as any, token, expiresAt },
      select: { id: true, email: true },
    });
  });

  // ── Billing ──
  ipcMain.handle("workspace:billing", async () => {
    if (!currentSession) return null;
    const wid = currentSession.user.workspaceId;
    const today = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate()));
    const ws = await prisma.workspace.findUnique({
      where: { id: wid },
      select: {
        planTier: true, trialEndsAt: true,
        billing: {
          select: {
            status: true, discountCode: true, dodoSubscriptionId: true, dodoProductId: true,
            lastPaymentAt: true, lastPaymentAmount: true, lastPaymentCurrency: true, lastInvoiceUrl: true,
            paymentFailedAt: true, currentPeriodStart: true, currentPeriodEnd: true,
            canceledAt: true, cancelReason: true, failureReminderCount: true,
          },
        },
      },
    });
    const usage = await prisma.workspaceDailyUsage.findUnique({
      where: { workspaceId_usageDate: { workspaceId: wid, usageDate: today } },
    }).catch(() => null);
    const quota = await prisma.workspaceQuota.findUnique({ where: { workspaceId: wid } }).catch(() => null);
    return { ...ws, usage, quota };
  });

  // ── AI Provider Keys ──
  ipcMain.handle("integrations:ai", async () => {
    if (!currentSession) return null;
    const wid = currentSession.user.workspaceId;
    const [keys, workflows] = await Promise.all([
      prisma.aiProviderKey.findMany({
        where: { workspaceId: wid },
        select: { provider: true, keyLast4: true, isActive: true, healthStatus: true, lastVerifiedAt: true, lastVerificationError: true, updatedAt: true },
        orderBy: { provider: "asc" },
      }),
      prisma.workflowSetting.findMany({
        where: { workspaceId: wid },
        select: { workflowType: true, provider: true, model: true },
        orderBy: { workflowType: "asc" },
      }),
    ]);
    return { keys, workflows };
  });

  ipcMain.handle("ai-keys:save", async (_e, data: { provider: string; apiKey: string }) => {
    if (!currentSession) return null;
    const wid = currentSession.user.workspaceId;
    const keyLast4 = last4(data.apiKey);
    const encrypted = encryptSecret(data.apiKey.trim());
    await prisma.aiProviderKey.upsert({
      where: { workspaceId_provider: { workspaceId: wid, provider: data.provider as any } },
      create: { workspaceId: wid, provider: data.provider as any, encryptedKey: encrypted, keyLast4, isActive: true, healthStatus: "UNKNOWN" },
      update: { encryptedKey: encrypted, keyLast4, isActive: true, healthStatus: "UNKNOWN" },
    });
    return { ok: true };
  });

  ipcMain.handle("ai-keys:test", async (_e, data: { provider: string; apiKey: string }) => {
    // Simple validation — key exists and has reasonable length
    return { ok: data.apiKey && data.apiKey.length > 10 };
  });

  ipcMain.handle("workflows:save", async (_e, data: { workflowType: string; provider: string; model: string }) => {
    if (!currentSession) return null;
    const wid = currentSession.user.workspaceId;
    await prisma.workflowSetting.upsert({
      where: { workspaceId_workflowType: { workspaceId: wid, workflowType: data.workflowType as any } },
      create: { workspaceId: wid, workflowType: data.workflowType as any, provider: data.provider as any, model: data.model },
      update: { provider: data.provider as any, model: data.model },
    });
    return { ok: true };
  });

  // ── Webhooks ──
  ipcMain.handle("integrations:webhooks", async () => {
    if (!currentSession) return null;
    return prisma.workspaceWebhookIntegration.findMany({
      where: { workspaceId: currentSession.user.workspaceId },
      select: { id: true, type: true, isActive: true, keyLast4: true, createdAt: true, updatedAt: true },
      orderBy: { createdAt: "desc" },
    });
  });

  ipcMain.handle("webhooks:save-secret", async (_e, data: { type: string; secret: string }) => {
    if (!currentSession) return null;
    const wid = currentSession.user.workspaceId;
    const keyLast4 = last4(data.secret);
    const encrypted = encryptSecret(data.secret);
    await prisma.workspaceWebhookIntegration.upsert({
      where: { workspaceId_type: { workspaceId: wid, type: data.type as any } },
      create: { workspaceId: wid, type: data.type as any, encryptedSecret: encrypted, keyLast4, isActive: true },
      update: { encryptedSecret: encrypted, keyLast4, isActive: true },
    });
    return { ok: true };
  });

  ipcMain.handle("webhooks:rotate-secret", async (_e, type: string) => {
    if (!currentSession) return null;
    const wid = currentSession.user.workspaceId;
    const newSecret = randomBytes(32).toString("hex");
    const encrypted = encryptSecret(newSecret);
    await prisma.workspaceWebhookIntegration.update({
      where: { workspaceId_type: { workspaceId: wid, type: type as any } },
      data: { encryptedSecret: encrypted, keyLast4: last4(newSecret) },
    });
    return { ok: true, secret: newSecret };
  });

  ipcMain.handle("webhooks:toggle", async (_e, data: { type: string; isActive: boolean }) => {
    if (!currentSession) return null;
    await prisma.workspaceWebhookIntegration.update({
      where: { workspaceId_type: { workspaceId: currentSession.user.workspaceId, type: data.type as any } },
      data: { isActive: data.isActive },
    });
    return { ok: true };
  });

  // ── On-Call ──
  ipcMain.handle("integrations:oncall", async () => {
    if (!currentSession) return null;
    const wid = currentSession.user.workspaceId;
    const quota = await prisma.workspaceQuota.findUnique({ where: { workspaceId: wid } }).catch(() => null);
    const members = await prisma.user.findMany({
      where: { workspaceId: wid },
      select: { id: true, name: true, email: true, phone: true, role: true },
      orderBy: [{ role: "asc" }, { name: "asc" }],
    });
    return { onCallEnabled: quota?.onCallRotationEnabled ?? false, members };
  });

  // ── Workspace overview (same as web app) ──
  ipcMain.handle("workspace:overview", async () => {
    if (!currentSession) return null;
    const wid = currentSession.user.workspaceId;
    const [keyCount, workflowCount, memberCount, inviteCount, workspace, webhookCount] = await Promise.all([
      prisma.aiProviderKey.count({ where: { workspaceId: wid } }),
      prisma.workflowSetting.count({ where: { workspaceId: wid } }),
      prisma.user.count({ where: { workspaceId: wid } }),
      prisma.workspaceInvite.count({ where: { workspaceId: wid, usedAt: null, expiresAt: { gt: new Date() } } }),
      prisma.workspace.findUniqueOrThrow({ where: { id: wid }, select: { planTier: true, trialEndsAt: true, billing: { select: { status: true } } } }),
      prisma.workspaceWebhookIntegration.count({ where: { workspaceId: wid, isActive: true } }).catch(() => 0),
    ]);
    return { keyCount, workflowCount, memberCount, inviteCount, planTier: workspace.planTier, billingStatus: workspace.billing?.status ?? null, webhookCount };
  });

  // ── Incident create ──
  ipcMain.handle("incidents:export-csv", async () => {
    if (!currentSession) return null;
    const wid = currentSession.user.workspaceId;
    const incidents = await prisma.incident.findMany({
      where: { workspaceId: wid },
      include: { owner: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" },
    });
    const esc = (v: unknown) => { const t = String(v ?? ""); const e = t.replace(/"/g, '""'); return /[",\n]/.test(e) ? `"${e}"` : e; };
    const header = ["incident_id","title","severity","status","category","owner_name","owner_email","created_at","resolved_at"].map(esc).join(",");
    const rows = incidents.map(i => [i.id,i.title,i.severity,i.status,i.category??"",i.owner?.name??"",i.owner?.email??"",i.createdAt.toISOString(),i.resolvedAt?.toISOString()??""].map(esc).join(","));
    const csv = [header, ...rows].join("\n");
    const { dialog } = await import("electron");
    const { canceled, filePath } = await dialog.showSaveDialog({ defaultPath: `trustloop-incidents-${new Date().toISOString().slice(0,10)}.csv`, filters: [{ name: "CSV", extensions: ["csv"] }] });
    if (canceled || !filePath) return null;
    const fs = await import("fs");
    fs.writeFileSync(filePath, csv, "utf-8");
    return { ok: true, path: filePath };
  });

  ipcMain.handle("incidents:create", async (_e, data: { title: string; description?: string; severity: string; customerName?: string; customerEmail?: string; channel?: string; category?: string; modelVersion?: string; sourceTicketRef?: string }) => {
    if (!currentSession) return null;
    return prisma.incident.create({
      data: {
        workspaceId: currentSession.user.workspaceId,
        title: data.title,
        description: data.description || "",
        severity: data.severity as IncidentSeverity,
        status: IncidentStatus.NEW,
        ownerUserId: currentSession.user.id,
        customerName: data.customerName || null,
        customerEmail: data.customerEmail || null,
        channel: (data.channel || "API") as IncidentChannel,
        category: data.category ? data.category as any : null,
        modelVersion: data.modelVersion || null,
        sourceTicketRef: data.sourceTicketRef || null,
      },
      select: { id: true, title: true, status: true, severity: true, createdAt: true },
    });
  });

  // ── Incident detail (same as web app [id]/page.tsx) ──
  ipcMain.handle("incidents:detail", async (_e, id: string) => {
    if (!currentSession) return null;
    const incident = await prisma.incident.findFirst({
      where: { id, workspaceId: currentSession.user.workspaceId },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        events: { include: { actor: { select: { name: true, email: true } } }, orderBy: { createdAt: "desc" } },
        postMortem: { include: { author: { select: { id: true, name: true } } } },
      },
    });
    if (!incident) return null;
    const owners = await prisma.user.findMany({
      where: { workspaceId: currentSession.user.workspaceId },
      select: { id: true, name: true, role: true },
      orderBy: [{ role: "asc" }, { name: "asc" }],
    });
    return { incident, owners };
  });

  // ── Incident update (status, severity, owner, category) ──
  ipcMain.handle("incidents:update", async (_e, id: string, data: { status?: string; severity?: string; ownerUserId?: string | null; category?: string | null }) => {
    if (!currentSession) return null;
    const updateData: any = {};
    if (data.status) { updateData.status = data.status; if (data.status === "RESOLVED") updateData.resolvedAt = new Date(); }
    if (data.severity) updateData.severity = data.severity;
    if (data.ownerUserId !== undefined) updateData.ownerUserId = data.ownerUserId || null;
    if (data.category !== undefined) updateData.category = data.category || null;
    return prisma.incident.update({
      where: { id, workspaceId: currentSession.user.workspaceId },
      data: updateData,
      select: { id: true, status: true, severity: true, ownerUserId: true, category: true },
    });
  });

  // ── Status updates (customer-facing) ──
  ipcMain.handle("incidents:publish-update", async (_e, incidentId: string, body: string) => {
    if (!currentSession) return null;
    const incident = await prisma.incident.findFirst({ where: { id: incidentId, workspaceId: currentSession.user.workspaceId } });
    if (!incident) return null;
    return prisma.statusUpdate.create({
      data: { incident: { connect: { id: incidentId } }, workspace: { connect: { id: currentSession.user.workspaceId } }, body, isVisible: true, publishedAt: new Date() },
      select: { id: true },
    });
  });

  // ── Incident add event/note ──
  ipcMain.handle("incidents:add-event", async (_e, incidentId: string, body: string, eventType?: string) => {
    if (!currentSession) return null;
    return prisma.incidentEvent.create({
      data: {
        incidentId,
        actorUserId: currentSession.user.id,
        eventType: (eventType || "NOTE") as EventType,
        body,
      },
      select: { id: true, eventType: true, body: true, createdAt: true },
    });
  });

  // ── Quotas ──
  ipcMain.handle("workspace:quotas", async () => {
    if (!currentSession) return null;
    const wid = currentSession.user.workspaceId;
    const quota = await prisma.workspaceQuota.findUnique({ where: { workspaceId: wid } });
    const today = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate()));
    const usage = await prisma.workspaceDailyUsage.findUnique({
      where: { workspaceId_usageDate: { workspaceId: wid, usageDate: today } },
    }).catch(() => null);
    return { quota, usage };
  });

  // ── SSO ──
  ipcMain.handle("security:sso", async () => {
    if (!currentSession) return null;
    return prisma.workspace.findUnique({
      where: { id: currentSession.user.workspaceId },
      select: { samlEnabled: true, samlMetadataUrl: true, samlOrganizationId: true, samlConnectionId: true },
    }).catch(() => null);
  });

  ipcMain.handle("security:sso-save", async (_e, data: { samlEnabled: boolean; samlMetadataUrl: string | null }) => {
    if (!currentSession) return null;
    return prisma.workspace.update({
      where: { id: currentSession.user.workspaceId },
      data: { samlEnabled: data.samlEnabled, samlMetadataUrl: data.samlMetadataUrl },
    });
  });

  // ── API Keys ──
  ipcMain.handle("security:apikeys", async () => {
    if (!currentSession) return null;
    return prisma.workspaceApiKey.findMany({
      where: { workspaceId: currentSession.user.workspaceId },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, keyPrefix: true, scopes: true, isActive: true, createdAt: true, lastUsedAt: true, expiresAt: true },
    });
  });

  ipcMain.handle("apikeys:create", async (_e, data: { name: string; expiryOption: string }) => {
    if (!currentSession) return null;
    const wid = currentSession.user.workspaceId;
    const keyPrefix = randomBytes(4).toString("hex");
    const secret = randomBytes(24).toString("base64url");
    const rawKey = `sk-tl-${keyPrefix}.${secret}`;
    const bcrypt = require("bcryptjs") as typeof import("bcryptjs");
    const keyHash = await bcrypt.hash(rawKey, 12);
    const expiryMap: Record<string, number> = { "30d": 30, "90d": 90, "1y": 365 };
    const days = expiryMap[data.expiryOption];
    const expiresAt = days ? new Date(Date.now() + days * 86400000) : null;
    await prisma.workspaceApiKey.create({
      data: { workspaceId: wid, name: data.name, keyPrefix, keyHash, scopes: ["incidents:read", "incidents:write"], isActive: true, expiresAt },
    });
    return { apiKey: rawKey };
  });

  ipcMain.handle("apikeys:revoke", async (_e, id: string) => {
    if (!currentSession) return null;
    return prisma.workspaceApiKey.update({
      where: { id, workspaceId: currentSession.user.workspaceId },
      data: { isActive: false },
    });
  });

  // ── Audit Log ──
  ipcMain.handle("security:audit", async (_e, opts?: { page?: number }) => {
    if (!currentSession) return null;
    const wid = currentSession.user.workspaceId;
    const page = opts?.page ?? 1;
    const take = 100;
    const [items, count] = await Promise.all([
      prisma.auditLog.findMany({
        where: { workspaceId: wid },
        orderBy: { createdAt: "desc" },
        take, skip: (page - 1) * take,
        select: {
          id: true, action: true, summary: true, createdAt: true, ipAddress: true,
          actorUser: { select: { name: true } },
          actorApiKey: { select: { name: true } },
        },
      }),
      prisma.auditLog.count({ where: { workspaceId: wid } }),
    ]);
    return { items, total: count, page, pages: Math.ceil(count / take) };
  });
}
