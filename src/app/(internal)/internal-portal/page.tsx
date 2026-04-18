import { requireInternalAuth } from "@/lib/internal-auth";
import { InternalStatCard } from "@/components/internal/internal-stat-card";
import { prisma } from "@/lib/prisma";

export default async function InternalOverviewPage() {
  await requireInternalAuth();

  const now = new Date();
  const d7 = new Date(now.getTime() - 7 * 86_400_000);

  const [
    totalWorkspaces, totalUsers, totalIncidents, incidentsLast7d,
    activeSubscriptions, trialingWorkspaces, blockedWorkspaces,
    earlyAccessRequests, inviteCodesUsed, enterpriseInquiries,
  ] = await Promise.all([
    prisma.workspace.count(),
    prisma.user.count(),
    prisma.incident.count(),
    prisma.incident.count({ where: { createdAt: { gte: d7 } } }),
    prisma.workspaceBilling.count({ where: { status: "ACTIVE" } }),
    prisma.workspaceBilling.count({ where: { status: "TRIALING" } }),
    prisma.workspace.count({ where: { blockedAt: { not: null } } }),
    prisma.earlyAccessRequest.count(),
    prisma.inviteCode.count({ where: { used: true } }),
    prisma.enterpriseContactInquiry.count(),
  ]);

  return (
    <div>
      <h1 className="text-xl font-bold text-[var(--color-title)]">Platform Overview</h1>
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <InternalStatCard label="Total Workspaces" value={totalWorkspaces} />
        <InternalStatCard label="Total Users" value={totalUsers} />
        <InternalStatCard label="Total Incidents" value={totalIncidents} sub={`${incidentsLast7d} last 7d`} />
        <InternalStatCard label="Active Subscriptions" value={activeSubscriptions} />
        <InternalStatCard label="Trialing" value={trialingWorkspaces} />
        <InternalStatCard label="Blocked" value={blockedWorkspaces} />
        <InternalStatCard label="Early Access Requests" value={earlyAccessRequests} />
        <InternalStatCard label="Invite Codes Used" value={inviteCodesUsed} />
        <InternalStatCard label="Enterprise Inquiries" value={enterpriseInquiries} />
      </div>
    </div>
  );
}
