#!/bin/bash
# Patch all Electron.app instances (hoisted + pnpm store)
ROOT="$(dirname "$0")/.."
patch_app() {
  local APP_DIR="$1"
  PLIST="$APP_DIR/Contents/Info.plist"
  [ -f "$PLIST" ] && /usr/libexec/PlistBuddy -c "Set :CFBundleName TrustLoop" "$PLIST" 2>/dev/null
  [ -f "$PLIST" ] && /usr/libexec/PlistBuddy -c "Set :CFBundleDisplayName TrustLoop" "$PLIST" 2>/dev/null
  [ -f "$PLIST" ] && /usr/libexec/PlistBuddy -c "Set :CFBundleIdentifier ai.trustloop.desktop" "$PLIST" 2>/dev/null
  # Replace Electron's default icon so macOS notifications use the TrustLoop icon
  ICON_SRC="$ROOT/assets/icon.icns"
  RESOURCES="$APP_DIR/Contents/Resources"
  if [ -f "$ICON_SRC" ] && [ -d "$RESOURCES" ]; then
    cp -f "$ICON_SRC" "$RESOURCES/electron.icns"
  fi
}

# Patch un-renamed Electron.app instances
find "$ROOT/node_modules" -path "*/electron/dist/Electron.app" -maxdepth 10 2>/dev/null | while read -r APP; do
  DIR="$(dirname "$APP")"
  if [ ! -d "$DIR/TrustLoop.app" ]; then
    mv "$APP" "$DIR/TrustLoop.app"
  fi
  patch_app "$DIR/TrustLoop.app"
done
# Also patch already-renamed TrustLoop.app instances (re-runs)
find "$ROOT/node_modules" -path "*/electron/dist/TrustLoop.app" -maxdepth 10 2>/dev/null | while read -r APP; do
  patch_app "$APP"
done
# Update path.txt everywhere (no trailing newline)
find "$ROOT/node_modules" -path "*/electron/path.txt" -maxdepth 10 2>/dev/null | while read -r PT; do
  printf 'TrustLoop.app/Contents/MacOS/Electron' > "$PT"
done
exit 0
