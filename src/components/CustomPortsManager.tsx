import { useState } from 'react';
import type { CustomPort } from '../types';
import { isValidPort } from '../utils/helpers';
import { ERROR_MESSAGES } from '../utils/constants';

interface CustomPortsManagerProps {
  customPorts: CustomPort[];
  onAdd: (port: number, label: string, category: string) => void;
  onRemove: (id: string) => void;
  onEdit: (id: string, label: string, category: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

const CATEGORIES = ['Frontend', 'Backend', 'Database', 'Other'];

export function CustomPortsManager({ customPorts, onAdd, onRemove, onEdit, isOpen, onClose }: CustomPortsManagerProps) {
  const [newPort, setNewPort] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newCategory, setNewCategory] = useState('Frontend');
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editCategory, setEditCategory] = useState('');

  const handleClose = () => {
    onClose();
    setError('');
    setEditingId(null);
    setNewPort('');
    setNewLabel('');
    setNewCategory('Frontend');
  };

  const handleAdd = () => {
    setError('');
    const portNum = parseInt(newPort, 10);

    if (!isValidPort(portNum)) {
      setError(ERROR_MESSAGES.INVALID_PORT);
      return;
    }

    if (customPorts.some((p) => p.port === portNum)) {
      setError(ERROR_MESSAGES.DUPLICATE_PORT);
      return;
    }

    if (!newLabel.trim()) {
      setError('Please provide a label for the port');
      return;
    }

    onAdd(portNum, newLabel.trim(), newCategory);
    setNewPort('');
    setNewLabel('');
    setError('');
  };

  const handleEdit = (id: string) => {
    if (!editLabel.trim()) {
      setError('Label cannot be empty');
      return;
    }
    onEdit(id, editLabel.trim(), editCategory);
    setEditingId(null);
    setEditLabel('');
    setEditCategory('');
    setError('');
  };

  const startEdit = (port: CustomPort) => {
    setEditingId(port.id);
    setEditLabel(port.label);
    setEditCategory(port.category || 'Other');
    setError('');
  };

  // Group ports by category
  const groupedPorts = CATEGORIES.reduce((acc, category) => {
    const ports = customPorts.filter(p => (p.category || 'Other') === category);
    if (ports.length > 0) {
      acc[category] = ports;
    }
    return acc;
  }, {} as Record<string, CustomPort[]>);

  // Add any categories not in the standard list that might exist in data
  customPorts.forEach(p => {
    const cat = p.category || 'Other';
    if (!CATEGORIES.includes(cat) && !groupedPorts[cat]) {
      groupedPorts[cat] = customPorts.filter(cp => (cp.category || 'Other') === cat);
    }
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface rounded-xl shadow-card-dark border border-surface-border max-w-2xl w-full max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-surface-border bg-surface-hover">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">Custom Ports</h2>
            <p className="text-xs text-text-secondary mt-0.5">Manage your frequently used ports</p>
          </div>
          <button
            onClick={handleClose}
            className="text-text-muted hover:text-text-primary transition-colors p-1"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Add New Port Form */}
        <div className="p-6 border-b border-surface-border bg-surface-active">
          <h3 className="text-sm font-medium text-text-secondary mb-3">Add New Port</h3>
          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-3">
              <input
                type="number"
                value={newPort}
                onChange={(e) => setNewPort(e.target.value)}
                placeholder="Port"
                className="input-field w-full text-sm"
                min="1"
                max="65535"
              />
            </div>
            <div className="col-span-4">
              <input
                type="text"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="Label"
                className="input-field w-full text-sm"
                onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
              />
            </div>
            <div className="col-span-3 relative">
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="input-field w-full text-sm px-2 py-2 appearance-none pr-8"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none text-text-muted">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
            <div className="col-span-2">
              <button onClick={handleAdd} className="btn-primary w-full text-sm h-[38px] flex items-center justify-center">
                Add
              </button>
            </div>
          </div>
          {error && (
            <p className="text-red-500 text-xs mt-3 flex items-center gap-1.5 animate-fade-in">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </p>
          )}
        </div>

        {/* Custom Ports List */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
          {customPorts.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-surface-active rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </div>
              <p className="text-text-secondary text-sm">No custom ports yet. Add one above!</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedPorts).map(([category, ports]) => (
                <div key={category}>
                  <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 px-1">{category}</h3>
                  <div className="space-y-2">
                    {ports.map((port) => (
                      <div
                        key={port.id}
                        className="flex items-center gap-3 p-3 bg-surface-hover hover:bg-surface-active rounded-lg border border-surface-border transition-colors group"
                      >
                        <div className="flex-shrink-0 w-16">
                          <span className="text-base font-bold text-brand-500 font-mono">:{port.port}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          {editingId === port.id ? (
                            <div className="grid grid-cols-2 gap-2">
                              <input
                                type="text"
                                value={editLabel}
                                onChange={(e) => setEditLabel(e.target.value)}
                                className="input-field text-sm h-8"
                                autoFocus
                                onKeyPress={(e) => e.key === 'Enter' && handleEdit(port.id)}
                              />
                              <select
                                value={editCategory}
                                onChange={(e) => setEditCategory(e.target.value)}
                                className="input-field text-sm h-8 py-0 px-2"
                              >
                                {CATEGORIES.map(cat => (
                                  <option key={cat} value={cat}>{cat}</option>
                                ))}
                              </select>
                            </div>
                          ) : (
                            <p className="text-sm font-medium text-text-primary truncate">{port.label}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                          {editingId === port.id ? (
                            <>
                              <button
                                onClick={() => handleEdit(port.id)}
                                className="text-emerald-500 hover:text-emerald-400 transition-colors p-1"
                                title="Save"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              </button>
                              <button
                                onClick={() => {
                                  setEditingId(null);
                                  setEditLabel('');
                                  setEditCategory('');
                                  setError('');
                                }}
                                className="text-text-muted hover:text-text-primary transition-colors p-1"
                                title="Cancel"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => startEdit(port)}
                                className="text-blue-500 hover:text-blue-400 transition-colors p-1"
                                title="Edit"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => onRemove(port.id)}
                                className="text-red-500 hover:text-red-400 transition-colors p-1"
                                title="Delete"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
