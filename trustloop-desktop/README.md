# TrustLoop Desktop — macOS

Native macOS Electron wrapper for TrustLoop. Requires **Apple Silicon (M1 or later)**.

## What This Does

- Wraps the TrustLoop web app in a native macOS window with Liquid Glass–inspired styling (macOS Tahoe)
- Provides native macOS menu bar with shortcuts for incidents, triage, analytics, workspace settings
- Delegates OAuth social login (Google / GitHub) to the default browser for security
- Uses the same database, Redis, auth (Stytch), and backend as the web app — no separate backend
- Enforces Apple Silicon only at startup
- Dynamically switches Dock icon based on macOS appearance (dark/light)

## Icon Styles

All 6 macOS Tahoe icon styles are included in `assets/icons/`:

| Style | Usage | Description |
|---|---|---|
| `default` | App icon (`.icns`) | Dark bg, burnt sienna ∞ loop |
| `dark` | Dark mode fallback | Dark bg, orange ∞ |
| `clear-light` | Dock icon (light mode) | Translucent light bg, monochrome ∞ — Liquid Glass |
| `clear-dark` | Dock icon (dark mode) | Translucent dark bg, monochrome ∞ — Liquid Glass |
| `tinted-light` | Tray/menu bar (light) | Lavender tinted bg, purple ∞ |
| `tinted-dark` | Tray/menu bar (dark) | Navy/purple bg, dark purple ∞ |

The Dock icon automatically switches between `clear-light` and `clear-dark` when macOS appearance changes.

## Prerequisites

- macOS 12+ on Apple Silicon (M1, M2, M3, M4)
- The TrustLoop web app running locally or at a deployed URL
- Node.js 20+, pnpm 10+

## Setup

```bash
cd trustloop-desktop
pnpm install
```

### Regenerate App Icons

```bash
pnpm icons
```

## Development

The desktop app boots the Next.js server internally — no need to run the web app separately.

```bash
# First time: install web app deps and run dev migrations from the repo root
cd /path/to/trustloop
pnpm install && pnpm prisma:generate && pnpm prisma:migrate

# Then launch the desktop app
cd trustloop-desktop
pnpm dev
```

The app will start `next dev` on a random free port and open the window once the server is ready.

### Production mode (faster startup)

Build the web app first, then the desktop app uses the standalone server:

```bash
cd /path/to/trustloop
pnpm build          # creates .next/standalone/server.js

cd trustloop-desktop
pnpm start           # boots the standalone server internally
```

## Build distributable

```bash
pnpm build
```

Produces a `.dmg` and `.zip` in `dist/` targeting `arm64` only.

## OAuth Social Login

When a user clicks Google or GitHub login, the app opens the default browser. After authentication, the browser redirects back to the app via the `trustloop://` custom protocol.

## macOS Tahoe Adaptations

- Hidden inset titlebar with native traffic lights
- `under-window` vibrancy for Liquid Glass translucency
- Backdrop blur on sidebar and header elements
- Continuous rounded corners on modals/dialogs
- Dark mode by default matching TrustLoop's design system
- Native macOS scrollbar styling
- Dynamic Dock icon switching (clear-light / clear-dark)

## Native Menu Bar

| Menu | Items |
|---|---|
| TrustLoop | About, Preferences (⌘,), Services, Hide, Quit |
| File | New Incident (⌘N), Export Incidents (⌘⇧E), Close |
| Edit | Undo, Redo, Cut, Copy, Paste, Select All |
| View | Dashboard (⌘1), Incidents (⌘2), Analytics (⌘3), Integrations (⌘4), Zoom, Fullscreen |
| Incidents | New Incident (⌘N), Run AI Triage (⌘T), Draft Customer Update (⌘U) |
| Workspace | Settings, Team Members, Billing, API Keys, Audit Log, SSO/SAML |
| Window | Minimize, Zoom, Bring All to Front |
| Help | Documentation, Status Page, Contact Support, Changelog |

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| ⌘1 | Dashboard |
| ⌘2 | Incidents |
| ⌘3 | Analytics |
| ⌘4 | Integrations |
| ⌘N | New Incident |
| ⌘T | Run AI Triage |
| ⌘U | Draft Customer Update |
| ⌘, | Workspace Settings |
| ⌘⇧E | Export Incidents |
