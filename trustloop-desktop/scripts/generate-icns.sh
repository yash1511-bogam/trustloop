#!/bin/bash
# Generate macOS .icns for all icon styles from the Icon Exports
# Requires: sips, iconutil (built into macOS)

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ASSETS="$SCRIPT_DIR/../assets"

generate_icns() {
  local style="$1"
  local src="$ASSETS/icons/$style"
  local out="$ASSETS/icon-$style.icns"
  local iconset="$ASSETS/icon-$style.iconset"

  # Find the largest source image
  local src_img
  src_img=$(ls "$src"/*1024x1024* 2>/dev/null | head -1)
  if [ -z "$src_img" ]; then
    src_img=$(ls "$src"/*512x512* 2>/dev/null | head -1)
  fi
  if [ -z "$src_img" ]; then
    echo "⚠ Skipping $style — no large source image found"
    return
  fi

  rm -rf "$iconset"
  mkdir -p "$iconset"

  sips -z 16 16     "$src_img" --out "$iconset/icon_16x16.png"      >/dev/null 2>&1
  sips -z 32 32     "$src_img" --out "$iconset/icon_16x16@2x.png"   >/dev/null 2>&1
  sips -z 32 32     "$src_img" --out "$iconset/icon_32x32.png"      >/dev/null 2>&1
  sips -z 64 64     "$src_img" --out "$iconset/icon_32x32@2x.png"   >/dev/null 2>&1
  sips -z 128 128   "$src_img" --out "$iconset/icon_128x128.png"    >/dev/null 2>&1
  sips -z 256 256   "$src_img" --out "$iconset/icon_128x128@2x.png" >/dev/null 2>&1
  sips -z 256 256   "$src_img" --out "$iconset/icon_256x256.png"    >/dev/null 2>&1
  sips -z 512 512   "$src_img" --out "$iconset/icon_256x256@2x.png" >/dev/null 2>&1
  sips -z 512 512   "$src_img" --out "$iconset/icon_512x512.png"    >/dev/null 2>&1
  cp "$src_img"                       "$iconset/icon_512x512@2x.png"

  iconutil -c icns "$iconset" -o "$out"
  rm -rf "$iconset"
  echo "✓ $out"
}

# Generate the main app icon from Default style
cp "$ASSETS/icons/default/"*1024x1024* "$ASSETS/icons/default/source-1024.png" 2>/dev/null || true
generate_icns "default"
cp "$ASSETS/icon-default.icns" "$ASSETS/icon.icns"
echo "✓ $ASSETS/icon.icns (primary)"

# Generate all style variants
for style in dark clear-light clear-dark tinted-light tinted-dark; do
  generate_icns "$style"
done

echo ""
echo "Done. All .icns files in $ASSETS/"
