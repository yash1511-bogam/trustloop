# TrustLoop Desktop — macOS (Tauri/Rust)

Native macOS Tauri wrapper for TrustLoop. Requires **Apple Silicon (M1 or later)**.

Migrated from Electron to Tauri v2 + Rust. Same icons, same design, same patterns.

## What Changed from Electron

| Aspect | Electron | Tauri |
|---|---|---|
| Runtime | Node.js + Chromium (~170MB) | Rust + system WebView (~5MB) |
| Backend | TypeScript (main process) | Rust (src-tauri/src/) |
| DB access | Prisma ORM | sqlx (raw SQL, same schema) |
| IPC | ipcMain/ipcRenderer | Tauri commands + invoke() |
| Preload | preload.ts (contextBridge) | tauri-bridge.js (window.__TAURI__) |
| Menu | Electron Menu API | Tauri Menu API |
| Deep links | app.setAsDefaultProtocolClient | tauri-plugin-deep-link |
| Build | electron-builder | cargo tauri build |

## What Stayed the Same

- All 6 macOS Tahoe icon styles (default, dark, clear-light, clear-dark, tinted-light, tinted-dark)
- Hidden inset titlebar with native traffic lights
- Under-window vibrancy for Liquid Glass translucency
- Same native menu bar with identical shortcuts (⌘1-4, ⌘N, ⌘T, ⌘U, ⌘,)
- OAuth social login (Google/GitHub) via trustloop:// protocol
- Same database, Redis, auth (Stytch), and backend — no separate backend
- Apple Silicon only enforcement at startup
- Window bounds persistence
- Same renderer (index.html, styles.css, app.js) — unchanged

## Prerequisites

- macOS 12+ on Apple Silicon
- Rust toolchain (`rustup` with `aarch64-apple-darwin` target)
- Node.js 20+, pnpm 10+
- The TrustLoop web app's database running (same Postgres + Redis)

## Setup

```bash
cd trustloop-desktop-tauri
pnpm install
```

## Development

```bash
# First time: install web app deps and run dev migrations from the repo root
cd /path/to/trustloop
pnpm install && pnpm prisma:generate && pnpm prisma:migrate

# Then launch the desktop app
cd trustloop-desktop-tauri
pnpm dev
```

## Build distributable

```bash
pnpm build
```

Produces a `.dmg` and `.app` in `src-tauri/target/release/bundle/` targeting `arm64` only.

## Project Structure

```
trustloop-desktop-tauri/
├── src-tauri/
│   ├── Cargo.toml              # Rust dependencies
│   ├── tauri.conf.json         # Tauri config (window, bundle, protocols)
│   ├── build.rs
│   ├── capabilities/
│   │   └── default.json        # Permissions (shell, dialog, notification, deep-link)
│   └── src/
│       ├── main.rs             # Entry point
│       ├── lib.rs              # App setup, plugins, window, macOS styling
│       ├── state.rs            # Shared state (session, DB pool, Redis)
│       ├── auth.rs             # Stytch OTP, OAuth, session caching
│       ├── db.rs               # Database URL normalization
│       ├── redis_mod.rs        # Redis get/set/del
│       ├── secrets.rs          # AWS Secrets Manager
│       ├── menu.rs             # Native macOS menu bar
│       └── commands/
│           ├── mod.rs
│           ├── auth_cmds.rs    # Auth IPC handlers
│           ├── dashboard.rs    # Dashboard data
│           ├── incidents.rs    # Incident CRUD, export, events
│           ├── workspace.rs    # Workspace settings, team, billing
│           ├── analytics.rs    # Analytics summary
│           ├── profile.rs      # User profile
│           ├── integrations.rs # AI keys, webhooks, on-call
│           ├── security.rs     # API keys, audit log, SSO
│           ├── protocol.rs     # trustloop:// deep link handler
│           └── util.rs         # Encryption, helpers
├── src/renderer/
│   ├── index.html              # Same UI (unchanged)
│   ├── styles.css              # Same styles (unchanged)
│   ├── app.js                  # Same app logic (unchanged)
│   └── tauri-bridge.js         # Maps window.trustloop.* → Tauri invoke()
├── assets/                     # All icons, logos (unchanged)
├── build/                      # Entitlements (unchanged)
└── scripts/                    # Icon generation scripts (unchanged)
```
