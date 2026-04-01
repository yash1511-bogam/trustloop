#!/bin/bash
# Patch all Electron.app instances (hoisted + pnpm store)
ROOT="$(dirname "$0")/.."
find "$ROOT/node_modules" -path "*/electron/dist/Electron.app" -maxdepth 6 2>/dev/null | while read -r APP; do
  DIR="$(dirname "$APP")"
  if [ ! -d "$DIR/TrustLoop.app" ]; then
    mv "$APP" "$DIR/TrustLoop.app"
  fi
  PLIST="$DIR/TrustLoop.app/Contents/Info.plist"
  [ -f "$PLIST" ] && /usr/libexec/PlistBuddy -c "Set :CFBundleName TrustLoop" "$PLIST" 2>/dev/null
  [ -f "$PLIST" ] && /usr/libexec/PlistBuddy -c "Set :CFBundleDisplayName TrustLoop" "$PLIST" 2>/dev/null
done
# Update path.txt everywhere (no trailing newline)
find "$ROOT/node_modules" -path "*/electron/path.txt" -maxdepth 5 2>/dev/null | while read -r PT; do
  printf 'TrustLoop.app/Contents/MacOS/Electron' > "$PT"
done
exit 0
