import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const deprecatedSslModes = new Set(["prefer", "require", "verify-ca"]);

function requiredValue(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required.`);
  }
  return value;
}

function isLocalDatabaseHost(host: string): boolean {
  const normalized = host.toLowerCase();
  return (
    normalized === "localhost" ||
    normalized === "127.0.0.1" ||
    normalized === "postgres" ||
    normalized === "trustloop-postgres"
  );
}

function normalizeDatabaseUrlForProject(connectionString: string): string {
  try {
    const url = new URL(connectionString);
    const localDb = isLocalDatabaseHost(url.hostname);
    const sslMode = url.searchParams.get("sslmode")?.toLowerCase();

    if (localDb && sslMode) {
      url.searchParams.delete("sslmode");
      return url.toString();
    }

    if (!localDb && sslMode && deprecatedSslModes.has(sslMode)) {
      url.searchParams.set("sslmode", "verify-full");
      return url.toString();
    }

    return connectionString;
  } catch {
    return connectionString;
  }
}

function normalizePgSslModeForProject(connectionString: string): void {
  const current = process.env.PGSSLMODE?.toLowerCase();
  if (!current) {
    return;
  }

  try {
    const host = new URL(connectionString).hostname;
    if (isLocalDatabaseHost(host)) {
      delete process.env.PGSSLMODE;
      return;
    }
  } catch {
    return;
  }

  if (deprecatedSslModes.has(current)) {
    process.env.PGSSLMODE = "verify-full";
  }
}

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

const rawDatabaseUrl = requiredValue("DATABASE_URL");
const normalizedDatabaseUrl = normalizeDatabaseUrlForProject(rawDatabaseUrl);
process.env.DATABASE_URL = normalizedDatabaseUrl;
normalizePgSslModeForProject(normalizedDatabaseUrl);

const adapter = new PrismaPg({
  connectionString: normalizedDatabaseUrl,
});

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["error"],
    adapter,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
