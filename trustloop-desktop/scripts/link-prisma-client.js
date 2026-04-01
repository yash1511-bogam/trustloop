#!/usr/bin/env node
// After `prisma generate` puts the generated client in the root's pnpm store,
// this script symlinks `.prisma` into the desktop's pnpm store so Electron
// can resolve `.prisma/client/default` at runtime.

const fs = require("fs");
const path = require("path");

// The desktop's @prisma/client package location in the pnpm store
const clientDir = path.dirname(require.resolve("@prisma/client/package.json"));
// The node_modules that contains @prisma/client (go up from @prisma/client → @prisma → node_modules)
const storeNodeModules = path.resolve(clientDir, "../..");
const desktopDotPrisma = path.join(storeNodeModules, ".prisma");

if (fs.existsSync(desktopDotPrisma)) {
  console.log(".prisma already exists in desktop store — skipping.");
  process.exit(0);
}

// The root's @prisma/client package location
const rootClientDir = path.dirname(
  require.resolve("@prisma/client/package.json", {
    paths: [path.resolve(__dirname, "../..")],
  })
);
const rootStoreNodeModules = path.resolve(rootClientDir, "../..");
const rootDotPrisma = path.join(rootStoreNodeModules, ".prisma");

if (!fs.existsSync(rootDotPrisma)) {
  console.error("ERROR: .prisma not found at", rootDotPrisma);
  console.error("Run `pnpm prisma:generate` from the root project first.");
  process.exit(1);
}

fs.symlinkSync(rootDotPrisma, desktopDotPrisma, "dir");
console.log(`Linked ${desktopDotPrisma}\n    -> ${rootDotPrisma}`);
