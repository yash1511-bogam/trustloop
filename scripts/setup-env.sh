#!/usr/bin/env bash
# Creates .env from .env.example if it doesn't already exist.
# Run this after cloning or after git pull if .env is missing.

set -euo pipefail

ENV_FILE=".env"
EXAMPLE_FILE=".env.example"

if [ ! -f "$EXAMPLE_FILE" ]; then
  echo "❌ $EXAMPLE_FILE not found. Are you in the project root?"
  exit 1
fi

if [ -f "$ENV_FILE" ]; then
  echo "✅ $ENV_FILE already exists — skipping copy."
  echo "   Edit it manually or delete it and re-run this script."
  exit 0
fi

cp "$EXAMPLE_FILE" "$ENV_FILE"
echo "📋 Created $ENV_FILE from $EXAMPLE_FILE"
echo "   Fill in your real secrets before starting the app."
