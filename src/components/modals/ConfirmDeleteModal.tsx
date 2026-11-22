import React from 'react';
import { Person } from '../../types';
import { AlertTriangle, Trash2 } from 'lucide-react';

export interface ConfirmDeleteModalProps {
  person: Person;
  isOpen: boolean;
  theme?: 'dark' | 'light';
  affectedChildrenCount: number;
  onClose: () => void;
  onConfirm: () => void;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  person,
  isOpen,
  theme = 'dark',
  affectedChildrenCount,
  onClose,
  onConfirm
}) => {
  if (!isOpen) return null;

  const isDark = theme === 'dark';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className={`relative w-full max-w-md rounded-2xl shadow-2xl border p-6 overflow-hidden ${
        isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
      }`}>
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/30">
            <AlertTriangle className="w-5 h-5" />
          </div>

          <div className="flex-1">
            <h3 className="font-bold text-base text-rose-400">Delete Relative?</h3>
            <p className="text-xs text-slate-400 mt-1">
              Are you sure you want to remove <strong className="text-white">{person.fullName}</strong> ({person.id}) from the family tree?
            </p>

            {affectedChildrenCount > 0 && (
              <div className="mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
                <strong>Warning:</strong> This person has <strong>{affectedChildrenCount} child/children</strong>. Removing them may detach the downstream branch unless another parent or marriage is linked.
              </div>
            )}

            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className={`px-3.5 py-1.5 text-xs font-medium rounded-xl border transition ${
                  isDark ? 'border-slate-700 hover:bg-slate-800 text-slate-300' : 'border-slate-200 hover:bg-slate-100 text-slate-600'
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/20 transition"
              >
                <Trash2 className="w-3.5 h-3.5" /> Confirm Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
