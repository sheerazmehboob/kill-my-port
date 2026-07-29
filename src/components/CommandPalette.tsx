import { useState, useEffect, useRef } from 'react';
import type { PortInfo } from '../types';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  ports: PortInfo[];
  onKillProcess: (port: PortInfo) => void;
}

export function CommandPalette({ isOpen, onClose, ports, onKillProcess }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const cleanQuery = query.toLowerCase().replace(/^kill\s+/, '').trim();

  const filteredPorts = ports.filter((p) => {
    if (!cleanQuery) return true;
    return (
      p.port.toString().includes(cleanQuery) ||
      p.processName.toLowerCase().includes(cleanQuery) ||
      p.pid.toString().includes(cleanQuery) ||
      p.protocol.toLowerCase().includes(cleanQuery)
    );
  });

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setSelectedIndex(0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (filteredPorts.length > 0 ? (prev + 1) % filteredPorts.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (filteredPorts.length > 0 ? (prev - 1 + filteredPorts.length) % filteredPorts.length : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredPorts[selectedIndex]) {
        onKillProcess(filteredPorts[selectedIndex]);
        onClose();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-start justify-center pt-20 px-4 animate-fade-in" onClick={onClose}>
      <div
        className="bg-surface border border-surface-border w-full max-w-2xl rounded-2xl shadow-card-dark overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Header */}
        <div className="flex items-center px-4 border-b border-surface-border bg-surface-hover">
          <svg className="w-5 h-5 text-text-muted mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleQueryChange}
            onKeyDown={handleKeyDown}
            placeholder="Type a port (e.g. 3000) or 'kill 5173' to terminate..."
            className="w-full bg-transparent py-4 text-text-primary text-base focus:outline-none placeholder-text-muted font-mono"
          />
          <kbd className="hidden sm:inline-block px-2 py-1 text-xs font-mono text-text-secondary bg-surface-active rounded border border-surface-border">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-2 divide-y divide-surface-border bg-surface">
          {filteredPorts.length === 0 ? (
            <div className="p-8 text-center text-text-muted text-sm">No matching active ports found.</div>
          ) : (
            filteredPorts.map((port, idx) => (
              <div
                key={`${port.port}-${port.pid}`}
                onClick={() => {
                  onKillProcess(port);
                  onClose();
                }}
                className={`flex items-center justify-between px-4 py-3 rounded-xl cursor-pointer transition-all border ${
                  idx === selectedIndex ? 'bg-brand-500/10 border-brand-500/30' : 'border-transparent hover:bg-surface-hover hover:border-surface-border'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="w-12 h-12 rounded-lg bg-surface-active border border-surface-border flex items-center justify-center font-mono font-bold text-brand-500 text-base shadow-sm">
                    {port.port}
                  </span>
                  <div>
                    <div className="text-text-primary font-mono font-semibold text-sm flex items-center gap-2">
                      {port.processName}
                      <span className="text-xs font-mono text-text-secondary font-normal">PID: {port.pid}</span>
                    </div>
                    <div className="text-xs text-text-secondary flex items-center gap-3 mt-0.5">
                      <span>Protocol: {port.protocol}</span>
                      {port.cpuUsage !== undefined && <span>CPU: {port.cpuUsage.toFixed(1)}%</span>}
                      {port.memoryUsage !== undefined && <span>RAM: {port.memoryUsage.toFixed(1)} MB</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button className="btn-primary !bg-red-500 hover:!bg-red-600 !text-white text-xs px-3 py-1.5 flex items-center gap-1 font-bold shadow-sm">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Kill Port
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="bg-surface-active border-t border-surface-border px-4 py-2.5 flex items-center justify-between text-xs text-text-secondary">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-surface rounded border border-surface-border text-text-primary font-mono">↑</kbd>
              <kbd className="px-1.5 py-0.5 bg-surface rounded border border-surface-border text-text-primary font-mono">↓</kbd>
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-surface rounded border border-surface-border text-text-primary font-mono">↵</kbd>
              Kill Process
            </span>
          </div>
          <span>Press Cmd/Ctrl + K anytime</span>
        </div>
      </div>
    </div>
  );
}
