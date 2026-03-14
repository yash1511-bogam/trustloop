import { Role } from "@prisma/client";

/**
 * Root domain for workspace routing.
 * OWNER  → subdomain:  `<slug>.<rootDomain>`
 * Others → path-based: `<rootDomain>/<slug>/…`
 */
function rootDomain(): string {
  return process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "localhost:3000";
}

function protocol(): string {
  const domain = rootDomain();
  return domain.startsWith("localhost") ? "http" : "https";
}

/** Build the workspace base URL for a given role + slug. */
export function workspaceBaseUrl(slug: string, role: Role): string {
  const proto = protocol();
  const domain = rootDomain();

  if (role === Role.OWNER) {
    return `${proto}://${slug}.${domain}`;
  }
  return `${proto}://${domain}/${slug}`;
}

/** Build a full workspace page URL (e.g. `/dashboard`). */
export function workspaceUrl(
  path: string,
  slug: string,
  role: Role,
): string {
  const base = workspaceBaseUrl(slug, role);
  const clean = path.startsWith("/") ? path : `/${path}`;

  if (role === Role.OWNER) {
    // subdomain: slug.domain/dashboard
    return `${base}${clean}`;
  }
  // path-based: domain/slug/dashboard
  return `${base}${clean}`;
}

/**
 * Build a relative path for in-app navigation (same origin).
 * OWNER  → `/dashboard`  (subdomain already encodes workspace)
 * Others → `/<slug>/dashboard`
 */
export function workspacePath(
  path: string,
  slug: string,
  role: Role,
): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  if (role === Role.OWNER) {
    return clean;
  }
  return `/${slug}${clean}`;
}

/** Extract workspace slug from a subdomain host header. Returns null if none. */
export function slugFromSubdomain(host: string | null): string | null {
  if (!host) return null;
  const domain = rootDomain();
  // Strip port for comparison when domain includes port
  const domainBase = domain.split(":")[0]!;
  const hostBase = host.split(":")[0]!;

  if (!hostBase.endsWith(`.${domainBase}`)) return null;
  const sub = hostBase.slice(0, -(domainBase.length + 1));
  // Only single-level subdomains (no dots)
  if (!sub || sub.includes(".")) return null;
  return sub;
}
