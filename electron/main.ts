import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage } from 'electron';
import { exec } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import { scanSystemPorts, scanWindowsPorts, scanUnixPorts, killProcessCore } from './scanner-core';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

process.env.DIST = path.join(__dirname, '../dist');
process.env.VITE_PUBLIC = app.isPackaged ? process.env.DIST : path.join(process.env.DIST, '../public');

let win: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;
const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL'];

function createWindow() {
  win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 600,
    icon: path.join(process.env.VITE_PUBLIC || '', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    backgroundColor: '#020617',
    titleBarStyle: 'default',
  });

  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', new Date().toLocaleString());
  });

  win.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      win?.hide();
      return false;
    }
  });

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL as string);
  } else {
    win.loadFile(path.join(process.env.DIST || '', 'index.html'));
  }
}

async function updateTrayMenu() {
  if (!tray) return;

  let activePorts: Array<Record<string, unknown>> = [];
  try {
    activePorts = process.platform === 'win32' ? await scanWindowsPorts() : await scanUnixPorts();
  } catch {
    // Ignore tray scan error
  }

  const listening = activePorts.filter((p) => (p.state as string) === 'LISTEN').slice(0, 10);

  const quickKillSubmenu: Electron.MenuItemConstructorOptions[] = listening.map((p) => {
    const port = p.port as number;
    const pid = p.pid as number;
    const procName = p.processName as string;
    return {
      label: `Kill Port ${port} (${procName} - PID ${pid})`,
      click: () => {
        try {
          if (process.platform === 'win32') {
            exec(`taskkill /F /PID ${pid}`);
          } else {
            exec(`kill -9 ${pid}`);
          }
          if (win) win.webContents.send('port-killed', { port, pid });
          updateTrayMenu();
        } catch (err) {
          console.error(`Failed to kill process ${pid} on port ${port} from tray:`, err);
        }
      },
    };
  });

  const menuItems: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'Open Kill My Port',
      click: () => {
        if (win) {
          win.show();
          win.focus();
        } else {
          createWindow();
        }
      },
    },
    { type: 'separator' },
    {
      label: '⚡ Quick Kill Port',
      submenu: quickKillSubmenu.length > 0 ? quickKillSubmenu : [{ label: 'No Active Dev Ports', enabled: false }],
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ];

  tray.setContextMenu(Menu.buildFromTemplate(menuItems));
}

function createTray() {
  const iconPath = path.join(process.env.VITE_PUBLIC || '', 'icon.png');
  const icon = fs.existsSync(iconPath)
    ? nativeImage.createFromPath(iconPath).resize({ width: 22, height: 22 })
    : nativeImage.createEmpty();
  tray = new Tray(icon);

  updateTrayMenu();

  tray.setToolTip('Kill My Port - Port Management');
  tray.on('click', () => {
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

  tray.on('right-click', () => {
    updateTrayMenu();
  });
}

app.on('before-quit', () => {
  isQuitting = true;
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (isQuitting) {
      app.quit();
      win = null;
    }
  }
});

app.on('activate', () => {
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

// IPC Handlers

ipcMain.handle('check-admin', () => {
  return process.platform === 'win32' ? true : process.getuid?.() === 0;
});

ipcMain.handle('get-settings', () => {
  return null;
});

ipcMain.handle('save-settings', () => {
  return true;
});

ipcMain.handle('get-autostart-status', () => {
  if (process.platform === 'linux') {
    const desktopFilePath = path.join(app.getPath('home'), '.config', 'autostart', 'kill-my-port.desktop');
    return fs.existsSync(desktopFilePath);
  }
  const settings = app.getLoginItemSettings();
  return settings.openAtLogin;
});

ipcMain.handle('toggle-autostart', (_event, enable: boolean) => {
  try {
    app.setLoginItemSettings({ openAtLogin: enable });
  } catch {
    // Ignore setting login item errors
  }

  if (process.platform === 'linux') {
    try {
      const autostartDir = path.join(app.getPath('home'), '.config', 'autostart');
      const desktopFilePath = path.join(autostartDir, 'kill-my-port.desktop');
      if (enable) {
        if (!fs.existsSync(autostartDir)) {
          fs.mkdirSync(autostartDir, { recursive: true });
        }
        const appDir = path.resolve(__dirname, '..');
        const electronBin = path.join(appDir, 'node_modules', '.bin', 'electron');
        const iconPath = path.join(appDir, 'public', 'icon.png');
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
        fs.writeFileSync(desktopFilePath, desktopContent, 'utf8');
      } else {
        if (fs.existsSync(desktopFilePath)) {
          fs.unlinkSync(desktopFilePath);
        }
      }
    } catch (err) {
      console.warn('[Electron Main] Failed to update Linux autostart:', err);
    }
  }
  return true;
});

ipcMain.handle('scan-ports', async () => {
  try {
    return await scanSystemPorts();
  } catch (error) {
    console.error('[Electron Main] Error scanning ports:', error);
    throw error;
  }
});

ipcMain.handle('kill-process', async (_event, pid: number, port?: number) => {
  console.log('[Electron Main] Kill process request received - PID:', pid, 'Port:', port);
  try {
    await killProcessCore(pid, port);
  } catch (error) {
    console.error('[Electron Main] Error killing process:', error);
    throw error;
  }
});


