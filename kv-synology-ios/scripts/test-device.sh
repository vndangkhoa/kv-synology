#!/usr/bin/env bash
# ==============================================================================
# KV-Synology iOS - Physical iPhone Testing & Sideloading Script for Linux
# Utilizes usbmuxd & libimobiledevice to pair, install, and debug on Linux
# ==============================================================================

set -euo pipefail

# ANSI Color Codes
BOLD="\033[1m"
GREEN="\033[0;32m"
RED="\033[0;31m"
YELLOW="\033[1;33m"
CYAN="\033[0;36m"
NC="\033[0m"

DEFAULT_IPA="$(cd "$(dirname "${BASH_SOURCE[0]}")/../build" && pwd)/KVSynology-Ionic.ipa"
IPA_PATH="${1:-}"
if [ -z "${IPA_PATH}" ] && [ -f "${DEFAULT_IPA}" ]; then
    IPA_PATH="${DEFAULT_IPA}"
fi

echo -e "${CYAN}${BOLD}================================================================${NC}"
echo -e "${CYAN}${BOLD}      KV-Synology iOS - Physical Device Testing (Linux)         ${NC}"
echo -e "${CYAN}${BOLD}================================================================${NC}"

# Check required system utilities
echo -e "\n${CYAN}[1/5] Checking required libimobiledevice utilities...${NC}"
REQUIRED_TOOLS=("usbmuxd" "idevice_id" "idevicepair" "ideviceinstaller" "idevicesyslog")
MISSING_TOOLS=()

for tool in "${REQUIRED_TOOLS[@]}"; do
    if ! command -v "$tool" >/dev/null 2>&1; then
        MISSING_TOOLS+=("$tool")
    fi
done

if [ ${#MISSING_TOOLS[@]} -gt 0 ]; then
    echo -e "${RED}[ERROR] Missing required packages: ${MISSING_TOOLS[*]}${NC}"
    echo -e "${YELLOW}Install them on Ubuntu/Debian via:${NC}"
    echo -e "  sudo apt-get update && sudo apt-get install -y usbmuxd libimobiledevice-utils ideviceinstaller\n"
    exit 1
fi
echo -e "${GREEN} ✔ All required USB & device tools are installed.${NC}"

# Verify usbmuxd service
echo -e "\n${CYAN}[2/5] Checking usbmuxd daemon status...${NC}"
if ! pgrep -x "usbmuxd" >/dev/null 2>&1; then
    echo -e "${YELLOW}[WARN] usbmuxd service is not active. Attempting to start...${NC}"
    if command -v systemctl >/dev/null 2>&1; then
        sudo systemctl start usbmuxd || true
    else
        sudo usbmuxd & || true
    fi
fi
echo -e "${GREEN} ✔ usbmuxd daemon is running.${NC}"

# Detect connected iOS device(s)
echo -e "\n${CYAN}[3/5] Scanning for connected iOS device over USB...${NC}"
DEVICES=$(idevice_id -l || true)

if [ -z "${DEVICES}" ]; then
    echo -e "${RED}[ERROR] No connected iOS device detected.${NC}"
    echo -e "${YELLOW}Troubleshooting steps:${NC}"
    echo -e "  1. Connect your iPhone/iPad to this PC using an Apple Lightning/USB-C cable."
    echo -e "  2. Unlock your iPhone screen."
    echo -e "  3. Tap 'Trust This Computer' and enter your iPhone passcode."
    echo -e "  4. Re-run this script."
    exit 1
fi

DEVICE_ID=$(echo "${DEVICES}" | head -n 1)
echo -e "${GREEN} ✔ Found device UDID:${NC} ${DEVICE_ID}"

# Validate device pairing
echo -e "\n${CYAN}[4/5] Validating device pairing...${NC}"
if ! idevicepair validate >/dev/null 2>&1; then
    echo -e "${YELLOW}[INFO] Device is not paired yet. Initiating pairing request...${NC}"
    echo -e "${YELLOW}>>> Please unlock your iPhone and tap 'Trust' on the prompt now! <<<${NC}"
    idevicepair pair
fi
echo -e "${GREEN} ✔ Device pairing successfully verified.${NC}"

# Sideload IPA if provided or found
echo -e "\n${CYAN}[5/5] Sideloading and Log Streaming...${NC}"
if [ -n "${IPA_PATH}" ]; then
    if [ ! -f "${IPA_PATH}" ]; then
        echo -e "${RED}[ERROR] Specified IPA file not found: ${IPA_PATH}${NC}"
        exit 1
    fi
    echo -e "${CYAN}[INSTALL] Deploying '${IPA_PATH}' to device...${NC}"
    ideviceinstaller -i "${IPA_PATH}"
    echo -e "${GREEN} ✔ Sideloading complete!${NC}"
else
    echo -e "${YELLOW}[NOTICE] No .ipa path provided. Skipping installation.${NC}"
    echo -e "Usage to install: $0 path/to/KVSynology-Ionic.ipa"
fi

echo -e "\n${CYAN}${BOLD}Streaming live system logs for KVSynology (Ctrl+C to exit)...${NC}"
echo -e "${CYAN}----------------------------------------------------------------${NC}"
idevicesyslog | grep --line-buffered -i "KVSynology"
