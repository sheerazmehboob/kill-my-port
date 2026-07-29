import { useState } from 'react';
import type { AutoKillRule } from '../types';

interface AutoKillRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  rules: AutoKillRule[];
  onAddRule: (port: number, label: string) => void;
  onRemoveRule: (id: string) => void;
  onToggleRule: (id: string) => void;
}

export function AutoKillRulesModal({
  isOpen,
  onClose,
  rules,
  onAddRule,
  onRemoveRule,
  onToggleRule,
}: AutoKillRulesModalProps) {
  const [portInput, setPortInput] = useState('');
  const [labelInput, setLabelInput] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedPort = parseInt(portInput, 10);
    if (isNaN(parsedPort) || parsedPort < 1 || parsedPort > 65535) return;
    onAddRule(parsedPort, labelInput.trim() || `Port ${parsedPort} Auto-Kill`);
    setPortInput('');
    setLabelInput('');
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div
        className="bg-surface border border-surface-border w-full max-w-xl rounded-2xl shadow-card-dark overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-surface-border bg-surface-hover">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0 mt-0.5">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-bold text-text-primary">Auto-Kill Rules</h2>
                <p className="text-xs text-text-secondary mt-0.5 leading-relaxed max-w-sm">
                  Auto-Kill watches your port list on every refresh. When a rule's port becomes occupied,
                  KillMyPort <strong className="text-amber-500">automatically terminates</strong> the conflicting process —
                  no manual action needed.
                </p>
              </div>
            </div>
            <button onClick={onClose} className="shrink-0 text-text-muted hover:text-text-primary p-1 rounded hover:bg-surface-active transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Add Form */}
        <form onSubmit={handleSubmit} className="p-8 border-b border-surface-border bg-surface-active">
          <div className="flex gap-3">
            <div className="w-1/3">
              <label className="block text-xs font-semibold text-text-muted mb-1">Port Number</label>
              <input
                type="number"
                value={portInput}
                onChange={(e) => setPortInput(e.target.value)}
                placeholder="e.g. 3000"
                min="1"
                max="65535"
                required
                className="input-field"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-semibold text-text-muted mb-1">Label / Description</label>
              <input
                type="text"
                value={labelInput}
                onChange={(e) => setLabelInput(e.target.value)}
                placeholder="e.g. Dev React App Port"
                className="input-field"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                className="btn-primary !bg-amber-500 hover:!bg-amber-600 !text-white h-[38px]"
              >
                + Add Rule
              </button>
            </div>
          </div>
        </form>

        {/* Rules List */}
        <div className="p-8 max-h-[50vh] overflow-y-auto space-y-3">
          {rules.length === 0 ? (
            <div className="text-center py-8 text-text-muted text-sm">
              No active Auto-Kill rules. Add a rule above to automatically terminate conflicting ports.
            </div>
          ) : (
            rules.map((rule) => (
              <div
                key={rule.id}
                className="flex items-center justify-between p-3.5 bg-surface-hover border border-surface-border rounded-xl hover:border-text-muted transition-all"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-amber-500 text-base px-2.5 py-1 bg-amber-500/10 rounded-lg border border-amber-500/30">
                    :{rule.port}
                  </span>
                  <div>
                    <h4 className="text-sm font-semibold text-text-primary">{rule.label}</h4>
                    <p className="text-xs text-text-secondary">Auto-Killed {rule.autoKillCount} times</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => onToggleRule(rule.id)}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg border transition-all ${
                      rule.enabled
                        ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                        : 'bg-surface-active text-text-muted border-surface-border'
                    }`}
                  >
                    {rule.enabled ? 'ACTIVE' : 'PAUSED'}
                  </button>
                  <button
                    onClick={() => onRemoveRule(rule.id)}
                    className="p-1.5 text-text-muted hover:text-red-500 transition-colors"
                    title="Delete rule"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
