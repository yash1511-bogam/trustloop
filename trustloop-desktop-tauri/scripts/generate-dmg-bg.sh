#!/bin/bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ASSETS="$SCRIPT_DIR/../assets"
OUT="$ASSETS/dmg-background.png"
OUT_2X="$ASSETS/dmg-background@2x.png"
ICON_SRC="$ASSETS/icons/default/Icon-iOS-Default-256x256@1x.png"

python3 - "$OUT" "$OUT_2X" "$ICON_SRC" <<'PYEOF'
import sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter

out_1x, out_2x, icon_path = sys.argv[1], sys.argv[2], sys.argv[3]

# Load app icon
app_icon = Image.open(icon_path).convert("RGBA")

for scale, path in [(1, out_1x), (2, out_2x)]:
    w, h = 660 * scale, 400 * scale
    img = Image.new("RGB", (w, h), (13, 14, 18))
    draw = ImageDraw.Draw(img)

    # Radial-ish gradient: lighter center, darker edges
    cx, cy = w // 2, int(h * 0.42)
    for y in range(h):
        for x in range(0, w, 4):
            dx = (x - cx) / (w * 0.6)
            dy = (y - cy) / (h * 0.6)
            d = min(1.0, (dx*dx + dy*dy) ** 0.5)
            v = int(28 - 14 * d)
            draw.rectangle([x, y, x+3, y], fill=(v, v, v + 3))

    # Subtle horizontal divider
    div_y = int(h * 0.72)
    draw.line([(w * 0.08, div_y), (w * 0.92, div_y)], fill=(50, 50, 58), width=scale)

    # Place app icon (left position where .app will sit)
    icon_size = 96 * scale
    icon_resized = app_icon.resize((icon_size, icon_size), Image.LANCZOS)
    icon_x = int(180 * scale - icon_size // 2)
    icon_y = int(170 * scale - icon_size // 2 - 30 * scale)
    img.paste(icon_resized, (icon_x, icon_y), icon_resized)

    # Draw arrow between icon positions
    arrow_y = int(170 * scale - 5 * scale)
    arrow_x1 = int(240 * scale)
    arrow_x2 = int(420 * scale)
    arrow_color = (160, 120, 70)

    # Arrow shaft
    for t in range(-1 * scale, 2 * scale):
        draw.line([(arrow_x1, arrow_y + t), (arrow_x2, arrow_y + t)], fill=arrow_color)

    # Arrowhead
    head_size = 12 * scale
    for i in range(head_size):
        frac = i / head_size
        draw.line([
            (arrow_x2 + i, arrow_y - int(head_size * (1 - frac) * 0.6)),
            (arrow_x2 + i, arrow_y + int(head_size * (1 - frac) * 0.6))
        ], fill=arrow_color)

    # Applications folder icon placeholder (right position)
    folder_size = 80 * scale
    folder_x = int(480 * scale - folder_size // 2)
    folder_y = int(170 * scale - folder_size // 2 - 20 * scale)
    # Draw a simple folder shape
    draw.rounded_rectangle(
        [folder_x, folder_y + 10*scale, folder_x + folder_size, folder_y + folder_size],
        radius=8*scale, fill=(45, 50, 65), outline=(70, 75, 90), width=scale
    )
    # Folder tab
    draw.rounded_rectangle(
        [folder_x, folder_y, folder_x + folder_size//3, folder_y + 14*scale],
        radius=4*scale, fill=(45, 50, 65), outline=(70, 75, 90), width=scale
    )
    # "A" letter in folder
    try:
        folder_font = ImageFont.truetype("/System/Library/Fonts/SFPro-Bold.otf", 28 * scale)
    except:
        folder_font = ImageFont.load_default()
    bbox = draw.textbbox((0, 0), "A", font=folder_font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    draw.text(
        (folder_x + (folder_size - tw) // 2, folder_y + 10*scale + (folder_size - 10*scale - th) // 2),
        "A", fill=(140, 150, 175), font=folder_font
    )

    # Fonts
    try:
        font_name = ImageFont.truetype("/System/Library/Fonts/SFPro-Semibold.otf", 22 * scale)
        font_sub = ImageFont.truetype("/System/Library/Fonts/SFPro-Regular.otf", 13 * scale)
        font_labels = ImageFont.truetype("/System/Library/Fonts/SFPro-Medium.otf", 11 * scale)
    except:
        font_name = font_sub = font_labels = ImageFont.load_default()

    # Labels under icons
    for label, lx in [("TrustLoop.app", 180), ("Applications", 480)]:
        bbox = draw.textbbox((0, 0), label, font=font_labels)
        tw = bbox[2] - bbox[0]
        draw.text(
            (lx * scale - tw // 2, int(170 * scale + 55 * scale)),
            label, fill=(140, 140, 150), font=font_labels
        )

    # App name centered below divider
    title = "TrustLoop"
    bbox = draw.textbbox((0, 0), title, font=font_name)
    tw = bbox[2] - bbox[0]
    draw.text(((w - tw) // 2, int(h * 0.75)), title, fill=(210, 175, 130), font=font_name)

    # Subtitle
    sub = "Drag to Applications to install"
    bbox = draw.textbbox((0, 0), sub, font=font_sub)
    sw = bbox[2] - bbox[0]
    draw.text(((w - sw) // 2, int(h * 0.83)), sub, fill=(110, 110, 120), font=font_sub)

    # Version
    ver = "v0.10.0 · Apple Silicon"
    bbox = draw.textbbox((0, 0), ver, font=font_sub)
    vw = bbox[2] - bbox[0]
    draw.text(((w - vw) // 2, int(h * 0.91)), ver, fill=(70, 70, 80), font=font_sub)

    img.save(path, "PNG")
    print(f"Created {path} ({w}x{h})")
PYEOF

echo "✅ DMG backgrounds ready"
