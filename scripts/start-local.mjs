#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { execa } from "execa";
import ora from "ora";
import chalk from "chalk";
import boxen from "boxen";
import gradient from "gradient-string";

const rootDir = process.cwd();
const envPath = path.join(rootDir, ".env");
const envExamplePath = path.join(rootDir, ".env.example");
const setupOnly = process.argv.includes("--setup-only");
const emptyDbFirst =
  process.argv.includes("--empty-db-first") || process.env.TRUSTLOOP_EMPTY_DB_FIRST === "1";

const hardRequiredEnv = ["REDIS_URL", "NEXT_PUBLIC_APP_URL"];
const warnOnlyEnv = [
  "STYTCH_PROJECT_ID",
  "STYTCH_SECRET",
  "KEY_ENCRYPTION_SECRET",
  "RESEND_API_KEY",
  "RESEND_FROM_EMAIL",
  "DODO_PAYMENTS_API_KEY",
  "DODO_PAYMENTS_WEBHOOK_KEY",
  "DODO_PRODUCT_ID_STARTER",
  "DODO_PRODUCT_ID_PRO",
  "DODO_PRODUCT_ID_ENTERPRISE",
  "AWS_ENDPOINT_URL",
];

const dbEnvAliases = {
  host: ["DATABASE_HOST", "DB_HOST", "PGHOST", "POSTGRES_HOST"],
  port: ["DATABASE_PORT", "DB_PORT", "PGPORT", "POSTGRES_PORT"],
  user: ["DATABASE_USER", "DB_USER", "PGUSER", "POSTGRES_USER"],
  password: ["DATABASE_PASSWORD", "DB_PASSWORD", "PGPASSWORD", "POSTGRES_PASSWORD"],
  name: ["DATABASE_NAME", "DB_NAME", "PGDATABASE", "POSTGRES_DB"],
  schema: ["DATABASE_SCHEMA", "DB_SCHEMA"],
  sslmode: ["DATABASE_SSLMODE", "PGSSLMODE"],
};

const deprecatedSslModes = new Set(["prefer", "require", "verify-ca"]);

