#!/usr/bin/env bash
# ==============================================================================
# DSM Helper WebApp & MCP Server — Unified Management Script
# ==============================================================================
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

ACTION="${1:-help}"
shift || true

# Configurable variables
PORT="${PORT:-8088}"
MCP_PORT="${MCP_PORT:-8089}"
PID_FILE="$SCRIPT_DIR/.dsm-helper.pid"
MCP_PID_FILE="$SCRIPT_DIR/.mcp-server.pid"
LOG_DIR="$SCRIPT_DIR/logs"
LOG_FILE="$LOG_DIR/app.log"
MCP_LOG_FILE="$LOG_DIR/mcp.log"

# Color formatting
GREEN="\033[0;32m"
SKY="\033[0;36m"
YELLOW="\033[1;33m"
RED="\033[0;31m"
PURPLE="\033[0;35m"
BOLD="\033[1m"
DIM="\033[2m"
NC="\033[0m"

# ------------------------------------------------------------------------------
# Helper Functions
# ------------------------------------------------------------------------------

ensure_log_dir() {
  mkdir -p "$LOG_DIR"
}

get_local_ip() {
  hostname -I 2>/dev/null | awk '{print $1}' || echo "127.0.0.1"
}

copy_static_assets() {
  local SRC="$SCRIPT_DIR"
  local DST="$SCRIPT_DIR/.next/standalone"
  if [[ ! -d "$DST" ]]; then return 0; fi

  # Ensure destination directory structure
  mkdir -p "$DST/.next" "$DST/public"

  # Copy public assets
  if [[ -d "$SRC/public" ]]; then
    cp -rf "$SRC/public/." "$DST/public/" 2>/dev/null || cp -rf "$SRC/public" "$DST/" 2>/dev/null || true
  fi

  # Copy .next/static assets (crucial for CSS and client chunks)
  if [[ -d "$SRC/.next/static" ]]; then
    mkdir -p "$DST/.next/static"
    cp -rf "$SRC/.next/static/." "$DST/.next/static/" 2>/dev/null || cp -rf "$SRC/.next/static" "$DST/.next/" 2>/dev/null || true
  fi
}

is_standalone() {
  grep -q "standalone" "$SCRIPT_DIR/next.config.ts" 2>/dev/null || \
  grep -q "standalone" "$SCRIPT_DIR/next.config.js" 2>/dev/null || \
  [[ -f "$SCRIPT_DIR/.next/standalone/server.js" ]]
}

find_port_pids() {
  local p="$1"
  {
    lsof -ti :"$p" 2>/dev/null || true
    ss -tulpn "sport = :$p" 2>/dev/null | grep -o 'pid=[0-9]*' | cut -d= -f2 || true
    fuser "$p/tcp" 2>/dev/null || true
  } | tr ' ' '\n' | grep -E '^[0-9]+$' | sort -u
}

find_project_pids() {
  local p="$1"
  {
    [[ -f "$PID_FILE" ]] && cat "$PID_FILE" 2>/dev/null || true
    pgrep -f "next.*-p.*$p" 2>/dev/null || true
    pgrep -a -f "next-server" 2>/dev/null | grep -F "$SCRIPT_DIR" | awk '{print $1}' || true
    pgrep -a -f "\.next/standalone/server\.js" 2>/dev/null | grep -F "$SCRIPT_DIR" | awk '{print $1}' || true
  } | tr ' ' '\n' | grep -E '^[0-9]+$' | sort -u
}

ensure_dependencies() {
  if [[ ! -d "$SCRIPT_DIR/node_modules" ]] || [[ ! -f "$SCRIPT_DIR/node_modules/next/package.json" ]]; then
    echo -e "${SKY}📦 Đang cài đặt thư viện dependencies (root)...${NC}"
    npm install
  fi

  if [[ -d "$SCRIPT_DIR/mcp" ]] && [[ ! -d "$SCRIPT_DIR/mcp/node_modules" ]]; then
    echo -e "${SKY}📦 Đang cài đặt thư viện MCP server...${NC}"
    (cd "$SCRIPT_DIR/mcp" && npm install)
  fi
}

