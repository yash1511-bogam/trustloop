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
const MIN_LEVEL: LogLevel =
  (process.env.LOG_LEVEL as LogLevel | undefined) ?? "info";

// ─── File writer (server-side only) ──────────────────────────────────────────

const fileStreams = new Map<string, fs.WriteStream>();

function getStream(filename: string): fs.WriteStream | null {
  if (IS_BROWSER) return null;
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
