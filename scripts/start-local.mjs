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

async function runStep(title, command, args, options = {}) {
  const spinner = ora({ text: title, color: "cyan" }).start();

  try {
    const result = await execa(command, args, {
      cwd: rootDir,
      stdio: "pipe",
      ...options,
    });

    spinner.succeed(chalk.green(title));
    return result;
  } catch (error) {
    spinner.fail(chalk.red(title));

    if (error.stderr) {
      console.error(chalk.red(error.stderr.trim()));
    } else if (error.message) {
      console.error(chalk.red(error.message));
    }

    process.exit(1);
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
        `${chalk.gray("- boots Postgres + Redis + LocalStack")}\n` +
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

async function checkPrerequisites() {
  await runStep("Checking Docker CLI", "docker", ["--version"]);
  await runStep("Checking Docker Compose", "docker", ["compose", "version"]);
  await runStep("Checking Docker daemon", "docker", ["info"]);
}

async function main() {
  printHeader();

  ensureEnvFile();

  const envMap = parseEnv(fs.readFileSync(envPath, "utf8"));
  validateEnv(envMap);

  await checkPrerequisites();
  await runStep("Starting local services (Postgres, Redis, LocalStack)", "docker", [
    "compose",
    "-f",
    "docker-compose.localstack.yml",
    "up",
    "-d",
  ]);

  await runStep("Generating Prisma client", "npm", ["run", "prisma:generate"]);
  await runStep("Applying database migrations", "npm", ["run", "prisma:deploy"]);
  await runStep("Seeding demo data (idempotent)", "npm", ["run", "db:seed"]);
  await runStep("Initializing LocalStack reminder queue", "npm", ["run", "localstack:init"]);

  printLinks(envMap);

  if (setupOnly) {
    console.log(chalk.green("Setup-only mode complete. Skipping process launch."));
    return;
  }

  console.log(chalk.bold.green("Starting TrustLoop web app + worker..."));
  console.log(chalk.gray("Press Ctrl+C to stop both processes.\n"));

  await execa("npm", ["run", "dev:full"], {
    cwd: rootDir,
    stdio: "inherit",
  });
}

main().catch((error) => {
  console.error(chalk.red(error instanceof Error ? error.message : String(error)));
  process.exit(1);
});
