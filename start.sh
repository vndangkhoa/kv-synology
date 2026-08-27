#!/usr/bin/env bash

# ==============================================================================
# DSM Helper WebApp - Launch Script
# ==============================================================================

set -e

# Base directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

PORT="${PORT:-8088}"
PID_FILE="$SCRIPT_DIR/.dsm-helper.pid"
LOG_DIR="$SCRIPT_DIR/logs"
LOG_FILE="$LOG_DIR/app.log"
MODE="production"
FOREGROUND=false

# ANSI color codes
GREEN="\033[0;32m"
SKY="\033[0;36m"
YELLOW="\033[1;33m"
RED="\033[0;31m"
BOLD="\033[1m"
NC="\033[0m"

# Parse arguments
while [[ "$#" -gt 0 ]]; do
  case $1 in
    -p|--port) PORT="$2"; shift ;;
    -d|--dev) MODE="development" ;;
    -f|--foreground) FOREGROUND=true ;;
    -h|--help)
      echo -e "${BOLD}DSM Helper - Khởi chạy ứng dụng${NC}"
      echo ""
      echo "Cách sử dụng: ./start.sh [TÙY CHỌN]"
      echo ""
      echo "Tùy chọn:"
      echo "  -p, --port <cổng>   Chỉ định cổng lắng nghe (Mặc định: 8088)"
      echo "  -d, --dev           Chạy ở chế độ phát triển (Development mode)"
      echo "  -f, --foreground    Chạy trực tiếp trên terminal (không chạy nền)"
      echo "  -h, --help          Hiển thị trợ giúp này"
      exit 0
      ;;
    *) echo "Tùy chọn không hợp lệ: $1"; exit 1 ;;
  esac
  shift
done

# Create logs directory if not exists
mkdir -p "$LOG_DIR"

# Check if already running via PID file
if [[ -f "$PID_FILE" ]]; then
  PID=$(cat "$PID_FILE" 2>/dev/null || true)
  if [[ -n "$PID" ]] && kill -0 "$PID" 2>/dev/null; then
    echo -e "${YELLOW}⚠️  DSM Helper đang chạy với PID: ${BOLD}$PID${NC}"
    echo -e "   Truy cập: ${SKY}http://localhost:$PORT${NC}"
    echo -e "   Để khởi động lại, dùng lệnh: ${BOLD}./restart.sh${NC}"
    exit 0
  else
    rm -f "$PID_FILE"
  fi
fi

# Check if port is already occupied
OCCUPIED_PID=$( { lsof -ti :"$PORT" 2>/dev/null || fuser "$PORT/tcp" 2>/dev/null || ss -tulpn "sport = :$PORT" 2>/dev/null | grep -o 'pid=[0-9]*' | cut -d= -f2 || true; } | head -n 1 | tr -d ' ' )
if [[ -n "$OCCUPIED_PID" ]] && kill -0 "$OCCUPIED_PID" 2>/dev/null; then
  echo -e "${RED}❌ Cổng $PORT đã bị chiếm dụng bởi tiến trình PID: $OCCUPIED_PID${NC}"
  echo -e "   Vui lòng dùng: ${BOLD}./stop.sh${NC} để dừng tiến trình cũ hoặc chạy trên cổng khác: ${BOLD}PORT=8090 ./start.sh${NC}"
  exit 1
fi

# Check node_modules
if [[ ! -d "$SCRIPT_DIR/node_modules" ]]; then
  echo -e "${SKY}📦 Đang cài đặt thư viện dependencies...${NC}"
  npm install
fi

# In production mode, ensure .next build exists
if [[ "$MODE" == "production" ]]; then
  if [[ ! -d "$SCRIPT_DIR/.next" ]]; then
    echo -e "${SKY}⚙️  Đang tiến hành biên dịch Next.js...${NC}"
    npm run build
  fi
fi

# Detect local IP
LOCAL_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "127.0.0.1")

echo -e "${GREEN}======================================================${NC}"
echo -e "${BOLD}🚀 Khởi chạy DSM Helper WebApp${NC}"
echo -e "   Chế độ : ${SKY}${MODE}${NC}"
echo -e "   Cổng   : ${SKY}${PORT}${NC}"
echo -e "   Local  : ${SKY}http://localhost:${PORT}${NC}"
echo -e "   Mạng   : ${SKY}http://${LOCAL_IP}:${PORT}${NC}"
echo -e "   Nhật ký: ${SKY}${LOG_FILE}${NC}"
echo -e "${GREEN}======================================================${NC}"

NEXT_CLI="$SCRIPT_DIR/node_modules/next/dist/bin/next"

if [[ "$FOREGROUND" == true ]]; then
  if [[ "$MODE" == "development" ]]; then
    exec node "$NEXT_CLI" dev -p "$PORT"
  else
    exec node "$NEXT_CLI" start -p "$PORT"
  fi
else
  if [[ "$MODE" == "development" ]]; then
    setsid nohup node "$NEXT_CLI" dev -p "$PORT" </dev/null >> "$LOG_FILE" 2>&1 &
  else
    setsid nohup node "$NEXT_CLI" start -p "$PORT" </dev/null >> "$LOG_FILE" 2>&1 &
  fi

  PID=$!
  echo "$PID" > "$PID_FILE"
  sleep 2

  if kill -0 "$PID" 2>/dev/null; then
    echo -e "${GREEN}✅ DSM Helper đã khởi động thành công (PID: ${BOLD}$PID${NC})!${NC}"
    echo -e "   Xem nhật ký live: ${BOLD}tail -f logs/app.log${NC}"
    echo -e "   Dừng ứng dụng  : ${BOLD}./stop.sh${NC}"
  else
    echo -e "${RED}❌ Khởi động thất bại! Kiểm tra logs tại: $LOG_FILE${NC}"
    tail -n 20 "$LOG_FILE"
    exit 1
  fi
fi
