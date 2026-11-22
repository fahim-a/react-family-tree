import { describe, it, expect } from 'vitest';
import { TreeHistoryManager, createInitialHistoryEntry } from '../editor/useTreeHistory';
import { createEmptyTree, addPerson, addSpouse, addChild, updatePerson } from '../editor/treeMutations';
import { parseGedcom } from '../parser/gedcomParser';
import { SAMPLE_GEDCOM_STRING } from '../demo/sampleData';
import { TreeData } from '../types';

/**
 * Test Suite: Tree History, Undo-Redo & Non-Destructive Revert Scenarios
 *
 * Verifies the session audit log, pointer navigation, and Option B append-only rollback:
 * - Scenario 1: Initial baseline entry creation and boundary disablement of undo/redo.
 * - Scenario 2: Sequential mutation recording with single-step Undo (`Ctrl+Z`) and Redo (`Ctrl+Y`).
 * - Scenario 3: Non-Destructive Append-Only Revert (Option B): rolling back to past revisions appends
 *   an immutable restore snapshot (`changeType: 'revert'`), preserving all subsequent work and allowing
 *   one-click undo of the revert itself.
 * - Scenario 4: Future branch truncation when performing a new mutation from an undone state.
 * - Scenario 5: Clean history stack reset upon ingesting a new GEDCOM file, JSON file, or blank tree.
 * - Scenario 6: Circular buffer FIFO constraint enforcement (`maxHistory = 50`).
 */
