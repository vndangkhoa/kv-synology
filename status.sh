#!/usr/bin/env bash

# ==============================================================================
# DSM Helper WebApp - Status Script
# ==============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

PORT="${PORT:-8088}"
PID_FILE="$SCRIPT_DIR/.dsm-helper.pid"

# ANSI color codes
GREEN="\033[0;32m"
SKY="\033[0;36m"
YELLOW="\033[1;33m"
RED="\033[0;31m"
BOLD="\033[1m"
NC="\033[0m"

echo -e "${BOLD}======================================================${NC}"
echo -e "${BOLD}📊 Trạng thái dịch vụ DSM Helper WebApp${NC}"
echo -e "${BOLD}======================================================${NC}"

IS_RUNNING=false
CURRENT_PID=""

if [[ -f "$PID_FILE" ]]; then
  CURRENT_PID=$(cat "$PID_FILE" 2>/dev/null || true)
  if [[ -n "$CURRENT_PID" ]] && kill -0 "$CURRENT_PID" 2>/dev/null; then
    IS_RUNNING=true
  fi
fi

if [[ "$IS_RUNNING" == false ]]; then
  PORT_PID=$( { lsof -ti :"$PORT" 2>/dev/null || fuser "$PORT/tcp" 2>/dev/null || ss -tulpn "sport = :$PORT" 2>/dev/null | grep -o 'pid=[0-9]*' | cut -d= -f2 || true; } | head -n 1 | tr -d ' ' )
  if [[ -n "$PORT_PID" ]] && kill -0 "$PORT_PID" 2>/dev/null; then
    CURRENT_PID="$PORT_PID"
    IS_RUNNING=true
    echo "$PORT_PID" > "$PID_FILE" 2>/dev/null || true
  fi
fi

if [[ "$IS_RUNNING" == true ]]; then
  LOCAL_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "127.0.0.1")
  
  STATS=$(ps -p "$CURRENT_PID" -o %cpu,%mem,etime --no-headers 2>/dev/null || echo "0 0 0")
  CPU_USAGE=$(echo "$STATS" | awk '{print $1}')
  MEM_USAGE=$(echo "$STATS" | awk '{print $2}')
  ELAPSED=$(echo "$STATS" | awk '{print $3}')

  echo -e "   Trạng thái : ${GREEN}● Đang chạy (Active)${NC}"
  echo -e "   PID        : ${SKY}${CURRENT_PID}${NC}"
  echo -e "   Cổng       : ${SKY}${PORT}${NC}"
  echo -e "   Tài nguyên : ${SKY}${CPU_USAGE}% CPU / ${MEM_USAGE}% RAM${NC}"
  echo -e "   Thời gian  : ${SKY}${ELAPSED}${NC}"
  echo -e "   Địa chỉ    : ${SKY}http://localhost:${PORT}${NC} hoặc ${SKY}http://${LOCAL_IP}:${PORT}${NC}"
  echo -e "   Nhật ký    : ${SKY}$SCRIPT_DIR/logs/app.log${NC}"
else
  echo -e "   Trạng thái : ${RED}○ Đã dừng (Inactive)${NC}"
  echo -e "   Cổng       : ${PORT} (Đang trống)"
  echo -e "   Khởi động  : ${BOLD}./start.sh${NC}"
fi

echo -e "${BOLD}======================================================${NC}"
