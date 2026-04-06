#!/usr/bin/env node
// After `prisma generate`, copy the generated .prisma client
// into the desktop's node_modules so electron-builder can package it.
// (Symlinks break during asar packaging — must be a real copy.)

const fs = require("fs");
const path = require("path");

const desktopRoot = path.resolve(__dirname, "..");
const desktopNodeModules = path.join(desktopRoot, "node_modules");

const rootClientDir = path.dirname(
  require.resolve("@prisma/client/package.json", {
    paths: [path.resolve(desktopRoot, "..")],
  })
);
const rootDotPrisma = path.join(path.resolve(rootClientDir, "../.."), ".prisma");

if (!fs.existsSync(rootDotPrisma)) {
  console.error("ERROR: .prisma not found at", rootDotPrisma);
  process.exit(1);
}

const clientDir = path.dirname(require.resolve("@prisma/client/package.json"));
const storeDotPrisma = path.join(path.resolve(clientDir, "../.."), ".prisma");

for (const dest of [storeDotPrisma, path.join(desktopNodeModules, ".prisma")]) {
  if (fs.existsSync(dest)) fs.rmSync(dest, { recursive: true, force: true });
  fs.cpSync(rootDotPrisma, dest, { recursive: true });
  console.log(`Copied .prisma -> ${dest}`);
}
