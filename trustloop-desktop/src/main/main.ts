// ── Load .env FIRST — before any module that reads process.env ──
// In production, secrets come from AWS Secrets Manager instead.
const path = require("path") as typeof import("path");
const repoRoot = path.resolve(__dirname, "..", "..", "..");
if (process.env.NODE_ENV !== "production") {
  require("dotenv").config({ path: path.join(repoRoot, ".env") });
}

import { app, BrowserWindow, Menu, shell, nativeTheme, nativeImage, dialog, Notification, ipcMain } from "electron";
import Module from "module";

// ── Resolve shared deps from the parent repo (dev) or asar (packaged) ──
const parentNodeModules = path.join(repoRoot, "node_modules");
const asarNodeModules = path.join(__dirname, "..", "..", "node_modules");
// @ts-ignore — addPath is internal but stable
if (typeof (Module as any)._nodeModulePaths === "function") {
  const origResolve = (Module as any)._resolveFilename;
  (Module as any)._resolveFilename = function (request: string, parent: any, isMain: boolean, options: any) {
    try {
      return origResolve.call(this, request, parent, isMain, options);
    } catch (e: any) {
      if (e.code === "MODULE_NOT_FOUND") {
        // Try asar node_modules first (for extraResources code needing asar deps)
        for (const dir of [asarNodeModules, parentNodeModules]) {
          try {
            const fakeMod = { id: dir, filename: dir, paths: (Module as any)._nodeModulePaths(dir) };
            return origResolve.call(this, request, fakeMod, isMain, options);
          } catch {}
        }
      }
      throw e;
    }
  };
}

import { registerIpcHandlers, setCurrentSession } from "./ipc";
import { disconnect } from "./db";
import { disconnectRedis } from "./redis";
import { loadAwsSecrets } from "./secrets";

// ── Apple Silicon gate ──
if (process.arch !== "arm64") {
  dialog.showErrorBox("Unsupported Hardware", "TrustLoop Desktop requires Apple Silicon (M1 or later).");
  app.quit();
}

app.setName("TrustLoop");

const desktopRoot = path.resolve(__dirname, "..", "..");
const ASSETS = app.isPackaged
  ? path.join(process.resourcesPath, "assets")
  : path.join(desktopRoot, "assets");
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

function getIconForStyle(style: string, size: string) {
  try {
    const img = nativeImage.createFromPath(iconPath(style, size));
    if (!img.isEmpty()) return img;
  } catch {}
  return nativeImage.createFromPath(iconPath("default", size));
}

// Tray / menu bar icon: tinted style
function getWindowIcon() {
  const style = nativeTheme.shouldUseDarkColors ? "tinted-dark" : "tinted-light";
  return getIconForStyle(style, "32x32@2x");
}

// ── Protocol ──
// In dev, register with the full path to our compiled main.js so macOS
// re-launches *this* app (not a bare Electron window) on protocol open.
if (process.defaultApp && process.argv.length >= 2) {
  app.setAsDefaultProtocolClient(OAUTH_PROTOCOL, process.execPath, [path.resolve(process.argv[1])]);
} else {
  app.setAsDefaultProtocolClient(OAUTH_PROTOCOL);
}

// Hold any protocol URL that arrives before the window is ready
let pendingProtocolUrl: string | null = null;

// On macOS, check if launched with a protocol URL in argv
const launchUrl = process.argv.find(a => a.startsWith(`${OAUTH_PROTOCOL}://`));
if (launchUrl) pendingProtocolUrl = launchUrl;

const gotLock = app.requestSingleInstanceLock({ protocolUrl: launchUrl || null });
if (!gotLock) { app.quit(); }
else {
  app.on("second-instance", (_e, argv, _workDir, additionalData: any) => {
    if (mainWindow?.isMinimized()) mainWindow.restore();
    mainWindow?.focus();
    // Protocol URL may come via additionalData (our lock data) or argv
    const url = additionalData?.protocolUrl || argv.find(a => a.startsWith(`${OAUTH_PROTOCOL}://`));
    if (url) handleProtocolUrl(url);
  });
}

// macOS fires open-url for custom protocol links — may arrive before app is ready
app.on("open-url", (e, url) => {
  e.preventDefault();
  if (mainWindow) {
    handleProtocolUrl(url);
  } else {
    pendingProtocolUrl = url;
  }
});

function handleProtocolUrl(url: string) {
  if (!mainWindow) { pendingProtocolUrl = url; return; }
  try {
    const parsed = new URL(url);
    if (parsed.hostname === "oauth") {
      const key = parsed.searchParams.get("key");
      if (key) {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://trustloop.yashbogam.me";
        fetch(`${appUrl}/api/auth/oauth/desktop/exchange`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key }),
        })
          .then(r => r.json())
          .then((data: any) => {
            if (data.sessionToken && data.user) {
              setCurrentSession({ token: data.sessionToken, user: data.user });
              if (mainWindow) {
                mainWindow.show();
                mainWindow.focus();
              }
              mainWindow?.webContents.send("oauth-callback", data.user);
            }
          })
          .catch(() => {});
      }
    }
  } catch {}
}

