#!/usr/bin/env bash
# JLPT Online - Production Rollback Helper Script
# Specification: RUNBOOK_PRODUCTION.md Section B2
# Usage: ./rollback.sh [target-tag]
set -euo pipefail

DEPLOY_DIR="${DEPLOY_DIR:-/opt/jlpt}"
RELEASES_FILE="${RELEASES_FILE:-$DEPLOY_DIR/RELEASES}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

TARGET_TAG="${1:-}"

if [ -z "$TARGET_TAG" ]; then
  if [ -f "$RELEASES_FILE" ]; then
    # Grab the previous successful release tag
    TARGET_TAG=$(grep "SUCCESS" "$RELEASES_FILE" | tail -n 2 | head -n 1 | grep -o 'tag=[^ ]*' | cut -d '=' -f 2 || true)
  fi
fi

if [ -z "$TARGET_TAG" ] || [ "$TARGET_TAG" = "none" ]; then
  echo "[ERROR] No rollback target tag specified and could not find previous tag in $RELEASES_FILE."
  echo "Usage: $0 <target-tag>"
  exit 1
fi

echo "Initiating manual emergency rollback to: ${TARGET_TAG}"
exec "$SCRIPT_DIR/deploy.sh" "${TARGET_TAG}" --force
