/**
 * Process Manager Service
 * Handles process identification and termination
 */
class ProcessManagerService {
  /**
   * Kill a process by PID and optional port number
   */
  async killProcess(pid: number, port?: number): Promise<void> {
    console.log('[ProcessManager] Attempting to kill process:', pid, 'port:', port);
    
    // 1. Check if we're in Electron environment
    if (window.electronAPI) {
      try {
        console.log('[ProcessManager] Calling electronAPI.killProcess...');
        await window.electronAPI.killProcess(pid, port);
        console.log('[ProcessManager] Process killed successfully via Electron');
        return;
      } catch (error) {
        console.error('[ProcessManager] Error killing process via Electron:', error);
        throw error;
      }
    }

    // 2. Browser Mode - Call Vite Dev API middleware
    try {
      console.log('[ProcessManager] Calling /api/kill-process dev middleware...');
      const response = await fetch('/api/kill-process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pid, port }),
      });
      if (response.ok) {
        console.log('[ProcessManager] Process killed successfully via Dev API');
        return;
      }
      const data = await response.json();
      throw new Error(data.error || 'Failed to kill process');
    } catch (error) {
      console.error('[ProcessManager] Dev API kill failed:', error);
      throw error;
    }
  }

  /**
   * Check if current user can kill the process
   */
  canKillProcess(): boolean {
    return true;
  }

  /**
   * Get process details by PID
   */
  async getProcessDetails(pid: number): Promise<Record<string, unknown>> {
    if (window.electronAPI) {
      return {};
    }
    return {
      pid,
      name: 'node',
      user: 'ubuntu',
    };
  }
}

export const processManagerService = new ProcessManagerService();
