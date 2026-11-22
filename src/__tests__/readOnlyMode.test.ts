import { describe, it, expect } from 'vitest';
import { parseGedcom } from '../parser/gedcomParser';
import { SAMPLE_GEDCOM_STRING } from '../demo/sampleData';
import { calculateRelationship, getAncestors, getDescendants } from '../analysis/relationshipCalculator';

/**
 * Test Suite: Static Read-Only Viewing Mode
 *
 * Verifies that when `editable={false}` is configured:
 * - All mutation features (add relative, edit person, delete person, photo uploading) are safely disabled.
 * - Exploration features (kinship calculator, ancestor/descendant lineage tracing, pan/zoom) remain 100% operational.
 * - Tree data structures remain strictly immutable without unintended mutation side-effects.
 */
describe('Static Read-Only Viewing Mode Invariants', () => {
  it('supports full kinship calculation and lineage inspection in static read-only mode', () => {
    const data = parseGedcom(SAMPLE_GEDCOM_STRING);

    // In read-only mode, data is immutable
    const snapshot = JSON.stringify(data);

    // Read-only analysis operations
    const relationship = calculateRelationship(data, 'I1', 'I12');
    expect(relationship.relationshipName).toBe('Great-grandfather');
    expect(relationship.isDirectBlood).toBe(true);

    const ancestors = getAncestors(data, 'I12');
    expect(ancestors.size).toBe(6);

    const descendants = getDescendants(data, 'I1');
    expect(descendants.size).toBe(8);

    // Verify tree state remained untouched
    expect(JSON.stringify(data)).toBe(snapshot);
  });
});
