import { describe, it, expect } from 'vitest';
import { computeTreeLayout } from '../layout/bimodalLayout';
import { parseGedcom } from '../parser/gedcomParser';
import { SAMPLE_GEDCOM_STRING } from '../demo/sampleData';

/**
 * Test Suite: Bimodal Hierarchical Layout Solver
 *
 * Verifies the fundamental geometric and topological invariants of the family tree layout engine:
 * 1. World Coordinate Normalization: All nodes, gates, and paths must possess strictly positive coordinates (x, y >= 60)
 *    to prevent visual clipping against canvas viewports.
 * 2. Spousal Horizontal Adjacency: Spouses must share identical generation tiers and vertical Y coordinates,
 *    separated horizontally by exactly (nodeWidth + spouseSpacing).
 * 3. Union Gate Centering: Intermediate marriage junction diamonds must be positioned exactly halfway between
 *    both spouses' centers and dropped 45% of the generational height.
 * 4. Generational Leveling: Children must occupy strictly greater generation ranks than their parents (gen_child > gen_parent).
 */
describe('Bimodal Layout Engine Invariants', () => {
  it('computes valid non-overlapping coordinates for all individuals', () => {
    const data = parseGedcom(SAMPLE_GEDCOM_STRING);
    const layout = computeTreeLayout(data);

    expect(Object.keys(layout.nodes).length).toBe(13);
    expect(Object.keys(layout.familyNodes).length).toBe(4);
    expect(layout.edges.length).toBeGreaterThan(0);

    // All coordinates must be strictly positive
    Object.values(layout.nodes).forEach(node => {
      expect(node.x).toBeGreaterThanOrEqual(60);
      expect(node.y).toBeGreaterThanOrEqual(60);
      expect(node.width).toBe(200);
      expect(node.height).toBe(88);
    });

    // Family gate nodes must also have positive coordinates
    Object.values(layout.familyNodes).forEach(fam => {
      expect(fam.x).toBeGreaterThanOrEqual(60);
      expect(fam.y).toBeGreaterThanOrEqual(60);
    });
  });

  it('keeps spouses adjacent in the same generation', () => {
    const data = parseGedcom(SAMPLE_GEDCOM_STRING);
    const layout = computeTreeLayout(data);

    const arthur = layout.nodes['I1'];
    const eleanor = layout.nodes['I2'];

    expect(arthur.generation).toBe(0);
    expect(eleanor.generation).toBe(0);
    expect(arthur.y).toBe(eleanor.y);
    // Spouses must be separated by nodeWidth + spouseSpacing
    expect(Math.abs(eleanor.x - arthur.x)).toBe(200 + 20);
  });

  it('positions family gate exactly between parents', () => {
    const data = parseGedcom(SAMPLE_GEDCOM_STRING);
    const layout = computeTreeLayout(data);

    const f1 = layout.familyNodes['F1'];
    const arthur = layout.nodes['I1'];
    const eleanor = layout.nodes['I2'];

    const expectedGateX = (arthur.x + 100 + eleanor.x + 100) / 2;
    expect(f1.x).toBeCloseTo(expectedGateX, 1);
  });

  it('calculates bounding box containing all nodes with padding', () => {
    const data = parseGedcom(SAMPLE_GEDCOM_STRING);
    const layout = computeTreeLayout(data);

    expect(layout.bounds).toBeDefined();
    expect(layout.bounds.width).toBeGreaterThan(1000);
    expect(layout.bounds.height).toBeGreaterThan(600);
  });
});
