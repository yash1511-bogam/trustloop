import { NextRequest, NextResponse } from "next/server";
import { resolve } from "dns/promises";
import { z } from "zod";
import { Role } from "@prisma/client";
import { hasRole } from "@/lib/auth";
import { requireApiAuthAndRateLimit } from "@/lib/api-guard";
import { forbidden, badRequest } from "@/lib/http";
import { prisma } from "@/lib/prisma";

/** The hostname users should CNAME to. Prefer CUSTOM_DOMAIN_CNAME_TARGET (e.g. a CloudFront/ALB domain), fall back to the app hostname. */
function cnameTarget(): string {
  return process.env.CUSTOM_DOMAIN_CNAME_TARGET
    ?? new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").hostname;
}

const setSchema = z.object({
  domain: z.string().trim().min(4).max(253).regex(
    /^(?!-)[a-z0-9-]+(\.[a-z0-9-]+)+$/i,
    "Invalid domain format",
  ),
});

// GET — check verification status of current custom domain
export async function GET(request: NextRequest): Promise<NextResponse> {
  const access = await requireApiAuthAndRateLimit(request);
  if (access.response) return access.response;
  const auth = access.auth;
  if (auth.kind !== "session") return forbidden();

  const ws = await prisma.workspace.findUnique({
    where: { id: auth.workspaceId },
    select: { customDomain: true, customDomainVerified: true },
  });
  if (!ws?.customDomain) {
    return NextResponse.json({ domain: null, verified: false, cnameTarget: cnameTarget() });
  }

  // Re-check DNS
  let verified = ws.customDomainVerified;
  if (!verified) {
    verified = await verifyCname(ws.customDomain, cnameTarget());
    if (verified) {
      await prisma.workspace.update({
        where: { id: auth.workspaceId },
        data: { customDomainVerified: true },
      });
    }
  }

  return NextResponse.json({ domain: ws.customDomain, verified, cnameTarget: cnameTarget() });
}

// POST — set or update custom domain
export async function POST(request: NextRequest): Promise<NextResponse> {
  const access = await requireApiAuthAndRateLimit(request);
  if (access.response) return access.response;
  const auth = access.auth;
  if (auth.kind !== "session") return forbidden();
  if (!hasRole({ user: auth.user }, [Role.OWNER, Role.MANAGER])) return forbidden();

  const body = await request.json().catch(() => null);
  const parsed = setSchema.safeParse(body);
  if (!parsed.success) return badRequest("Invalid domain.");

  const domain = parsed.data.domain.toLowerCase();

  // Check uniqueness
  const existing = await prisma.workspace.findUnique({ where: { customDomain: domain } });
  if (existing && existing.id !== auth.workspaceId) {
    return badRequest("This domain is already claimed by another workspace.");
  }

  const verified = await verifyCname(domain, cnameTarget());

  await prisma.workspace.update({
    where: { id: auth.workspaceId },
    data: { customDomain: domain, customDomainVerified: verified },
  });

  return NextResponse.json({ domain, verified, cnameTarget: cnameTarget() });
}

// DELETE — remove custom domain
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const access = await requireApiAuthAndRateLimit(request);
  if (access.response) return access.response;
  const auth = access.auth;
  if (auth.kind !== "session") return forbidden();
  if (!hasRole({ user: auth.user }, [Role.OWNER, Role.MANAGER])) return forbidden();

  await prisma.workspace.update({
    where: { id: auth.workspaceId },
    data: { customDomain: null, customDomainVerified: false },
  });

  return NextResponse.json({ domain: null, verified: false });
}

async function verifyCname(domain: string, expectedTarget: string): Promise<boolean> {
  try {
    const records = await resolve(domain, "CNAME");
    return records.some((r) => r.replace(/\.$/, "").toLowerCase() === expectedTarget.toLowerCase());
  } catch {
    return false;
  }
}
