#!/usr/bin/env bash
# Syncs the full skill folder to the openclaw workspace (excluding node_modules, .git, etc.)
set -euo pipefail

SRC="$(cd "$(dirname "$0")/.." && pwd)"
DEST="$HOME/.openclaw/workspace/skills/nutrition"

mkdir -p "$DEST"

rsync -a --delete \
  --exclude='node_modules/' \
  --exclude='.git/' \
  --exclude='.embeddings.cache.json' \
  --exclude='bun.lockb' \
  --exclude='*.tgz' \
  "$SRC/" "$DEST/"

echo "Synced $SRC → $DEST"
