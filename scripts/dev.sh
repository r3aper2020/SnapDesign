#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
API_DIR="$ROOT_DIR/api-server"
APP_DIR="$ROOT_DIR/app"

API_PORT="${API_PORT:-4000}"

# Auto-detect computer's IP address for network access
if [ -z "${API_BASE_URL:-}" ]; then
  # Try to get the IP address that other devices on the network can reach
  COMPUTER_IP=$(ip route get 1.1.1.1 2>/dev/null | awk '{print $7}' | head -1)

  # Fallback to hostname -I if the above fails
  if [ -z "$COMPUTER_IP" ] || [ "$COMPUTER_IP" = "0.0.0.0" ]; then
    COMPUTER_IP=$(hostname -I | awk '{print $1}')
  fi

  # If we still don't have a valid IP, use localhost as fallback
  if [ -z "$COMPUTER_IP" ] || [[ "$COMPUTER_IP" =~ ^(127\.|0\.|169\.254\.) ]]; then
    echo "Warning: Could not detect valid network IP, using localhost"
    COMPUTER_IP="localhost"
  fi

  API_URL="http://${COMPUTER_IP}:${API_PORT}"
  echo "Using IP: ${COMPUTER_IP}"
else
  API_URL="$API_BASE_URL"
  echo "Using provided API_BASE_URL: ${API_URL}"
fi

echo "Starting API server (port ${API_PORT})..."
cd "$API_DIR"
if [ ! -d node_modules ]; then
  echo "Installing API dependencies..."
  npm ci
fi
PORT="$API_PORT" npm run dev >/tmp/snapdesign-api.log 2>&1 &
API_PID=$!

cleanup() {
  echo "Shutting down..."
  if ps -p $API_PID >/dev/null 2>&1; then
    kill $API_PID || true
  fi
  # Kill any remaining tsx processes
  pkill -f "tsx.*src/index.ts" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo "Waiting for API health at ${API_URL}/health..."
ATTEMPTS=0
until curl -fsS "${API_URL}/health" >/dev/null 2>&1; do
  ATTEMPTS=$((ATTEMPTS+1))
  if [ $ATTEMPTS -gt 60 ]; then
    echo "API did not become healthy in time. See /tmp/snapdesign-api.log"
    exit 1
  fi
  sleep 1
done
echo "API is healthy."

echo "Starting Expo..."
cd "$APP_DIR"
if [ ! -d node_modules ]; then
  echo "Installing app dependencies..."
  npm ci
fi

# Use tunnel if requested to improve QR scanning across networks
EXPO_FLAGS=(start --clear)
if [ "${EXPO_TUNNEL:-false}" = "true" ]; then
  EXPO_FLAGS+=(--tunnel)
fi

echo "API_BASE_URL=$API_URL"
echo "Launching Expo (QR code will display below)"
API_BASE_URL="$API_URL" npx expo "${EXPO_FLAGS[@]}"

