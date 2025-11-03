#!/bin/bash

cd "$(dirname "$0")"

if ! command -v bun &> /dev/null; then
    echo "Error: Bun is not installed. Please install Bun first."
    echo "Visit: https://bun.sh"
    exit 1
fi

BASE_PORT="${SAMSARA_PORT:-${PORT:-3000}}"
echo "Starting Samsara-hub server (base port ${BASE_PORT})..."
SAMSARA_PORT="${BASE_PORT}" bun run Public/server.ts
