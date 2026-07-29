import type { PortInfo, Protocol, ProcessState } from '../types';

/**
 * Port Scanner Service
 * This is a mock implementation for development
 * In production, this will communicate with Electron main process via IPC
 */
class PortScannerService {
  /**
   * Scan all active ports on the system
   */
  async scanPorts(): Promise<PortInfo[]> {
    console.log('[PortScanner] Scanning ports...');
    
    // 1. Check if we're in Electron environment
    if (window.electronAPI) {
      try {
        console.log('[PortScanner] Using Electron API for real port scan');
        const ports = await window.electronAPI.scanPorts();
        console.log('[PortScanner] Scanned', ports.length, 'ports from system');
        return ports;
      } catch (error) {
        console.error('[PortScanner] Error scanning ports via Electron:', error);
        throw error;
      }
    }

    // 2. Browser Mode - Call Vite Dev API middleware for real system ports
    try {
      console.log('[PortScanner] Calling /api/scan-ports dev middleware...');
      const response = await fetch('/api/scan-ports');
      if (response.ok) {
        const ports = await response.json();
        console.log('[PortScanner] Scanned', ports.length, 'real system ports via Dev API');
        return ports;
      }
    } catch (err) {
      console.warn('[PortScanner] Dev API fetch failed, using fallback:', err);
    }

    // 3. Fallback mock data if API unavailable
    console.log('[PortScanner] Using MOCK data fallback');
    return this.getMockPorts();
  }

  /**
   * Get mock port data for development
   */
  private getMockPorts(): PortInfo[] {
    const mockPorts: PortInfo[] = [
      {
        port: 3000,
        protocol: 'TCP' as Protocol,
        processName: 'node',
        pid: 12345,
        state: 'LISTEN' as ProcessState,
        user: 'ubuntu',
        isSystemProcess: false,
        requiresAdmin: false,
        address: '127.0.0.1',
      },
      {
        port: 5173,
        protocol: 'TCP' as Protocol,
        processName: 'node',
        pid: 12346,
        state: 'LISTEN' as ProcessState,
        user: 'ubuntu',
        isSystemProcess: false,
        requiresAdmin: false,
        address: '0.0.0.0',
      },
      {
        port: 5432,
        protocol: 'TCP' as Protocol,
        processName: 'postgres',
        pid: 1234,
        state: 'LISTEN' as ProcessState,
        user: 'postgres',
        isSystemProcess: false,
        requiresAdmin: true,
        address: '127.0.0.1',
      },
      {
        port: 22,
        protocol: 'TCP' as Protocol,
        processName: 'sshd',
        pid: 1001,
        state: 'LISTEN' as ProcessState,
        user: 'root',
        isSystemProcess: true,
        requiresAdmin: true,
        address: '0.0.0.0',
      },
      {
        port: 80,
        protocol: 'TCP' as Protocol,
        processName: 'nginx',
        pid: 2345,
        state: 'LISTEN' as ProcessState,
        user: 'www-data',
        isSystemProcess: false,
        requiresAdmin: true,
        address: '0.0.0.0',
      },
    ];

    return mockPorts;
  }
}

export const portScannerService = new PortScannerService();
