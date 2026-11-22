import { useState, useCallback, useRef } from 'react';
import { TreeData, HistoryEntry, HistoryChangeType } from '../types';

export interface UseTreeHistoryOptions {
  maxHistory?: number;
  initialReason?: string;
  onStateChange?: (data: TreeData) => void;
}

export function createInitialHistoryEntry(data: TreeData, reason = 'Initial Tree Loaded'): HistoryEntry {
  return {
    id: `hist_${Date.now()}_0`,
    timestamp: new Date(),
    description: reason,
    changeType: 'load',
    snapshot: JSON.parse(JSON.stringify(data))
  };
}

/**
 * Pure TypeScript History Manager that manages an immutable undo/redo audit stack
 * with support for non-destructive append-only timeline reverts.
 *
 * Immutability & Revert Architecture (Option B Ledger):
 * ----------------------------------------------------
 * - Every tree mutation pushes a deep clone snapshot of `TreeData`.
 * - Single-step Undo (`undo()`) and Redo (`redo()`) navigate the pointer without deleting history.
 * - Selecting a past revision via `revertToIndex(targetIndex)` appends a new `'revert'` entry
 *   to the top of the stack rather than truncating future steps. This ensures that no research
 *   or intermediate edits are lost, and the revert itself can be undone via standard Undo.
 */
export class TreeHistoryManager {
  private _history: HistoryEntry[];
  private _currentIndex: number;
  private _maxHistory: number;

  constructor(initialData: TreeData, initialReason = 'Initial Tree Loaded', maxHistory = 50) {
    this._maxHistory = maxHistory;
    this._history = [createInitialHistoryEntry(initialData, initialReason)];
    this._currentIndex = 0;
  }

  public get history(): HistoryEntry[] {
    return [...this._history];
  }

  public get currentIndex(): number {
    return this._currentIndex;
  }

  public get currentData(): TreeData {
    return this._history[this._currentIndex]?.snapshot;
  }

  public get canUndo(): boolean {
    return this._currentIndex > 0;
  }

  public get canRedo(): boolean {
    return this._currentIndex < this._history.length - 1;
  }

  public recordChange(
    description: string,
    nextData: TreeData,
    changeType: HistoryChangeType,
    targetPersonName?: string,
    details?: string
  ): HistoryEntry {
    const clonedSnapshot = JSON.parse(JSON.stringify(nextData));
    const newEntry: HistoryEntry = {
      id: `hist_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date(),
      description,
      changeType,
      snapshot: clonedSnapshot,
      targetPersonName,
      details
    };

    // Discard future redos
    const active = this._history.slice(0, this._currentIndex + 1);
    this._history = [...active, newEntry];

    if (this._history.length > this._maxHistory) {
      this._history = this._history.slice(this._history.length - this._maxHistory);
    }

    this._currentIndex = this._history.length - 1;
    return newEntry;
  }

  public undo(): TreeData | null {
    if (!this.canUndo) return null;
    this._currentIndex--;
    return this.currentData;
  }

  public redo(): TreeData | null {
    if (!this.canRedo) return null;
    this._currentIndex++;
    return this.currentData;
  }

  public revertToIndex(targetIndex: number, mode: 'append' | 'jump' = 'append'): TreeData | null {
    if (targetIndex < 0 || targetIndex >= this._history.length) return null;
    if (targetIndex === this._currentIndex) return this.currentData;

    // Fast-forward redo to a future undone state, or explicit jump mode
    if (mode === 'jump' || targetIndex > this._currentIndex) {
      this._currentIndex = targetIndex;
      return this.currentData;
    }

    // Append-only revert for past states (Option B - non-destructive)
    const targetEntry = this._history[targetIndex];
    if (!targetEntry) return null;

    const targetSnapshot = JSON.parse(JSON.stringify(targetEntry.snapshot));
    const description = `Reverted to "${targetEntry.description}"`;
    this.recordChange(
      description,
      targetSnapshot,
      'revert',
      targetEntry.targetPersonName,
      `Restored state from Step #${targetIndex}`
    );
    return this.currentData;
  }

  public clearHistory(newData: TreeData, reason = 'Dataset Loaded'): void {
    this._history = [createInitialHistoryEntry(newData, reason)];
    this._currentIndex = 0;
  }
}