function parseEnv(content) {
  const map = new Map();

  for (const rawLine of content.split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const splitIndex = line.indexOf("=");
    if (splitIndex === -1) continue;

    const key = line.slice(0, splitIndex).trim();
    let value = line.slice(splitIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    map.set(key, value);
  }

  return map;
}

function firstEnvValue(envMap, keys) {
  for (const key of keys) {
    const value = envMap.get(key);
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return undefined;
}

function getDbPartsFromEnv(envMap) {
  return {
    host: firstEnvValue(envMap, dbEnvAliases.host),
    port: firstEnvValue(envMap, dbEnvAliases.port) || "5432",
    user: firstEnvValue(envMap, dbEnvAliases.user),
    password: firstEnvValue(envMap, dbEnvAliases.password),
    name: firstEnvValue(envMap, dbEnvAliases.name),
    schema: firstEnvValue(envMap, dbEnvAliases.schema),
    sslmode: firstEnvValue(envMap, dbEnvAliases.sslmode),
  };
}

function getMissingDbParts(parts) {
  const missing = [];

  if (!parts.host) missing.push("DATABASE_HOST (or DB_HOST/PGHOST/POSTGRES_HOST)");
  if (!parts.user) missing.push("DATABASE_USER (or DB_USER/PGUSER/POSTGRES_USER)");
  if (!parts.password) missing.push("DATABASE_PASSWORD (or DB_PASSWORD/PGPASSWORD/POSTGRES_PASSWORD)");
  if (!parts.name) missing.push("DATABASE_NAME (or DB_NAME/PGDATABASE/POSTGRES_DB)");

  return missing;
}

function buildDatabaseUrlFromParts(parts) {
  const missing = getMissingDbParts(parts);
  if (missing.length > 0) {
    return { ok: false, missing };
  }

  const auth = `${encodeURIComponent(parts.user)}:${encodeURIComponent(parts.password)}`;
  const dbName = encodeURIComponent(parts.name);
  const port = parts.port || "5432";
  const params = new URLSearchParams();

  if (parts.schema) {
    params.set("schema", parts.schema);
  }

  if (parts.sslmode) {
    const normalizedSslmode = parts.sslmode.toLowerCase();
    params.set(
      "sslmode",
      deprecatedSslModes.has(normalizedSslmode) ? "verify-full" : normalizedSslmode,
    );
  }

  const query = params.toString();
  const url = `postgresql://${auth}@${parts.host}:${port}/${dbName}${query ? `?${query}` : ""}`;

  return { ok: true, url };
}

function normalizeDatabaseUrlForProject(databaseUrl) {
  if (!databaseUrl) {
    return { url: databaseUrl, changed: false, note: "" };
  }

  try {
    const url = new URL(databaseUrl);
    const currentSslMode = url.searchParams.get("sslmode");
    const normalizedCurrentSslMode = currentSslMode?.toLowerCase();
    const localDb = isLocalDatabaseUrl(databaseUrl);

    if (localDb && currentSslMode) {
      url.searchParams.delete("sslmode");
      return {
        url: url.toString(),
        changed: true,
        note: "Removed sslmode from local DATABASE_URL.",
      };
    }

    if (!localDb && normalizedCurrentSslMode && deprecatedSslModes.has(normalizedCurrentSslMode)) {
      url.searchParams.set("sslmode", "verify-full");
      return {
        url: url.toString(),
        changed: true,
        note: `Updated DATABASE_URL sslmode=${normalizedCurrentSslMode} to sslmode=verify-full.`,
      };
    }

    return { url: databaseUrl, changed: false, note: "" };
  } catch {
    return { url: databaseUrl, changed: false, note: "" };
  }
}

function normalizePgSslModeForProject(databaseUrl, envMap) {
  const currentPgSslMode = (envMap.get("PGSSLMODE") ?? process.env.PGSSLMODE ?? "").toLowerCase();
  if (!currentPgSslMode) {
    return { changed: false, note: "" };
  }

  const localDb = isLocalDatabaseUrl(databaseUrl);
  if (localDb) {
    delete process.env.PGSSLMODE;
    envMap.delete("PGSSLMODE");
    return { changed: true, note: "Removed PGSSLMODE for local Postgres connection." };
  }

  if (deprecatedSslModes.has(currentPgSslMode)) {
    process.env.PGSSLMODE = "verify-full";
    envMap.set("PGSSLMODE", "verify-full");
    return {
      changed: true,
      note: `Updated PGSSLMODE=${currentPgSslMode} to PGSSLMODE=verify-full.`,
    };
  }

  return { changed: false, note: "" };
}

function isPlaceholder(value) {
  if (!value) return true;

  const normalized = value.toLowerCase();
  return (
    normalized.includes("replace-") ||
    normalized.includes("xxxx") ||
    normalized === "test" ||
    normalized === "re_xxx"
  );
}

function buildEffectiveEnvMap(fileEnvMap) {
  const effective = new Map(fileEnvMap);

  for (const [key, value] of Object.entries(process.env)) {
    if (typeof value === "string" && value.length > 0) {
      effective.set(key, value);
    }
  }

  return effective;
}

function applyEnvMapToProcess(envMap) {
  for (const [key, value] of envMap.entries()) {
    process.env[key] = value;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function shouldBootLocalstackDocker(awsEndpointUrl) {
  if (!awsEndpointUrl) return false;

  try {
    const url = new URL(awsEndpointUrl);
    const host = url.hostname.toLowerCase();

    return host === "localhost" || host === "127.0.0.1" || host === "localstack";
  } catch {
    return false;
  }
}

function isLocalDatabaseUrl(databaseUrl) {
  if (!databaseUrl) return false;

  try {
    const url = new URL(databaseUrl);
    const host = url.hostname.toLowerCase();

    return (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "postgres" ||
      host === "trustloop-postgres"
    );
  } catch {
    return false;
  }
}

function formatStepError(error) {
  if (!error || typeof error !== "object") {
    return String(error ?? "").trim();
  }

  const candidates = [error.stderr, error.stdout, error.shortMessage, error.message].filter(
    (part) => typeof part === "string" && part.trim().length > 0,
  );

  return candidates.join("\n").trim();
}

function listMigrationDirectories() {
  const migrationsDir = path.join(rootDir, "prisma", "migrations");
  if (!fs.existsSync(migrationsDir)) return [];

  return fs
    .readdirSync(migrationsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

async function waitForCondition(title, checkFn, errorMessage, options = {}) {
  const { attempts = 60, delayMs = 2000, exitOnFailure = true } = options;
  const spinner = ora({ text: title, color: "cyan" }).start();

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const ready = await checkFn();
      if (ready) {
        spinner.succeed(chalk.green(title));
        return true;
      }
    } catch {}

    await sleep(delayMs);
  }

  spinner.fail(chalk.red(title));
  if (exitOnFailure) {
    console.error(chalk.red(errorMessage));
    process.exit(1);
  }

  return false;
}

async function waitForPostgres(databaseUrl, options = {}) {
  const {
    title = "Waiting for Postgres readiness",
    errorMessage = "Postgres did not become ready in time for DATABASE_URL.",
    exitOnFailure = true,
  } = options;

  return waitForCondition(
    title,
    async () => {
      const { Client } = await import("pg");
      const client = new Client({
        connectionString: databaseUrl,
        connectionTimeoutMillis: 2000,
        query_timeout: 2000,
      });

      try {
        await client.connect();
        await client.query("SELECT 1");
        return true;
      } finally {
        await client.end().catch(() => {});
      }
    },
    errorMessage,
    { exitOnFailure },
  );
}

async function waitForRedis(redisUrl) {
  await waitForCondition(
    "Waiting for Redis readiness",
    async () => {
      const { default: Redis } = await import("ioredis");
      const redis = new Redis(redisUrl, {
        lazyConnect: true,
        connectTimeout: 2000,
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
      });

      try {
        await redis.connect();
        const pong = await redis.ping();
        return pong === "PONG";
      } finally {
        await redis.quit().catch(() => {});
        redis.disconnect();
      }
    },
    "Redis did not become ready in time for REDIS_URL.",
  );
}

async function waitForLocalstack(awsEndpointUrl) {
  const healthUrl = new URL("/_localstack/health", awsEndpointUrl).toString();

  await waitForCondition(
    "Waiting for LocalStack readiness",
    async () => {
      const response = await fetch(healthUrl);
      return response.ok;
    },
    "LocalStack did not become ready in time.",
  );
}

async function hasRequiredAppTables(databaseUrl) {
  const { Client } = await import("pg");
  const client = new Client({
    connectionString: databaseUrl,
    connectionTimeoutMillis: 5000,
    query_timeout: 5000,
  });

  try {
    await client.connect();
    const { rowCount } = await client.query(
      `
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name IN ('User', 'Workspace', 'Incident')
        LIMIT 1
      `,
    );

    return (rowCount ?? 0) > 0;
  } finally {
    await client.end().catch(() => {});
  }
}

async function ensureAppSchemaExists(databaseUrl) {
  const hasTables = await hasRequiredAppTables(databaseUrl);
  if (hasTables) {
    return;
  }

  console.log(
    chalk.yellow(
      "TrustLoop tables were not found after migrations. Creating schema with Prisma db push.",
    ),
  );
  await runStep("Creating app schema (prisma db push)", "pnpm", [
    "exec",
    "prisma",
    "db",
    "push",
    "--skip-generate",
    "--accept-data-loss",
  ]);

  const hasTablesAfterPush = await hasRequiredAppTables(databaseUrl);
  if (!hasTablesAfterPush) {
    console.error(chalk.red("Schema creation did not produce required TrustLoop tables."));
    process.exit(1);
  }
}

async function runStep(title, command, args, options = {}) {
  const { allowFailure = false, ...execaOptions } = options;
  const spinner = ora({ text: title, color: "cyan" }).start();

  try {
    const result = await execa(command, args, {
      cwd: rootDir,
      stdio: "pipe",
      env: process.env,
      ...execaOptions,
    });

    spinner.succeed(chalk.green(title));
    return { ok: true, result };
  } catch (error) {
    spinner.fail(chalk.red(title));
    const errorText = formatStepError(error);

    if (errorText) {
      console.error(chalk.red(errorText));
    }

    if (!allowFailure) {
      process.exit(1);
    }

    return { ok: false, error, errorText };
  }
}

function printHeader() {
  const banner = gradient(["#22d3ee", "#0ea5e9", "#14b8a6"]).multiline(
    "TRUSTLOOP\nLOCAL LAUNCH",
  );

  console.log(`\n${banner}\n`);
  console.log(
    boxen(
      `${chalk.bold("One command local startup")}\n` +
        `${chalk.gray("- installs dependencies")}\n` +
        `${chalk.gray("- uses Postgres + Redis from .env")}\n` +
        `${chalk.gray("- boots LocalStack when endpoint is local")}\n` +
        `${chalk.gray("- runs migrations and queue init")}\n` +
        `${chalk.gray("- launches web app + worker")}`,
      {
        borderColor: "cyan",
        borderStyle: "round",
        padding: 1,
        margin: { top: 0, bottom: 1 },
      },
    ),
  );
}

function printLinks(envMap) {
  const baseUrl = envMap.get("NEXT_PUBLIC_APP_URL") || "http://localhost:3000";

  const lines = [
    `${chalk.bold("App")}:        ${chalk.cyan(baseUrl)}`,
    `${chalk.bold("Login")}:      ${chalk.cyan(`${baseUrl}/login`)}`,
    `${chalk.bold("Recover")}:    ${chalk.cyan(`${baseUrl}/forgot-access`)}`,
    `${chalk.bold("Register")}:   ${chalk.cyan(`${baseUrl}/register`)}`,
    `${chalk.bold("Dashboard")}:  ${chalk.cyan(`${baseUrl}/dashboard`)}`,
    `${chalk.bold("Executive")}:  ${chalk.cyan(`${baseUrl}/executive`)}`,
    `${chalk.bold("Settings")}:   ${chalk.cyan(`${baseUrl}/settings`)}`,
  ];

  console.log(
    boxen(lines.join("\n"), {
      title: "Local Links",
      titleAlignment: "center",
      borderColor: "green",
      borderStyle: "round",
      padding: 1,
      margin: { top: 1, bottom: 1 },
    }),
  );
}

function validateEnv(envMap) {
  const missing = hardRequiredEnv.filter((key) => {
    const value = envMap.get(key);
    return !value;
  });

  const databaseUrl = envMap.get("DATABASE_URL");
  const dbPartsResult = buildDatabaseUrlFromParts(getDbPartsFromEnv(envMap));
  const hasDatabaseConfig = Boolean(databaseUrl) || dbPartsResult.ok;

  if (missing.length > 0 || !hasDatabaseConfig) {
    const lines = [];

    if (missing.length > 0) {
      lines.push(chalk.bold("Missing required .env keys:"), ...missing);
    }

    if (!hasDatabaseConfig) {
      if (lines.length > 0) lines.push("");
      lines.push(
        chalk.bold("Database config is incomplete:"),
        "Set DATABASE_URL or all of these keys:",
        ...dbPartsResult.missing,
      );
    }

    console.error(
      boxen(
        lines.join("\n"),
        {
          borderColor: "red",
          borderStyle: "round",
          padding: 1,
          margin: { top: 1, bottom: 1 },
        },
      ),
    );
    process.exit(1);
  }

  const risky = warnOnlyEnv.filter((key) => isPlaceholder(envMap.get(key)));

  if (risky.length > 0) {
    console.log(
      boxen(
        `${chalk.bold("Warning")}: Placeholder values detected for:\n${risky.join("\n")}\n\n` +
          `The app will start, but auth/email/AI features may fail until these are set.`,
        {
          borderColor: "yellow",
          borderStyle: "round",
          padding: 1,
          margin: { top: 1, bottom: 1 },
        },
      ),
    );
  }
}

function ensureEnvFile() {
  if (fs.existsSync(envPath)) {
    return;
  }

  if (!fs.existsSync(envExamplePath)) {
    console.error(chalk.red(".env is missing and .env.example was not found."));
    process.exit(1);
  }

  fs.copyFileSync(envExamplePath, envPath);
  console.log(chalk.yellow("Created .env from .env.example. Update secrets before production usage."));
}

async function baselineExistingDatabase() {
  const migrationDirs = listMigrationDirectories();

  if (migrationDirs.length === 0) {
    console.error(chalk.red("No migration directories were found under prisma/migrations for P3005 recovery."));
    process.exit(1);
  }

  console.log(chalk.yellow("Detected existing database schema without Prisma history. Baselining migrations..."));

  for (const migration of migrationDirs) {
    await runStep(`Baselining migration ${migration}`, "pnpm", [
      "exec",
      "prisma",
      "migrate",
      "resolve",
      "--applied",
      migration,
    ]);
  }
}

async function checkPrerequisites(bootLocalstackDocker) {
  await runStep("Checking pnpm", "pnpm", ["--version"]);

  if (!bootLocalstackDocker) {
    return;
  }

  await runStep("Checking Docker CLI", "docker", ["--version"]);
  await runStep("Checking Docker Compose", "docker", ["compose", "version"]);
  await runStep("Checking Docker daemon", "docker", ["info"]);
}

async function main() {
  printHeader();

  ensureEnvFile();

  const fileEnvMap = parseEnv(fs.readFileSync(envPath, "utf8"));
  applyEnvMapToProcess(fileEnvMap);
  const effectiveEnvMap = buildEffectiveEnvMap(fileEnvMap);
  validateEnv(effectiveEnvMap);
  let databaseUrl = effectiveEnvMap.get("DATABASE_URL");
  const normalizedDbUrlResult = normalizeDatabaseUrlForProject(databaseUrl);
  if (normalizedDbUrlResult.changed) {
    databaseUrl = normalizedDbUrlResult.url;
    process.env.DATABASE_URL = databaseUrl;
    effectiveEnvMap.set("DATABASE_URL", databaseUrl);
    console.log(chalk.cyan(normalizedDbUrlResult.note));
  }

  const pgSslModeResult = normalizePgSslModeForProject(databaseUrl, effectiveEnvMap);
  if (pgSslModeResult.changed) {
    console.log(chalk.cyan(pgSslModeResult.note));
  }

  const redisUrl = effectiveEnvMap.get("REDIS_URL");
  const awsEndpointUrl = effectiveEnvMap.get("AWS_ENDPOINT_URL");
  const bootLocalstackDocker = shouldBootLocalstackDocker(awsEndpointUrl);

  await checkPrerequisites(bootLocalstackDocker);

  if (bootLocalstackDocker) {
    await runStep("Starting local service (LocalStack)", "docker", [
      "compose",
      "-f",
      "docker-compose.localstack.yml",
      "up",
      "-d",
      "localstack",
    ]);
  } else {
    console.log(chalk.yellow("Skipping LocalStack Docker startup because AWS_ENDPOINT_URL is not local."));
  }

  let postgresReady = await waitForPostgres(databaseUrl, { exitOnFailure: false });
  if (!postgresReady) {
    const dbPartsResult = buildDatabaseUrlFromParts(getDbPartsFromEnv(effectiveEnvMap));

    if (!dbPartsResult.ok) {
      console.error(
        boxen(
          `${chalk.bold("Postgres readiness failed for DATABASE_URL.")}\n` +
            `Fallback via DB host/user/password/name keys is missing:\n${dbPartsResult.missing.join("\n")}`,
          {
            borderColor: "red",
            borderStyle: "round",
            padding: 1,
            margin: { top: 1, bottom: 1 },
          },
        ),
      );
      process.exit(1);
    }

    if (dbPartsResult.url === databaseUrl) {
      console.error(chalk.red("Postgres did not become ready using DATABASE_URL."));
      process.exit(1);
    }

    console.log(
      chalk.yellow("DATABASE_URL was unreachable. Retrying Postgres with DB host/user/password/name from .env."),
    );
    const normalizedFallbackDbUrl = normalizeDatabaseUrlForProject(dbPartsResult.url);
    databaseUrl = normalizedFallbackDbUrl.url;
    process.env.DATABASE_URL = databaseUrl;
    effectiveEnvMap.set("DATABASE_URL", databaseUrl);
    if (normalizedFallbackDbUrl.changed) {
      console.log(chalk.cyan(normalizedFallbackDbUrl.note));
    }

    const fallbackPgSslModeResult = normalizePgSslModeForProject(databaseUrl, effectiveEnvMap);
    if (fallbackPgSslModeResult.changed) {
      console.log(chalk.cyan(fallbackPgSslModeResult.note));
    }

    postgresReady = await waitForPostgres(databaseUrl, {
      title: "Waiting for Postgres readiness (fallback from .env DB parts)",
      errorMessage: "Postgres did not become ready in time for fallback DB connection values.",
      exitOnFailure: false,
    });

    if (!postgresReady) {
      console.error(chalk.red("Postgres did not become ready using DATABASE_URL or fallback DB parts."));
      process.exit(1);
    }
  }

  await waitForRedis(redisUrl);

  if (bootLocalstackDocker) {
    await waitForLocalstack(awsEndpointUrl);
  }

  await runStep("Validating Prisma schema", "pnpm", ["run", "prisma:validate"]);
  await runStep("Generating Prisma client", "pnpm", ["run", "prisma:generate"]);

  if (emptyDbFirst) {
    console.log(chalk.yellow("Empty database mode enabled. Resetting database before migration flow."));
    await runStep("Resetting database (empty-db-first)", "pnpm", [
      "exec",
      "prisma",
      "migrate",
      "reset",
      "--force",
      "--skip-seed",
    ]);
  }

  const migrationStep = await runStep("Applying database migrations", "pnpm", ["run", "prisma:deploy"], {
    allowFailure: true,
  });

  if (!migrationStep.ok) {
    const sawP3005 = migrationStep.errorText.includes("P3005");

    if (sawP3005 && isLocalDatabaseUrl(databaseUrl)) {
      console.log(
        chalk.yellow(
          "Detected P3005 on local Postgres. Resetting local database once to recover migration history.",
        ),
      );
      await runStep("Resetting local database (P3005 recovery)", "pnpm", [
        "exec",
        "prisma",
        "migrate",
        "reset",
        "--force",
        "--skip-seed",
      ]);
      await runStep("Re-applying database migrations", "pnpm", ["run", "prisma:deploy"]);
    } else if (sawP3005) {
      await baselineExistingDatabase();
      await runStep("Re-applying database migrations", "pnpm", ["run", "prisma:deploy"]);
    } else {
      process.exit(1);
    }
  }

  await runStep("Checking migration status", "pnpm", ["run", "prisma:status"]);
  await ensureAppSchemaExists(databaseUrl);
  await runStep("Introspecting database schema (pull/print)", "bash", [
    "-lc",
    "pnpm run prisma:pull:print > /tmp/trustloop-prisma-pull.prisma",
  ]);
  await runStep("Seeding demo data (idempotent)", "pnpm", ["run", "db:seed"]);
  await runStep("Initializing LocalStack reminder queue", "pnpm", ["run", "localstack:init"]);
  await runStep("Running one worker polling cycle", "pnpm", ["run", "worker:once"]);
  await runStep("Running billing grace automation cycle", "pnpm", ["run", "billing:grace:once"]);

  printLinks(effectiveEnvMap);

  if (setupOnly) {
    console.log(chalk.green("Setup-only mode complete. Skipping process launch."));
    return;
  }

  console.log(chalk.bold.green("Starting TrustLoop web app + worker..."));
  console.log(chalk.gray("Press Ctrl+C to stop both processes.\n"));

  await execa("pnpm", ["run", "dev:full"], {
    cwd: rootDir,
    stdio: "inherit",
  });
}

main().catch((error) => {
  console.error(chalk.red(error instanceof Error ? error.message : String(error)));
  process.exit(1);
});
