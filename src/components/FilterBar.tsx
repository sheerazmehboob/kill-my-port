import { useRef } from 'react';
import type { Protocol } from '../types';



interface FilterBarProps {
  protocol: 'ALL' | Protocol;
  onProtocolChange: (protocol: 'ALL' | Protocol) => void;
  showSystemPorts: boolean;
  onToggleSystemPorts: () => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  totalCount: number;
  filteredCount: number;
  onClearFilters: () => void;
}

const PROTOCOL_PILLS = [
  { val: 'ALL', label: 'All' },
  { val: 'TCP', label: 'TCP' },
  { val: 'UDP', label: 'UDP' },
] as const;



export function FilterBar({
  protocol,
  onProtocolChange,
  showSystemPorts,
  onToggleSystemPorts,
  searchTerm,
  onSearchChange,
  totalCount,
  filteredCount,
  onClearFilters,
}: FilterBarProps) {
  const searchRef = useRef<HTMLInputElement>(null);
  const isFiltered = protocol !== 'ALL' || showSystemPorts || searchTerm.length > 0;
  const showingFiltered = filteredCount !== totalCount;

  return (
    <div className="border-b border-surface-border bg-surface-hover px-5 py-3">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        
        {/* ── Left: Filter pills ── */}
        <div className="flex items-center gap-4 flex-wrap">
          {/* Protocol */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-widest">Protocol</span>
            <div className="flex gap-1 ml-1">
              {PROTOCOL_PILLS.map(({ val, label }) => (
                <button
                  key={val}
                  onClick={() => onProtocolChange(val)}
                  className={`px-3 py-1 text-xs font-semibold rounded border transition-all duration-100 ${
                    protocol === val
                      ? 'bg-brand-500/10 text-brand-500 border-brand-500/30'
                      : 'bg-surface text-text-muted border-surface-border hover:text-text-primary hover:bg-surface-hover'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="w-px h-4 bg-surface-border" />

          {/* System Ports toggle */}
          <button
            onClick={onToggleSystemPorts}
            className={`flex items-center gap-2 px-3 py-1 text-xs font-semibold rounded border transition-all duration-100 ${
              showSystemPorts
                ? 'bg-red-500/10 text-red-500 border-red-500/30'
                : 'bg-surface text-text-muted border-surface-border hover:text-text-primary hover:bg-surface-hover'
            }`}
            title="Show Windows/System background processes"
          >
            <span className={`w-1.5 h-1.5 rounded-full ${showSystemPorts ? 'bg-red-500' : 'bg-text-muted'}`} />
            System Ports
          </button>
        </div>


        {/* ── Right: Search + Count + Clear ── */}
        <div className="flex items-center gap-4 ml-auto flex-1 justify-end flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[280px] max-w-2xl">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <svg className="w-3.5 h-3.5 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              id="main-search"
              ref={searchRef}
              type="text"
              value={searchTerm}
              onChange={e => onSearchChange(e.target.value)}
              placeholder="Search ports or processes... (Ctrl+K)"
              className="w-full bg-surface border border-surface-border rounded-lg text-xs text-text-primary placeholder-text-muted
                         pl-9 pr-8 py-1.5 shadow-sm
                         focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/50
                         transition-all duration-150"
            />
            {searchTerm && (
              <button
                onClick={() => { onSearchChange(''); searchRef.current?.focus(); }}
                className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-text-muted hover:text-text-primary transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Count & Reset */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-text-secondary whitespace-nowrap">
              {showingFiltered ? (
                <><span className="text-text-primary font-semibold">{filteredCount}</span> / {totalCount}</>
              ) : (
                <><span className="text-text-primary font-semibold">{totalCount}</span> ports</>
              )}
            </span>
            {isFiltered && (
              <button
                onClick={() => { onClearFilters(); onSearchChange(''); }}
                className="text-xs font-semibold text-brand-500 hover:text-brand-400 transition-colors flex items-center gap-1.5 whitespace-nowrap"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Reset
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