export function processPendingProtocolUrl() {
  if (pendingProtocolUrl) {
    const url = pendingProtocolUrl;
    pendingProtocolUrl = null;
    handleProtocolUrl(url);
  }
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
  // Let macOS use the bundle .icns for the dock icon (proper padding/sizing)
  mainWindow.once("ready-to-show", () => mainWindow!.show());
  mainWindow.loadFile(path.join(RENDERER, "index.html"));
  mainWindow.webContents.once("did-finish-load", () => processPendingProtocolUrl());
  mainWindow.on("resize", saveBounds);
  mainWindow.on("move", saveBounds);
  mainWindow.on("closed", () => { mainWindow = null; });
}

// ── Update state ──
let updateState: "idle" | "available" | "downloading" | "ready" = "idle";
let updateVersion = "";
let updateDmgPath = "";

function sendUpdateState() {
  // Only notify renderer when there's something to show
  if (updateState === "idle") return;
  mainWindow?.webContents.send("update-state", { state: updateState, version: updateVersion });
}

function checkForUpdatesQuiet() {
  const currentVersion = app.getVersion();
  fetch("https://api.github.com/repos/yash1511-bogam/trustloop/releases/latest", {
    headers: { Accept: "application/vnd.github+json" },
  })
    .then(r => r.ok ? r.json() : null)
    .then((release: any) => {
      if (!release || !release.tag_name) return;
      const latest = (release.tag_name || "").replace(/^v/, "").trim();
      if (!latest || latest === currentVersion) return;
      updateVersion = latest;
      updateState = "available";
      sendUpdateState();
      rebuildMenu();
    })
    .catch(() => {});
}

function downloadUpdate() {
  if (updateState !== "available") return;
  updateState = "downloading";
  sendUpdateState();
  const tmpDir = path.join(app.getPath("temp"), "trustloop-update");
  fs.mkdirSync(tmpDir, { recursive: true });
  const tag = `v${updateVersion}`;
  fetch(`https://api.github.com/repos/yash1511-bogam/trustloop/releases/tags/${tag}`, {
    headers: { Accept: "application/vnd.github+json" },
  })
    .then(r => r.ok ? r.json() : null)
    .then((release: any) => {
      if (!release) { updateState = "available"; sendUpdateState(); return; }
      const asset = (release.assets || []).find((a: any) => a.name.includes("arm64") && a.name.endsWith(".dmg"));
      if (!asset) { updateState = "available"; sendUpdateState(); return; }
      return fetch(asset.browser_download_url).then(r => r.arrayBuffer()).then(buf => {
        const dest = path.join(tmpDir, asset.name);
        fs.writeFileSync(dest, Buffer.from(buf));
        updateDmgPath = dest;
        updateState = "ready";
        sendUpdateState();
        rebuildMenu();
      });
    })
    .catch(() => { updateState = "available"; sendUpdateState(); });
}

function installUpdate() {
  if (updateState !== "ready" || !updateDmgPath) return;
  shell.openPath(updateDmgPath);
  setTimeout(() => app.quit(), 1500);
}

function checkForUpdates() {
  const currentVersion = app.getVersion();
  fetch("https://api.github.com/repos/yash1511-bogam/trustloop/releases/latest", {
    headers: { Accept: "application/vnd.github+json" },
  })
    .then(r => r.ok ? r.json() : null)
    .then((release: any) => {
      if (!release) {
        dialog.showMessageBox({ type: "info", title: "Check for Updates", message: "Unable to check for updates.", detail: "Could not reach GitHub. Check your internet connection.", buttons: ["OK"] });
        return;
      }
      const latest = (release.tag_name || "").replace(/^v/, "");
      if (latest && latest !== currentVersion) {
        updateVersion = latest;
        updateState = "available";
        sendUpdateState();
        rebuildMenu();
      } else {
        dialog.showMessageBox({ type: "info", title: "No Updates", message: "You're up to date!", detail: `TrustLoop ${currentVersion} is the latest version.`, buttons: ["OK"] });
      }
    })
    .catch(() => {
      dialog.showMessageBox({ type: "info", title: "Check for Updates", message: "Unable to check for updates.", detail: "Could not reach GitHub. Check your internet connection.", buttons: ["OK"] });
    });
}

