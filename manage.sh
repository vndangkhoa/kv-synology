#!/usr/bin/env bash

# ==============================================================================
# DSM Helper WebApp - Unified Management CLI
# ==============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

ACTION="${1:-help}"
shift || true

case "$ACTION" in
  start)
    "$SCRIPT_DIR/start.sh" "$@"
    ;;
  stop)
    "$SCRIPT_DIR/stop.sh" "$@"
    ;;
  restart)
    "$SCRIPT_DIR/restart.sh" "$@"
    ;;
  status)
    "$SCRIPT_DIR/status.sh" "$@"
    ;;
  logs)
    if [[ -f "$SCRIPT_DIR/logs/app.log" ]]; then
      tail -f "$SCRIPT_DIR/logs/app.log"
    else
      echo "Chưa có file log tại $SCRIPT_DIR/logs/app.log"
    fi
    ;;
  build)
    echo "⚙️  Đang biên dịch dự án Next.js..."
    npm run build
    ;;
  dev)
    "$SCRIPT_DIR/start.sh" --dev "$@"
    ;;
  help|*)
    echo "======================================================"
    echo "🛠️  DSM Helper WebApp - Quản lý dịch vụ"
    echo "======================================================"
    echo "Cách sử dụng: ./manage.sh [LỆNH] [TÙY CHỌN]"
    echo ""
    echo "Các lệnh hỗ trợ:"
    echo "  start     Khởi chạy ứng dụng ở chế độ nền (Production)"
    echo "  stop      Dừng ứng dụng và giải phóng cổng"
    echo "  restart   Khởi động lại ứng dụng"
    echo "  status    Kiểm tra trạng thái, PID và tài nguyên"
    echo "  logs      Theo dõi nhật ký thực tế (live logs)"
    echo "  dev       Khởi chạy ở chế độ phát triển (Development)"
    echo "  build     Biên dịch dự án Next.js"
    echo "  help      Hiển thị trợ giúp này"
    echo ""
    echo "Ví dụ:"
    echo "  ./manage.sh start -p 8088"
    echo "  ./manage.sh logs"
    echo "  ./manage.sh status"
    echo "======================================================"
    ;;
esac
