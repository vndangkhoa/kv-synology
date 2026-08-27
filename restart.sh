#!/usr/bin/env bash

# ==============================================================================
# DSM Helper WebApp - Restart Script
# ==============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "🔄 Đang khởi động lại DSM Helper..."
"$SCRIPT_DIR/stop.sh"
sleep 1
"$SCRIPT_DIR/start.sh" "$@"
