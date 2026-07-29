#!/usr/bin/env bash
set -e

echo "=========================================================="
echo "      Kill-My-Port One-Time Setup & Installer             "
echo "=========================================================="
echo ""

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo ">> 1. Installing dependencies..."
npm install --silent

echo ">> 2. Building production bundle..."
npm run build

OS_TYPE="$(uname -s)"
ELECTRON_BIN="$SCRIPT_DIR/node_modules/.bin/electron"
ICON_PATH="$SCRIPT_DIR/public/icon.png"

echo ">> 3. Registering System Search Launcher & Auto-Start ($OS_TYPE)..."

if [ "$OS_TYPE" = "Linux" ]; then
    APPS_DIR="$HOME/.local/share/applications"
    mkdir -p "$APPS_DIR"
    APP_DESKTOP_FILE="$APPS_DIR/kill-my-port.desktop"

    cat <<EOF > "$APP_DESKTOP_FILE"
[Desktop Entry]
Type=Application
Name=Kill My Port
Comment=End port conflicts in one click
Exec="$ELECTRON_BIN" "$SCRIPT_DIR"
Icon=$ICON_PATH
Terminal=false
Categories=Utility;Development;
EOF
    chmod +x "$APP_DESKTOP_FILE"
    echo ">> System Application Launcher created: $APP_DESKTOP_FILE"

    if command -v update-desktop-database &> /dev/null; then
        update-desktop-database "$APPS_DIR" 2>/dev/null || true
    fi

    AUTOSTART_DIR="$HOME/.config/autostart"
    mkdir -p "$AUTOSTART_DIR"
    AUTO_DESKTOP_FILE="$AUTOSTART_DIR/kill-my-port.desktop"
    cp "$APP_DESKTOP_FILE" "$AUTO_DESKTOP_FILE"
    chmod +x "$AUTO_DESKTOP_FILE"
    echo ">> Linux Autostart entry created: $AUTO_DESKTOP_FILE"

elif [ "$OS_TYPE" = "Darwin" ]; then
    LAUNCH_AGENT_DIR="$HOME/Library/LaunchAgents"
    mkdir -p "$LAUNCH_AGENT_DIR"
    PLIST_FILE="$LAUNCH_AGENT_DIR/com.killmyport.app.plist"

    cat <<EOF > "$PLIST_FILE"
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.killmyport.app</string>
    <key>ProgramArguments</key>
    <array>
        <string>$ELECTRON_BIN</string>
        <string>$SCRIPT_DIR</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <false/>
</dict>
</plist>
EOF
    echo ">> macOS LaunchAgent created: $PLIST_FILE"
fi

echo ""
echo ">> 4. Launching Kill-My-Port in background & System Tray..."
nohup "$ELECTRON_BIN" "$SCRIPT_DIR" > /dev/null 2>&1 &

echo ""
echo "=========================================================="
echo " SUCCESS! Setup is 100% complete.                        "
echo "                                                         "
echo " 1. Kill-My-Port is now running in your System Tray.      "
echo " 2. Search 'Kill My Port' in your System Apps to open!   "
echo " 3. Closing [X] minimizes to tray — it stays running.    "
echo " 4. It starts automatically on every system boot.         "
echo " 5. To uninstall safely, run: ./uninstall.sh              "
echo "=========================================================="