ensure_build() {
  local FORCE="${1:-false}"
  local NEED_BUILD=false

  if [[ "$FORCE" == "true" ]]; then
    NEED_BUILD=true
  elif [[ ! -f "$SCRIPT_DIR/.next/BUILD_ID" ]]; then
    NEED_BUILD=true
  elif is_standalone && [[ ! -f "$SCRIPT_DIR/.next/standalone/server.js" ]]; then
    NEED_BUILD=true
  fi

  if [[ "$NEED_BUILD" == "true" ]]; then
    echo -e "${SKY}⚙️  Đang biên dịch Next.js (npm run build)...${NC}"
    npm run build
    copy_static_assets
    echo -e "${GREEN}✅ Biên dịch WebApp hoàn tất!${NC}"
  fi

  # Check MCP build
  if [[ -d "$SCRIPT_DIR/mcp" ]] && [[ ! -f "$SCRIPT_DIR/mcp/dist/index.js" ]]; then
    echo -e "${SKY}⚙️  Đang biên dịch MCP Server (tsc)...${NC}"
    (cd "$SCRIPT_DIR/mcp" && npm run build 2>/dev/null || npx tsc 2>/dev/null || true)
  fi
}

# ------------------------------------------------------------------------------
# Core Actions
# ------------------------------------------------------------------------------

do_status() {
  local PORT="${PORT:-8088}"
  echo -e "${BOLD}======================================================${NC}"
  echo -e "${BOLD}📊 Trạng thái Hệ thống DSM Helper & Dịch vụ liên quan${NC}"
  echo -e "${BOLD}======================================================${NC}"

  # WebApp Check
  local IS_RUNNING=false
  local CURRENT_PID=""

  if [[ -f "$PID_FILE" ]]; then
    CURRENT_PID=$(cat "$PID_FILE" 2>/dev/null || true)
    if [[ -n "$CURRENT_PID" ]] && kill -0 "$CURRENT_PID" 2>/dev/null; then
      IS_RUNNING=true
    fi
  fi

  if [[ "$IS_RUNNING" == false ]]; then
    local PORT_PID=$(find_port_pids "$PORT" | head -n 1)
    if [[ -n "$PORT_PID" ]] && kill -0 "$PORT_PID" 2>/dev/null; then
      CURRENT_PID="$PORT_PID"
      IS_RUNNING=true
      echo "$PORT_PID" > "$PID_FILE" 2>/dev/null || true
    fi
  fi

  local LOCAL_IP=$(get_local_ip)

  echo -e "${BOLD}1. WebApp (Next.js Dashboard):${NC}"
  if [[ "$IS_RUNNING" == true ]]; then
    local STATS=$(ps -p "$CURRENT_PID" -o %cpu,%mem,etime --no-headers 2>/dev/null || echo "0 0 0")
    local CPU=$(echo "$STATS" | awk '{print $1}')
    local MEM=$(echo "$STATS" | awk '{print $2}')
    local ELAPSED=$(echo "$STATS" | awk '{print $3}')

    echo -e "   Trạng thái : ${GREEN}● Đang chạy (Active)${NC}"
    echo -e "   PID        : ${SKY}${CURRENT_PID}${NC}"
    echo -e "   Cổng       : ${SKY}${PORT}${NC}"
    echo -e "   Tài nguyên : ${SKY}${CPU}% CPU / ${MEM}% RAM${NC}"
    echo -e "   Thời gian  : ${SKY}${ELAPSED}${NC}"
    echo -e "   Local URL  : ${SKY}http://localhost:${PORT}${NC}"
    echo -e "   Mạng LAN   : ${SKY}http://${LOCAL_IP}:${PORT}${NC}"
    echo -e "   Nhật ký    : ${SKY}${LOG_FILE}${NC}"
  else
    echo -e "   Trạng thái : ${RED}○ Đã dừng (Inactive)${NC}"
    echo -e "   Cổng       : ${PORT} (Đang trống)"
    echo -e "   Khởi động  : ${BOLD}./manage.sh start${NC}"
  fi

  # MCP Server Check
  echo ""
  echo -e "${BOLD}2. MCP Server (AI Agent Gateway):${NC}"
  local MCP_RUNNING=false
  local MCP_PID=""
  if [[ -f "$MCP_PID_FILE" ]]; then
    MCP_PID=$(cat "$MCP_PID_FILE" 2>/dev/null || true)
    if [[ -n "$MCP_PID" ]] && kill -0 "$MCP_PID" 2>/dev/null; then
      MCP_RUNNING=true
    fi
  fi

  if [[ "$MCP_RUNNING" == true ]]; then
    echo -e "   Trạng thái : ${GREEN}● Đang chạy (Active)${NC}"
    echo -e "   PID        : ${SKY}${MCP_PID}${NC}"
    echo -e "   Nhật ký    : ${SKY}${MCP_LOG_FILE}${NC}"
  else
    echo -e "   Trạng thái : ${DIM}○ Chưa chạy (Standalone/STDIO)${NC}"
    echo -e "   Khởi động  : ${BOLD}./manage.sh mcp start${NC}"
  fi

  echo -e "${BOLD}======================================================${NC}"
}

