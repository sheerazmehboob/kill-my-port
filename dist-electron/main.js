import { app, ipcMain, BrowserWindow, nativeImage, Tray, Menu } from "electron";
import { exec as exec$1 } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";
import { exec } from "child_process";
import { promisify } from "util";
import os from "os";
const execAsync = promisify(exec);
const numCores = Math.max(1, os.cpus().length);
async function getDockerPortMap() {
  const map = /* @__PURE__ */ new Map();
  try {
    const { stdout } = await execAsync('docker ps --format "{{.ID}}\\t{{.Names}}\\t{{.Ports}}"', {
      timeout: 3e3
    });
    for (const line of stdout.split("\n")) {
      const parts = line.trim().split("	");
      if (parts.length < 3) continue;
      const [id, name, portsStr] = parts;
      for (const m of portsStr.matchAll(/(?:0\.0\.0\.0|\[::\]|->)[:]*(\d+)(?:->|\/)/g)) {
        const port = parseInt(m[1], 10);
        if (port > 0 && port <= 65535) map.set(port, { id, name });
      }
    }
  } catch {
  }
  return map;
}
async function getDockerContainerForPort(targetPort) {
  const map = await getDockerPortMap();
  return map.get(targetPort) ?? null;
}
async function getProcessMetrics() {
  const map = /* @__PURE__ */ new Map();
  try {
    if (process.platform === "win32") {
      const { stdout } = await execAsync("tasklist /FO CSV /NH", { timeout: 5e3 });
      for (const line of stdout.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        const fields = trimmed.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map((f) => f.replace(/^"|"$/g, "").trim());
        if (fields.length < 5) continue;
        const pid = parseInt(fields[1], 10);
        const memKB = parseInt(fields[4].replace(/[^0-9]/g, ""), 10);
        if (!isNaN(pid) && pid > 0) {
          map.set(pid, { cpu: 0, memMB: isNaN(memKB) ? 0 : Math.round(memKB / 1024 * 10) / 10 });
        }
      }
    } else if (process.platform === "darwin") {
      const { stdout } = await execAsync("ps -A -o pid=,pcpu=,rss=", { timeout: 5e3 });
      for (const line of stdout.split("\n")) {
        const parts = line.trim().split(/\s+/);
        if (parts.length < 3) continue;
        const pid = parseInt(parts[0], 10);
        const rawCpu = parseFloat(parts[1]);
        const rssKB = parseInt(parts[2], 10);
        if (!isNaN(pid) && pid > 0) {
          const normalizedCpu = Math.min(100, Math.round((isNaN(rawCpu) ? 0 : rawCpu / numCores) * 10) / 10);
          map.set(pid, { cpu: normalizedCpu, memMB: isNaN(rssKB) ? 0 : Math.round(rssKB / 1024 * 10) / 10 });
        }
      }
    } else {
      const { stdout } = await execAsync("ps -A -o pid=,pcpu=,rss=", { timeout: 5e3 });
      for (const line of stdout.split("\n")) {
        const parts = line.trim().split(/\s+/);
        if (parts.length < 3) continue;
        const pid = parseInt(parts[0], 10);
        const rawCpu = parseFloat(parts[1]);
        const rssKB = parseInt(parts[2], 10);
        if (!isNaN(pid) && pid > 0) {
          const normalizedCpu = Math.min(100, Math.round((isNaN(rawCpu) ? 0 : rawCpu / numCores) * 10) / 10);
          map.set(pid, { cpu: normalizedCpu, memMB: isNaN(rssKB) ? 0 : Math.round(rssKB / 1024 * 10) / 10 });
        }
      }
    }
  } catch {
  }
  return map;
}
async function isPortListening(port) {
  if (!port || port < 1 || port > 65535) return false;
  try {
    if (process.platform === "win32") {
      const { stdout } = await execAsync(`netstat -ano`, {
        timeout: 3e3
      });
      return stdout.split("\n").some(
        (l) => l.includes("LISTENING") && l.includes(`:${port} `)
      );
    } else {
      try {
        const { stdout } = await execAsync(`ss -tlnp "sport = :${port}"`, {
          timeout: 2e3
        });
        return stdout.split("\n").filter((l) => l.trim() && !l.startsWith("Netid")).length > 0;
      } catch {
        const { stdout } = await execAsync(`lsof -i TCP:${port} -s TCP:LISTEN -t`, {
          timeout: 2e3
        });
        return stdout.trim().length > 0;
      }
    }
  } catch {
    return false;
  }
}
async function scanUnixPorts() {
  const portMap = /* @__PURE__ */ new Map();
  const dockerMap = await getDockerPortMap();
  const metrics = await getProcessMetrics();
  const currentUser = process.env.USER || process.env.LOGNAME || "user";
  try {
    const { stdout: ssOut } = await execAsync("ss -tulpn", { timeout: 5e3 });
    for (const line of ssOut.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("Netid") || trimmed.startsWith("State")) continue;
      const parts = trimmed.split(/\s+/);
      if (parts.length < 5) continue;
      const proto = parts[0].toLowerCase().startsWith("tcp") ? "TCP" : "UDP";
      const rawState = parts[1].toUpperCase();
      const state = rawState.includes("LISTEN") ? "LISTEN" : rawState;
      const localAddr = parts[4];
      const portMatch = localAddr.match(/:(\d+)$/);
      if (!portMatch) continue;
      const port = parseInt(portMatch[1], 10);
      if (isNaN(port) || port < 1 || port > 65535) continue;
      let pid = 0;
      let processName = "System Process";
      if (dockerMap.has(port)) {
        processName = `docker: ${dockerMap.get(port).name}`;
      } else {
        const usersMatch = trimmed.match(/users:\(\("([^"]+)",pid=(\d+)/);
        if (usersMatch) {
          processName = usersMatch[1];
          pid = parseInt(usersMatch[2], 10);
        }
      }
      const key = `${port}-${proto}-${pid}`;
      if (portMap.has(key)) continue;
      const isDocker = processName.startsWith("docker:");
      const SYSTEM_PATTERNS = ["systemd", "kernel", "init", "launchd", "docker-proxy", "containerd", "kthreadd"];
      const isSystem = isDocker ? false : SYSTEM_PATTERNS.some((p) => processName.toLowerCase().includes(p)) || pid === 0 || pid < 100;
      const m = metrics.get(pid);
      portMap.set(key, {
        port,
        protocol: proto,
        processName,
        pid,
        state,
        user: isDocker ? "docker" : pid === 0 ? "root" : currentUser,
        isSystemProcess: isSystem,
        requiresAdmin: isDocker ? false : pid === 0 || isSystem,
        address: localAddr.replace(/:(\d+)$/, "").replace(/^\*$/, "0.0.0.0") || "0.0.0.0",
        cpuUsage: m?.cpu ?? 0,
        memoryUsage: m?.memMB ?? 0
      });
    }
  } catch (err) {
    console.warn("[scanner] ss warning:", err.message);
  }
  try {
    const { stdout: lsofOut } = await execAsync("lsof -i -P -n -s TCP:LISTEN", {
      timeout: 8e3
    });
    const lines = lsofOut.split("\n");
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].trim().split(/\s+/);
      if (parts.length < 9) continue;
      const rawName = parts[0];
      const pid = parseInt(parts[1], 10);
      const user = parts[2];
      const addrField = parts[8];
      const portMatch = addrField.match(/:(\d+)$/);
      if (!portMatch) continue;
      const port = parseInt(portMatch[1], 10);
      if (isNaN(port) || port < 1 || port > 65535) continue;
      const protocol = (parts[7] ?? "").includes("TCP") ? "TCP" : "UDP";
      const key = `${port}-${protocol}-${pid}`;
      const processName = dockerMap.has(port) ? `docker: ${dockerMap.get(port).name}` : rawName;
      if (portMap.has(key)) {
        const ex = portMap.get(key);
        if (ex.pid === 0 && pid > 0) {
          ex.pid = pid;
          ex.user = user;
          if (!ex.processName.startsWith("docker:")) {
            ex.processName = processName;
          }
          const m = metrics.get(pid);
          ex.cpuUsage = m?.cpu ?? 0;
          ex.memoryUsage = m?.memMB ?? 0;
          const SYSTEM_PATTERNS = ["systemd", "kernel", "init", "launchd"];
          ex.isSystemProcess = SYSTEM_PATTERNS.some((p) => ex.processName.toLowerCase().includes(p));
          ex.requiresAdmin = user === "root";
        }
      } else {
        const isDocker = processName.startsWith("docker:");
        const SYSTEM_PATTERNS = ["systemd", "kernel", "init", "launchd"];
        const isSystem = isDocker ? false : SYSTEM_PATTERNS.some((p) => processName.toLowerCase().includes(p)) || pid < 100;
        const m = metrics.get(pid);
        portMap.set(key, {
          port,
          protocol,
          processName,
          pid,
          state: "LISTEN",
          user,
          isSystemProcess: isSystem,
          requiresAdmin: isDocker ? false : user === "root",
          address: addrField.replace(/:(\d+)$/, "").replace(/^\*$/, "0.0.0.0") || "0.0.0.0",
          cpuUsage: m?.cpu ?? 0,
          memoryUsage: m?.memMB ?? 0
        });
      }
    }
  } catch (err) {
    console.warn("[scanner] lsof fallback:", err.message);
  }
  return [...portMap.values()];
}
async function scanWindowsPorts() {
  const portMap = /* @__PURE__ */ new Map();
  const dockerMap = await getDockerPortMap();
  const metrics = await getProcessMetrics();
  const processNames = /* @__PURE__ */ new Map();
  try {
    const { stdout: taskOut } = await execAsync("tasklist /FO CSV /NH", { timeout: 5e3 });
    for (const line of taskOut.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const fields = trimmed.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map((f) => f.replace(/^"|"$/g, "").trim());
      if (fields.length < 2) continue;
      const pid = parseInt(fields[1], 10);
      if (!isNaN(pid) && pid > 0) processNames.set(pid, fields[0]);
    }
  } catch {
  }
  try {
    const { stdout: netstatOut } = await execAsync("netstat -ano", { timeout: 8e3 });
    for (const line of netstatOut.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("Active") || trimmed.startsWith("Proto")) continue;
      const parts = trimmed.split(/\s+/);
      if (parts.length < 4) continue;
      const proto = parts[0].toUpperCase();
      const localAddr = parts[1];
      const state = parts[3] ?? "LISTENING";
      const pidStr = parts[parts.length - 1];
      if (proto === "TCP" && !state.includes("LISTENING")) continue;
      const portMatch = localAddr.match(/:(\d+)$/);
      if (!portMatch) continue;
      const port = parseInt(portMatch[1], 10);
      if (isNaN(port) || port < 1 || port > 65535) continue;
      const pid = parseInt(pidStr, 10);
      if (isNaN(pid)) continue;
      const key = `${port}-${proto.includes("TCP") ? "TCP" : "UDP"}-${pid}`;
      if (portMap.has(key)) continue;
      let processName = "Unknown";
      let isSystemProcess = false;
      if (dockerMap.has(port)) {
        processName = `docker: ${dockerMap.get(port).name}`;
      } else if (pid === 0 || pid === 4) {
        processName = "System";
        isSystemProcess = true;
      } else if (processNames.has(pid)) {
        processName = processNames.get(pid);
      }
      const SYS_PROCS = ["System", "svchost.exe", "services.exe", "lsass.exe", "smss.exe", "wininit.exe", "ntoskrnl.exe", "System Idle Process"];
      if (SYS_PROCS.some((s) => processName.toLowerCase() === s.toLowerCase()) || pid < 10) {
        isSystemProcess = true;
      }
      const m = metrics.get(pid);
      portMap.set(key, {
        port,
        protocol: proto.includes("TCP") ? "TCP" : "UDP",
        processName,
        pid,
        state: state.includes("LISTENING") ? "LISTEN" : state,
        user: isSystemProcess ? "NT AUTHORITY\\SYSTEM" : process.env.USERNAME || "User",
        isSystemProcess,
        requiresAdmin: isSystemProcess,
        address: localAddr.replace(/:(\d+)$/, "") || "0.0.0.0",
        cpuUsage: m?.cpu ?? 0,
        memoryUsage: m?.memMB ?? 0
      });
    }
  } catch (err) {
    console.error("[scanner] netstat failed:", err.message);
  }
  return [...portMap.values()];
}
async function scanSystemPorts() {
  if (process.platform === "win32") {
    return scanWindowsPorts();
  }
  return scanUnixPorts();
}
async function killProcessCore(pid, port) {
  const platform = process.platform;
  const validPid = Number.isInteger(pid) && pid > 0 ? pid : 0;
  const validPort = Number.isInteger(port) && (port ?? 0) >= 1 && (port ?? 0) <= 65535 ? port : 0;
  if (!validPid && !validPort) {
    throw new Error("Invalid kill parameters: need a valid PID or port.");
  }
  if (validPort) {
    const dockerInfo = await getDockerContainerForPort(validPort);
    if (dockerInfo && /^[a-zA-Z0-9_-]+$/.test(dockerInfo.id)) {
      try {
        await execAsync(`docker stop ${dockerInfo.id}`);
        if (!await isPortListening(validPort)) return;
      } catch {
        try {
          await execAsync(`docker kill ${dockerInfo.id}`);
          if (!await isPortListening(validPort)) return;
        } catch {
        }
      }
    }
  }
  if (validPid > 0) {
    try {
      if (platform === "win32") {
        await execAsync(`taskkill /PID ${validPid} /F /T`);
      } else {
        await execAsync(`kill -9 ${validPid}`);
      }
      if (!validPort || !await isPortListening(validPort)) return;
    } catch {
    }
  }
  if (validPort && platform !== "win32") {
    try {
      await execAsync(`fuser -k ${validPort}/tcp 2>/dev/null || true`);
      if (!await isPortListening(validPort)) return;
    } catch {
    }
    try {
      await execAsync(`lsof -t -iTCP:${validPort} | xargs -r kill -9`);
      if (!await isPortListening(validPort)) return;
    } catch {
    }
  }
  if (validPort && await isPortListening(validPort)) {
    throw new Error(`Failed to kill process on port ${validPort}. Try running with elevated privileges.`);
  }
}
const __dirname$1 = path.dirname(fileURLToPath(import.meta.url));
process.env.DIST = path.join(__dirname$1, "../dist");
process.env.VITE_PUBLIC = app.isPackaged ? process.env.DIST : path.join(process.env.DIST, "../public");
let win = null;
let tray = null;
let isQuitting = false;
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
function createWindow() {
  win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1e3,
    minHeight: 600,
    icon: path.join(process.env.VITE_PUBLIC || "", "icon.png"),
    webPreferences: {
      preload: path.join(__dirname$1, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    },
    backgroundColor: "#020617",
    titleBarStyle: "default"
  });
  win.webContents.on("did-finish-load", () => {
    win?.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  });
  win.on("close", (event) => {
    if (!isQuitting) {
      event.preventDefault();
      win?.hide();
      return false;
    }
  });
  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(process.env.DIST || "", "index.html"));
  }
}
async function updateTrayMenu() {
  if (!tray) return;
  let activePorts = [];
  try {
    activePorts = process.platform === "win32" ? await scanWindowsPorts() : await scanUnixPorts();
  } catch {
  }
  const listening = activePorts.filter((p) => p.state === "LISTEN").slice(0, 10);
  const quickKillSubmenu = listening.map((p) => {
    const port = p.port;
    const pid = p.pid;
    const procName = p.processName;
    return {
      label: `Kill Port ${port} (${procName} - PID ${pid})`,
      click: () => {
        try {
          if (process.platform === "win32") {
            exec$1(`taskkill /F /PID ${pid}`);
          } else {
            exec$1(`kill -9 ${pid}`);
          }
          if (win) win.webContents.send("port-killed", { port, pid });
          updateTrayMenu();
        } catch (err) {
          console.error(`Failed to kill process ${pid} on port ${port} from tray:`, err);
        }
      }
    };
  });
  const menuItems = [
    {
      label: "Open Kill My Port",
      click: () => {
        if (win) {
          win.show();
          win.focus();
        } else {
          createWindow();
        }
      }
    },
    { type: "separator" },
    {
      label: "⚡ Quick Kill Port",
      submenu: quickKillSubmenu.length > 0 ? quickKillSubmenu : [{ label: "No Active Dev Ports", enabled: false }]
    },
    { type: "separator" },
    {
      label: "Quit",
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ];
  tray.setContextMenu(Menu.buildFromTemplate(menuItems));
}
function createTray() {
  const iconPath = path.join(process.env.VITE_PUBLIC || "", "icon.png");
  const icon = fs.existsSync(iconPath) ? nativeImage.createFromPath(iconPath).resize({ width: 22, height: 22 }) : nativeImage.createEmpty();
  tray = new Tray(icon);
  updateTrayMenu();
  tray.setToolTip("Kill My Port - Port Management");
  tray.on("click", () => {
    if (win) {
      if (win.isVisible()) {
        win.hide();
      } else {
        win.show();
        win.focus();
      }
    } else {
      createWindow();
    }
  });
  tray.on("right-click", () => {
    updateTrayMenu();
  });
}
app.on("before-quit", () => {
  isQuitting = true;
});
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    if (isQuitting) {
      app.quit();
      win = null;
    }
  }
});
app.on("activate", () => {
  if (win === null) {
    createWindow();
  } else {
    win.show();
    win.focus();
  }
});
app.whenReady().then(() => {
  createWindow();
  createTray();
});
ipcMain.handle("check-admin", () => {
  return process.platform === "win32" ? true : process.getuid?.() === 0;
});
ipcMain.handle("get-settings", () => {
  return null;
});
ipcMain.handle("save-settings", () => {
  return true;
});
ipcMain.handle("get-autostart-status", () => {
  if (process.platform === "linux") {
    const desktopFilePath = path.join(app.getPath("home"), ".config", "autostart", "kill-my-port.desktop");
    return fs.existsSync(desktopFilePath);
  }
  const settings = app.getLoginItemSettings();
  return settings.openAtLogin;
});
ipcMain.handle("toggle-autostart", (_event, enable) => {
  try {
    app.setLoginItemSettings({ openAtLogin: enable });
  } catch {
  }
  if (process.platform === "linux") {
    try {
      const autostartDir = path.join(app.getPath("home"), ".config", "autostart");
      const desktopFilePath = path.join(autostartDir, "kill-my-port.desktop");
      if (enable) {
        if (!fs.existsSync(autostartDir)) {
          fs.mkdirSync(autostartDir, { recursive: true });
        }
        const appDir = path.resolve(__dirname$1, "..");
        const electronBin = path.join(appDir, "node_modules", ".bin", "electron");
        const iconPath = path.join(appDir, "public", "icon.png");
        const desktopContent = `[Desktop Entry]
Type=Application
Name=Kill My Port
Comment=End port conflicts in one click
Exec="${electronBin}" "${appDir}"
Icon=${iconPath}
Terminal=false
Categories=Utility;Development;
X-GNOME-Autostart-enabled=true
`;
        fs.writeFileSync(desktopFilePath, desktopContent, "utf8");
      } else {
        if (fs.existsSync(desktopFilePath)) {
          fs.unlinkSync(desktopFilePath);
        }
      }
    } catch (err) {
      console.warn("[Electron Main] Failed to update Linux autostart:", err);
    }
  }
  return true;
});
ipcMain.handle("scan-ports", async () => {
  try {
    return await scanSystemPorts();
  } catch (error) {
    console.error("[Electron Main] Error scanning ports:", error);
    throw error;
  }
});
ipcMain.handle("kill-process", async (_event, pid, port) => {
  console.log("[Electron Main] Kill process request received - PID:", pid, "Port:", port);
  try {
    await killProcessCore(pid, port);
  } catch (error) {
    console.error("[Electron Main] Error killing process:", error);
    throw error;
  }
});
