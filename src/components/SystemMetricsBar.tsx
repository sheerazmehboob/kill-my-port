import { useState } from 'react';
import type { PortInfo } from '../types';

interface SystemMetricsBarProps {
  ports: PortInfo[];
}

export function SystemMetricsBar({ ports }: SystemMetricsBarProps) {
  const [isCollapsed, setIsCollapsed] = useState(true);

  if (ports.length === 0) return null;

  // Aggregate metrics
  const totalRamMB = ports.reduce((acc, p) => acc + (p.memoryUsage || 0), 0);
  const rawTotalCpu = ports.reduce((acc, p) => acc + (p.cpuUsage || 0), 0);
  const totalCpu = Math.min(100, Math.round(rawTotalCpu * 10) / 10);
  const dockerCount = ports.filter(p => p.processName.startsWith('docker:')).length;
  const systemProcessCount = ports.filter(p => p.isSystemProcess).length;
  const userProcessCount = ports.length - systemProcessCount;

  // Top RAM & CPU Consumers
  const topRamProcess = [...ports].sort((a, b) => (b.memoryUsage || 0) - (a.memoryUsage || 0))[0];
  const topCpuProcess = [...ports].sort((a, b) => (b.cpuUsage || 0) - (a.cpuUsage || 0))[0];

  if (isCollapsed) {
    return (
      <div className="bg-surface border-b border-surface-border px-5 py-2 flex items-center justify-between transition-all duration-200">
        <div className="flex items-center gap-4 text-[11px] font-mono truncate">
          <span className="text-accent-500 font-semibold">
            RAM: {totalRamMB > 1024 ? `${(totalRamMB / 1024).toFixed(2)} GB` : `${totalRamMB.toFixed(1)} MB`}
          </span>
          <span className="text-text-muted">•</span>
          <span className="text-emerald-500 font-semibold">CPU: {totalCpu.toFixed(1)}%</span>
          <span className="text-text-muted">•</span>
          <span className="text-brand-500 font-medium">{ports.length} Active Ports</span>
          {topRamProcess && (
            <>
              <span className="text-text-muted hidden sm:inline">•</span>
              <span className="text-amber-500 truncate hidden sm:inline">
                Peak: {topRamProcess.processName} ({topRamProcess.memoryUsage?.toFixed(0)}M)
              </span>
            </>
          )}
        </div>
        <button
          onClick={() => setIsCollapsed(false)}
          className="text-[11px] font-medium text-text-secondary hover:text-text-primary flex items-center gap-1.5 transition-colors ml-3 shrink-0 bg-surface-hover hover:bg-surface-active px-2.5 py-1 rounded border border-surface-border"
          title="Expand telemetry dashboard"
        >
          <span>Expand</span>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="bg-surface border-b border-surface-border px-5 py-4 transition-all duration-300 relative group shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <span className="text-[11px] font-mono font-bold text-text-secondary uppercase tracking-widest flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-accent-500 animate-pulse" />
          System Telemetry & Health Overview
        </span>
        <button
          onClick={() => setIsCollapsed(true)}
          className="text-[11px] font-medium text-text-secondary hover:text-text-primary flex items-center gap-1.5 transition-colors bg-surface-hover hover:bg-surface-active px-2.5 py-1 rounded border border-surface-border"
          title="Collapse dashboard to compact ribbon"
        >
          <span>Collapse</span>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 items-center">
        {/* Tracked RAM Card */}
        <div className="bg-surface-hover border border-surface-border rounded-xl px-3.5 py-2.5 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-500 shrink-0 shadow-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Active RAM</p>
            <p className="text-sm md:text-[15px] font-mono font-bold text-text-primary truncate mt-0.5">
              {totalRamMB > 1024 ? `${(totalRamMB / 1024).toFixed(2)} GB` : `${totalRamMB.toFixed(1)} MB`}
            </p>
          </div>
        </div>

        {/* Total System CPU Load Card */}
        <div className="bg-surface-hover border border-surface-border rounded-xl px-3.5 py-2.5 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shrink-0 shadow-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Ports CPU Load</p>
            <p className="text-sm md:text-[15px] font-mono font-bold text-text-primary truncate mt-0.5" title="System-Normalized CPU Capacity">
              {totalCpu.toFixed(1)}%
            </p>
          </div>
        </div>

        {/* Top RAM Consumer */}
        <div className="bg-surface-hover border border-surface-border rounded-xl px-3.5 py-2.5 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shrink-0 shadow-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest truncate">Peak RAM</p>
            <p className="text-sm md:text-[15px] font-mono font-semibold text-text-primary truncate mt-0.5" title={topRamProcess?.processName}>
              {topRamProcess ? `${topRamProcess.processName} (${topRamProcess.memoryUsage?.toFixed(0) || 0}M)` : '-'}
            </p>
          </div>
        </div>

        {/* Top CPU Consumer */}
        <div className="bg-surface-hover border border-surface-border rounded-xl px-3.5 py-2.5 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-500 shrink-0 shadow-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest truncate">Peak CPU</p>
            <p className="text-sm md:text-[15px] font-mono font-semibold text-text-primary truncate mt-0.5" title={topCpuProcess?.processName}>
              {topCpuProcess ? `${topCpuProcess.processName} (${topCpuProcess.cpuUsage?.toFixed(1) || 0}%)` : '-'}
            </p>
          </div>
        </div>

        {/* Environment Breakdown */}
        <div className="bg-surface-hover border border-surface-border rounded-xl px-3.5 py-2.5 flex items-center gap-3 col-span-2 sm:col-span-1">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500 shrink-0 shadow-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Process Split</p>
            <div className="flex items-center gap-2 text-xs font-mono truncate mt-0.5">
              <span className="text-emerald-500 font-semibold">{userProcessCount} Usr</span>
              <span className="text-text-muted">•</span>
              <span className="text-red-500">{systemProcessCount} Sys</span>
              {dockerCount > 0 && (
                <>
                  <span className="text-text-muted">•</span>
                  <span className="text-cyan-500 font-bold">{dockerCount} Dck</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
