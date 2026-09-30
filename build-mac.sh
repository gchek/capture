#!/bin/bash
# Builds the macOS (Apple Silicon) app + DMG into dist/installer/.
set -euo pipefail
cd "$(dirname "$0")"

echo "==> Frontend"
(cd frontend && npm install --silent && npx vite build)

echo "==> Backend (PyInstaller)"
(cd backend && ../.venv/bin/pyinstaller backend-mac.spec --distpath ../dist/backend-mac --workpath ../build/backend-mac -y --log-level WARN)

echo "==> Icon"
if [ ! -f electron/icon.icns ]; then
  ICONSET=$(mktemp -d)/icon.iconset; mkdir -p "$ICONSET"
  for s in 16 32 64 128 256 512; do sips -z $s $s electron/icon.png --out "$ICONSET/icon_${s}x${s}.png" >/dev/null; done
  for s in 16 32 128 256; do cp "$ICONSET/icon_$((s*2))x$((s*2)).png" "$ICONSET/icon_${s}x${s}@2x.png"; done
  cp "$ICONSET/icon_512x512.png" "$ICONSET/icon_512x512@2x.png"
  iconutil -c icns "$ICONSET" -o electron/icon.icns
fi

echo "==> Electron app"
(cd electron && npm install --silent && npx electron-builder --mac dir --arm64)

# Apple Silicon refuses unsigned code, so ad-hoc sign the whole bundle (no Developer ID = no notarization).
APP=$(ls -d "$PWD"/dist/installer/mac-arm64/*.app)
codesign --force --deep --sign - "$APP"
codesign --verify --deep --strict "$APP" && echo "signature OK: $APP"

echo "==> DMG"
(cd electron && npx electron-builder --mac dmg --arm64 --prepackaged "$APP")
ls -lh dist/installer/*.dmg
