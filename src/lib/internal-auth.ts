import { notFound } from "next/navigation";
import { NextRequest } from "next/server";
import { getAuth, type AuthContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// ── Types ────────────────────────────────────────────────────────────────────

export type InternalRole = "CEO" | "SUPPORT" | "TECH" | "MARKETING";

export type InternalAuthContext = {
  user: AuthContext["user"];
  role: InternalRole;
  memberId: string;
};

// ── Tailscale IP helpers (optional, for future use) ──────────────────────────

const TAILSCALE_MIN = ipToNumber("100.64.0.0");
const TAILSCALE_MAX = ipToNumber("100.127.255.255");

function ipToNumber(ip: string): number {
  const parts = ip.split(".");
  if (parts.length !== 4) return 0;
  return parts.reduce((n, octet) => (n << 8) + (Number(octet) | 0), 0) >>> 0;
}

export function isTailscaleIp(ip: string): boolean {
  const n = ipToNumber(ip);
  return n >= TAILSCALE_MIN && n <= TAILSCALE_MAX;
}

export function getRequestIp(request: NextRequest): string | null {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip")?.trim() ?? null;
}

// ── DB lookup (no caching — revocation is instant) ───────────────────────────

async function getInternalMember(email: string): Promise<{ id: string; role: InternalRole } | null> {
  const member = await prisma.internalTeamMember.findUnique({
    where: { email: email.toLowerCase().trim() },
    select: { id: true, role: true, status: true },
  });
  if (!member || member.status !== "ACTIVE") return null;
  return { id: member.id, role: member.role as InternalRole };
}

function isPortalEnabled(): boolean {
  return process.env.INTERNAL_PORTAL_ENABLED === "true";
}

function isStubAuth(): boolean {
  return process.env.TRUSTLOOP_STUB_AUTH === "1";
}

// ── Server component auth (layout.tsx) ───────────────────────────────────────

export async function requireInternalAuth(): Promise<InternalAuthContext> {
  if (!isPortalEnabled()) notFound();
  if (isStubAuth()) notFound();

  const auth = await getAuth({ skipDevFallback: true });
  if (!auth) notFound();

  const member = await getInternalMember(auth.user.email);
  if (!member) notFound();

  return { user: auth.user, role: member.role, memberId: member.id };
}

// ── API route auth ───────────────────────────────────────────────────────────

export async function requireInternalApiAuth(
  request: NextRequest,
): Promise<InternalAuthContext | null> {
  if (!isPortalEnabled()) return null;
  if (isStubAuth()) return null;

  // Reject API keys — internal portal is session-only
  const authHeader = request.headers.get("authorization");
  if (authHeader?.toLowerCase().startsWith("bearer ")) return null;

  const auth = await getAuth({ skipDevFallback: true });
  if (!auth) return null;

  if (process.env.INTERNAL_REQUIRE_TAILSCALE === "true") {
    const ip = getRequestIp(request);
    if (!ip || !isTailscaleIp(ip)) return null;
  }

  const member = await getInternalMember(auth.user.email);
  if (!member) return null;

  return { user: auth.user, role: member.role, memberId: member.id };
}

// ── Role helpers ─────────────────────────────────────────────────────────────

export function requireRole(
  ctx: InternalAuthContext,
  allowed: InternalRole[],
): boolean {
  return allowed.includes(ctx.role);
}

const ROLE_TABS: Record<string, InternalRole[]> = {
  overview: ["CEO", "SUPPORT", "TECH", "MARKETING"],
  revenue: ["CEO"],
  workspaces: ["CEO", "SUPPORT", "TECH"],
  users: ["CEO", "SUPPORT"],
  growth: ["CEO", "MARKETING"],
  "invite-codes": ["CEO", "MARKETING"],
  "promo-codes": ["CEO"],
  team: ["CEO"],
  "enterprise-leads": ["CEO", "MARKETING"],
  infrastructure: ["CEO", "TECH"],
  audit: ["CEO", "TECH"],
};

export function visibleTabs(role: InternalRole): string[] {
  return Object.entries(ROLE_TABS)
    .filter(([, roles]) => roles.includes(role))
    .map(([tab]) => tab);
}