do_stop() {
  local PORT="${PORT:-8088}"
  local PORT_PIDS=$(find_port_pids "$PORT")
  local PROJECT_PIDS=$(find_project_pids "$PORT")
  local ALL_PIDS=$(echo -e "$PORT_PIDS\n$PROJECT_PIDS" | tr ' ' '\n' | grep -E '^[0-9]+$' | sort -u)
  local STOPPED=false

  if [[ -n "$ALL_PIDS" ]]; then
    for PID in $ALL_PIDS; do
      if kill -0 "$PID" 2>/dev/null; then
        echo -e "${YELLOW}🛑 Đang dừng tiến trình PID: $PID (cổng $PORT)...${NC}"
        kill -15 "$PID" 2>/dev/null || true
        STOPPED=true
      fi
    done

    sleep 1.5

    # Force kill if still lingering
    local REMAINING=$(echo -e "$(find_port_pids "$PORT")\n$(find_project_pids "$PORT")" | tr ' ' '\n' | grep -E '^[0-9]+$' | sort -u)
    for PID in $REMAINING; do
      if kill -0 "$PID" 2>/dev/null; then
        echo -e "${RED}⚠️  Tiến trình PID $PID chưa dừng, gửi SIGKILL...${NC}"
        kill -9 "$PID" 2>/dev/null || true
      fi
    done
  fi

  rm -f "$PID_FILE"

  # Also stop MCP Server if running
  if [[ -f "$MCP_PID_FILE" ]]; then
    local MPID=$(cat "$MCP_PID_FILE" 2>/dev/null || true)
    if [[ -n "$MPID" ]] && kill -0 "$MPID" 2>/dev/null; then
      echo -e "${YELLOW}🛑 Đang dừng MCP Server PID: $MPID...${NC}"
      kill -15 "$MPID" 2>/dev/null || true
      sleep 0.5
      kill -9 "$MPID" 2>/dev/null || true
    fi
    rm -f "$MCP_PID_FILE"
  fi

  if [[ "$STOPPED" == true ]]; then
    echo -e "${GREEN}✅ Đã dừng DSM Helper thành công và giải phóng cổng $PORT!${NC}"
  else
    echo -e "${GREEN}ℹ️  DSM Helper hiện không chạy (Cổng $PORT đang trống).${NC}"
  fi
}

