#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# KV-Synology iOS - Unified Emulator & Testing Control Center
# ==============================================================================
# This script manages launching the iOS Simulator and test harnesses on Ubuntu.
#
# Hardware detected on this machine:
#   CPU: Intel Core i5-12400F (VT-x enabled)
#   KVM: /dev/kvm (active)
#   Display: X11 / Wayland ($DISPLAY)
# ==============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m'

print_header() {
    echo -e "${BLUE}${BOLD}================================================================${NC}"
    echo -e "${BLUE}${BOLD}       KV-Synology iOS - Emulator & Testing Control Center      ${NC}"
    echo -e "${BLUE}${BOLD}================================================================${NC}"
}

check_environment() {
    echo -e "\n${BOLD}[Host Environment Diagnostics]${NC}"
    
    # 1. Check KVM
    if [ -e "/dev/kvm" ] && [ -w "/dev/kvm" ]; then
        echo -e "  KVM Acceleration:    ${GREEN}✔ Active (/dev/kvm is accessible)${NC}"
    else
        echo -e "  KVM Acceleration:    ${RED}✘ /dev/kvm not writable or absent${NC}"
    fi

    # 2. Check CPU Virtualization
    if grep -q -E 'vmx|svm' /proc/cpuinfo; then
        echo -e "  Hardware VT-x/SVM:   ${GREEN}✔ Supported by CPU${NC}"
    else
        echo -e "  Hardware VT-x/SVM:   ${YELLOW}⚠ Virtualization flag not found${NC}"
    fi

    # 3. Check Docker
    if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
        echo -e "  Docker Daemon:       ${GREEN}✔ Running & accessible without sudo${NC}"
    else
        echo -e "  Docker Daemon:       ${RED}✘ Docker daemon unavailable${NC}"
    fi

    # 4. Check Display
    if [ -n "${DISPLAY:-}" ]; then
        echo -e "  Display Server:      ${GREEN}✔ $DISPLAY (${XDG_SESSION_TYPE:-x11})${NC}"
    else
        echo -e "  Display Server:      ${YELLOW}⚠ Headless (No DISPLAY set)${NC}"
    fi
}

run_docker_osx() {
    print_header
    echo -e "\n${BOLD}Launching Genuine Apple iOS Simulator via Docker-OSX (KVM)...${NC}"
    echo -e "This runs macOS Sonoma inside Docker with near-native speed using /dev/kvm."
    echo -e "The macOS graphical desktop and Apple Simulator will display directly on your screen."
    echo ""
    echo -e "${YELLOW}Note: The first launch will download the container image (~20GB).${NC}"
    read -p "Do you want to proceed and launch Docker-OSX? (y/N): " -r CONFIRM
    if [[ "$CONFIRM" =~ ^[Yy]$ ]]; then
        if command -v xhost >/dev/null 2>&1; then
            echo -e "[INFO] Authorizing local container display access (xhost +local:root)..."
            xhost +local:root || true
        fi
        
        echo -e "[RUN] Starting Docker-OSX container..."
        docker run -it \
            --device /dev/kvm \
            -p 50922:10022 \
            -p 5900:5900 \
            -v /tmp/.X11-unix:/tmp/.X11-unix \
            -e "DISPLAY=${DISPLAY:-:0.0}" \
            -e GENERATE_UNIQUE=true \
            sickcodes/docker-osx:sonoma
    else
        echo "Aborted."
    fi
}

run_appetize_browser() {
    print_header
    echo -e "\n${BOLD}In-Browser Streaming iOS Simulator (Appetize.io)...${NC}"
    echo -e "Zero setup required! Test an interactive virtual iPhone in your Linux browser."
    echo ""
    
    # Ensure simulator zip exists
    "$SCRIPT_DIR/package-simulator.sh"
    
    SIMULATOR_ZIP="$PROJECT_ROOT/build/KVSynology-Simulator.app.zip"
    echo ""
    echo -e "${GREEN}${BOLD}Simulator package ready:${NC} $SIMULATOR_ZIP"
    echo ""
    echo "Steps to run in your browser:"
    echo "  1. Open: https://appetize.io/upload"
    echo "  2. Drag and drop '$SIMULATOR_ZIP'"
    echo "  3. Click 'View' to start interactive iPhone simulation in Chrome/Firefox."
    echo ""
    
    if command -v xdg-open >/dev/null 2>&1; then
        read -p "Would you like to open https://appetize.io/upload now in your browser? (y/N): " -r OPEN_BROWSER
        if [[ "$OPEN_BROWSER" =~ ^[Yy]$ ]]; then
            xdg-open "https://appetize.io/upload" || true
        fi
    fi
}

run_quickemu() {
    print_header
    echo -e "\n${BOLD}Quickemu macOS Setup Instructions:${NC}"
    echo "To run a native QEMU/SPICE macOS virtual machine on Ubuntu:"
    echo ""
    echo "  sudo apt install -y quickemu"
    echo "  quickget macos sonoma"
    echo "  quickemu --vm macos-sonoma.conf"
    echo ""
}

show_menu() {
    print_header
    check_environment
    echo ""
    echo -e "${BOLD}Select an action:${NC}"
    echo "  1) Launch Apple iOS Simulator locally on Ubuntu (Docker-OSX / KVM)"
    echo "  2) Test in Web Browser via Appetize.io (Instant touch simulator)"
    echo "  3) Show Quickemu native QEMU instructions"
    echo "  4) Run automated Swift 6 unit tests on Linux (30/30 tests)"
    echo "  5) Rebuild .IPA and Simulator bundles"
    echo "  6) Exit"
    echo ""
    read -p "Enter choice [1-6]: " -r CHOICE
    case "$CHOICE" in
        1) run_docker_osx ;;
        2) run_appetize_browser ;;
        3) run_quickemu ;;
        4) "$SCRIPT_DIR/test-linux.sh" ;;
        5) "$SCRIPT_DIR/build-ipa.sh" && "$SCRIPT_DIR/package-simulator.sh" ;;
        6) exit 0 ;;
        *) echo "Invalid option." ;;
    esac
}

# Command-line arguments
case "${1:-}" in
    --docker-osx)
        run_docker_osx
        ;;
    --appetize|--browser)
        run_appetize_browser
        ;;
    --quickemu)
        run_quickemu
        ;;
    --test)
        "$SCRIPT_DIR/test-linux.sh"
        ;;
    --build)
        "$SCRIPT_DIR/build-ipa.sh"
        "$SCRIPT_DIR/package-simulator.sh"
        ;;
    *)
        show_menu
        ;;
esac
