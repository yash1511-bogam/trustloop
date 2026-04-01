// ── Load .env FIRST — before any module that reads process.env ──
// Must use require() here because TS hoists import statements above runtime code.
const path = require("path") as typeof import("path");
const repoRoot = path.resolve(__dirname, "..", "..", "..");
require("dotenv").config({ path: path.join(repoRoot, ".env") });

import { app, BrowserWindow, Menu, shell, nativeTheme, nativeImage, dialog } from "electron";
import Module from "module";

// ── Resolve shared deps (@prisma/client, etc.) from the parent repo's node_modules ──
const parentNodeModules = path.join(repoRoot, "node_modules");
// @ts-ignore — addPath is internal but stable
if (typeof (Module as any)._nodeModulePaths === "function") {
  const origResolve = (Module as any)._resolveFilename;
  (Module as any)._resolveFilename = function (request: string, parent: any, isMain: boolean, options: any) {
    try {
      return origResolve.call(this, request, parent, isMain, options);
    } catch (e: any) {
      if (e.code === "MODULE_NOT_FOUND") {
        // Retry from parent repo's node_modules
        const fakeMod = { id: parentNodeModules, filename: parentNodeModules, paths: (Module as any)._nodeModulePaths(parentNodeModules) };
        return origResolve.call(this, request, fakeMod, isMain, options);
      }
      throw e;
    }
  };
}

import { registerIpcHandlers, getSession, setCurrentSession } from "./ipc";
import { disconnect } from "./db";
import { disconnectRedis } from "./redis";

// ── Apple Silicon gate ──
if (process.arch !== "arm64") {
  dialog.showErrorBox("Unsupported Hardware", "TrustLoop Desktop requires Apple Silicon (M1 or later).");
  app.quit();
}

app.setName("TrustLoop");

const desktopRoot = path.resolve(__dirname, "..", "..");
const ASSETS = path.join(desktopRoot, "assets");
const RENDERER = path.join(desktopRoot, "src", "renderer");
const OAUTH_PROTOCOL = "trustloop";

let mainWindow: BrowserWindow | null = null;

// ── Icons — 6 macOS Tahoe styles ──
// Default: standard colorful icon (light mode, pre-Tahoe or Default style)
// Dark: dark appearance icon
// ClearLight / ClearDark: Liquid Glass translucent (macOS 26 Tahoe only)
// TintedLight / TintedDark: single-color tinted (macOS 26 Tahoe only)
//
// At runtime we pick based on nativeTheme.shouldUseDarkColors.
// The .icns (app bundle icon) uses Default. Dock icon switches dynamically.

const ICON_MAP: Record<string, { dir: string; prefix: string }> = {
  "default":       { dir: "default",       prefix: "Icon-iOS-Default" },
  "dark":          { dir: "dark",          prefix: "Icon-iOS-Dark" },
  "clear-light":   { dir: "clear-light",   prefix: "Icon-iOS-ClearLight" },
  "clear-dark":    { dir: "clear-dark",    prefix: "Icon-iOS-ClearDark" },
  "tinted-light":  { dir: "tinted-light",  prefix: "Icon-iOS-TintedLight" },
  "tinted-dark":   { dir: "tinted-dark",   prefix: "Icon-iOS-TintedDark" },
};

function iconPath(style: string, size: string): string {
  const m = ICON_MAP[style] || ICON_MAP["default"];
  return path.join(ASSETS, "icons", m.dir, `${m.prefix}-${size}.png`);
}

function getIcon(size = "128x128@2x") {
  const isDark = nativeTheme.shouldUseDarkColors;
  // Light mode → default icon, Dark mode → dark icon
  const style = isDark ? "dark" : "default";
  try {
    const p = iconPath(style, size);
    const img = nativeImage.createFromPath(p);
    if (!img.isEmpty()) return img;
  } catch {}
  return nativeImage.createFromPath(iconPath("default", size));
}

// Smaller icon for window titlebar
function getWindowIcon() { return getIcon("32x32@2x"); }
// Larger icon for Dock
function getDockIcon() { return getIcon("512x512@1x"); }

// ── Protocol ──
if (process.defaultApp && process.argv.length >= 2) {
  app.setAsDefaultProtocolClient(OAUTH_PROTOCOL, process.execPath, [path.resolve(process.argv[1])]);
} else {
  app.setAsDefaultProtocolClient(OAUTH_PROTOCOL);
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) { app.quit(); }
else {
  app.on("second-instance", (_e, argv) => {
    if (mainWindow?.isMinimized()) mainWindow.restore();
    mainWindow?.focus();
    const url = argv.find(a => a.startsWith(`${OAUTH_PROTOCOL}://`));
    if (url) handleProtocolUrl(url);
  });
}

app.on("open-url", (e, url) => { e.preventDefault(); handleProtocolUrl(url); });

