#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const rootDir = process.cwd();
const defaultJobs = [
  {
    input: "TrustLoop-System-Design.excalidraw",
    output: "docs/diagrams/trustloop-system-design.svg",
  },
  {
    input: "TrustLoop-System-Design-detail.excalidraw",
    output: "docs/diagrams/trustloop-system-design-detail.svg",
  },
];

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function normalizeBox(element) {
  const width = Math.abs(element.width ?? 0);
  const height = Math.abs(element.height ?? 0);
  const x = (element.x ?? 0) + Math.min(0, element.width ?? 0);
  const y = (element.y ?? 0) + Math.min(0, element.height ?? 0);

  return { x, y, width, height };
}

function arrowPoints(element) {
  const points = Array.isArray(element.points) ? element.points : [];

  return points.map(([px, py]) => ({
    x: (element.x ?? 0) + px,
    y: (element.y ?? 0) + py,
  }));
}

function collectBounds(elements) {
  const points = [];

  for (const element of elements) {
    if (element.type === "arrow") {
      for (const point of arrowPoints(element)) {
        points.push(point);
      }
      continue;
    }

    const box = normalizeBox(element);
    points.push({ x: box.x, y: box.y });
    points.push({ x: box.x + box.width, y: box.y + box.height });
  }

  if (points.length === 0) {
    return { minX: 0, minY: 0, maxX: 800, maxY: 600 };
  }

  const minX = Math.min(...points.map((point) => point.x));
  const minY = Math.min(...points.map((point) => point.y));
  const maxX = Math.max(...points.map((point) => point.x));
  const maxY = Math.max(...points.map((point) => point.y));

  return { minX, minY, maxX, maxY };
}

function markerId(color) {
  return `arrow-${color.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase() || "default"}`;
}

function renderRectangle(element) {
  const { x, y, width, height } = normalizeBox(element);
  const radius = Math.min(12, width / 10, height / 10);

  return `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${radius}" ry="${radius}" fill="${element.backgroundColor === "transparent" ? "none" : element.backgroundColor}" stroke="${element.strokeColor}" stroke-width="${element.strokeWidth ?? 1}" opacity="${(element.opacity ?? 100) / 100}" />`;
}

function renderDiamond(element) {
  const { x, y, width, height } = normalizeBox(element);
  const points = [
    `${x + width / 2},${y}`,
    `${x + width},${y + height / 2}`,
    `${x + width / 2},${y + height}`,
    `${x},${y + height / 2}`,
  ].join(" ");

  return `<polygon points="${points}" fill="${element.backgroundColor === "transparent" ? "none" : element.backgroundColor}" stroke="${element.strokeColor}" stroke-width="${element.strokeWidth ?? 1}" opacity="${(element.opacity ?? 100) / 100}" />`;
}

function renderArrow(element, markerIds) {
  const points = arrowPoints(element);
  if (points.length < 2) {
    return "";
  }

  const marker = markerId(element.strokeColor ?? "#1e1e1e");
  markerIds.add(`${marker}|${element.strokeColor ?? "#1e1e1e"}`);
  const pointsAttr = points.map((point) => `${point.x},${point.y}`).join(" ");
  const startMarker = element.startArrowhead ? ` marker-start="url(#${marker})"` : "";
  const endMarker = element.endArrowhead ? ` marker-end="url(#${marker})"` : "";

  return `<polyline points="${pointsAttr}" fill="none" stroke="${element.strokeColor}" stroke-width="${element.strokeWidth ?? 1}" stroke-linecap="round" stroke-linejoin="round" opacity="${(element.opacity ?? 100) / 100}"${startMarker}${endMarker} />`;
}

function textAnchor(textAlign) {
  if (textAlign === "center") return "middle";
  if (textAlign === "right") return "end";
  return "start";
}

function textX(box, align) {
  if (align === "middle") return box.x + box.width / 2;
  if (align === "end") return box.x + box.width;
  return box.x;
}

function renderText(element) {
  const box = normalizeBox(element);
  const size = element.fontSize ?? 16;
  const lineHeight = (element.lineHeight ?? 1.25) * size;
  const align = textAnchor(element.textAlign);
  const x = textX(box, align);
  const lines = String(element.text ?? "").split("\n");
  const fill = element.strokeColor ?? "#1e1e1e";
  const family =
    "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji'";

  const tspans = lines
    .map((line, index) => {
      const dy = index === 0 ? 0 : lineHeight;
      return `<tspan x="${x}" dy="${dy}">${escapeXml(line || " ")}</tspan>`;
    })
    .join("");

  return `<text x="${x}" y="${box.y}" fill="${fill}" font-size="${size}" font-family="${family}" text-anchor="${align}" dominant-baseline="hanging" opacity="${(element.opacity ?? 100) / 100}">${tspans}</text>`;
}

function renderSvg(inputPath, outputPath) {
  const raw = fs.readFileSync(inputPath, "utf8");
  const document = JSON.parse(raw);
  const elements = (document.elements ?? []).filter((element) => !element.isDeleted);
  const bounds = collectBounds(elements);
  const padding = 32;
  const minX = bounds.minX - padding;
  const minY = bounds.minY - padding;
  const width = Math.max(1, bounds.maxX - bounds.minX + padding * 2);
  const height = Math.max(1, bounds.maxY - bounds.minY + padding * 2);
  const markerIds = new Set();
  const body = [];

  const backgroundColor = document.appState?.viewBackgroundColor ?? "#ffffff";
  body.push(`<rect x="${minX}" y="${minY}" width="${width}" height="${height}" fill="${backgroundColor}" />`);

  for (const element of elements) {
    if (element.type === "rectangle") {
      body.push(renderRectangle(element));
      continue;
    }

    if (element.type === "diamond") {
      body.push(renderDiamond(element));
      continue;
    }

    if (element.type === "arrow") {
      body.push(renderArrow(element, markerIds));
      continue;
    }

    if (element.type === "text") {
      body.push(renderText(element));
    }
  }

  const markers = [...markerIds]
    .map((entry) => {
      const [id, color] = entry.split("|");
      return `<marker id="${id}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="${color}" /></marker>`;
    })
    .join("");

  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${minX} ${minY} ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="${escapeXml(path.basename(inputPath, ".excalidraw"))}">`,
    "<defs>",
    markers,
    "</defs>",
    body.join(""),
    "</svg>",
  ].join("");

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${svg}\n`);
}

function resolveJobs(args) {
  if (args.length === 0) {
    return defaultJobs;
  }

  if (args.length === 2) {
    return [{ input: args[0], output: args[1] }];
  }

  throw new Error("Usage: node scripts/export-excalidraw-svg.mjs [input.excalidraw output.svg]");
}

try {
  const jobs = resolveJobs(process.argv.slice(2));

  for (const job of jobs) {
    renderSvg(path.resolve(rootDir, job.input), path.resolve(rootDir, job.output));
    process.stdout.write(`Wrote ${job.output}\n`);
  }
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
