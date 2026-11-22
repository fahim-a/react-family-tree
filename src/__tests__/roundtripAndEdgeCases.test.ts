import { describe, it, expect, vi } from 'vitest';
import { parseGedcom } from '../parser/gedcomParser';
import { exportGedcom, downloadGedcomFile } from '../exporter/gedcomExporter';
import { exportJson, downloadJsonFile } from '../exporter/jsonExporter';
import { computeTreeLayout } from '../layout/bimodalLayout';
import { applyPrivacyFilter } from '../parser/privacyFilter';
import { SAMPLE_GEDCOM_STRING } from '../demo/sampleData';
import { createEmptyTree, addPerson, addSpouse, addChild } from '../editor/treeMutations';
import { TreeData } from '../types';

/**
 * Test Suite: Serialization Roundtrip Fidelity & Graph Edge Cases
 *
 * Verifies data persistence, format conversion roundtrips, and structural edge cases:
 * - Scenario 1: GEDCOM <-> JSON bidirectional roundtrip preserving custom attributes, historical dates, and notes.
 * - Scenario 2: Empty tree rendering without errors or bounding box collapse.
 * - Scenario 3: Single isolated individual tree without families or marriages.
 * - Scenario 4: Disconnected forest (multiple parallel unrelated trees in a single canvas world).
 * - Scenario 5: Single-parent families (mothers or fathers with children but no spouse).
 * - Scenario 6: Living relative privacy masking and cutoff year thresholding.
 * - Scenario 7: DOM download helpers triggering synthetic click anchors for file saving.
 */