do_start() {
  local PORT="${PORT:-8088}"
  local MODE="production"
  local FOREGROUND=false
  local WITH_MCP=false
  local FORCE=false

  while [[ "$#" -gt 0 ]]; do
    case $1 in
      -p|--port) PORT="$2"; shift ;;
      -d|--dev) MODE="development" ;;
      -f|--foreground) FOREGROUND=true ;;
      --with-mcp) WITH_MCP=true ;;
      --force) FORCE=true ;;
      -h|--help)
        echo -e "${BOLD}Cách sử dụng: ./manage.sh start [-p port] [-d|--dev] [-f|--foreground] [--with-mcp] [--force]${NC}"
        return 0
        ;;
      *)
        echo -e "${RED}Tùy chọn không hợp lệ: $1${NC}"
        return 1
        ;;
    esac
    shift
  done

  ensure_log_dir
  ensure_dependencies

  # Check if already running
  if [[ -f "$PID_FILE" ]]; then
    local PID=$(cat "$PID_FILE" 2>/dev/null || true)
    if [[ -n "$PID" ]] && kill -0 "$PID" 2>/dev/null; then
      echo -e "${YELLOW}⚠️  DSM Helper đã đang chạy với PID: $PID${NC}"
      echo -e "   Truy cập: ${SKY}http://localhost:$PORT${NC}"
      return 0
    else
      rm -f "$PID_FILE"
    fi
  fi

  # Check port occupancy
  local OCCUPIED_PID=$(find_port_pids "$PORT" | head -n 1)
  if [[ -n "$OCCUPIED_PID" ]] && kill -0 "$OCCUPIED_PID" 2>/dev/null; then
    local CMDLINE=$(ps -o args= -p "$OCCUPIED_PID" 2>/dev/null || true)
    if [[ "$FORCE" == "true" ]]; then
      echo -e "${YELLOW}⚠️  Cổng $PORT đang bị chiếm bởi PID: $OCCUPIED_PID. Tự động giải phóng (--force)...${NC}"
      kill -9 "$OCCUPIED_PID" 2>/dev/null || true
      sleep 1
    else
      echo -e "${RED}❌ Cổng $PORT đã bị chiếm bởi PID: $OCCUPIED_PID (${CMDLINE:0:70})${NC}"
      echo -e "   Dùng: ${BOLD}./manage.sh stop${NC} hoặc ${BOLD}./manage.sh start --force${NC} hoặc ${BOLD}PORT=8090 ./manage.sh start${NC}"
      return 1
    fi
  fi

  # Check and ensure build if in production
  local IS_STANDALONE=false
  if is_standalone; then IS_STANDALONE=true; fi

  if [[ "$MODE" == "production" ]]; then
    ensure_build false
  fi

  local LOCAL_IP=$(get_local_ip)

  echo -e "${GREEN}======================================================${NC}"
  echo -e "${BOLD}🚀 Đang khởi chạy DSM Helper WebApp${NC}"
  echo -e "   Chế độ    : ${SKY}${MODE}$([ "$IS_STANDALONE" = true ] && echo " (standalone)")${NC}"
  echo -e "   Cổng      : ${SKY}${PORT}${NC}"
  echo -e "   Local URL : ${SKY}http://localhost:${PORT}${NC}"
  echo -e "   Mạng LAN  : ${SKY}http://${LOCAL_IP}:${PORT}${NC}"
  echo -e "   Nhật ký   : ${SKY}${LOG_FILE}${NC}"
  echo -e "${GREEN}======================================================${NC}"

  if [[ "$IS_STANDALONE" == true ]]; then
    copy_static_assets
  fi

  # Foreground execution
  if [[ "$FOREGROUND" == true ]]; then
    if [[ "$MODE" == "development" ]]; then
      exec node "$SCRIPT_DIR/node_modules/next/dist/bin/next" dev -p "$PORT"
    elif [[ "$IS_STANDALONE" == true && -f "$SCRIPT_DIR/.next/standalone/server.js" ]]; then
      exec env PORT="$PORT" HOSTNAME="0.0.0.0" NODE_ENV=production node "$SCRIPT_DIR/.next/standalone/server.js"
    else
      exec node "$SCRIPT_DIR/node_modules/next/dist/bin/next" start -p "$PORT"
    fi
  fi

  # Background daemon execution
  if [[ "$MODE" == "development" ]]; then
    setsid nohup node "$SCRIPT_DIR/node_modules/next/dist/bin/next" dev -p "$PORT" </dev/null >> "$LOG_FILE" 2>&1 &
  elif [[ "$IS_STANDALONE" == true && -f "$SCRIPT_DIR/.next/standalone/server.js" ]]; then
    setsid env PORT="$PORT" HOSTNAME="0.0.0.0" NODE_ENV=production nohup node "$SCRIPT_DIR/.next/standalone/server.js" </dev/null >> "$LOG_FILE" 2>&1 &
  else
    setsid nohup node "$SCRIPT_DIR/node_modules/next/dist/bin/next" start -p "$PORT" </dev/null >> "$LOG_FILE" 2>&1 &
  fi

  local PID=$!
  echo "$PID" > "$PID_FILE"

  # Wait and verify readiness
  echo -n "   Đang chờ dịch vụ sẵn sàng..."
  local READY=false
  for i in {1..20}; do
    sleep 0.8
    echo -n "."
    if ! kill -0 "$PID" 2>/dev/null; then
      echo ""
      echo -e "${RED}❌ Khởi động thất bại! Tiến trình thoát sớm.${NC}"
      tail -n 25 "$LOG_FILE"
      rm -f "$PID_FILE"
      return 1
    fi

    if ss -tlnp 2>/dev/null | grep -q ":$PORT\b" || lsof -ti :"$PORT" 2>/dev/null | grep -q "$PID"; then
      READY=true
      break
    fi
  done
  echo ""

  if [[ "$READY" == true ]]; then
    echo -e "${GREEN}✅ DSM Helper WebApp đã khởi động thành công (PID: ${BOLD}$PID${NC})!${NC}"
    echo -e "   👉 Mở trình duyệt: ${BOLD}${SKY}http://${LOCAL_IP}:${PORT}${NC}"
    echo -e "   👉 Xem log trực tiếp: ${BOLD}./manage.sh logs${NC}"
  else
    echo -e "${RED}❌ Hết thời gian chờ kết nối cổng $PORT.${NC}"
    tail -n 30 "$LOG_FILE"
    kill -15 "$PID" 2>/dev/null || true
    rm -f "$PID_FILE"
    return 1
  fi

  # Optionally start MCP
  if [[ "$WITH_MCP" == true ]]; then
    do_mcp_start
  fi
}