// ── Menu ──
function rebuildMenu() {
  const nav = (page: string) => () => mainWindow?.webContents.send("navigate", page);
  const updateMenuItem: Electron.MenuItemConstructorOptions = updateState === "ready"
    ? { label: "Install Update…", click: () => installUpdate() }
    : { label: "Check for Updates…", click: () => checkForUpdates() };
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: app.name,
      submenu: [
        {
          label: "About TrustLoop",
          click: () => {
            const icon = nativeImage.createFromPath(iconPath("default", "256x256@1x"));
            dialog.showMessageBox({
              type: "none",
              icon: icon.isEmpty() ? undefined : icon,
              title: "About TrustLoop",
              message: "TrustLoop",
              detail: "Version 0.10.0\n© 2025 TrustLoop",
              buttons: ["OK"],
            });
          },
        },
        updateMenuItem,
        { type: "separator" },
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
        { label: "Search", accelerator: "CmdOrCtrl+Shift+/", click: nav("search-settings") },
        { type: "separator" },
        { label: "Documentation", click: () => shell.openExternal("https://trustloop.ai/docs") },
        { label: "Changelog", click: nav("changelog") },
        { type: "separator" },
        { label: "Contact Support", click: () => shell.openExternal("https://trustloop.ai/contact-sales") },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// Dock icon is handled by the bundle .icns — no runtime switching needed.

// ── First-launch notification ──

function showFirstLaunchNotification() {
  const flagPath = path.join(app.getPath("userData"), ".notif-shown");
  if (fs.existsSync(flagPath)) return;
  if (!Notification.isSupported()) return;

  // Delay so macOS registers the app for notifications before we fire one
  setTimeout(() => {
    const icon = nativeImage.createFromPath(iconPath("default", "256x256@1x"));
    const notif = new Notification({
      title: "TrustLoop",
      body: "Notifications are allowed. You'll receive incident alerts here.",
      ...(icon.isEmpty() ? {} : { icon }),
      silent: false,
    });
    notif.on("show", () => {
      fs.writeFileSync(flagPath, new Date().toISOString(), "utf-8");
    });
    notif.show();
    // Write flag after a short delay as fallback (macOS doesn't always emit "show")
    setTimeout(() => {
      if (!fs.existsSync(flagPath)) {
        fs.writeFileSync(flagPath, new Date().toISOString(), "utf-8");
      }
    }, 3000);
  }, 5000);
}

// ── Move to /Applications prompt ──
function promptMoveToApplications(): Promise<void> {
  return new Promise((resolve) => {
    if (process.env.NODE_ENV !== "production" || !app.isPackaged || app.isInApplicationsFolder()) {
      return resolve();
    }
    const icon = nativeImage.createFromPath(iconPath("default", "128x128@2x"));
    const win = new BrowserWindow({
      width: 370,
      height: 180,
      resizable: false,
      minimizable: false,
      maximizable: false,
      fullscreenable: false,
      titleBarStyle: "hidden",
      vibrancy: "under-window",
      visualEffectState: "active",
      backgroundColor: "#00000000",
      roundedCorners: true,
      show: false,
      alwaysOnTop: true,
      webPreferences: { contextIsolation: true, nodeIntegration: false },
    });
    if (app.dock) app.dock.setBadge("");
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
      *{margin:0;padding:0;box-sizing:border-box;-webkit-app-region:drag}
      body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;padding:24px;color:#e5e5e5;background:transparent}
      .wrap{text-align:center;max-width:320px}
      h2{font-size:15px;font-weight:600;margin-bottom:6px}
      p{font-size:12px;color:#999;margin-bottom:20px;line-height:1.4}
      .btns{display:flex;gap:10px;justify-content:center;-webkit-app-region:no-drag}
      button{font-size:13px;padding:7px 20px;border-radius:8px;border:none;cursor:pointer;font-weight:500;transition:opacity .15s}
      button:hover{opacity:.85}
      .move{background:#c2662d;color:#fff}
      .skip{background:rgba(255,255,255,.08);color:#bbb}
    </style></head><body><div class="wrap">
      <h2>Move to Applications?</h2>
      <p>Move TrustLoop to your Applications folder for the best experience.</p>
      <div class="btns">
        <button class="skip" onclick="window.close()">Not Now</button>
        <button class="move" id="mv">Move</button>
      </div>
    </div><script>
      document.getElementById('mv').onclick=()=>{fetch('trustloop://move').catch(()=>{});window.close()};
    </script></body></html>`;
    win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
    win.once("ready-to-show", () => win.show());
    win.webContents.on("will-navigate", (e, url) => {
      e.preventDefault();
      if (url.includes("trustloop://move")) {
        try { app.moveToApplicationsFolder(); } catch {}
      }
    });
    win.on("closed", () => resolve());
  });
}

// ── Lifecycle ──
app.whenReady().then(async () => {
  await loadAwsSecrets();
  await promptMoveToApplications();
  registerIpcHandlers();
  ipcMain.on("update:download", () => downloadUpdate());
  ipcMain.on("update:install", () => installUpdate());
  ipcMain.on("update:dismiss", () => {
    updateState = "idle";
    mainWindow?.webContents.send("update-state", { state: "idle", version: "" });
  });
  rebuildMenu();
  createWindow();
  showFirstLaunchNotification();
  // Check for updates silently on startup
  setTimeout(() => checkForUpdatesQuiet(), 2000);
  app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });

app.on("before-quit", async () => {
  await disconnect();
  await disconnectRedis();
});
