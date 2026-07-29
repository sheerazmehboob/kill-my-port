import { SYSTEM_PROCESS_PATTERNS } from './constants';

/**
 * Validates if a port number is valid
 */
export function isValidPort(port: number): boolean {
  return Number.isInteger(port) && port >= 1 && port <= 65535;
}

/**
 * Determines if a process is a system process based on its name
 */
export function isSystemProcess(processName: string): boolean {
  const name = processName.toLowerCase();
  return SYSTEM_PROCESS_PATTERNS.some(pattern => name.includes(pattern.toLowerCase()));
}

/**
 * Calculates risk level for killing a process
 * Returns: 'low' | 'medium' | 'high'
 */
export function getRiskLevel(isSystem: boolean, requiresAdmin: boolean): 'low' | 'medium' | 'high' {
  if (isSystem) return 'high';
  if (requiresAdmin) return 'medium';
  return 'low';
}

/**
 * Formats PID for display
 */
export function formatPID(pid: number): string {
  return pid.toString().padStart(5, '0');
}

/**
 * Debounce function for search input
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };
    
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Generate unique ID
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Format timestamp to readable string
 */
export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleString();
}

/**
 * Truncate string with ellipsis
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - 3) + '...';
}
