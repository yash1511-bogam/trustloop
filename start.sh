#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

if ! command -v node >/dev/null 2>&1; then
  echo "Error: Node.js is required but not installed."
  exit 1
fi

if ! command -v pnpm >/dev/null 2>&1; then
  if command -v corepack >/dev/null 2>&1; then
    echo "pnpm not found. Activating via corepack..."
    corepack enable
    corepack prepare pnpm@10.30.3 --activate
  else
    echo "Error: pnpm is required but not installed, and corepack is unavailable."
    exit 1
  fi
fi

echo "Installing TrustLoop dependencies..."
pnpm install

echo "Launching TrustLoop local stack..."
pnpm run start:local -- "$@"
