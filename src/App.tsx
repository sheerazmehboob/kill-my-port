import { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from './components/Header';
import { SystemMetricsBar } from './components/SystemMetricsBar';
import { FilterBar } from './components/FilterBar';
import { CommonPorts } from './components/CommonPorts';
import { PortTable } from './components/PortTable';
import { CustomPortsManager } from './components/CustomPortsManager';
import { CommandPalette } from './components/CommandPalette';
import { AutoKillRulesModal } from './components/AutoKillRulesModal';
import { ProcessInspectorModal } from './components/ProcessInspectorModal';
import { ConfirmDialog } from './components/ConfirmDialog';
import { ToastContainer } from './components/Toast';
import type { PortInfo, CustomPort, AppSettings, ToastMessage, Protocol, AutoKillRule } from './types';
import { portScannerService } from './services/port-scanner';
import { processManagerService } from './services/process-manager';
import { storageService } from './services/storage-service';
import { generateId, getRiskLevel } from './utils/helpers';
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from './utils/constants';

function App() {
  // State
  const [ports, setPorts] = useState<PortInfo[]>([]);
  const [customPorts, setCustomPorts] = useState<CustomPort[]>([]);
  const [autoKillRules, setAutoKillRules] = useState<AutoKillRule[]>(() => storageService.getAutoKillRules());
  const [settings, setSettings] = useState<AppSettings>(storageService.getSettings());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const isRefreshingRef = useRef(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [protocolFilter, setProtocolFilter] = useState<'ALL' | Protocol>('ALL');
  const [showSystemPorts, setShowSystemPorts] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [highlightedPort, setHighlightedPort] = useState<number | undefined>();
  const [inspectedPort, setInspectedPort] = useState<PortInfo | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isCustomPortsOpen, setIsCustomPortsOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    port?: PortInfo;
  }>({ isOpen: false });

  // Theme State
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Sync theme to DOM
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  // Global shortcut listener for Cmd/Ctrl + K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        document.getElementById('main-search')?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Load custom ports on mount
  useEffect(() => {
    setCustomPorts(storageService.getCustomPorts());
  }, []);

  const addToast = useCallback((type: ToastMessage['type'], message: string, duration?: number) => {
    const newToast: ToastMessage = {
      id: generateId(),
      type,
      message,
      duration,
    };
    setToasts((prev) => [...prev, newToast]);
  }, []);

  // Scan ports & evaluate Auto-Kill Rules
  const scanPorts = useCallback(async () => {
    if (isRefreshingRef.current) return;
    isRefreshingRef.current = true;
    setIsRefreshing(true);
    try {
      const scannedPorts = await portScannerService.scanPorts();
      setPorts(scannedPorts);

      // Auto-Kill evaluation
      const currentRules = storageService.getAutoKillRules();
      for (const rule of currentRules) {
        if (!rule.enabled) continue;
        const target = scannedPorts.find((p) => p.port === rule.port && p.state === 'LISTEN');
        if (target) {
          try {
            await processManagerService.killProcess(target.pid, target.port);
            addToast('success', `⚡ Auto-Killed "${target.processName}" on Port ${rule.port}`);
            rule.autoKillCount += 1;
            storageService.saveAutoKillRules(currentRules);
            setAutoKillRules([...currentRules]);
          } catch {
            // Ignore auto-kill fail silently
          }
        }
      }
    } catch (error) {
      console.error('Error scanning ports:', error);
      addToast('error', ERROR_MESSAGES.SCAN_FAILED);
    } finally {
      isRefreshingRef.current = false;
      setIsRefreshing(false);
    }
  }, [addToast]);

  // Auto-refresh effect
  useEffect(() => {
    if (!settings.autoRefreshEnabled) return;

    const interval = setInterval(() => {
      scanPorts();
    }, settings.autoRefreshInterval);

    return () => clearInterval(interval);
  }, [settings.autoRefreshEnabled, settings.autoRefreshInterval, scanPorts]);

  // Initial scan
  useEffect(() => {
    scanPorts();
  }, [scanPorts]);

  // Toast management
  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Kill process
  const handleKillProcess = (port: PortInfo) => {
    if (settings.confirmBeforeKill) {
      setConfirmDialog({ isOpen: true, port });
    } else {
      executeKill(port);
    }
  };

  const executeKill = async (port: PortInfo) => {
    try {
      await processManagerService.killProcess(port.pid, port.port);
      addToast('success', SUCCESS_MESSAGES.PROCESS_KILLED);
      await scanPorts(); // Refresh after kill
    } catch (error: unknown) {
      console.error('Error killing process:', error);
      const errObj = error as { message?: string };
      const message = errObj.message?.includes('permission')
        ? ERROR_MESSAGES.PERMISSION_DENIED
        : errObj.message?.includes('not found')
        ? ERROR_MESSAGES.PROCESS_NOT_FOUND
        : ERROR_MESSAGES.KILL_FAILED;
      addToast('error', message);
    }
  };

  const confirmKill = () => {
    if (confirmDialog.port) {
      executeKill(confirmDialog.port);
    }
    setConfirmDialog({ isOpen: false });
  };

  // Custom ports management
  const handleAddCustomPort = (port: number, label: string, category: string = 'Other') => {
    const newPort: CustomPort = {
      id: generateId(),
      port,
      label,
      category,
      createdAt: Date.now(),
    };
    const updated = [...customPorts, newPort];
    setCustomPorts(updated);
    storageService.saveCustomPorts(updated);
    addToast('success', SUCCESS_MESSAGES.PORT_ADDED);
  };

  const handleRemoveCustomPort = (id: string) => {
    const updated = customPorts.filter((p) => p.id !== id);
    setCustomPorts(updated);
    storageService.saveCustomPorts(updated);
    addToast('success', SUCCESS_MESSAGES.PORT_REMOVED);
  };

  const handleEditCustomPort = (id: string, label: string, category: string) => {
    const updated = customPorts.map((p) => (p.id === id ? { ...p, label, category } : p));
    setCustomPorts(updated);
    storageService.saveCustomPorts(updated);
    addToast('success', 'Custom port updated');
  };

  // Auto-Kill Rules management
  const handleAddAutoKillRule = (port: number, label: string) => {
    const newRule: AutoKillRule = {
      id: generateId(),
      port,
      label,
      enabled: true,
      autoKillCount: 0,
      createdAt: Date.now(),
    };
    const updated = [...autoKillRules, newRule];
    setAutoKillRules(updated);
    storageService.saveAutoKillRules(updated);
    addToast('success', `Added Auto-Kill rule for Port ${port}`);
  };

  const handleRemoveAutoKillRule = (id: string) => {
    const updated = autoKillRules.filter((r) => r.id !== id);
    setAutoKillRules(updated);
    storageService.saveAutoKillRules(updated);
    addToast('success', 'Auto-Kill rule removed');
  };

  const handleToggleAutoKillRule = (id: string) => {
    const updated = autoKillRules.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r));
    setAutoKillRules(updated);
    storageService.saveAutoKillRules(updated);
  };

  // Settings management
  const handleToggleAutoRefresh = () => {
    const updated = { ...settings, autoRefreshEnabled: !settings.autoRefreshEnabled };
    setSettings(updated);
    storageService.saveSettings(updated);
  };

  const handleChangeInterval = (interval: number) => {
    const updated = { ...settings, autoRefreshInterval: interval };
    setSettings(updated);
    storageService.saveSettings(updated);
  };

  // Filtering
  const filteredPorts = ports.filter((port) => {
    // Search term filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      if (!port.port.toString().includes(term) && !port.processName.toLowerCase().includes(term)) return false;
    }
    // Protocol filter
    if (protocolFilter !== 'ALL' && port.protocol !== protocolFilter) return false;
    // System ports filter (always keep Docker)
    if (!showSystemPorts && port.isSystemProcess && !port.processName.startsWith('docker:')) return false;
    return true;
  });

  const handlePortClick = (portNum: number) => {
    setHighlightedPort(portNum);
    setSearchTerm(portNum.toString());
    setTimeout(() => setHighlightedPort(undefined), 3000);
  };

  const clearFilters = () => {
    setProtocolFilter('ALL');
    setShowSystemPorts(false);
  };

  const customPortsSet = new Set(customPorts.map((p) => p.port));

  return (
    <div className="flex flex-col h-screen bg-base text-text-primary transition-colors">
      {/* Header — brand + controls only */}
      <Header
        onRefresh={scanPorts}
        isRefreshing={isRefreshing}
        autoRefreshEnabled={settings.autoRefreshEnabled}
        autoRefreshInterval={settings.autoRefreshInterval}
        onToggleAutoRefresh={handleToggleAutoRefresh}
        onChangeInterval={handleChangeInterval}
        onOpenAutoKillRules={() => setIsRulesModalOpen(true)}
        isDarkMode={isDarkMode}
        onToggleTheme={() => setIsDarkMode(!isDarkMode)}
      />

      {/* Compact telemetry ribbon */}
      <SystemMetricsBar ports={ports} />

      {/* Filter bar — search + protocol + type + listening toggles */}
      <FilterBar
        protocol={protocolFilter}
        onProtocolChange={setProtocolFilter}
        showSystemPorts={showSystemPorts}
        onToggleSystemPorts={() => setShowSystemPorts(!showSystemPorts)}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onClearFilters={clearFilters}
        totalCount={ports.length}
        filteredCount={filteredPorts.length}
      />

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Common Ports Sidebar */}
        <CommonPorts
          activePorts={ports}
          customPorts={customPorts}
          onPortClick={handlePortClick}
          onInspectProcess={(port) => setInspectedPort(port)}
          onKillProcess={handleKillProcess}
          onManageCustomPorts={() => setIsCustomPortsOpen(true)}
          isOpen={isSidebarOpen}
          onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        />

        {/* Port Table */}
        <PortTable
          ports={filteredPorts}
          onKillProcess={handleKillProcess}
          onInspectProcess={(port) => setInspectedPort(port)}
          customPorts={customPortsSet}
          highlightedPort={highlightedPort}
        />
      </div>

      {/* Process Inspector Modal */}
      <ProcessInspectorModal
        isOpen={!!inspectedPort}
        onClose={() => setInspectedPort(null)}
        port={inspectedPort}
        onKillProcess={handleKillProcess}
        onAddAutoKillRule={handleAddAutoKillRule}
      />

      {/* Custom Ports Manager */}
      <CustomPortsManager
        customPorts={customPorts}
        onAdd={handleAddCustomPort}
        onRemove={handleRemoveCustomPort}
        onEdit={handleEditCustomPort}
        isOpen={isCustomPortsOpen}
        onClose={() => setIsCustomPortsOpen(false)}
      />

      {/* Auto-Kill Rules Modal */}
      <AutoKillRulesModal
        isOpen={isRulesModalOpen}
        onClose={() => setIsRulesModalOpen(false)}
        rules={autoKillRules}
        onAddRule={handleAddAutoKillRule}
        onRemoveRule={handleRemoveAutoKillRule}
        onToggleRule={handleToggleAutoKillRule}
      />

      {/* Confirm Dialog */}
      {confirmDialog.port && (
        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          title="Kill Process?"
          message={`Are you sure you want to kill "${confirmDialog.port.processName}" (PID: ${confirmDialog.port.pid})?`}
          type={getRiskLevel(confirmDialog.port.isSystemProcess, confirmDialog.port.requiresAdmin) === 'high' ? 'danger' : 'warning'}
          confirmText="Kill Process"
          cancelText="Cancel"
          onConfirm={confirmKill}
          onCancel={() => setConfirmDialog({ isOpen: false })}
        >
          {confirmDialog.port.isSystemProcess && (
            <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-red-400 text-sm font-medium flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                Warning: This is a system process. Killing it may cause system instability.
              </p>
            </div>
          )}
        </ConfirmDialog>
      )}

      {/* Command Palette */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        ports={ports}
        onKillProcess={handleKillProcess}
      />

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  );
}

export default App;
