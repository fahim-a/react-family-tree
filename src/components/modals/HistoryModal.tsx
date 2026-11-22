import React from 'react';
import { HistoryEntry, HistoryChangeType } from '../../types';
import {
  History,
  X,
  RotateCcw,
  RotateCw,
  UserPlus,
  Users,
  GitBranch,
  PenLine,
  Trash2,
  Camera,
  Database,
  CheckCircle2,
  Undo2,
  Redo2,
  Clock
} from 'lucide-react';

export interface HistoryModalProps {
  isOpen: boolean;
  theme?: 'dark' | 'light';
  history: HistoryEntry[];
  currentIndex: number;
  canUndo: boolean;
  canRedo: boolean;
  onClose: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onRevertToIndex: (index: number) => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({
  isOpen,
  theme = 'dark',
  history,
  currentIndex,
  canUndo,
  canRedo,
  onClose,
  onUndo,
  onRedo,
  onRevertToIndex
}) => {
  if (!isOpen) return null;
  const isDark = theme === 'dark';

  const getChangeIcon = (type: HistoryChangeType) => {
    switch (type) {
      case 'add_person':
        return <UserPlus className="w-4 h-4 text-emerald-400" />;
      case 'add_spouse':
        return <Users className="w-4 h-4 text-purple-400" />;
      case 'add_child':
      case 'add_parent':
        return <GitBranch className="w-4 h-4 text-sky-400" />;
      case 'edit_person':
        return <PenLine className="w-4 h-4 text-amber-400" />;
      case 'delete_person':
        return <Trash2 className="w-4 h-4 text-rose-400" />;
      case 'unlink_relation':
        return <X className="w-4 h-4 text-amber-400" />;
      case 'media':
        return <Camera className="w-4 h-4 text-indigo-400" />;
      case 'revert':
        return <RotateCcw className="w-4 h-4 text-cyan-400" />;
      case 'load':
      default:
        return <Database className="w-4 h-4 text-slate-400" />;
    }
  };

  const formatTimestamp = (date: Date) => {
    try {
      const d = date instanceof Date ? date : new Date(date);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return '';
    }
  };

  const totalChanges = Math.max(0, history.length - 1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className={`relative w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[85vh] ${
          isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Header */}
        <div className={`p-4 sm:p-5 border-b flex items-center justify-between ${
          isDark ? 'border-slate-800 bg-slate-900/80' : 'border-slate-100 bg-slate-50/80'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-500/30">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm sm:text-base">Change History & Revert</h3>
                <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full border ${
                  isDark ? 'bg-slate-800 text-purple-300 border-slate-700' : 'bg-purple-50 text-purple-700 border-purple-200'
                }`}>
                  {totalChanges} change{totalChanges === 1 ? '' : 's'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Audit log of all edits in this session. Select any point in time to revert back.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Quick Undo / Redo toolbar inside modal */}
            <button
              onClick={onUndo}
              disabled={!canUndo}
              className={`p-1.5 rounded-lg border transition disabled:opacity-30 ${
                isDark ? 'border-slate-700 hover:bg-slate-800 text-slate-300' : 'border-slate-200 hover:bg-slate-100 text-slate-700'
              }`}
              title="Undo Last Change (Ctrl+Z)"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              onClick={onRedo}
              disabled={!canRedo}
              className={`p-1.5 rounded-lg border transition disabled:opacity-30 ${
                isDark ? 'border-slate-700 hover:bg-slate-800 text-slate-300' : 'border-slate-200 hover:bg-slate-100 text-slate-700'
              }`}
              title="Redo Next Change (Ctrl+Y)"
            >
              <Redo2 className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className={`p-1.5 rounded-lg ml-2 transition ${
                isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-black hover:bg-slate-100'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Timeline List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
          {history.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              No changes recorded in this session.
            </div>
          ) : (
            <div className="relative pl-6 space-y-3 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-700/50">
              {history.map((entry, idx) => {
                const isCurrent = idx === currentIndex;
                const isPast = idx < currentIndex;

                return (
                  <div
                    key={entry.id}
                    className={`relative flex items-center justify-between gap-3 p-3 rounded-xl border transition-all duration-200 ${
                      isCurrent
                        ? isDark
                          ? 'bg-purple-950/40 border-purple-500/60 shadow-lg shadow-purple-500/10 ring-1 ring-purple-500/40'
                          : 'bg-purple-50/90 border-purple-300 shadow-md ring-1 ring-purple-400'
                        : isPast
                        ? isDark
                          ? 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                          : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
                        : isDark
                        ? 'bg-slate-900/40 border-slate-800/60 opacity-60 hover:opacity-100'
                        : 'bg-slate-50 border-slate-200/80 opacity-60 hover:opacity-100'
                    }`}
                  >
                    {/* Timeline Node Bullet */}
                    <div
                      className={`absolute -left-[27px] w-4 h-4 rounded-full border-2 flex items-center justify-center transition ${
                        isCurrent
                          ? 'bg-purple-500 border-white dark:border-slate-950 scale-125'
                          : isPast
                          ? 'bg-emerald-500 border-slate-800 dark:border-slate-900'
                          : 'bg-slate-600 border-slate-800 dark:border-slate-900'
                      }`}
                    />

                    {/* Entry Details */}
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                        isDark ? 'bg-slate-800/90' : 'bg-slate-100'
                      }`}>
                        {getChangeIcon(entry.changeType)}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-xs font-semibold leading-tight truncate">
                            {entry.description}
                          </h4>
                          {entry.changeType === 'revert' && (
                            <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 shrink-0">
                              Reverted
                            </span>
                          )}
                          {isCurrent && (
                            <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-500 text-white shadow-sm shrink-0">
                              <CheckCircle2 className="w-2.5 h-2.5" /> Current State
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-500" />
                            {formatTimestamp(entry.timestamp)}
                          </span>

                          {entry.targetPersonName && (
                            <span className="truncate text-slate-400">
                              Target: <strong className={isDark ? 'text-slate-200' : 'text-slate-700'}>{entry.targetPersonName}</strong>
                            </span>
                          )}

                          <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded border border-slate-700/60 text-slate-400">
                            Step #{idx}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Revert / Fast-Forward Action */}
                    <div className="shrink-0 ml-2">
                      {isCurrent ? (
                        <span className="text-xs font-medium text-purple-400 italic px-2 py-1">
                          Active
                        </span>
                      ) : isPast ? (
                        <button
                          onClick={() => onRevertToIndex(idx)}
                          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition ${
                            isDark
                              ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-purple-300 hover:text-white'
                              : 'bg-purple-50 hover:bg-purple-100 border-purple-200 text-purple-700'
                          }`}
                          title={`Revert back to Step #${idx}`}
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span className="hidden sm:inline">Revert to this</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => onRevertToIndex(idx)}
                          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition ${
                            isDark
                              ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-sky-300 hover:text-white'
                              : 'bg-sky-50 hover:bg-sky-100 border-sky-200 text-sky-700'
                          }`}
                          title={`Fast-forward redo to Step #${idx}`}
                        >
                          <RotateCw className="w-3 h-3" />
                          <span className="hidden sm:inline">Redo to this</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`p-3.5 sm:p-4 border-t flex items-center justify-between text-xs ${
          isDark ? 'border-slate-800 bg-slate-900/80 text-slate-400' : 'border-slate-100 bg-slate-50 text-slate-500'
        }`}>
          <div className="flex items-center gap-1.5 font-mono text-[11px]">
            <span>Shortcuts:</span>
            <kbd className={`px-1.5 py-0.5 rounded border text-[10px] font-bold ${
              isDark ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-700 shadow-sm'
            }`}>Ctrl+Z</kbd>
            <span>Undo</span>
            <kbd className={`px-1.5 py-0.5 rounded border text-[10px] font-bold ml-1 ${
              isDark ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-700 shadow-sm'
            }`}>Ctrl+Y</kbd>
            <span>Redo</span>
          </div>

          <button
            onClick={onClose}
            className={`px-4 py-1.5 rounded-xl font-semibold border transition ${
              isDark
                ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
                : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700 shadow-sm'
            }`}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
