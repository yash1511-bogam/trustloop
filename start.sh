#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

if ! command -v node >/dev/null 2>&1; then
  echo "Error: Node.js is required but not installed."
  exit 1
fi

if ! command -v pnpm >/dev/null 2>&1; then
  echo "Error: pnpm is required but not installed."
  echo "Tip: run 'corepack enable && corepack prepare pnpm@latest --activate'"
  exit 1
fi

echo "Installing TrustLoop dependencies..."
pnpm install

echo "Launching TrustLoop local stack..."
pnpm run start:local -- "$@"