do_mcp_start() {
  ensure_log_dir
  if [[ ! -d "$SCRIPT_DIR/mcp" ]]; then
    echo -e "${YELLOW}⚠️  Thư mục mcp/ không tồn tại.${NC}"
    return 1
  fi

  ensure_dependencies
  if [[ ! -f "$SCRIPT_DIR/mcp/dist/index.js" ]]; then
    echo -e "${SKY}⚙️  Biên dịch MCP server...${NC}"
    (cd "$SCRIPT_DIR/mcp" && npm run build 2>/dev/null || npx tsc)
  fi

  if [[ -f "$MCP_PID_FILE" ]]; then
    local MPID=$(cat "$MCP_PID_FILE" 2>/dev/null || true)
    if [[ -n "$MPID" ]] && kill -0 "$MPID" 2>/dev/null; then
      echo -e "${YELLOW}⚠️  MCP Server đã đang chạy (PID: $MPID)${NC}"
      return 0
    fi
  fi

  echo -e "${SKY}🤖 Đang khởi chạy MCP Server...${NC}"
  setsid nohup node "$SCRIPT_DIR/mcp/dist/index.js" </dev/null >> "$MCP_LOG_FILE" 2>&1 &
  local MPID=$!
  echo "$MPID" > "$MCP_PID_FILE"
  sleep 1
  if kill -0 "$MPID" 2>/dev/null; then
    echo -e "${GREEN}✅ MCP Server đã khởi động (PID: ${BOLD}$MPID${NC})!${NC}"
  else
    echo -e "${RED}❌ MCP Server khởi động thất bại.${NC}"
    tail -n 15 "$MCP_LOG_FILE"
    rm -f "$MCP_PID_FILE"
  fi
}

do_health_check() {
  local PORT="${PORT:-8088}"
  echo -e "${BOLD}🏥 Đang kiểm tra sức khỏe hệ thống (Health Probe)...${NC}"

  local STATUS_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:${PORT}/" || echo "000")
  if [[ "$STATUS_CODE" == "200" || "$STATUS_CODE" == "304" ]]; then
    echo -e "   [WebApp UI]          : ${GREEN}OK (HTTP $STATUS_CODE)${NC}"
  else
    echo -e "   [WebApp UI]          : ${RED}FAIL (HTTP $STATUS_CODE)${NC}"
  fi

  local TRAFFIC_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:${PORT}/api/traffic/connections" || echo "000")
  if [[ "$TRAFFIC_CODE" == "200" ]]; then
    echo -e "   [Traffic & GeoIP API]: ${GREEN}OK (HTTP $TRAFFIC_CODE)${NC}"
  else
    echo -e "   [Traffic & GeoIP API]: ${YELLOW}WARN (HTTP $TRAFFIC_CODE)${NC}"
  fi

  local SNMP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "http://127.0.0.1:${PORT}/api/snmp/query" -H "Content-Type: application/json" -d '{"host":"127.0.0.1","credentials":{"version":"v2c","community":"public"},"sensors":[]}' || echo "000")
  if [[ "$SNMP_CODE" == "200" || "$SNMP_CODE" == "400" || "$SNMP_CODE" == "500" ]]; then
    echo -e "   [SNMP Backend API]   : ${GREEN}OK (Handler Active)${NC}"
  else
    echo -e "   [SNMP Backend API]   : ${RED}FAIL (HTTP $SNMP_CODE)${NC}"
  fi
}

# ------------------------------------------------------------------------------
# Dispatcher
# ------------------------------------------------------------------------------

