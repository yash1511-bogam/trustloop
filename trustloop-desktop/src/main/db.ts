// Exact same Prisma setup as the web app (src/lib/prisma.ts).
// Both desktop and web connect to the same Postgres, same schema, same tables.

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const deprecatedSslModes = new Set(["prefer", "require", "verify-ca"]);

function requiredValue(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function isLocalDatabaseHost(host: string): boolean {
  const n = host.toLowerCase();
  return n === "localhost" || n === "127.0.0.1" || n === "postgres" || n === "trustloop-postgres";
}

function normalizeDatabaseUrl(cs: string): string {
  try {
    const url = new URL(cs);
    const local = isLocalDatabaseHost(url.hostname);
    const ssl = url.searchParams.get("sslmode")?.toLowerCase();
    if (local && ssl) { url.searchParams.delete("sslmode"); return url.toString(); }
    if (!local && ssl && deprecatedSslModes.has(ssl)) { url.searchParams.set("sslmode", "verify-full"); return url.toString(); }
    return cs;
  } catch { return cs; }
}

function normalizePgSslMode(cs: string): void {
  const current = process.env.PGSSLMODE?.toLowerCase();
  if (!current) return;
  try {
    if (isLocalDatabaseHost(new URL(cs).hostname)) { delete process.env.PGSSLMODE; return; }
  } catch { return; }
  if (deprecatedSslModes.has(current)) process.env.PGSSLMODE = "verify-full";
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const rawUrl = requiredValue("DATABASE_URL");
const normalizedUrl = normalizeDatabaseUrl(rawUrl);
process.env.DATABASE_URL = normalizedUrl;
normalizePgSslMode(normalizedUrl);

const poolSize = parseInt(process.env.DATABASE_POOL_SIZE ?? "", 10) || undefined;
const adapter = new PrismaPg({ connectionString: normalizedUrl, ...(poolSize ? { max: poolSize } : {}) });

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ log: ["error"], adapter });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export async function disconnect(): Promise<void> {
  await prisma.$disconnect();
}
