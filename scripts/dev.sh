#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
API_DIR="$ROOT_DIR/api-server"
APP_DIR="$ROOT_DIR/app"

API_PORT="${API_PORT:-4000}"
API_URL="${API_BASE_URL:-http://localhost:${API_PORT}}"

echo "[dev] Starting API server (port ${API_PORT})..."
cd "$API_DIR"
if [ ! -d node_modules ]; then
  echo "[dev] Installing API dependencies..."
  npm ci
fi
PORT="$API_PORT" npm run dev >/tmp/snapdesign-api.log 2>&1 &
API_PID=$!

cleanup() {
  echo "[dev] Shutting down..."
  if ps -p $API_PID >/dev/null 2>&1; then
    kill $API_PID || true
  fi
}
trap cleanup EXIT INT TERM

echo "[dev] Waiting for API health at ${API_URL}/health..."
ATTEMPTS=0
until curl -fsS "${API_URL}/health" >/dev/null 2>&1; do
  ATTEMPTS=$((ATTEMPTS+1))
  if [ $ATTEMPTS -gt 60 ]; then
    echo "[dev] API did not become healthy in time. See /tmp/snapdesign-api.log"
    exit 1
  fi
  sleep 1
done
echo "[dev] API is healthy."

echo "[dev] Starting Expo..."
cd "$APP_DIR"
if [ ! -d node_modules ]; then
  echo "[dev] Installing app dependencies..."
  npm ci
fi

# Use tunnel if requested to improve QR scanning across networks
EXPO_FLAGS=(start --clear)
if [ "${EXPO_TUNNEL:-false}" = "true" ]; then
  EXPO_FLAGS+=(--tunnel)
fi

echo "[dev] API_BASE_URL=$API_URL"
echo "[dev] Launching: npx expo ${EXPO_FLAGS[*]} (QR code will display below)"
API_BASE_URL="$API_URL" npx expo "${EXPO_FLAGS[@]}"

