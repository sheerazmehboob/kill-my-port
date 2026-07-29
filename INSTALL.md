# 🚀 Installing Kill My Port

Welcome! You can easily install **Kill My Port** using our pre-built installers. Choose your operating system below for detailed, step-by-step instructions.

---

## 🍎 macOS Installation

Since we don't code-sign the macOS app with an Apple Developer account (to keep it completely free and open source), you will need to allow the app to run the very first time you launch it.

### Step-by-Step
1. **Download:** Go to our [Releases](https://github.com/sheerazmehboob/kill-my-port/releases) page and download the latest `.dmg` file.
2. **Mount:** Double-click the downloaded `.dmg` file to mount it. A new window will pop up.
3. **Install:** Drag the **Kill My Port** icon into the `Applications` folder shortcut right next to it.
4. **Launch:** Open your `Applications` folder or use Spotlight Search (`Cmd + Space`) and launch "Kill My Port".
5. **Security Prompt:** Because the app is unsigned, macOS will show a prompt saying the app cannot be opened because the developer cannot be verified. Click **Cancel**.
6. **Allow Access:** Open your Mac's **System Settings** > **Privacy & Security**. Scroll down to the "Security" section, and you will see a message saying "Kill My Port was blocked from use". Click the **Open Anyway** button.
7. **Final Launch:** Click **Open** on the final confirmation prompt.

🎉 *You will only ever have to do this once! The app will open normally from now on.*

---

## 🪟 Windows Installation

The Windows installer is fully automated and sets up everything for you.

### Step-by-Step
1. **Download:** Navigate to our [Releases](https://github.com/sheerazmehboob/kill-my-port/releases) page and download the latest `.exe` installer.
2. **Run Installer:** Double-click the `.exe` file.
3. **SmartScreen Prompt:** Windows might show a "Windows protected your PC" blue screen because the app is brand new. Click **More info**, then click **Run anyway**.
4. **Complete:** The installer will automatically extract the files, add a shortcut to your Start Menu, and launch the application.

🎉 *Done! The app will automatically run in the background in your System Tray.*

---

## 🐧 Linux Installation

For Linux, we provide both Debian/Ubuntu packages (`.deb`) and universal executables (`.AppImage`). 

### Option 1: Debian/Ubuntu (`.deb`) - Recommended
This method integrates the app directly into your system's package manager and application launcher.
1. Download the latest `.deb` file from the [Releases](https://github.com/sheerazmehboob/kill-my-port/releases) page.
2. Open your terminal and navigate to your downloads folder:
   ```bash
   cd ~/Downloads
   ```
3. Install the package using `apt` (this automatically installs any missing dependencies):
   ```bash
   sudo apt install ./killmyport_*.deb
   ```
4. Search for "Kill My Port" in your application launcher to open it.

### Option 2: Universal Linux (`.AppImage`)
This method works on almost any Linux distribution without needing root permissions to install.
1. Download the latest `.AppImage` file from the [Releases](https://github.com/sheerazmehboob/kill-my-port/releases) page.
2. Open your terminal and make the file executable:
   ```bash
   chmod +x ~/Downloads/KillMyPort-*.AppImage
   ```
3. Run the application:
   ```bash
   ~/Downloads/KillMyPort-*.AppImage
   ```

*(Note: Depending on your desktop environment, you might need an AppImage launcher daemon if you want it integrated into your application menus).*

---

## 💡 Quick Tips

* **System Tray:** Kill My Port is designed to be an *always-on* utility. When you close the window, the app continues running quietly in your system tray without consuming CPU overhead. You can open it instantly anytime!
* **Docker Support:** You don't need to do anything extra to enable Docker support. The app will automatically detect if a port is bound to a Docker container and will safely stop the container when you click kill.
* **Auto-Refresh:** Click the settings gear to configure the app to scan your ports automatically every 1 to 30 seconds.
