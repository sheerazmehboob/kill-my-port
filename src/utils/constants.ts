import type { CommonPort } from '../types/index';

export const COMMON_PORTS: CommonPort[] = [
  { port: 3000, label: 'React Dev', description: 'Create React App / Next.js dev server', category: 'frontend' },
  { port: 4200, label: 'Angular', description: 'Angular CLI dev server', category: 'frontend' },
  { port: 5173, label: 'Vite', description: 'Vite dev server', category: 'frontend' },
  { port: 8080, label: 'Spring Boot', description: 'Spring Boot / Tomcat', category: 'backend' },
  { port: 9000, label: 'Java App', description: 'Common Java application port', category: 'backend' },
  { port: 5432, label: 'PostgreSQL', description: 'PostgreSQL database', category: 'database' },
  { port: 3306, label: 'MySQL', description: 'MySQL database', category: 'database' },
  { port: 27017, label: 'MongoDB', description: 'MongoDB database', category: 'database' },
  { port: 6379, label: 'Redis', description: 'Redis cache', category: 'database' },
  { port: 5000, label: 'Flask', description: 'Flask dev server', category: 'backend' },
  { port: 8000, label: 'Django', description: 'Django dev server', category: 'backend' },
];

export const DEFAULT_SETTINGS = {
  autoRefreshEnabled: false,
  autoRefreshInterval: 5000,
  theme: 'dark' as const,
  showSystemProcesses: true,
  confirmBeforeKill: true,
};

export const REFRESH_INTERVALS = [
  { label: '1 second', value: 1000 },
  { label: '5 seconds', value: 5000 },
  { label: '10 seconds', value: 10000 },
  { label: '30 seconds', value: 30000 },
];

export const SYSTEM_PROCESS_PATTERNS = [
  'systemd',
  'kernel',
  'init',
  'launchd',
  'svchost',
  'csrss',
  'lsass',
  'System',
  'wininit',
];

export const ERROR_MESSAGES = {
  PERMISSION_DENIED: 'Permission denied. You may need administrator privileges to kill this process.',
  PROCESS_NOT_FOUND: 'Process not found. It may have already exited.',
  SCAN_FAILED: 'Failed to scan ports. Please try again.',
  INVALID_PORT: 'Invalid port number. Please enter a number between 1 and 65535.',
  DUPLICATE_PORT: 'This port already exists in your custom ports list.',
  KILL_FAILED: 'Failed to kill process. Please try again.',
};

export const SUCCESS_MESSAGES = {
  PROCESS_KILLED: 'Process killed successfully',
  PORT_ADDED: 'Custom port added successfully',
  PORT_REMOVED: 'Custom port removed successfully',
  SETTINGS_SAVED: 'Settings saved successfully',
};
