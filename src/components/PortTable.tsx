import { useState } from 'react';
import type { PortInfo } from '../types';
import { getRiskLevel } from '../utils/helpers';

interface PortTableProps {
  ports: PortInfo[];
  onKillProcess: (port: PortInfo) => void;
  onInspectProcess?: (port: PortInfo) => void;
  customPorts: Set<number>;
  highlightedPort?: number;
}

type SortColumn = 'port' | 'protocol' | 'process' | 'pid' | 'state' | 'cpu' | 'memory';
type SortDirection = 'asc' | 'desc';

export function PortTable({ ports, onKillProcess, onInspectProcess, customPorts, highlightedPort }: PortTableProps) {
  const [sortColumn, setSortColumn] = useState<SortColumn>('port');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [killingPid, setKillingPid] = useState<number | null>(null);

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const sortedPorts = [...ports].sort((a, b) => {
    let aVal: string | number =
      sortColumn === 'process' ? a.processName :
      sortColumn === 'cpu' ? (a.cpuUsage ?? 0) :
      sortColumn === 'memory' ? (a.memoryUsage ?? 0) :
      a[sortColumn];

    let bVal: string | number =
      sortColumn === 'process' ? b.processName :
      sortColumn === 'cpu' ? (b.cpuUsage ?? 0) :
      sortColumn === 'memory' ? (b.memoryUsage ?? 0) :
      b[sortColumn];

    if (typeof aVal === 'string') aVal = aVal.toLowerCase();
    if (typeof bVal === 'string') bVal = bVal.toLowerCase();

    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const handleKill = async (port: PortInfo) => {
    setKillingPid(port.pid);
    try { await onKillProcess(port); } finally { setKillingPid(null); }
  };

  const SortIcon = ({ column }: { column: SortColumn }) => {
    if (sortColumn !== column) {
      return <svg className="w-3.5 h-3.5 text-text-muted ml-1 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" /></svg>;
    }
    return sortDirection === 'asc'
      ? <svg className="w-3.5 h-3.5 text-brand-500 ml-1 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
      : <svg className="w-3.5 h-3.5 text-brand-500 ml-1 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>;
  };

  const getStatusBadge = (port: PortInfo) => {
    const risk = getRiskLevel(port.isSystemProcess, port.requiresAdmin);
    if (risk === 'high') return <span className="pill-danger">System</span>;
    if (risk === 'medium') return <span className="pill-amber">Admin</span>;
    return <span className="pill-approved">User</span>; // emerald green pill
  };

  const ResourceHint = ({ port }: { port: PortInfo }) => {
    const cpu = port.cpuUsage ?? 0;
    const ram = port.memoryUsage ?? 0;
    const hasCpu = cpu > 0.5;
    const hasRam = ram > 10;
    if (!hasCpu && !hasRam) return null;
    return (
      <div className="flex items-center gap-2 mt-1">
        {hasCpu && (
          <span className={`pill ${cpu > 20 ? 'pill-danger' : 'pill-open'}`} title="CPU Load">
            {cpu.toFixed(1)}%
          </span>
        )}
        {hasRam && (
          <span className={`pill ${ram > 300 ? 'pill-amber' : 'pill-open'}`} title="Memory (RAM) Usage">
            {ram >= 1024 ? `${(ram / 1024).toFixed(1)} GB` : `${ram.toFixed(0)} MB`}
          </span>
        )}
      </div>
    );
  };

  if (ports.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-12 bg-base">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-20 h-20 bg-surface rounded-2xl flex items-center justify-center mx-auto border border-surface-border shadow-sm">
            <svg className="w-10 h-10 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-text-primary">No active ports found</h3>
            <p className="text-sm text-text-secondary mt-1 leading-relaxed">Adjust your filters or ensure you have permissions to view system processes.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-hidden flex flex-col bg-surface m-4 rounded-xl border border-surface-border shadow-card dark:shadow-card-dark">
      <div className="overflow-x-auto overflow-y-auto flex-1 rounded-t-xl">
        <table className="w-full border-collapse">
          <thead className="bg-surface sticky top-0 z-10 border-b border-surface-border">
            <tr>
              <th className="pl-6 pr-4 py-3.5 text-left w-32 whitespace-nowrap">
                <button onClick={() => handleSort('port')} className="flex items-center text-[11px] font-bold text-text-secondary uppercase tracking-widest hover:text-text-primary transition-colors">
                  Port <SortIcon column="port" />
                </button>
              </th>
              <th className="px-4 py-3.5 text-left">
                <button onClick={() => handleSort('process')} className="flex items-center text-[11px] font-bold text-text-secondary uppercase tracking-widest hover:text-text-primary transition-colors">
                  Process <SortIcon column="process" />
                </button>
              </th>
              <th className="px-4 py-3.5 text-left w-24 whitespace-nowrap">
                <button onClick={() => handleSort('pid')} className="flex items-center text-[11px] font-bold text-text-secondary uppercase tracking-widest hover:text-text-primary transition-colors">
                  PID <SortIcon column="pid" />
                </button>
              </th>
              <th className="px-4 py-3.5 text-left w-24 text-[11px] font-bold text-text-secondary uppercase tracking-widest whitespace-nowrap">
                Type
              </th>
              <th className="pl-4 pr-6 py-3.5 text-right w-44 text-[11px] font-bold text-text-secondary uppercase tracking-widest whitespace-nowrap">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border">
            {sortedPorts.map((port) => {
              const isDocker = port.processName.startsWith('docker:');
              const isHighlighted = highlightedPort === port.port;
              const isCustom = customPorts.has(port.port);

              return (
                <tr
                  key={`${port.port}-${port.protocol}-${port.pid}`}
                  onClick={() => onInspectProcess?.(port)}
                  className={`group transition-all duration-150 cursor-pointer ${
                    isHighlighted ? 'bg-brand-500/10 border-l-[3px] border-l-brand-500' : 'bg-surface hover:bg-surface-hover border-l-[3px] border-l-transparent'
                  }`}
                >
                  {/* Port number */}
                  <td className="pl-6 pr-4 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2.5">
                      <span className="text-sm font-mono font-bold text-text-primary">{port.port}</span>
                      <span className={`pill ${
                        port.protocol === 'TCP' ? 'bg-blue-500/10 text-blue-500 border-blue-500/30' : 'pill-amber'
                      }`}>{port.protocol}</span>
                      {isCustom && <span className="pill pill-completed uppercase tracking-wider">Saved</span>}
                    </div>
                  </td>

                  {/* Process name + resources */}
                  <td className="px-4 py-4">
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm font-mono text-text-primary truncate max-w-[280px]" title={port.processName}>
                          {port.processName}
                        </span>
                        {isDocker && (
                          <span className="pill pill-docker uppercase tracking-wider shrink-0">
                            Docker
                          </span>
                        )}
                      </div>
                      <ResourceHint port={port} />
                    </div>
                  </td>

                  {/* PID */}
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className="text-sm font-mono text-text-secondary">{port.pid || '–'}</span>
                  </td>

                  {/* Type badge */}
                  <td className="px-4 py-4 whitespace-nowrap">
                    {getStatusBadge(port)}
                  </td>

                  {/* Actions */}
                  <td className="pl-4 pr-6 py-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-2.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                      {onInspectProcess && (
                        <button
                          onClick={(e) => { e.stopPropagation(); onInspectProcess(port); }}
                          className="btn-secondary"
                          title="Inspect — view CPU, memory, address and quick-actions"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Inspect
                        </button>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); handleKill(port); }}
                        disabled={killingPid === port.pid}
                        className="btn-primary !bg-red-500 hover:!bg-red-600"
                        title={`Kill ${port.processName} (PID ${port.pid})`}
                      >
                        {killingPid === port.pid ? (
                          <>
                            <svg className="animate-spin w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Killing…
                          </>
                        ) : (
                          <>
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            Kill
                          </>
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      {/* Footer status text */}
      <div className="bg-surface border-t border-surface-border px-6 py-2.5 flex items-center justify-between z-10 shrink-0 rounded-b-xl">
        <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-widest">{sortedPorts.length} ports listed</span>
        <span className="text-[11px] text-text-secondary">Hover a row and click <span className="font-semibold text-text-primary">Inspect</span> for detailed process metrics</span>
      </div>
    </div>
  );
}
