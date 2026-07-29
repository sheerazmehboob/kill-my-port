import { useState } from 'react';
import type { PortInfo } from '../types';
import { getRiskLevel } from '../utils/helpers';

interface ProcessInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  port: PortInfo | null;
  onKillProcess: (port: PortInfo) => void;
  onAddAutoKillRule?: (portNumber: number, label: string) => void;
}

export function ProcessInspectorModal({
  isOpen,
  onClose,
  port,
  onKillProcess,
  onAddAutoKillRule,
}: ProcessInspectorModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !port) return null;

  const isDocker = port.processName.startsWith('docker:');
  const ramMb = port.memoryUsage ?? 0;
  const cpuPct = port.cpuUsage ?? 0;
  const risk = getRiskLevel(port.isSystemProcess, port.requiresAdmin);

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify({
      port: port.port,
      protocol: port.protocol,
      processName: port.processName,
      pid: port.pid,
      state: port.state,
      user: port.user,
      address: port.address,
      cpuUsage: cpuPct,
      memoryUsageMB: ramMb,
      isSystemProcess: port.isSystemProcess,
      requiresAdmin: port.requiresAdmin,
    }, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const cpuColor = cpuPct > 50 ? 'from-red-500 to-red-600' : cpuPct > 20 ? 'from-amber-500 to-orange-500' : 'from-emerald-500 to-teal-500';
  const ramColor = ramMb > 500 ? 'from-red-500 to-red-600' : ramMb > 200 ? 'from-amber-500 to-orange-500' : 'from-brand-400 to-brand-600';

  const riskBadge = risk === 'high'
    ? <span className="pill pill-danger">Elevated Risk</span>
    : risk === 'medium'
    ? <span className="pill pill-amber">Requires Admin</span>
    : <span className="pill pill-approved">User Process</span>;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-surface border border-surface-border rounded-2xl w-full max-w-lg shadow-card-dark overflow-hidden animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="bg-surface-hover px-6 py-5 border-b border-surface-border flex items-start justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            {/* Large Port Icon */}
            <div className={`h-14 min-w-[3.5rem] px-3 w-auto rounded-2xl flex items-center justify-center font-mono font-bold text-xl shrink-0 border-2 shadow-sm ${
              isDocker
                ? 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20'
                : port.isSystemProcess
                ? 'bg-red-500/10 text-red-500 border-red-500/20'
                : 'bg-brand-500/10 text-brand-500 border-brand-500/20'
            }`}>
              {port.port}
            </div>
            
            {/* Process Info */}
            <div className="min-w-0 flex flex-col justify-center">
              <h2 className="text-lg font-bold text-text-primary font-mono flex items-center gap-2 flex-wrap leading-none mb-2">
                <span className="truncate">{port.processName}</span>
                {isDocker && <span className="pill pill-docker text-[10px]">DOCKER</span>}
              </h2>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 bg-surface-active px-2 py-0.5 rounded border border-surface-border">
                  <span className="text-[10px] text-text-muted font-semibold uppercase tracking-wider">PID</span>
                  <span className="text-xs text-text-primary font-mono font-bold">{port.pid || '—'}</span>
                </div>
                <div className="flex items-center gap-1.5 bg-surface-active px-2 py-0.5 rounded border border-surface-border">
                  <span className="text-[10px] text-text-muted font-semibold uppercase tracking-wider">PROTO</span>
                  <span className="text-xs text-text-primary font-mono font-bold">{port.protocol}</span>
                </div>
                {riskBadge}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="shrink-0 text-text-muted hover:text-text-primary p-1.5 rounded-lg hover:bg-surface-active transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── Body ── */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">

          {/* Resource gauges */}
          <div className="grid grid-cols-2 gap-4">
            {/* CPU */}
            <div className="bg-surface-hover border border-surface-border rounded-xl p-3.5">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">CPU Load</span>
                <span className={`text-sm font-mono font-bold ${cpuPct > 20 ? 'text-amber-500' : 'text-emerald-500'}`}>
                  {cpuPct.toFixed(1)}%
                </span>
              </div>
              <div className="w-full h-2 bg-surface-active rounded-full overflow-hidden mb-1.5 border border-surface-border">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${cpuColor} transition-all duration-500`}
                  style={{ width: `${Math.min(100, Math.max(2, cpuPct))}%` }}
                />
              </div>
              <p className="text-[10px] text-text-secondary">
                {cpuPct > 50 ? '🔥 Heavy CPU usage' : cpuPct > 20 ? '⚡ Moderate CPU load' : '✓ Normal CPU load'}
              </p>
            </div>

            {/* RAM */}
            <div className="bg-surface-hover border border-surface-border rounded-xl p-3.5">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Memory</span>
                <span className={`text-sm font-mono font-bold ${ramMb > 200 ? 'text-amber-500' : 'text-brand-500'}`}>
                  {ramMb >= 1024 ? `${(ramMb / 1024).toFixed(2)} GB` : `${ramMb.toFixed(0)} MB`}
                </span>
              </div>
              <div className="w-full h-2 bg-surface-active rounded-full overflow-hidden mb-1.5 border border-surface-border">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${ramColor} transition-all duration-500`}
                  style={{ width: `${Math.min(100, Math.max(2, (ramMb / 1024) * 100))}%` }}
                />
              </div>
              <p className="text-[10px] text-text-secondary">
                {ramMb > 500 ? '⚠️ High memory footprint' : ramMb > 200 ? '📊 Moderate usage' : '✓ Normal memory usage'}
              </p>
            </div>
          </div>

          {/* Process metadata */}
          <div className="bg-surface border border-surface-border rounded-xl overflow-hidden">
            <div className="px-4 py-2 border-b border-surface-border bg-surface-hover">
              <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Process Details</span>
            </div>
            <div className="divide-y divide-surface-border">
              {[
                { label: 'Binding Address', value: `${port.address || '0.0.0.0'}:${port.port}` },
                { label: 'State', value: port.state, colored: true },
                { label: 'User / Owner', value: port.user || 'Unknown' },
                { label: 'Privileges', value: port.requiresAdmin ? 'Administrator required' : 'Standard user' },
              ].map(({ label, value, colored }) => (
                <div key={label} className="grid grid-cols-[140px_1fr] items-center gap-4 px-4 py-2.5">
                  <span className="text-xs text-text-secondary font-mono">{label}</span>
                  <span className={`text-xs font-mono font-semibold ${colored ? 'text-emerald-500' : 'text-text-primary'}`}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* System process warning */}
          {port.isSystemProcess && (
            <div className="flex items-start gap-2.5 bg-red-50 dark:bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
              <svg className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              <p className="text-xs text-red-600 dark:text-red-400 leading-relaxed">
                <strong className="font-semibold">System process warning:</strong> Terminating this process may cause system instability or loss of network services.
              </p>
            </div>
          )}
        </div>

        {/* ── Footer Actions ── */}
        <div className="bg-surface-hover px-6 py-4 border-t border-surface-border flex items-center justify-between gap-3">
          <button
            onClick={handleCopy}
            className="btn-secondary text-xs px-3 py-2 flex items-center gap-1.5"
            title="Copy process details as JSON"
          >
            {copied ? (
              <><svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>Copied!</>
            ) : (
              <><svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>Copy JSON</>
            )}
          </button>

          <div className="flex items-center gap-2">
            {onAddAutoKillRule && (
              <button
                onClick={() => { onAddAutoKillRule(port.port, port.processName); onClose(); }}
                className="btn-secondary text-xs px-3 py-2 flex items-center gap-1.5 border-amber-500/30 text-amber-500 hover:bg-amber-500/10"
                title="Add an Auto-Kill rule — next time a process occupies this port it will be automatically terminated"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Auto-Kill Rule
              </button>
            )}
            <button
              onClick={() => { onKillProcess(port); onClose(); }}
              className="btn-primary !bg-red-500 hover:!bg-red-600 text-xs px-4 py-2 flex items-center gap-1.5 font-bold"
              title="Immediately terminate this process"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Kill Process
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
