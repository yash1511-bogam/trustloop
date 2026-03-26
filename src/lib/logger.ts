/**
 * Structured logger — writes to stdout AND rotating log files under /logs.
 *
 * Log files:
 *   logs/app.log        – general app / Next.js / UI server-side
 *   logs/db.log         – Prisma / Postgres queries & errors
 *   logs/redis.log      – Redis connection & command errors
 *   logs/aws.log        – SQS / LocalStack / AWS SDK events
 *   logs/worker.log     – background worker & reminder processing
 *   logs/billing.log    – billing webhooks & grace automation
 *   logs/auth.log       – login, register, OAuth, OTP flows
 *   logs/error.log      – every ERROR/FATAL across all channels
 *   logs/combined.log   – everything in one place
 */

import fs from "node:fs";
import path from "node:path";
import { AsyncLocalStorage } from "node:async_hooks";

// ─── Request context (correlation ID) ─────────────────────────────────────────

interface RequestContext {
  requestId: string;
}

const requestContext = new AsyncLocalStorage<RequestContext>();

/** Run `fn` with a correlation ID attached to every log call inside it. */
export function withRequestId<T>(requestId: string, fn: () => T): T {
  return requestContext.run({ requestId }, fn);
}

/** Return the current request's correlation ID, if any. */
export function getRequestId(): string | undefined {
  return requestContext.getStore()?.requestId;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type LogLevel = "debug" | "info" | "warn" | "error" | "fatal";
export type LogChannel =
  | "app"
  | "db"
  | "redis"
  | "aws"
  | "worker"
  | "billing"
  | "auth"
  | "ui";

interface LogEntry {
  ts: string;
  level: LogLevel;
  channel: LogChannel;
  msg: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const LOG_DIR = path.resolve(process.cwd(), "logs");
const IS_BROWSER = typeof window !== "undefined";
const LEVEL_RANK: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  fatal: 4,
};
type LogMode = "auto" | "file" | "console";
const DEFAULT_LEVEL: LogLevel = "info";
const LEVELS: readonly LogLevel[] = ["debug", "info", "warn", "error", "fatal"];
const requestedLevel = process.env.LOG_LEVEL?.trim().toLowerCase();
const MIN_LEVEL: LogLevel =
  requestedLevel && LEVELS.includes(requestedLevel as LogLevel)
    ? (requestedLevel as LogLevel)
    : DEFAULT_LEVEL;
const LOG_MODES: readonly LogMode[] = ["auto", "file", "console"];
const requestedMode = process.env.LOG_MODE?.trim().toLowerCase();
const configuredLogMode: LogMode =
  requestedMode && LOG_MODES.includes(requestedMode as LogMode)
    ? (requestedMode as LogMode)
    : "auto";

function isServerlessRuntime(): boolean {
  return Boolean(
    process.env.VERCEL === "1" ||
      process.env.AWS_LAMBDA_FUNCTION_NAME ||
      process.env.AWS_EXECUTION_ENV?.includes("AWS_Lambda") ||
      process.env.NETLIFY ||
      process.env.K_SERVICE,
  );
}

const EFFECTIVE_LOG_MODE: "file" | "console" =
  IS_BROWSER || configuredLogMode === "console"
    ? "console"
    : configuredLogMode === "file"
      ? "file"
      : isServerlessRuntime()
        ? "console"
        : "file";

// ─── File writer (server-side only) ──────────────────────────────────────────

const fileStreams = new Map<string, fs.WriteStream>();

function getStream(filename: string): fs.WriteStream | null {
  if (IS_BROWSER || EFFECTIVE_LOG_MODE !== "file") return null;
  if (!fileStreams.has(filename)) {
    try {
      if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
      const stream = fs.createWriteStream(path.join(LOG_DIR, filename), {
        flags: "a",
        encoding: "utf8",
      });
      fileStreams.set(filename, stream);
    } catch {
      return null;
    }
  }
  return fileStreams.get(filename) ?? null;
}

function writeLine(filename: string, line: string) {
  getStream(filename)?.write(line + "\n");
}

// ─── Core write ───────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function write(level: LogLevel, channel: LogChannel, msg: string, meta?: Record<string, any>) {
  if (LEVEL_RANK[level] < LEVEL_RANK[MIN_LEVEL]) return;

  const entry: LogEntry = {
    ts: new Date().toISOString(),
    level,
    channel,
    msg,
    ...(requestContext.getStore()?.requestId && { requestId: requestContext.getStore()!.requestId }),
    ...meta,
  };

  const line = JSON.stringify(entry);

  // Console output
  const consoleFn =
    level === "error" || level === "fatal"
      ? console.error
      : level === "warn"
        ? console.warn
        : console.log;
  consoleFn(`[${entry.ts}] [${level.toUpperCase()}] [${channel}] ${msg}`, meta ?? "");

  if (IS_BROWSER) return;

  // Channel-specific file
  writeLine(`${channel}.log`, line);

  // Error sink — captures all errors regardless of channel
  if (level === "error" || level === "fatal") {
    writeLine("error.log", line);
  }

  // Combined log — everything
  writeLine("combined.log", line);
}

// ─── Public API ───────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Meta = Record<string, any>;

function makeChannel(channel: LogChannel) {
  return {
    debug: (msg: string, meta?: Meta) => write("debug", channel, msg, meta),
    info:  (msg: string, meta?: Meta) => write("info",  channel, msg, meta),
    warn:  (msg: string, meta?: Meta) => write("warn",  channel, msg, meta),
    error: (msg: string, meta?: Meta) => write("error", channel, msg, meta),
    fatal: (msg: string, meta?: Meta) => write("fatal", channel, msg, meta),
  };
}

export const log = {
  app:     makeChannel("app"),
  db:      makeChannel("db"),
  redis:   makeChannel("redis"),
  aws:     makeChannel("aws"),
  worker:  makeChannel("worker"),
  billing: makeChannel("billing"),
  auth:    makeChannel("auth"),
  ui:      makeChannel("ui"),
};

export default log;