case "$ACTION" in
  start)
    do_start "$@"
    ;;
  stop)
    do_stop "$@"
    ;;
  restart)
    echo -e "${SKY}🔄 Đang khởi động lại DSM Helper...${NC}"
    do_stop "$@" || true
    sleep 1
    for i in {1..10}; do
      if ! ss -tlnp 2>/dev/null | grep -q ":${PORT:-8088}\b"; then break; fi
      sleep 0.5
    done
    do_start "$@"
    ;;
  status)
    do_status
    ;;
  dev)
    do_start --dev "$@"
    ;;
  build)
    ensure_dependencies
    ensure_build true
    ;;
  clean)
    echo -e "${YELLOW}🧹 Đang dọn dẹp thư mục build và cache...${NC}"
    rm -rf "$SCRIPT_DIR/.next" "$SCRIPT_DIR/logs" "$SCRIPT_DIR/.dsm-helper.pid" "$SCRIPT_DIR/.mcp-server.pid"
    echo -e "${GREEN}✅ Đã dọn dẹp sạch sẽ!${NC}"
    ;;
  logs)
    if [[ "$1" == "--mcp" ]]; then
      if [[ -f "$MCP_LOG_FILE" ]]; then tail -f "$MCP_LOG_FILE"; else echo "Chưa có log MCP"; fi
    else
      if [[ -f "$LOG_FILE" ]]; then tail -f "$LOG_FILE"; else echo "Chưa có log WebApp"; fi
    fi
    ;;
  health|check)
    do_health_check
    ;;
  mcp)
    MCP_ACTION="${1:-status}"
    shift || true
    case "$MCP_ACTION" in
      start) do_mcp_start ;;
      stop)
        if [[ -f "$MCP_PID_FILE" ]]; then
          kill -9 "$(cat "$MCP_PID_FILE")" 2>/dev/null || true
          rm -f "$MCP_PID_FILE"
          echo -e "${GREEN}✅ Đã dừng MCP Server!${NC}"
        else
          echo -e "${YELLOW}MCP Server không chạy.${NC}"
        fi
        ;;
      status)
        if [[ -f "$MCP_PID_FILE" ]] && kill -0 "$(cat "$MCP_PID_FILE")" 2>/dev/null; then
          echo -e "${GREEN}● MCP Server đang chạy (PID: $(cat "$MCP_PID_FILE"))${NC}"
        else
          echo -e "${RED}○ MCP Server đã dừng${NC}"
        fi
        ;;
      build)
        (cd "$SCRIPT_DIR/mcp" && npm run build)
        ;;
      *)
        echo "Sử dụng: ./manage.sh mcp [start|stop|status|build]"
        ;;
    esac
    ;;
  docker)
    DOCKER_ACTION="${1:-up}"
    shift || true
    case "$DOCKER_ACTION" in
      up) docker compose up -d ;;
      down) docker compose down ;;
      build) docker compose build ;;
      logs) docker compose logs -f ;;
      *) echo "Sử dụng: ./manage.sh docker [up|down|build|logs]" ;;
    esac
    ;;
  help|*)
    echo -e "${BOLD}======================================================${NC}"
    echo -e "${BOLD}🛠️  DSM Helper — Unified Management CLI${NC}"
    echo -e "${BOLD}======================================================${NC}"
    echo -e "  ${GREEN}./manage.sh start${NC} [-p port] [--dev] [-f] [--force] [--with-mcp]"
    echo -e "                       Khởi chạy WebApp ở chế độ Production (daemon)"
    echo -e "  ${GREEN}./manage.sh dev${NC} [-p port]    Khởi chạy chế độ phát triển (Next Dev)"
    echo -e "  ${GREEN}./manage.sh stop${NC}            Dừng toàn bộ dịch vụ & giải phóng cổng"
    echo -e "  ${GREEN}./manage.sh restart${NC}         Khởi động lại dịch vụ"
    echo -e "  ${GREEN}./manage.sh status${NC}          Kiểm tra trạng thái CPU/RAM/Port/PID"
    echo -e "  ${GREEN}./manage.sh logs${NC} [--mcp]     Theo dõi log thời gian thực"
    echo -e "  ${GREEN}./manage.sh build${NC}           Biên dịch lại toàn bộ dự án (Next.js + MCP)"
    echo -e "  ${GREEN}./manage.sh check${NC}           Kiểm tra sức khỏe endpoint (Health probe)"
    echo -e "  ${GREEN}./manage.sh mcp${NC} [cmd]       Quản lý MCP Server (start|stop|status|build)"
    echo -e "  ${GREEN}./manage.sh docker${NC} [cmd]    Quản lý qua Docker Compose (up|down|build|logs)"
    echo -e "  ${GREEN}./manage.sh clean${NC}           Dọn dẹp thư mục .next, logs và PID file"
    echo -e "${BOLD}======================================================${NC}"
    ;;
esac
