import type { PortInfo, CustomPort } from '../types';

interface CommonPortsProps {
  activePorts: PortInfo[];
  customPorts: CustomPort[];
  onPortClick: (port: number) => void;
  onInspectProcess: (portInfo: PortInfo) => void;
  onKillProcess: (portInfo: PortInfo) => void;
  onManageCustomPorts: () => void;
  isOpen: boolean;
  onToggle: () => void;
}

export function CommonPorts({ activePorts, customPorts, onPortClick, onInspectProcess, onKillProcess, onManageCustomPorts, isOpen, onToggle }: CommonPortsProps) {
  const getStatus = (port: number) => {
    const ap = activePorts.find(p => p.port === port);
    return ap ? { inUse: true, process: ap.processName, portInfo: ap } : { inUse: false, process: '', portInfo: null };
  };

  const categories = Array.from(new Set(customPorts.map(p => p.category || 'Other'))).sort();

  if (!isOpen) {
    return (
      <div className="flex flex-col items-center border-r border-surface-border bg-surface"
           style={{ width: 40, flexShrink: 0 }}>
        {/* Collapsed: show toggle button + rotated label */}
        <button
          onClick={onToggle}
          className="w-10 h-10 flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-hover transition-all"
          title="Expand Quick Ports sidebar"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
        <div className="mt-3 text-[10px] font-semibold text-text-secondary uppercase tracking-widest"
             style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
          Bookmarks
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col border-r border-surface-border bg-surface overflow-hidden transition-all duration-200"
      style={{ width: 240, flexShrink: 0 }}
    >
      {/* Sidebar header with toggle */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-border">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
          <span className="text-xs font-semibold text-text-primary uppercase tracking-wider">Bookmarks</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono font-semibold text-text-secondary bg-surface-hover border border-surface-border px-1.5 py-0.5 rounded shadow-sm">
            {customPorts.length}
          </span>
          <button
            onClick={onManageCustomPorts}
            className="p-1 text-text-muted hover:text-text-primary hover:bg-surface-hover rounded transition-all"
            title="Add Bookmark"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
          <button
            onClick={onToggle}
            className="p-1 text-text-muted hover:text-text-primary hover:bg-surface-hover rounded transition-all"
            title="Collapse sidebar"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Empty state */}
      {customPorts.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6 text-center">
          <div className="w-10 h-10 rounded-xl bg-surface-hover border border-surface-border shadow-sm flex items-center justify-center">
            <svg className="w-5 h-5 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
          </div>
          <div>
            <p className="text-xs font-semibold text-text-primary">No bookmarks yet</p>
            <p className="text-[11px] text-text-secondary mt-1 leading-relaxed">Use the + button above to save ports you care about.</p>
          </div>
        </div>
      )}

      {/* Port list */}
      {customPorts.length > 0 && (
        <div className="flex-1 overflow-y-auto py-2">
          {categories.map(category => (
            <div key={category} className="mb-2">
              <div className="px-4 py-1.5">
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">{category}</span>
              </div>
              {customPorts
                .filter(p => (p.category || 'Other') === category)
                .map(cp => {
                  const status = getStatus(cp.port);
                  return (
                    <div
                      key={cp.port}
                      className={`w-full text-left px-4 py-2 transition-colors group flex items-center justify-between ${
                        status.inUse
                          ? 'hover:bg-red-500/5 border-l-[3px] border-red-500'
                          : 'hover:bg-surface-hover border-l-[3px] border-transparent'
                      }`}
                    >
                      <button 
                        onClick={() => onPortClick(cp.port)}
                        className="flex items-center gap-2 min-w-0 flex-1 cursor-pointer text-left focus:outline-none"
                      >
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-0.5 shadow-sm ${
                          status.inUse ? 'bg-red-500 animate-pulse' : 'bg-surface-border border border-text-muted'
                        }`} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold text-text-primary">{cp.port}</span>
                            <span className="text-[11px] text-text-secondary truncate">{cp.label}</span>
                          </div>
                          {status.inUse && (
                            <div className="text-[10px] font-mono text-red-500 truncate mt-0.5">{status.process}</div>
                          )}
                        </div>
                      </button>

                      {/* Hover Actions */}
                      <div className={`flex items-center gap-1 transition-opacity pl-2 shrink-0 ${status.inUse ? 'opacity-60 group-hover:opacity-100' : 'opacity-0 group-hover:opacity-30'}`}>
                        <button
                          onClick={(e) => { e.stopPropagation(); if (status.portInfo) onInspectProcess(status.portInfo); }}
                          disabled={!status.inUse}
                          className="p-1.5 text-text-muted hover:text-text-primary hover:bg-surface rounded transition-colors disabled:cursor-not-allowed"
                          title="Inspect Process"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); if (status.portInfo) onKillProcess(status.portInfo); }}
                          disabled={!status.inUse}
                          className="p-1.5 text-text-muted hover:text-red-500 hover:bg-red-500/10 rounded transition-colors disabled:cursor-not-allowed"
                          title="Kill Process"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
