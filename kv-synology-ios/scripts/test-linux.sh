#!/usr/bin/env bash
# ==============================================================================
# KV-Synology iOS - Linux Headless Unit Test Runner
# Checks for local Swift installation or falls back to official swift:6.0 Docker
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

# ANSI Color Codes
BOLD="\033[1m"
GREEN="\033[0;32m"
RED="\033[0;31m"
YELLOW="\033[1;33m"
CYAN="\033[0;36m"
NC="\033[0m" # No Color

echo -e "${CYAN}${BOLD}================================================================${NC}"
echo -e "${CYAN}${BOLD}       KV-Synology iOS - Linux Test Execution Runner            ${NC}"
echo -e "${CYAN}${BOLD}================================================================${NC}"
echo -e "Project Root: ${PROJECT_DIR}\n"

# Verify Package.swift exists
if [ ! -f "${PROJECT_DIR}/Package.swift" ]; then
    echo -e "${RED}[ERROR] Package.swift not found in ${PROJECT_DIR}!${NC}"
    exit 1
fi

STATUS_CODE=0

if command -v swift >/dev/null 2>&1; then
    SWIFT_VER="$(swift --version | head -n 1)"
    echo -e "${GREEN}[INFO] Local Swift compiler detected:${NC} ${SWIFT_VER}"
    echo -e "${CYAN}[RUN] Executing 'swift test --enable-test-discovery'...${NC}\n"
    
    cd "${PROJECT_DIR}"
    if swift test --enable-test-discovery; then
        STATUS_CODE=0
    else
        STATUS_CODE=$?
    fi
else
    echo -e "${YELLOW}[INFO] Local Swift not found in PATH. Checking Docker...${NC}"
    if ! command -v docker >/dev/null 2>&1; then
        echo -e "${RED}[ERROR] Neither local 'swift' nor 'docker' is installed.${NC}"
        echo -e "Please install Swift (https://www.swift.org/install/) or Docker to run tests on Linux."
        exit 1
    fi

    echo -e "${GREEN}[INFO] Docker detected. Using official 'swift:6.0' container...${NC}"
    echo -e "${CYAN}[RUN] docker run --rm -v ${PROJECT_DIR}:/workspace -w /workspace swift:6.0 swift test --enable-test-discovery${NC}\n"

    set +e
    docker run --rm \
        -v "${PROJECT_DIR}":/workspace \
        -w /workspace \
        swift:6.0 \
        swift test --enable-test-discovery
    STATUS_CODE=$?
    set -e
fi

echo ""
echo -e "${CYAN}${BOLD}----------------------------------------------------------------${NC}"
if [ ${STATUS_CODE} -eq 0 ]; then
    echo -e "${GREEN}${BOLD} ✔ [PASS] All KVSynologyCore unit tests passed successfully!     ${NC}"
else
    echo -e "${RED}${BOLD} ✘ [FAIL] Unit tests encountered errors (Exit code: ${STATUS_CODE}).${NC}"
fi
echo -e "${CYAN}${BOLD}----------------------------------------------------------------${NC}"

exit ${STATUS_CODE}
