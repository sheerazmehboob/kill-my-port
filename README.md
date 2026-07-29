<div align="center">

# 🔪 Kill My Port

### End port conflicts in one click.

A cross-platform desktop application for developers to instantly identify, manage, and terminate processes blocking your ports — no terminal wizardry required.

[![Version](https://img.shields.io/badge/version-0.0.1-6366f1.svg?style=for-the-badge)](https://github.com/sheerazmehboob/kill-my-port)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-0ea5e9.svg?style=for-the-badge)](https://github.com/sheerazmehboob/kill-my-port)
[![Built With Electron](https://img.shields.io/badge/built%20with-Electron-47848f.svg?style=for-the-badge&logo=electron)](https://www.electronjs.org/)
[![License](https://img.shields.io/badge/license-MIT-22c55e.svg?style=for-the-badge)](./LICENSE)

</div>

---

## 🤔 What Is This?

You're coding. You restart your server. And then:

```
Error: listen EADDRINUSE :::3000
Error: listen EADDRINUSE :::8000
```

You open a terminal, try `lsof -ti:3000 | xargs kill -9`, forget the syntax, Google it, repeat for every port. It's painful.

**Kill My Port** fixes this permanently. It's an always-running desktop application that sits in your **system tray** and gives you a live view of every port on your machine. One click — process dead. Done.

---

## ✨ Features

| Feature | Description |
|---|---|
| 🔍 **Live Port Scanner** | Real-time view of all active TCP/UDP ports using `ss`, `lsof`, or `netstat` |
| 🐳 **Docker Awareness** | Detects container-bound ports and terminates the Docker container directly |
| ⚡ **Multi-Strategy Kill Engine** | 5-stage termination: Docker → PID kill → fuser → lsof → elevated sudo |
| 🛡️ **Smart Safety System** | Color-coded risk levels, system process warnings, and kill confirmation |
| 🔎 **Search & Filter** | Filter by port number, process name, protocol (TCP/UDP), or state |
| 📌 **Custom Port Watchlist** | Pin and label your frequently used ports for instant access |
| 🖥️ **System Tray Integration** | Minimizes to tray instead of closing — always running, zero overhead |
| 🔄 **Auto-Refresh** | Configurable live scanning (1s, 5s, 10s, 30s intervals) |
| 📋 **Common Port Sidebar** | Pre-loaded shortcuts for popular dev ports (React, Django, Postgres, Redis…) |
| 🌍 **100% Cross-Platform** | Works on Linux, macOS, and Windows |

---

## 📋 Requirements

Before you start, make sure you have:

| Tool | Version | Check |
|---|---|---|
| **Node.js** | v20.12+ | `node --version` |
| **npm** | v10.5+ | `npm --version` |
| **Git** | Any | `git --version` |

> **Linux extra requirement**: `fuser` (part of `psmisc`) and `ss` (part of `iproute2`) for full kill functionality.
> ```bash
> sudo apt install psmisc iproute2   # Debian/Ubuntu
> sudo dnf install psmisc iproute    # Fedora/RHEL
> ```

---

## 🚀 Installation (One-Time Setup)

### Step 1 — Clone the Repository

```bash
git clone https://github.com/sheerazmehboob/kill-my-port.git
cd kill-my-port
```

### Step 2 — Run Setup

This is the **only command you will ever need to run**. It installs dependencies, builds the app, registers it in your system launcher, sets it to auto-start on boot, and launches it immediately.

**Linux / macOS:**
```bash
chmod +x setup.sh
./setup.sh
```

**Windows:**
```bat
setup.bat
```

That's it. ✅ You're done.

After this:
- **Kill My Port** appears in your system application search (Ubuntu Activities, macOS Spotlight, Windows Start Menu).
- It **auto-starts on every login** — no terminal, no `npm run dev`, ever again.
- It **lives in your System Tray** — pressing `[X]` hides it to the tray rather than quitting.

---

## 🛠️ Management Scripts

All scripts live in the root of the project:

| Script | Platform | What It Does |
|---|---|---|
| `./setup.sh` | Linux / macOS | One-time install: deps, build, register launcher, autostart, launch |
| `setup.bat` | Windows | Same as above for Windows |
| `./launch.sh` | Linux / macOS | Open the app manually (skips setup, brings window to focus) |
| `./uninstall.sh` | Linux / macOS | Remove autostart, launcher entry, and running instances safely |
| `uninstall.bat` | Windows | Remove Start Menu & Startup shortcuts safely |

### Packaging for Release (Binaries)

If you want to create distributable binaries (AppImage, deb, exe, portable, dmg) for other operating systems or environments, you can use the built-in package scripts:

| Command | Output | Notes |
|---|---|---|
| `npm run package:linux` | AppImage, .deb | Linux binaries (generated in `release/`) |
| `npm run package:win` | NSIS (.exe), portable | Windows binaries (generated in `release/`) |
| `npm run package:mac` | .dmg | macOS binaries (skips signing by default) |
| `npm run package:all` | All of the above | Packages for Mac, Windows, and Linux |

> Note: To package for macOS, it's highly recommended to do so on a macOS machine. The current configuration skips code signing (`identity: null`), so macOS might show a warning when running the `.dmg` (allow it via System Settings > Privacy & Security).

### Launching Manually (After Setup)

If you ever need to manually open Kill My Port without re-running setup:

```bash
./launch.sh
```

### Uninstalling

**Linux / macOS:**
```bash
./uninstall.sh
```

**Windows:**
```bat
uninstall.bat
```

---

## 🖥️ Using the App

### Opening the App

After setup, you have **3 ways** to open Kill My Port:

1. **System Search** (recommended): Press `Super` / `Win` key → type `Kill My Port` → press Enter.
2. **System Tray**: If already running, find the tray icon in your taskbar. Click it to show/hide the window.
3. **Manually**: `./launch.sh` from the project directory.

---

### Killing a Process — Step by Step

1. **Locate the port** in the table or use the search bar.
2. Click the red **Kill** button on that row.
3. A confirmation dialog appears showing:
   - The process name and PID
   - Whether it's a Docker container
   - Risk level (low / medium / high)
4. Click **Kill Process** to confirm.
5. Kill My Port attempts termination using up to **5 strategies** in sequence:
   - `docker stop` / `docker kill` (for container-bound ports)
   - `kill -9 <PID>` (direct process termination)
   - `fuser -k <port>/tcp` (port-based kill)
   - `lsof -t -iTCP:<port> | xargs kill -9` (fallback)
   - `pkexec` / `sudo` elevation (for root-owned processes)
6. The app **verifies** the port is freed before showing success.
7. The port list refreshes automatically.

---

## 🐳 Docker Container Support

Kill My Port has **full Docker awareness**. Any port bound by a Docker container is:

1. **Labeled** clearly in the UI as `docker: <container-name>`.
2. **Killed correctly** — it executes `docker stop <container-id>` and falls back to `docker kill` if needed.

---

## 🔒 Security & Safety

- **No network access** — entirely local, offline-first.
- **No telemetry** — your port data never leaves your machine.
- **Confirmation dialogs** — every kill requires explicit confirmation.
- **System process warnings** — clearly flags `sshd`, `systemd`, kernel services.
- **Verification before success** — success toast is only shown after re-checking the socket state.

---

## 📄 License

[MIT](./LICENSE) — free to use, modify, and distribute.

---

<div align="center">

**Made with ❤️ for developers tired of Googling `lsof -ti:3000 | xargs kill -9` at 2am.**

</div>
