#!/usr/bin/env bash
# ==========================================================
#   Kill-My-Port — Safe Uninstaller
#   Removes autostart, system launcher, and stops app
# ==========================================================
set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
OS_TYPE="$(uname -s)"

echo "=========================================================="
echo "      Kill-My-Port Uninstaller                            "
echo "=========================================================="
echo ""

echo ">> 1. Stopping any running Kill-My-Port instances..."
pkill -f "electron.*kill-my-port" 2>/dev/null || true
pkill -f "electron.*$SCRIPT_DIR" 2>/dev/null || true
echo "   Stopped."
echo ""

if [ "$OS_TYPE" = "Linux" ]; then
    APP_DESKTOP="$HOME/.local/share/applications/kill-my-port.desktop"
    if [ -f "$APP_DESKTOP" ]; then
        rm -f "$APP_DESKTOP"
        echo ">> 2. Removed system launcher: $APP_DESKTOP"
    fi

    if command -v update-desktop-database &>/dev/null; then
        update-desktop-database "$HOME/.local/share/applications" 2>/dev/null || true
    fi

    AUTOSTART="$HOME/.config/autostart/kill-my-port.desktop"
    if [ -f "$AUTOSTART" ]; then
        rm -f "$AUTOSTART"
        echo ">> 3. Removed autostart entry: $AUTOSTART"
    fi

elif [ "$OS_TYPE" = "Darwin" ]; then
    PLIST="$HOME/Library/LaunchAgents/com.killmyport.app.plist"
    if [ -f "$PLIST" ]; then
        launchctl unload "$PLIST" 2>/dev/null || true
        rm -f "$PLIST"
        echo ">> 2. Removed macOS LaunchAgent: $PLIST"
    fi
fi

echo ""
echo "=========================================================="
echo " Uninstall complete!                                      "
echo " Kill-My-Port will no longer auto-start on boot.         "
echo " Source code remains intact. Run ./setup.sh to reinstall. "
echo "=========================================================="
