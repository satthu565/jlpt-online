#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

NATIVE_TURBO=$(find "$REPO_ROOT/node_modules/.pnpm" -path "*/@turbo/*/bin/turbo" 2>/dev/null | head -n 1)
if [ -z "$NATIVE_TURBO" ] || [ ! -x "$NATIVE_TURBO" ]; then
  NATIVE_TURBO=$(command -v turbo 2>/dev/null)
fi

exec "$NATIVE_TURBO" "$@" --env-mode=loose
