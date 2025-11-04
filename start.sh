#!/bin/bash

cd "$(dirname "$0")"

detect_platform() {
    if [ -n "$TERMUX_VERSION" ] || [ -d "/data/data/com.termux" ]; then
        echo "termux"
    elif [ -f "/etc/alpine-release" ]; then
        echo "alpine"
    else
        echo "linux"
    fi
}

check_bun_installation() {
    if ! command -v bun &> /dev/null; then
        echo "Error: Bun is not installed. Please install Bun first."
        echo "Visit: https://bun.sh"

        PLATFORM=$(detect_platform)
        case "$PLATFORM" in
            termux)
                echo "For Termux, install with: pkg install bun"
                ;;
            alpine)
                echo "For Alpine Linux, you may need to install from source or use npm/yarn"
                ;;
        esac
        exit 1
    fi
}

set_platform_env() {
    PLATFORM=$(detect_platform)
    export SAMSARA_PLATFORM="$PLATFORM"

    case "$PLATFORM" in
        termux)
            export SAMSARA_PREFIX="/data/data/com.termux/files/usr"
            ;;
        alpine)
            export SAMSARA_PREFIX="/usr"
            ;;
        *)
            export SAMSARA_PREFIX="/usr"
            ;;
    esac
}

check_bun_installation
set_platform_env

BASE_PORT="${SAMSARA_PORT:-${PORT:-3000}}"
echo "Starting Samsara-hub server on $SAMSARA_PLATFORM (base port ${BASE_PORT})..."
SAMSARA_PORT="${BASE_PORT}" bun run Public/server.ts
