export type Protocol = 'TCP' | 'UDP';
export type ProcessState = 'LISTEN' | 'ESTABLISHED' | 'TIME_WAIT' | 'CLOSE_WAIT' | 'UNKNOWN';

export interface PortInfo {
  port: number;
  protocol: Protocol;
  processName: string;
  pid: number;
  state: ProcessState;
  user?: string;
  isSystemProcess: boolean;
  requiresAdmin: boolean;
  address?: string;
  cpuUsage?: number;
  memoryUsage?: number; // in MB
}

export interface CustomPort {
  id: string;
  port: number;
  label: string;
  category?: string;
  createdAt: number;
}

export interface AutoKillRule {
  id: string;
  port: number;
  label: string;
  enabled: boolean;
  autoKillCount: number;
  createdAt: number;
}

export interface CommonPort {
  port: number;
  label: string;
  description: string;
  category: string;
}

export interface AppSettings {
  autoRefreshEnabled: boolean;
  autoRefreshInterval: number; // in milliseconds
  theme: 'dark' | 'light';
  showSystemProcesses: boolean;
  confirmBeforeKill: boolean;
}

export interface FilterState {
  searchTerm: string;
  protocol: 'ALL' | Protocol;
  showOnlyListening: boolean;
  portNumber?: number;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  duration?: number;
}

declare global {
  interface Window {
    electronAPI?: {
      scanPorts: () => Promise<PortInfo[]>;
      killProcess: (pid: number, port?: number) => Promise<void>;
      getSettings: () => Promise<AppSettings | null>;
      saveSettings: (settings: AppSettings) => Promise<boolean>;
      checkAdmin: () => Promise<boolean>;
    };
  }
}
