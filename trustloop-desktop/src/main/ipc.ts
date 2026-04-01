import { ipcMain, shell } from "electron";
import { prisma } from "./db";
import { sendOtp, verifyOtp, authenticateSession, getOAuthStartUrl, registerUser, verifyRegisterOtp, AuthUser } from "./auth";
import { IncidentStatus, IncidentSeverity, Role, AiProvider, WorkflowType } from "@prisma/client";

let currentSession: { token: string; user: AuthUser } | null = null;
export function getSession() { return currentSession; }
export function setCurrentSession(s: { token: string; user: AuthUser }) { currentSession = s; }

export function registerIpcHandlers(): void {

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

  ipcMain.handle("auth:is-dev", () => process.env.NODE_ENV === "development");

  ipcMain.handle("auth:oauth-start", async (_e, provider: "google" | "github", intent?: "login" | "register", workspaceName?: string) => {
    const url = await getOAuthStartUrl(provider, intent, workspaceName);
    shell.openExternal(url);
    return true;
  });

  // Dev auto-login: same as src/lib/auth.ts getAuth() dev fallback
  ipcMain.handle("auth:dev-login", async () => {
    if (process.env.NODE_ENV !== "development") return null;
    const user = await prisma.user.findFirst({
      where: { email: "demo@trustloop.local" },
      include: { workspace: { select: { name: true } } },
    });
    if (!user) return null;
    currentSession = {
      token: "dev-session",
      user: {
        id: user.id, name: user.name, email: user.email,
        role: user.role, workspaceId: user.workspaceId,
        workspaceName: user.workspace.name, stytchUserId: user.stytchUserId,
      },
    };
    return currentSession.user;
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

  ipcMain.handle("incidents:list", async (_e, opts?: { status?: string; severity?: string; page?: number }) => {
    if (!currentSession) return null;
    const wid = currentSession.user.workspaceId;
    const page = opts?.page ?? 1;
    const take = 50;
    const where: any = { workspaceId: wid };
    if (opts?.status) where.status = opts.status;
    if (opts?.severity) where.severity = opts.severity;

    const [items, count] = await Promise.all([
      prisma.incident.findMany({
        where, orderBy: { createdAt: "desc" }, take, skip: (page - 1) * take,
        select: {
          id: true, title: true, status: true, severity: true, channel: true,
          createdAt: true, resolvedAt: true, customerName: true, customerEmail: true,
          owner: { select: { id: true, name: true } },
        },
      }),
      prisma.incident.count({ where }),
    ]);
    return { items, total: count, page, pages: Math.ceil(count / take) };
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
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);

    const [byStatus, bySeverity, series] = await Promise.all([
      prisma.incident.groupBy({ by: ["status"], where: { workspaceId: wid }, _count: true }),
      prisma.incident.groupBy({ by: ["severity"], where: { workspaceId: wid }, _count: true }),
      prisma.incidentAnalyticsDaily.findMany({
        where: { workspaceId: wid, day: { gte: thirtyDaysAgo } },
        orderBy: { day: "asc" },
      }),
    ]);
    return { byStatus, bySeverity, series };
  });
}