describe('Tree History, Undo-Redo & Revert Scenarios', () => {
  it('Scenario 1: Initializes history with baseline entry and disables undo/redo', () => {
    const baseTree = createEmptyTree();
    const entry = createInitialHistoryEntry(baseTree, 'New Blank Tree');

    expect(entry.changeType).toBe('load');
    expect(entry.description).toBe('New Blank Tree');
    expect(entry.snapshot).toEqual(baseTree);

    const manager = new TreeHistoryManager(baseTree, 'New Blank Tree');
    expect(manager.history.length).toBe(1);
    expect(manager.currentIndex).toBe(0);
    expect(manager.canUndo).toBe(false);
    expect(manager.canRedo).toBe(false);
    expect(manager.undo()).toBeNull();
    expect(manager.redo()).toBeNull();
  });

  it('Scenario 2: Records changes and allows single-step Undo and Redo via TreeHistoryManager', () => {
    const initialTree = createEmptyTree();
    const manager = new TreeHistoryManager(initialTree, 'Blank Tree');

    // Step 1: Add Person
    const { data: tree1, personId: p1 } = addPerson(initialTree, { first: 'John', surname: 'Doe' });
    manager.recordChange('Added person "John Doe"', tree1, 'add_person', 'John Doe');

    expect(manager.history.length).toBe(2);
    expect(manager.currentIndex).toBe(1);
    expect(manager.canUndo).toBe(true);
    expect(manager.canRedo).toBe(false);

    // Step 2: Add Spouse
    const { data: tree2, spouseId: p2 } = addSpouse(tree1, p1, { first: 'Jane', surname: 'Doe' });
    manager.recordChange('Added spouse "Jane Doe"', tree2, 'add_spouse', 'Jane Doe');

    expect(manager.history.length).toBe(3);
    expect(manager.currentIndex).toBe(2);
    expect(manager.currentData.people[p2]).toBeDefined();

    // Undo Step 2 -> Back to Step 1 (John Doe only)
    const afterUndo = manager.undo();
    expect(afterUndo).not.toBeNull();
    expect(manager.currentIndex).toBe(1);
    expect(manager.canUndo).toBe(true);
    expect(manager.canRedo).toBe(true);
    expect(afterUndo!.people[p1]).toBeDefined();
    expect(afterUndo!.people[p2]).toBeUndefined();

    // Undo Step 1 -> Back to Step 0 (Empty Tree)
    const afterUndo2 = manager.undo();
    expect(afterUndo2).not.toBeNull();
    expect(manager.currentIndex).toBe(0);
    expect(manager.canUndo).toBe(false);
    expect(manager.canRedo).toBe(true);
    expect(Object.keys(afterUndo2!.people).length).toBe(0);

    // Redo Step 1 -> Forward to John Doe
    const afterRedo1 = manager.redo();
    expect(afterRedo1!.people[p1]).toBeDefined();
    expect(afterRedo1!.people[p2]).toBeUndefined();
    expect(manager.currentIndex).toBe(1);

    // Redo Step 2 -> Forward to Jane Doe
    const afterRedo2 = manager.redo();
    expect(afterRedo2!.people[p2]).toBeDefined();
    expect(manager.currentIndex).toBe(2);
    expect(manager.canRedo).toBe(false);
  });

  it('Scenario 3: Supports selecting any arbitrary point in time with non-destructive Append-Only Revert (Option B)', () => {
    const tree: TreeData = createEmptyTree();
    const manager = new TreeHistoryManager(tree, 'Start');

    // Make 4 consecutive edits
    const { data: d1, personId: p1 } = addPerson(tree, { first: 'Alice' });
    manager.recordChange('Add Alice', d1, 'add_person', 'Alice');

    const { data: d2, childId: c1 } = addChild(d1, p1, { first: 'Bob' });
    manager.recordChange('Add Bob', d2, 'add_child', 'Bob');

    const d3 = updatePerson(d2, p1, { occupation: 'Astronaut' });
    manager.recordChange('Update Alice occupation', d3, 'edit_person', 'Alice');

    const { data: d4, childId: c2 } = addChild(d3, p1, { first: 'Charlie' });
    manager.recordChange('Add Charlie', d4, 'add_child', 'Charlie');

    expect(manager.history.length).toBe(5); // [0: Start, 1: Alice, 2: Bob, 3: Astronaut, 4: Charlie]
    expect(manager.currentIndex).toBe(4);

    // Revert to index 1 (Alice only) using default Option B (append-only revert)
    const revertedTo1 = manager.revertToIndex(1);
    expect(revertedTo1).not.toBeNull();

    // In Option B, history grows to 6 entries - past changes (Bob, Astronaut, Charlie) are NOT lost!
    expect(manager.history.length).toBe(6);
    expect(manager.currentIndex).toBe(5);
    expect(manager.history[5].changeType).toBe('revert');
    expect(manager.history[5].description).toBe('Reverted to "Add Alice"');

    // The active tree matches Step 1 snapshot
    expect(revertedTo1!.people[p1]).toBeDefined();
    expect(revertedTo1!.people[p1].occupation).toBeUndefined();
    expect(revertedTo1!.people[c1]).toBeUndefined();
    expect(revertedTo1!.people[c2]).toBeUndefined();

    // Verify all prior history steps remain preserved in the audit stack
    expect(manager.history[1].description).toBe('Add Alice');
    expect(manager.history[2].description).toBe('Add Bob');
    expect(manager.history[3].description).toBe('Update Alice occupation');
    expect(manager.history[4].description).toBe('Add Charlie');

    // Pressing Undo reverses the revert itself, jumping back to Step 4 (Charlie + Astronaut Alice)
    const undidRevert = manager.undo();
    expect(manager.currentIndex).toBe(4);
    expect(undidRevert!.people[c2]).toBeDefined();
    expect(undidRevert!.people[p1].occupation).toBe('Astronaut');

    // Pressing Redo returns to the reverted state
    const redidRevert = manager.redo();
    expect(manager.currentIndex).toBe(5);
    expect(redidRevert!.people[c2]).toBeUndefined();

    // Revert directly to index 3 (Bob + Alice Astronaut)
    const revertedTo3 = manager.revertToIndex(3);
    expect(manager.history.length).toBe(7);
    expect(manager.currentIndex).toBe(6);
    expect(revertedTo3!.people[p1].occupation).toBe('Astronaut');
    expect(revertedTo3!.people[c1]).toBeDefined();
    expect(revertedTo3!.people[c2]).toBeUndefined();

    // Jump mode allows moving pointer without appending when explicitly requested
    const jumped = manager.revertToIndex(1, 'jump');
    expect(jumped).not.toBeNull();
    expect(manager.currentIndex).toBe(1);
    expect(manager.history.length).toBe(7); // Length unchanged in jump mode

    // Out of bounds revert returns null
    expect(manager.revertToIndex(-1)).toBeNull();
    expect(manager.revertToIndex(99)).toBeNull();
  });

  it('Scenario 4: Discards undone future history branch when a new change is made', () => {
    const tree: TreeData = createEmptyTree();
    const manager = new TreeHistoryManager(tree, 'Start');

    // Change 1
    const { data: d1, personId: p1 } = addPerson(tree, { first: 'PersonA' });
    manager.recordChange('Add A', d1, 'add_person');

    // Change 2
    const { data: d2 } = addPerson(d1, { first: 'PersonB' });
    manager.recordChange('Add B', d2, 'add_person');

    // Undo to index 1 (PersonA only)
    manager.undo();
    expect(manager.currentIndex).toBe(1);

    // Make a NEW change from index 1 (Branching off)
    const { data: d3 } = addPerson(manager.currentData, { first: 'PersonC' });
    manager.recordChange('Add C', d3, 'add_person');

    // PersonB should no longer exist in history stack
    expect(manager.history.length).toBe(3); // [Start, PersonA, PersonC]
    expect(manager.history.some(h => h.description === 'Add B')).toBe(false);
    expect(manager.currentData.people[p1]).toBeDefined();
    expect(manager.currentIndex).toBe(2);
  });

  it('Scenario 5: Loading a new GEDCOM, JSON, or Blank Tree clears out history', () => {
    const manager = new TreeHistoryManager(createEmptyTree(), 'Old Session');
    const { data: d1 } = addPerson(createEmptyTree(), { first: 'Temporary' });
    manager.recordChange('Add Temp', d1, 'add_person');

    expect(manager.history.length).toBe(2);
    expect(manager.currentIndex).toBe(1);

    // Load new GEDCOM dataset
    const newGedcomData = parseGedcom(SAMPLE_GEDCOM_STRING);
    // Clear history with new dataset
    manager.clearHistory(newGedcomData, 'Loaded "hawthorne.ged"');

    expect(manager.history.length).toBe(1);
    expect(manager.currentIndex).toBe(0);
    expect(manager.history[0].description).toBe('Loaded "hawthorne.ged"');
    expect(Object.keys(manager.currentData.people).length).toBe(13);

    // Create New Blank Tree
    const blankTree = createEmptyTree();
    manager.clearHistory(blankTree, 'New Blank Tree');

    expect(manager.history.length).toBe(1);
    expect(manager.currentIndex).toBe(0);
    expect(manager.history[0].description).toBe('New Blank Tree');
    expect(Object.keys(manager.currentData.people).length).toBe(0);
  });

  it('Scenario 6: Respects maxHistory buffer constraint', () => {
    const manager = new TreeHistoryManager(createEmptyTree(), 'Start', 3); // Max 3 entries

    let current = createEmptyTree();
    for (let i = 1; i <= 5; i++) {
      const { data: next } = addPerson(current, { first: `Person${i}` });
      manager.recordChange(`Add Person ${i}`, next, 'add_person');
      current = next;
    }

    expect(manager.history.length).toBe(3);
    expect(manager.currentIndex).toBe(2);
    expect(manager.history[manager.history.length - 1].description).toBe('Add Person 5');
  });
});
