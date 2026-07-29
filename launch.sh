#!/usr/bin/env bash
# ==========================================================
#   Kill-My-Port — Quick Launch
# ==========================================================

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
ELECTRON_BIN="$SCRIPT_DIR/node_modules/.bin/electron"

if [ ! -f "$ELECTRON_BIN" ]; then
    echo "App not built yet. Running setup..."
    ./setup.sh
    exit 0
fi

if pgrep -f "electron.*$SCRIPT_DIR" > /dev/null 2>&1; then
    echo "Kill-My-Port is already running in background/tray."
    wmctrl -a "Kill My Port" 2>/dev/null || true
    exit 0
fi

echo "Starting Kill-My-Port..."
nohup "$ELECTRON_BIN" "$SCRIPT_DIR" > /dev/null 2>&1 &
echo "Kill-My-Port is running in your System Tray."
