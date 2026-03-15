#!/usr/bin/env bash
# Copies SKILL.md to the openclaw workspace so the agent always has the latest version.
set -euo pipefail

DEST="$HOME/.openclaw/workspace/skills/nutrition/SKILL.md"
SRC="$(cd "$(dirname "$0")/.." && pwd)/SKILL.md"

cp "$SRC" "$DEST"
echo "Synced SKILL.md → $DEST"