describe('Roundtrip Fidelity & Engine Edge Cases', () => {
  it('Scenario 1: Preserves custom attributes and vitals across GEDCOM -> JSON -> GEDCOM', () => {
    let tree: TreeData = createEmptyTree();
    const { data: d1, personId: p1 } = addPerson(tree, {
      fullName: 'Benjamin Franklin',
      first: 'Benjamin',
      surname: 'Franklin',
      gender: 'M',
      birth: { date: '17 JAN 1706', year: 1706, place: 'Boston, MA' },
      death: { date: '17 APR 1790', year: 1790, place: 'Philadelphia, PA' },
      occupation: 'Polymath & Statesman',
      bio: 'One of the Founding Fathers of the United States.',
      attributes: {
        'Invention': 'Lightning Rod & Bifocals',
        'Postmaster': 'First US Postmaster General',
        'Diplomacy': 'Ambassador to France'
      }
    });

    // Export to JSON and parse back
    const jsonStr = exportJson(d1);
    const fromJson: TreeData = JSON.parse(jsonStr);

    expect(fromJson.people[p1].attributes?.['Invention']).toBe('Lightning Rod & Bifocals');
    expect(fromJson.people[p1].attributes?.['Postmaster']).toBe('First US Postmaster General');
    expect(fromJson.people[p1].birth?.place).toBe('Boston, MA');

    // Export to GEDCOM and parse back
    const gedStr = exportGedcom(fromJson);
    expect(gedStr).toContain('1 OCCU Polymath & Statesman');
    expect(gedStr).toContain('1 EVEN Lightning Rod & Bifocals');
    expect(gedStr).toContain('2 TYPE Invention');
    expect(gedStr).toContain('2 PLAC Boston, MA');

    const fromGed = parseGedcom(gedStr);
    expect(fromGed.people[p1].fullName).toBe('Benjamin Franklin');
    expect(fromGed.people[p1].birth?.year).toBe(1706);
    expect(fromGed.people[p1].death?.year).toBe(1790);
    expect(fromGed.people[p1].attributes?.['Invention']).toBe('Lightning Rod & Bifocals');
  });

  it('Scenario 2: Handles layout for an empty tree gracefully without exceptions', () => {
    const emptyTree: TreeData = { people: {}, families: {} };
    const layout = computeTreeLayout(emptyTree);

    expect(layout.nodes).toEqual({});
    expect(layout.familyNodes).toEqual({});
    expect(layout.edges).toEqual([]);
    expect(layout.bounds).toBeDefined();
    expect(layout.bounds.width).toBeGreaterThan(0);
    expect(layout.bounds.height).toBeGreaterThan(0);
  });

  it('Scenario 3: Handles layout for an isolated single individual', () => {
    const tree: TreeData = {
      people: {
        'I1': {
          id: 'I1',
          fullName: 'Solo Traveler',
          first: 'Solo',
          surname: 'Traveler',
          gender: 'U',
          isLiving: true,
          fams: [],
          attributes: {}
        }
      },
      families: {}
    };

    const layout = computeTreeLayout(tree);
    expect(Object.keys(layout.nodes)).toHaveLength(1);
    expect(layout.nodes['I1'].x).toBeGreaterThanOrEqual(60);
    expect(layout.nodes['I1'].y).toBeGreaterThanOrEqual(60);
    expect(layout.familyNodes).toEqual({});
    expect(layout.edges).toHaveLength(0);
  });

  it('Scenario 4: Handles a forest of disconnected families without overlaps', () => {
    let tree: TreeData = createEmptyTree();
    // Family A (Roots)
    const { data: d1, personId: pA1 } = addPerson(tree, { first: 'Adam', gender: 'M' });
    const { data: d2 } = addSpouse(d1, pA1, { first: 'Eve', gender: 'F' });

    // Family B (Completely unrelated forest)
    const { data: d3, personId: pB1 } = addPerson(d2, { first: 'Noah', gender: 'M' });
    const { data: d4 } = addSpouse(d3, pB1, { first: 'Naamah', gender: 'F' });

    const layout = computeTreeLayout(d4);
    expect(Object.keys(layout.nodes)).toHaveLength(4);
    expect(Object.keys(layout.familyNodes)).toHaveLength(2);

    // Verify all nodes have positive coordinates
    Object.values(layout.nodes).forEach(node => {
      expect(node.x).toBeGreaterThanOrEqual(60);
      expect(node.y).toBeGreaterThanOrEqual(60);
    });

    // Check that family A and family B do not collide
    const xPositions = Object.values(layout.nodes).map(n => n.x);
    const uniqueXs = new Set(xPositions);
    expect(uniqueXs.size).toBe(4); // All 4 individuals placed at distinct horizontal slots
  });

  it('Scenario 5: Handles single-parent families (father only or mother only)', () => {
    let tree: TreeData = createEmptyTree();
    const { data: d1, personId: momId } = addPerson(tree, { first: 'SingleMom', gender: 'F' });
    const { data: d2, childId } = addChild(d1, momId, { first: 'OnlyChild', gender: 'M' });

    const layout = computeTreeLayout(d2);
    expect(layout.nodes[momId]).toBeDefined();
    expect(layout.nodes[childId]).toBeDefined();

    // Family gate should exist and be positioned directly under the single mother
    const childFamc = d2.people[childId].famc!;
    const gate = layout.familyNodes[childFamc];
    expect(gate).toBeDefined();
    expect(gate.x).toBeCloseTo(layout.nodes[momId].x + layout.nodes[momId].width / 2, 1);
  });

  it('Scenario 6: Privacy filter distinguishes deceased ancestors from living descendants accurately', () => {
    const data = parseGedcom(SAMPLE_GEDCOM_STRING);

    // Apply strict privacy filter with custom cutoff 1940
    const filtered = applyPrivacyFilter(data, {
      enabled: true,
      livingCutoffYear: 1940,
      maskName: '[RESTRICTED PERSON]'
    });

    // Arthur Hawthorne (born 1928, died 2005) is deceased -> NOT redacted
    expect(filtered.people['I1'].fullName).toBe('Arthur Hawthorne');
    expect(filtered.people['I1'].birth?.year).toBe(1928);

    // Oliver Hawthorne (born 1984, living) -> MUST be redacted
    expect(filtered.people['I7'].fullName).toBe('[RESTRICTED PERSON]');
    expect(filtered.people['I7'].birth?.date).toBeUndefined();
    expect(filtered.people['I7'].occupation).toBeUndefined();

    // Noah Hawthorne (born 2021, living) -> MUST be redacted
    expect(filtered.people['I13'].fullName).toBe('[RESTRICTED PERSON]');
    expect(filtered.people['I13'].birth?.date).toBeUndefined();

    // Privacy disabled: all data returned verbatim
    const unmasked = applyPrivacyFilter(data, { enabled: false });
    expect(unmasked.people['I7'].fullName).toBe('Oliver Hawthorne');
    expect(unmasked.people['I7'].birth?.year).toBe(1984);
  });

  it('Scenario 7: File download helpers trigger browser download without error', () => {
    const data = parseGedcom(SAMPLE_GEDCOM_STRING);

    // Mock DOM APIs
    const mockClick = vi.fn();
    const mockAppendChild = vi.fn();
    const mockRemoveChild = vi.fn();
    const mockCreateObjectURL = vi.fn(() => 'blob:mock-url');
    const mockRevokeObjectURL = vi.fn();

    const mockAnchor = {
      href: '',
      download: '',
      click: mockClick
    };

    const mockDocument = {
      createElement: vi.fn(() => mockAnchor),
      body: {
        appendChild: mockAppendChild,
        removeChild: mockRemoveChild
      }
    };

    class MockBlob {
      content: any;
      options: any;
      constructor(content: any, options: any) {
        this.content = content;
        this.options = options;
      }
    }

    vi.stubGlobal('document', mockDocument);
    vi.stubGlobal('URL', {
      createObjectURL: mockCreateObjectURL,
      revokeObjectURL: mockRevokeObjectURL
    });
    vi.stubGlobal('Blob', MockBlob);

    // Trigger JSON download
    downloadJsonFile(data, 'custom_family.json');
    expect(mockCreateObjectURL).toHaveBeenCalled();
    expect(mockAnchor.download).toBe('custom_family.json');
    expect(mockClick).toHaveBeenCalled();
    expect(mockRevokeObjectURL).toHaveBeenCalled();

    // Trigger GEDCOM download
    downloadGedcomFile(data, 'custom_family.ged');
    expect(mockAnchor.download).toBe('custom_family.ged');

    vi.unstubAllGlobals();
  });
});
