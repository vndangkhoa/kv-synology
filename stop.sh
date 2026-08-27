#!/usr/bin/env bash

# ==============================================================================
# DSM Helper WebApp - Stop Script
# ==============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

PORT="${PORT:-8088}"
PID_FILE="$SCRIPT_DIR/.dsm-helper.pid"

# ANSI color codes
GREEN="\033[0;32m"
YELLOW="\033[1;33m"
RED="\033[0;31m"
BOLD="\033[1m"
NC="\033[0m"

STOPPED=false

# Helper to find all PIDs associated with port and next-server
find_all_pids() {
  local p="$1"
  {
    [[ -f "$PID_FILE" ]] && cat "$PID_FILE" 2>/dev/null || true
    lsof -ti :"$p" 2>/dev/null || true
    fuser "$p/tcp" 2>/dev/null || true
    ss -tulpn "sport = :$p" 2>/dev/null | grep -o 'pid=[0-9]*' | cut -d= -f2 || true
    pgrep -f "next.*-p.*$p" 2>/dev/null || true
    pgrep -f "next-server" 2>/dev/null || true
  } | tr ' ' '\n' | grep -E '^[0-9]+$' | sort -u
}

ALL_PIDS=$(find_all_pids "$PORT")

if [[ -n "$ALL_PIDS" ]]; then
  for PID in $ALL_PIDS; do
    if kill -0 "$PID" 2>/dev/null; then
      echo -e "${YELLOW}🛑 Đang dừng tiến trình PID: $PID...${NC}"
      kill -15 "$PID" 2>/dev/null || true
      STOPPED=true
    fi
  done

  # Wait up to 3 seconds
  sleep 1.5

  # Force kill any lingering processes
  for PID in $(find_all_pids "$PORT"); do
    if kill -0 "$PID" 2>/dev/null; then
      echo -e "${YELLOW}⚠️  Gửi tín hiệu SIGKILL tới PID: $PID...${NC}"
      kill -9 "$PID" 2>/dev/null || true
    fi
  done
fi

rm -f "$PID_FILE"

if [[ "$STOPPED" == true ]]; then
  echo -e "${GREEN}✅ Đã dừng DSM Helper thành công và giải phóng cổng $PORT!${NC}"
else
  echo -e "${GREEN}ℹ️  DSM Helper hiện không chạy (Cổng $PORT đang trống).${NC}"
fi
