#!/usr/bin/env node
/**
 * tail-logs.mjs
 * Live-tail one or more log files from the /logs directory.
 *
 * Usage:
 *   node scripts/tail-logs.mjs                  # tails combined.log
 *   node scripts/tail-logs.mjs error             # tails error.log
 *   node scripts/tail-logs.mjs db redis aws      # tails db + redis + aws logs
 *   node scripts/tail-logs.mjs --list            # list available log files
 *
 * Channels: app | db | redis | aws | worker | billing | auth | ui | error | combined
 */

import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOG_DIR = path.resolve(__dirname, "../logs");

const COLORS = {
  debug:   "\x1b[90m",   // grey
  info:    "\x1b[36m",   // cyan
  warn:    "\x1b[33m",   // yellow
  error:   "\x1b[31m",   // red
  fatal:   "\x1b[35m",   // magenta
  reset:   "\x1b[0m",
  channel: "\x1b[32m",   // green
  ts:      "\x1b[90m",   // grey
};

function colorLevel(level) {
  return `${COLORS[level] ?? ""}${level.toUpperCase().padEnd(5)}${COLORS.reset}`;
}

function formatLine(raw, filename) {
  try {
    const entry = JSON.parse(raw);
    const ts      = `${COLORS.ts}${entry.ts}${COLORS.reset}`;
    const level   = colorLevel(entry.level ?? "info");
    const channel = `${COLORS.channel}[${entry.channel ?? filename.replace(".log", "")}]${COLORS.reset}`;
    const msg     = entry.msg ?? "";
    const rest    = Object.entries(entry)
      .filter(([k]) => !["ts", "level", "channel", "msg"].includes(k))
      .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
      .join(" ");
    return `${ts} ${level} ${channel} ${msg}${rest ? "  " + rest : ""}`;
  } catch {
    return raw;
  }
}

function tailFile(filename) {
  const filepath = path.join(LOG_DIR, filename);

  // Print last 20 lines on start
  if (fs.existsSync(filepath)) {
    const lines = fs.readFileSync(filepath, "utf8").split("\n").filter(Boolean);
    const tail  = lines.slice(-20);
    for (const line of tail) {
      console.log(formatLine(line, filename));
    }
  } else {
    console.log(`\x1b[33m[tail-logs] Waiting for ${filename} to be created...\x1b[0m`);
  }

  // Watch for new lines
  let size = fs.existsSync(filepath) ? fs.statSync(filepath).size : 0;

  fs.watchFile(filepath, { interval: 300 }, (curr) => {
    if (curr.size <= size) return;
    const stream = fs.createReadStream(filepath, {
      start: size,
      end: curr.size,
      encoding: "utf8",
    });
    const rl = readline.createInterface({ input: stream });
    rl.on("line", (line) => {
      if (line.trim()) console.log(formatLine(line, filename));
    });
    size = curr.size;
  });
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);

if (args.includes("--list")) {
  if (!fs.existsSync(LOG_DIR)) {
    console.log("No logs directory found yet. Start the app first.");
  } else {
    const files = fs.readdirSync(LOG_DIR).filter((f) => f.endsWith(".log"));
    console.log("Available log files:\n" + files.map((f) => `  ${f}`).join("\n"));
  }
  process.exit(0);
}

const channels = args.length > 0 ? args : ["combined"];
const filenames = channels.map((c) => (c.endsWith(".log") ? c : `${c}.log`));

console.log(`\x1b[36mTailing: ${filenames.join(", ")}  (Ctrl+C to stop)\x1b[0m\n`);

if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

for (const filename of filenames) {
  tailFile(filename);
}
