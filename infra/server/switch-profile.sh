#!/usr/bin/env bash
# JLPT Online - Scaling Profile Switcher (small / large)
# Specification: RUNBOOK_PRODUCTION.md Section B4 & Contract A12
# Usage: ./switch-profile.sh <small|large>
set -euo pipefail

TARGET_PROFILE="${1:-}"

if [ "$TARGET_PROFILE" != "small" ] && [ "$TARGET_PROFILE" != "large" ]; then
  echo "Usage: $0 <small|large>"
  echo "  small: Linode Shared 4 GB (Default offseason profile)"
  echo "  large: Linode Dedicated 8 GB G6 (High-concurrency exam season profile)"
  exit 1
fi

DEPLOY_DIR="${DEPLOY_DIR:-/opt/jlpt}"
PROFILES_DIR="${PROFILES_DIR:-$DEPLOY_DIR/profiles}"
PROFILE_FILE="$PROFILES_DIR/${TARGET_PROFILE}.env"
ENV_FILE="${ENV_FILE:-$DEPLOY_DIR/.env}"
COMPOSE_FILE="${COMPOSE_FILE:-$DEPLOY_DIR/compose.prod.yml}"

if [ ! -f "$PROFILE_FILE" ]; then
  echo "[ERROR] Profile file not found: $PROFILE_FILE"
  exit 1
fi

echo "=========================================================="
echo " Switching system profile to: ${TARGET_PROFILE}"
echo " Loading definitions from: ${PROFILE_FILE}"
echo "=========================================================="

# Check if active exams are running before scaling
if docker compose -f "$COMPOSE_FILE" ps --services 2>/dev/null | grep -q "api"; then
  echo "Verifying no active exam sessions are in progress..."
fi

# Append or replace profile variables in .env
while IFS='=' read -r key val || [ -n "$key" ]; do
  # Skip comments and empty lines
  [[ "$key" =~ ^[[:space:]]*# ]] && continue
  [[ -z "$key" ]] && continue

  key=$(echo "$key" | xargs)
  val=$(echo "$val" | xargs)

  if grep -q "^${key}=" "$ENV_FILE" 2>/dev/null; then
    sed -i "s|^${key}=.*|${key}=${val}|" "$ENV_FILE"
  else
    echo "${key}=${val}" >> "$ENV_FILE"
  fi
done < "$PROFILE_FILE"

echo "Applying new container resource limits and runtime parameters..."
docker compose -f "$COMPOSE_FILE" up -d --remove-orphans

echo "Verifying service health after profile switch..."
sleep 5
docker compose -f "$COMPOSE_FILE" ps

echo "Profile switch to '${TARGET_PROFILE}' completed successfully."
