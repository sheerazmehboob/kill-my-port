import { useState, useRef } from 'react';
import { REFRESH_INTERVALS } from '../utils/constants';

interface HeaderProps {
  onRefresh: () => void;
  isRefreshing: boolean;
  autoRefreshEnabled: boolean;
  autoRefreshInterval: number;
  onToggleAutoRefresh: () => void;
  onChangeInterval: (interval: number) => void;
  onOpenAutoKillRules?: () => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
}

export function Header({
  onRefresh,
  isRefreshing,
  autoRefreshEnabled,
  autoRefreshInterval,
  onToggleAutoRefresh,
  onChangeInterval,
  onOpenAutoKillRules,
  isDarkMode,
  onToggleTheme,
}: HeaderProps) {
  const [showIntervalMenu, setShowIntervalMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  const handleMenuBlur = () => setTimeout(() => setShowIntervalMenu(false), 150);

  return (
    <header
      className="flex items-center justify-between border-b border-surface-border bg-surface shadow-sm"
      style={{ padding: '0 24px', height: 64, flexShrink: 0 }}
    >
      {/* ── Brand ── */}
      <div className="flex items-center gap-3 select-none">
        <img 
          src="/icon.png" 
          alt="Kill My Port Logo" 
          className="rounded-lg shadow-md"
          style={{ width: 36, height: 36 }}
        />
        <div>
          <div className="text-[15px] font-bold text-text-primary leading-none">KillMyPort</div>
          <div className="text-[11px] text-text-secondary leading-none mt-1 font-mono">Port &amp; process manager</div>
        </div>
      </div>

      {/* ── Right controls ── */}
      <div className="flex items-center gap-3">

        {/* Theme Toggle */}
        <button
          onClick={onToggleTheme}
          title={`Switch to ${isDarkMode ? 'Light' : 'Dark'} Mode`}
          className="btn-ghost p-2 rounded-full hover:bg-surface-active"
        >
          {isDarkMode ? (
            <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ) : (
            <svg className="w-4 h-4 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
        </button>

        {/* Divider */}
        <div className="w-px h-5 bg-surface-border mx-1" />

        {/* Refresh */}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          title="Refresh port list now"
          className="btn-secondary h-[34px] px-3 gap-1.5"
        >
          <svg className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>

        {/* Auto-Kill Rules */}
        {onOpenAutoKillRules && (
          <button
            onClick={onOpenAutoKillRules}
            title="Auto-Kill Rules: automatically terminate a process when it occupies a watched port"
            className="flex items-center gap-1.5 h-[34px] px-3 text-xs font-semibold rounded-lg border transition-all duration-150 active:scale-95 bg-amber-500/10 text-amber-600 dark:text-amber-500 border-amber-500/30 hover:bg-amber-500/20"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Auto-Kill
          </button>
        )}

        {/* Divider */}
        <div className="w-px h-5 bg-surface-border mx-1" />

        {/* Auto-refresh toggle */}
        <button
          onClick={onToggleAutoRefresh}
          title={autoRefreshEnabled ? 'Auto-refresh ON — click to pause' : 'Auto-refresh OFF — click to enable'}
          className={`flex items-center gap-1.5 h-[34px] px-3 text-xs font-semibold rounded-lg border transition-all duration-150 active:scale-95 ${
            autoRefreshEnabled 
              ? 'bg-brand-500/10 text-brand-600 dark:text-brand-400 border-brand-500/30 hover:bg-brand-500/20' 
              : 'bg-surface-active border-surface-border text-text-secondary hover:text-text-primary hover:bg-surface-hover shadow-sm'
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${autoRefreshEnabled ? 'bg-brand-500 animate-pulse' : 'bg-text-muted'}`} />
          Auto
        </button>

        {/* Interval selector */}
        <div className="relative" ref={menuRef} onBlur={handleMenuBlur}>
          <button
            onClick={() => setShowIntervalMenu(v => !v)}
            disabled={!autoRefreshEnabled}
            className="flex items-center gap-1 text-xs font-mono rounded-lg border transition-all duration-150 disabled:opacity-30 h-[34px] px-2.5 bg-surface-active border-surface-border text-text-secondary hover:text-text-primary hover:bg-surface-hover shadow-sm"
          >
            {REFRESH_INTERVALS.find(i => i.value === autoRefreshInterval)?.label ?? '5s'}
            <svg className="w-3 h-3 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {showIntervalMenu && (
            <div className="absolute right-0 mt-2 rounded-xl overflow-hidden animate-slide-up z-[120] bg-surface border border-surface-border shadow-card-dark w-32 py-1">
              {REFRESH_INTERVALS.map(interval => (
                <button
                  key={interval.value}
                  onClick={() => { onChangeInterval(interval.value); setShowIntervalMenu(false); }}
                  className={`w-full text-left text-xs transition-colors px-4 py-2 flex items-center gap-2 ${
                    interval.value === autoRefreshInterval
                      ? 'text-brand-600 dark:text-brand-400 font-bold bg-brand-500/5'
                      : 'text-text-secondary font-medium hover:bg-surface-hover hover:text-text-primary'
                  }`}
                >
                  {interval.label}
                  {interval.value === autoRefreshInterval && (
                    <svg className="w-3 h-3 ml-auto text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