export interface UseTreeHistoryReturn {
  currentData: TreeData;
  history: HistoryEntry[];
  currentIndex: number;
  canUndo: boolean;
  canRedo: boolean;
  recordChange: (
    description: string,
    nextData: TreeData,
    changeType: HistoryChangeType,
    targetPersonName?: string,
    details?: string
  ) => void;
  undo: () => TreeData | null;
  redo: () => TreeData | null;
  revertToIndex: (targetIndex: number, mode?: 'append' | 'jump') => TreeData | null;
  clearHistory: (newData: TreeData, reason?: string) => void;
}

/**
 * React Hook wrapping TreeHistoryManager for reactive state in components.
 */
export function useTreeHistory(
  initialData: TreeData,
  options: UseTreeHistoryOptions = {}
): UseTreeHistoryReturn {
  const { maxHistory = 50, initialReason = 'Initial Tree Loaded', onStateChange } = options;

  const [history, setHistory] = useState<HistoryEntry[]>(() => [
    createInitialHistoryEntry(initialData, initialReason)
  ]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);

  const historyRef = useRef<HistoryEntry[]>(history);
  historyRef.current = history;
  const indexRef = useRef<number>(currentIndex);
  indexRef.current = currentIndex;

  const currentData = history[currentIndex]?.snapshot || initialData;
  const canUndo = currentIndex > 0;
  const canRedo = currentIndex < history.length - 1;

  const recordChange = useCallback(
    (
      description: string,
      nextData: TreeData,
      changeType: HistoryChangeType,
      targetPersonName?: string,
      details?: string
    ) => {
      const clonedSnapshot = JSON.parse(JSON.stringify(nextData));
      const newEntry: HistoryEntry = {
        id: `hist_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        timestamp: new Date(),
        description,
        changeType,
        snapshot: clonedSnapshot,
        targetPersonName,
        details
      };

      setHistory(prev => {
        const activeHistory = prev.slice(0, indexRef.current + 1);
        const nextHistory = [...activeHistory, newEntry];
        if (nextHistory.length > maxHistory) {
          return nextHistory.slice(nextHistory.length - maxHistory);
        }
        return nextHistory;
      });

      setCurrentIndex(prev => Math.min(prev + 1, maxHistory - 1));
      onStateChange?.(clonedSnapshot);
    },
    [maxHistory, onStateChange]
  );

  const undo = useCallback((): TreeData | null => {
    if (indexRef.current <= 0) return null;
    const targetIdx = indexRef.current - 1;
    const targetSnapshot = historyRef.current[targetIdx].snapshot;
    setCurrentIndex(targetIdx);
    onStateChange?.(targetSnapshot);
    return targetSnapshot;
  }, [onStateChange]);

  const redo = useCallback((): TreeData | null => {
    if (indexRef.current >= historyRef.current.length - 1) return null;
    const targetIdx = indexRef.current + 1;
    const targetSnapshot = historyRef.current[targetIdx].snapshot;
    setCurrentIndex(targetIdx);
    onStateChange?.(targetSnapshot);
    return targetSnapshot;
  }, [onStateChange]);

  const revertToIndex = useCallback(
    (targetIndex: number, mode: 'append' | 'jump' = 'append'): TreeData | null => {
      if (targetIndex < 0 || targetIndex >= historyRef.current.length) return null;
      if (targetIndex === indexRef.current) return currentData;

      // Fast-forward redo to a future undone state, or explicit jump mode
      if (mode === 'jump' || targetIndex > indexRef.current) {
        const targetSnapshot = historyRef.current[targetIndex].snapshot;
        setCurrentIndex(targetIndex);
        onStateChange?.(targetSnapshot);
        return targetSnapshot;
      }

      // Append-only revert for past states (Option B - non-destructive)
      const targetEntry = historyRef.current[targetIndex];
      if (!targetEntry) return null;

      const targetSnapshot = JSON.parse(JSON.stringify(targetEntry.snapshot));
      const description = `Reverted to "${targetEntry.description}"`;
      recordChange(
        description,
        targetSnapshot,
        'revert',
        targetEntry.targetPersonName,
        `Restored state from Step #${targetIndex}`
      );
      return targetSnapshot;
    },
    [currentData, onStateChange, recordChange]
  );

  const clearHistory = useCallback(
    (newData: TreeData, reason = 'Dataset Loaded') => {
      const freshEntry = createInitialHistoryEntry(newData, reason);
      setHistory([freshEntry]);
      setCurrentIndex(0);
      onStateChange?.(newData);
    },
    [onStateChange]
  );

  return {
    currentData,
    history,
    currentIndex,
    canUndo,
    canRedo,
    recordChange,
    undo,
    redo,
    revertToIndex,
    clearHistory
  };
}
