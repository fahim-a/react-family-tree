import { describe, it, expect } from 'vitest';
import { normalizeTreeData } from '../parser/treeNormalizer';
import { computeTreeLayout } from '../layout/bimodalLayout';

describe('treeNormalizer', () => {
  it('converts array-based people and families into records', () => {
    const raw = {
      people: [
        { id: 'I1', first: 'John', surname: 'Doe', gender: 'M', fams: ['F1'] },
        { id: 'I2', first: 'Jane', surname: 'Smith', gender: 'F', fams: ['F1'] },
        { id: 'I3', first: 'Junior', surname: 'Doe', gender: 'M', famc: 'F1' }
      ],
      families: [
        { id: 'F1', husband: 'I1', wife: 'I2', children: ['I3'] }
      ]
    };

    const normalized = normalizeTreeData(raw);

    expect(Array.isArray(normalized.people)).toBe(false);
    expect(Array.isArray(normalized.families)).toBe(false);
    expect(Object.keys(normalized.people)).toHaveLength(3);
    expect(Object.keys(normalized.families)).toHaveLength(1);
    expect(normalized.people['I1'].fullName).toBe('John Doe');
    expect(normalized.families['F1'].husband).toBe('I1');
    expect(normalized.families['F1'].children).toEqual(['I3']);
  });

  it('supports "persons" property alias and extracts events array', () => {
    const raw = {
      persons: [
        {
          id: 'P1',
          name: 'Grandpa Joe',
          gender: 'male',
          events: [
            { type: 'Birth', date: '12 Jan 1920', place: 'Boston, MA' },
            { type: 'Death', date: '5 May 1995', place: 'Chicago, IL' }
          ]
        }
      ],
      families: []
    };

    const normalized = normalizeTreeData(raw);
    const p = normalized.people['P1'];

    expect(p).toBeDefined();
    expect(p.fullName).toBe('Grandpa Joe');
    expect(p.gender).toBe('M');
    expect(p.birth?.date).toBe('12 Jan 1920');
    expect(p.birth?.place).toBe('Boston, MA');
    expect(p.death?.date).toBe('5 May 1995');
    expect(p.death?.place).toBe('Chicago, IL');
  });

  it('handles husbandId, wifeId, childrenIds, and family marriage events', () => {
    const raw = {
      people: [
        { id: 'H1', fullName: 'Dad', gender: 'M' },
        { id: 'W1', fullName: 'Mom', gender: 'F' },
        { id: 'C1', fullName: 'Kid', gender: 'O' }
      ],
      families: [
        {
          id: 'FAM_1',
          husbandId: 'H1',
          wifeId: 'W1',
          childrenIds: ['C1'],
          events: [
            { type: 'Marriage', date: '15 Jun 1980', place: 'London' }
          ]
        }
      ]
    };

    const normalized = normalizeTreeData(raw);
    const fam = normalized.families['FAM_1'];

    expect(fam.husband).toBe('H1');
    expect(fam.wife).toBe('W1');
    expect(fam.children).toEqual(['C1']);
    expect(fam.marriage?.date).toBe('15 Jun 1980');
    expect(fam.marriage?.place).toBe('London');
  });

  it('coerces single string fams into an array', () => {
    const raw = {
      people: [
        { id: 'I10', fullName: 'Alice', fams: 'F99' }
      ],
      families: [
        { id: 'F99', wife: 'I10', children: [] }
      ]
    };

    const normalized = normalizeTreeData(raw);
    expect(normalized.people['I10'].fams).toEqual(['F99']);
  });

  it('repairs bidirectional links between parents, spouses, and children', () => {
    // Family lists children and parents, but person objects lack famc and fams
    const raw = {
      people: [
        { id: 'FATHER', fullName: 'Father', gender: 'M' },
        { id: 'MOTHER', fullName: 'Mother', gender: 'F' },
        { id: 'SON', fullName: 'Son', gender: 'M' }
      ],
      families: [
        { id: 'FAM_TEST', husband: 'FATHER', wife: 'MOTHER', children: ['SON'] }
      ]
    };

    const normalized = normalizeTreeData(raw);

    // Repaired child famc
    expect(normalized.people['SON'].famc).toBe('FAM_TEST');
    // Repaired spouse fams
    expect(normalized.people['FATHER'].fams).toContain('FAM_TEST');
    expect(normalized.people['MOTHER'].fams).toContain('FAM_TEST');
  });

  it('repairs reverse links from child famc to family children list', () => {
    const raw = {
      people: [
        { id: 'DAUGHTER', fullName: 'Daughter', gender: 'F', famc: 'FAM_REV' }
      ],
      families: [
        { id: 'FAM_REV', husband: 'DAD', children: [] }
      ]
    };

    const normalized = normalizeTreeData(raw);
    expect(normalized.families['FAM_REV'].children).toContain('DAUGHTER');
  });

  it('computes hierarchical multi-tier layout successfully on array-based JSON datasets', () => {
    const rawDataset = {
      people: [
        { id: 'P_ROOT', fullName: 'Patriarch', gender: 'M' },
        { id: 'P_SPOUSE', fullName: 'Matriarch', gender: 'F' },
        { id: 'P_CHILD', fullName: 'Child One', gender: 'M' },
        { id: 'P_GRANDCHILD', fullName: 'Grandchild', gender: 'F' }
      ],
      families: [
        { id: 'F_GEN1', husband: 'P_ROOT', wife: 'P_SPOUSE', children: ['P_CHILD'] },
        { id: 'F_GEN2', husband: 'P_CHILD', children: ['P_GRANDCHILD'] }
      ]
    };

    const normalized = normalizeTreeData(rawDataset);
    const layout = computeTreeLayout(normalized);

    expect(Object.keys(layout.nodes)).toHaveLength(4);
    expect(layout.nodes['P_ROOT'].generation).toBe(0);
    expect(layout.nodes['P_SPOUSE'].generation).toBe(0);
    expect(layout.nodes['P_CHILD'].generation).toBe(1);
    expect(layout.nodes['P_GRANDCHILD'].generation).toBe(2);
    expect(layout.edges.length).toBeGreaterThanOrEqual(4);
  });

  it('is idempotent when given already normalized TreeData', () => {
    const raw = {
      people: {
        I1: { id: 'I1', fullName: 'John Doe', first: 'John', surname: 'Doe', gender: 'M', fams: [] }
      },
      families: {}
    };

    const normalizedOnce = normalizeTreeData(raw);
    const normalizedTwice = normalizeTreeData(normalizedOnce);

    expect(normalizedTwice.people['I1'].fullName).toBe('John Doe');
  });

  it('safely handles empty or invalid inputs', () => {
    expect(normalizeTreeData(null)).toEqual({ people: {}, families: {}, media: {} });
    expect(normalizeTreeData(undefined)).toEqual({ people: {}, families: {}, media: {} });
    expect(normalizeTreeData('bad string')).toEqual({ people: {}, families: {}, media: {} });
    expect(normalizeTreeData({})).toEqual({ people: {}, families: {}, media: {} });
  });
});
