#!/usr/bin/env bash
# Syncs the full skill folder to the openclaw workspace (excluding node_modules, .git, etc.)
set -euo pipefail

SRC="$(cd "$(dirname "$0")/.." && pwd)"
DEST="$HOME/.openclaw/workspace/skills/nutrition-claw"

mkdir -p "$DEST"

rsync -a --delete --delete-excluded \
  --exclude='node_modules/' \
  --exclude='.git/' \
  --exclude='.embeddings.cache.json' \
  --exclude='bun.lockb' \
  --exclude='*.tgz' \
  --exclude='scripts/' \
  "$SRC/" "$DEST/"

echo "Synced $SRC → $DEST"