function handleProtocolUrl(url: string) {
  if (!mainWindow) return;
  try {
    const parsed = new URL(url);
    if (parsed.hostname === "oauth") {
      const key = parsed.searchParams.get("key");
      if (key) {
        // Exchange the one-time key for a session via the web app API
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        fetch(`${appUrl}/api/auth/oauth/desktop/exchange`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key }),
        })
          .then(r => r.json())
          .then((data: any) => {
            if (data.sessionToken && data.user) {
              setCurrentSession({ token: data.sessionToken, user: data.user });
              mainWindow?.webContents.send("oauth-callback");
            }
          })
          .catch(() => {});
      }
    }
  } catch {}
}

// ── Window bounds persistence ──
import * as fs from "fs";
const boundsFile = path.join(app.getPath("userData"), "window-bounds.json");

function loadBounds(): { x?: number; y?: number; width: number; height: number } {
  try {
    return JSON.parse(fs.readFileSync(boundsFile, "utf8"));
  } catch {
    return { width: 1100, height: 620 };
  }
}

function saveBounds() {
  if (!mainWindow) return;
  try { fs.writeFileSync(boundsFile, JSON.stringify(mainWindow.getBounds())); } catch {}
}

// ── Window ──
function createWindow() {
  nativeTheme.themeSource = "system";
  const bounds = loadBounds();
  mainWindow = new BrowserWindow({
    ...bounds,
    minWidth: 960, minHeight: 640,
    icon: getWindowIcon(),
    titleBarStyle: "hiddenInset",
    trafficLightPosition: { x: 16, y: 18 },
    vibrancy: "under-window",
    visualEffectState: "active",
    backgroundColor: "#00000000",
    roundedCorners: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });
  if (app.dock) app.dock.setIcon(getDockIcon());
  mainWindow.once("ready-to-show", () => mainWindow!.show());
  mainWindow.loadFile(path.join(RENDERER, "index.html"));
  mainWindow.on("resize", saveBounds);
  mainWindow.on("move", saveBounds);
  mainWindow.on("closed", () => { mainWindow = null; });
}

// ── Menu ──
function buildMenu() {
  const nav = (page: string) => () => mainWindow?.webContents.send("navigate", page);
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: app.name,
      submenu: [
        { role: "about" }, { type: "separator" },
        { label: "Preferences…", accelerator: "Cmd+,", click: nav("settings") },
        { type: "separator" }, { role: "services" }, { type: "separator" },
        { role: "hide" }, { role: "hideOthers" }, { role: "unhide" },
        { type: "separator" }, { role: "quit" },
      ],
    },
    {
      label: "File",
      submenu: [
        { label: "New Incident", accelerator: "CmdOrCtrl+N", click: nav("new-incident") },
        { type: "separator" }, { role: "close" },
      ],
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" }, { role: "redo" }, { type: "separator" },
        { role: "cut" }, { role: "copy" }, { role: "paste" }, { role: "selectAll" },
      ],
    },
    {
      label: "View",
      submenu: [
        { label: "Dashboard", accelerator: "CmdOrCtrl+1", click: nav("dashboard") },
        { label: "Incidents", accelerator: "CmdOrCtrl+2", click: nav("incidents") },
        { label: "Analytics", accelerator: "CmdOrCtrl+3", click: nav("analytics") },
        { type: "separator" },
        { role: "reload" }, { role: "forceReload" }, { role: "toggleDevTools" },
        { type: "separator" },
        { role: "resetZoom" }, { role: "zoomIn" }, { role: "zoomOut" },
        { type: "separator" }, { role: "togglefullscreen" },
      ],
    },
    {
      label: "Incidents",
      submenu: [
        { label: "New Incident", accelerator: "CmdOrCtrl+N", click: nav("new-incident") },
        { label: "Run AI Triage", accelerator: "CmdOrCtrl+T", click: nav("triage") },
        { label: "Draft Customer Update", accelerator: "CmdOrCtrl+U", click: nav("draft-update") },
      ],
    },
    {
      label: "Workspace",
      submenu: [
        { label: "Settings", accelerator: "CmdOrCtrl+,", click: nav("settings") },
        { label: "Team Members", click: nav("team") },
        { label: "Billing", click: nav("billing") },
        { type: "separator" },
        { label: "API Keys", click: nav("api-keys") },
        { label: "Audit Log", click: nav("audit") },
        { label: "SSO / SAML", click: nav("sso") },
      ],
    },
    {
      label: "Window",
      submenu: [
        { role: "minimize" }, { role: "zoom" }, { type: "separator" },
        { role: "front" }, { type: "separator" }, { role: "window" as any },
      ],
    },
    {
      label: "Help",
      submenu: [
        { label: "Documentation", click: () => shell.openExternal("https://trustloop.ai/docs") },
        { label: "Changelog", click: nav("changelog") },
        { type: "separator" },
        { label: "Contact Support", click: () => shell.openExternal("https://trustloop.ai/contact-sales") },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

nativeTheme.on("updated", () => {
  if (app.dock) app.dock.setIcon(getDockIcon());
});

// ── Lifecycle ──
app.whenReady().then(() => {
  registerIpcHandlers();
  buildMenu();
  createWindow();
  app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });

app.on("before-quit", async () => {
  await disconnect();
  await disconnectRedis();
});
