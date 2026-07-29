import { contextBridge, ipcRenderer } from 'electron';

console.log('[Preload] Script is loading...');

const api = {
  scanPorts: () => ipcRenderer.invoke('scan-ports'),
  killProcess: (pid: number, port?: number) => ipcRenderer.invoke('kill-process', pid, port),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings: unknown) => ipcRenderer.invoke('save-settings', settings),
  checkAdmin: () => ipcRenderer.invoke('check-admin'),
};

try {
  contextBridge.exposeInMainWorld('electronAPI', api);
  console.log('[Preload] electronAPI exposed via contextBridge');
} catch (error) {
  console.error('[Preload] Error exposing via contextBridge:', error);
}

console.log('[Preload] electronAPI exposed successfully');
