#!/bin/bash

cd "$(dirname "$0")"

if ! command -v bun &> /dev/null; then
    echo "Error: Bun is not installed. Please install Bun first."
    echo "Visit: https://bun.sh"
    exit 1
fi

echo "Starting Samsara-hub server..."
bun run server.ts
