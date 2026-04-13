#!/bin/bash
# Compile AppIcon.xcassets into Assets.car for macOS Tahoe icon style support
# Run after electron-builder creates the .app bundle

set -e

DESKTOP_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
XCASSETS="$DESKTOP_ROOT/assets/AppIcon.xcassets"
APP_BUNDLE="$DESKTOP_ROOT/dist/mac-arm64/TrustLoop.app"

if [ ! -d "$APP_BUNDLE" ]; then
  echo "App bundle not found at $APP_BUNDLE — run pnpm build first"
  exit 1
fi

RESOURCES="$APP_BUNDLE/Contents/Resources"
PLIST="$APP_BUNDLE/Contents/Info.plist"

echo "Compiling $XCASSETS → Assets.car..."
xcrun actool \
  --compile "$RESOURCES" \
  --platform macosx \
  --minimum-deployment-target 12.0 \
  --app-icon AppIcon \
  --output-partial-info-plist /tmp/trustloop-icon-partial.plist \
  "$XCASSETS"

echo "Setting CFBundleIconName in Info.plist..."
/usr/libexec/PlistBuddy -c "Delete :CFBundleIconName" "$PLIST" 2>/dev/null || true
/usr/libexec/PlistBuddy -c "Add :CFBundleIconName string AppIcon" "$PLIST"

echo "Done. App bundle now supports Default, Dark, and Tinted icon styles."
