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

const hardRequiredEnv = ["DATABASE_URL", "REDIS_URL", "NEXT_PUBLIC_APP_URL"];
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

async function waitForCondition(title, checkFn, errorMessage) {
  const spinner = ora({ text: title, color: "cyan" }).start();

  for (let attempt = 1; attempt <= 60; attempt += 1) {
    try {
      const ready = await checkFn();
      if (ready) {
        spinner.succeed(chalk.green(title));
        return;
      }
    } catch {}

    await sleep(2000);
  }

  spinner.fail(chalk.red(title));
  console.error(chalk.red(errorMessage));
  process.exit(1);
}

async function waitForPostgres(databaseUrl) {
  await waitForCondition(
    "Waiting for Postgres readiness",
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
    "Postgres did not become ready in time for DATABASE_URL.",
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

  if (missing.length > 0) {
    console.error(
      boxen(
        `${chalk.bold("Missing required .env keys:")}\n${missing.join("\n")}`,
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
  const databaseUrl = effectiveEnvMap.get("DATABASE_URL");
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

  await waitForPostgres(databaseUrl);
  await waitForRedis(redisUrl);

  if (bootLocalstackDocker) {
    await waitForLocalstack(awsEndpointUrl);
  }

  await runStep("Validating Prisma schema", "pnpm", ["run", "prisma:validate"]);
  await runStep("Generating Prisma client", "pnpm", ["run", "prisma:generate"]);
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
