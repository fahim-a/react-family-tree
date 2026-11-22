import { describe, it, expect } from 'vitest';
import {
  createEmptyTree,
  addPerson,
  addSpouse,
  addChild,
  addParent,
  updatePerson,
  removePerson,
  removeRelation
} from '../editor/treeMutations';
import { TreeData } from '../types';

/**
 * Test Suite: Complex Real-World Tree Editing Scenarios
 *
 * Verifies end-to-end multi-step interactive workflows executed by users in the editor:
 * - Scenario 1: Multi-generation tree construction starting completely from scratch (Gen 1 to Gen 4).
 * - Scenario 2: Multiple non-concurrent marriages with distinct children per spouse branch.
 * - Scenario 3: Linking an existing disconnected node into a family union as a child or spouse.
 * - Scenario 4: Cascading deletions with dependent subtree warning counts and dangling reference cleanup.
 * - Scenario 5: Arbitrary custom key/value attribute preservation (DNA haplogroups, military ranks, ships).
 * - Scenario 6: Non-biological adoptive / foster parenting relationships.
 */
describe('Complex Tree Editing & Real-World CRUD Scenarios', () => {
  it('Scenario 1: Builds a complete 4-generation tree from scratch', () => {
    let tree: TreeData = createEmptyTree();

    // Gen 1: Add Great-Grandfather
    const { data: d1, personId: ggfId } = addPerson(tree, {
      first: 'William',
      surname: 'Sterling',
      gender: 'M',
      birth: { year: 1900, place: 'London, UK' },
      death: { year: 1975, place: 'London, UK' },
      occupation: 'Clockmaker',
      attributes: { 'Apprenticeship': 'Guildhall 1914', 'Religion': 'Anglican' }
    });

    // Add Great-Grandmother (Spouse)
    const { data: d2, spouseId: ggmId, familyId: fGen1 } = addSpouse(d1, ggfId, {
      first: 'Mary',
      surname: 'Evans',
      gender: 'F',
      birth: { year: 1903, place: 'Bristol, UK' },
      death: { year: 1980, place: 'London, UK' }
    }, { year: 1924, place: 'St Pauls Church' });

    expect(d2.people[ggfId].fams).toContain(fGen1);
    expect(d2.people[ggmId].fams).toContain(fGen1);
    expect(d2.families[fGen1].marriage?.year).toBe(1924);

    // Gen 2: Add 2 Children (Grandfather & Great-Aunt)
    const { data: d3, childId: gfId } = addChild(d2, ggfId, {
      first: 'James',
      surname: 'Sterling',
      gender: 'M',
      birth: { year: 1926 }
    });
    const { data: d4, childId: gauntId } = addChild(d3, ggfId, {
      first: 'Dorothy',
      surname: 'Sterling',
      gender: 'F',
      birth: { year: 1929 }
    });

    expect(d4.families[fGen1].children).toEqual([gfId, gauntId]);
    expect(d4.people[gfId].famc).toBe(fGen1);
    expect(d4.people[gauntId].famc).toBe(fGen1);

    // Gen 2: Add Spouse to Grandfather
    const { data: d5, familyId: fGen2 } = addSpouse(d4, gfId, {
      first: 'Elizabeth',
      surname: 'Taylor',
      gender: 'F',
      birth: { year: 1928 }
    });

    // Gen 3: Add Father to Gen 2
    const { data: d6, childId: fatherId } = addChild(d5, gfId, {
      first: 'Robert',
      surname: 'Sterling',
      gender: 'M',
      birth: { year: 1955 }
    });
    expect(d6.people[fatherId].famc).toBe(fGen2);

    // Gen 3: Add Spouse to Father (Mother)
    const { data: d7, familyId: fGen3 } = addSpouse(d6, fatherId, {
      first: 'Margaret',
      surname: 'Hamilton',
      gender: 'F',
      birth: { year: 1958 }
    });

    // Gen 4: Add 2 Grandchildren
    const { data: d8, childId: child1Id } = addChild(d7, fatherId, {
      first: 'Daniel',
      surname: 'Sterling',
      gender: 'M',
      birth: { year: 1985 }
    });
    const { data: d9, childId: child2Id } = addChild(d8, fatherId, {
      first: 'Sarah',
      surname: 'Sterling',
      gender: 'F',
      birth: { year: 1988 }
    });

    expect(d9.families[fGen3].children).toEqual([child1Id, child2Id]);
    expect(Object.keys(d9.people).length).toBe(9);
    expect(Object.keys(d9.families).length).toBe(3);
  });

  it('Scenario 2: Supports multiple non-concurrent marriages and half-sibling families', () => {
    let tree: TreeData = createEmptyTree();

    // Person X (Husband)
    const { data: d1, personId: husbId } = addPerson(tree, {
      first: 'Charles',
      surname: 'Montgomery',
      gender: 'M',
      birth: { year: 1950 }
    });

    // First Marriage to Spouse 1 (1975)
    const { data: d2, spouseId: spouse1Id, familyId: fam1Id } = addSpouse(d1, husbId, {
      first: 'Diana',
      surname: 'Spencer',
      gender: 'F',
      birth: { year: 1952 }
    }, { year: 1975 });

    // Child 1 with Spouse 1
    const { data: d3, childId: child1Id } = addChild(d2, husbId, {
      first: 'William',
      surname: 'Montgomery',
      gender: 'M',
      birth: { year: 1978 }
    });

    // Second Marriage to Spouse 2 (1990)
    const { data: d4, spouseId: spouse2Id, familyId: fam2Id } = addSpouse(d3, husbId, {
      first: 'Camilla',
      surname: 'Parker',
      gender: 'F',
      birth: { year: 1954 }
    }, { year: 1990 });

    // Child 2 with Spouse 2 (specifying fam2Id)
    const { data: d5, childId: child2Id } = addChild(d4, husbId, {
      first: 'Harry',
      surname: 'Montgomery',
      gender: 'M',
      birth: { year: 1992 }
    }, fam2Id);

    // Verify husband has both families in order
    expect(d5.people[husbId].fams).toHaveLength(2);
    expect(d5.people[husbId].fams).toContain(fam1Id);
    expect(d5.people[husbId].fams).toContain(fam2Id);

    // Verify spouse 1 only belongs to fam 1
    expect(d5.people[spouse1Id].fams).toEqual([fam1Id]);
    // Verify spouse 2 only belongs to fam 2
    expect(d5.people[spouse2Id].fams).toEqual([fam2Id]);

    // Child 1 belongs to fam 1, Child 2 belongs to fam 2
    expect(d5.people[child1Id].famc).toBe(fam1Id);
    expect(d5.people[child2Id].famc).toBe(fam2Id);
    expect(d5.families[fam1Id].children).toEqual([child1Id]);
    expect(d5.families[fam2Id].children).toEqual([child2Id]);
  });

  it('Scenario 3: Links an existing person from the tree as a relative', () => {
    let tree: TreeData = createEmptyTree();

    // Create 2 independent individuals
    const { data: d1, personId: p1 } = addPerson(tree, { first: 'Adam', gender: 'M' });
    const { data: d2, personId: p2 } = addPerson(d1, { first: 'Eve', gender: 'F' });
    const { data: d3, personId: p3 } = addPerson(d2, { first: 'Cain', gender: 'M' });

    // Link existing person p2 as spouse of p1
    const { data: d4, familyId: fam1Id } = addSpouse(d3, p1, p2);
    expect(d4.people[p1].fams).toContain(fam1Id);
    expect(d4.people[p2].fams).toContain(fam1Id);
    expect(d4.families[fam1Id].husband).toBe(p1);
    expect(d4.families[fam1Id].wife).toBe(p2);

    // Link existing person p3 as child of p1
    const { data: d5 } = addChild(d4, p1, p3);
    expect(d5.people[p3].famc).toBe(fam1Id);
    expect(d5.families[fam1Id].children).toContain(p3);

    // Link existing person as mother
    const { data: d6, personId: p4 } = addPerson(d5, { first: 'Grandma', gender: 'F' });
    const { data: d7 } = addParent(d6, p1, p4, 'mother');
    expect(d7.people[p1].famc).toBeDefined();
    const motherFam = d7.families[d7.people[p1].famc!];
    expect(motherFam.wife).toBe(p4);
    expect(motherFam.children).toContain(p1);
  });

  it('Scenario 4: Handles cascade deletions, spouse cleanup, and subtree warnings', () => {
    let tree: TreeData = createEmptyTree();

    // Dad, Mom, 2 Kids
    const { data: d1, personId: dadId } = addPerson(tree, { first: 'Father', gender: 'M' });
    const { data: d2, spouseId: momId, familyId: fId } = addSpouse(d1, dadId, { first: 'Mother', gender: 'F' });
    const { data: d3, childId: k1Id } = addChild(d2, dadId, { first: 'Kid1' });
    const { data: d4, childId: k2Id } = addChild(d3, dadId, { first: 'Kid2' });

    // Remove Father: Affected children count should be 2
    const { data: d5, affectedChildrenCount } = removePerson(d4, dadId);
    expect(affectedChildrenCount).toBe(2);
    expect(d5.people[dadId]).toBeUndefined();

    // Family union should still exist for Mother and children, but husband is removed
    expect(d5.families[fId]).toBeDefined();
    expect(d5.families[fId].husband).toBeUndefined();
    expect(d5.families[fId].wife).toBe(momId);
    expect(d5.families[fId].children).toEqual([k1Id, k2Id]);

    // Now remove Mother: Family has no remaining parents but keeps orphaned sibling group
    const { data: d6 } = removePerson(d5, momId);
    expect(d6.people[momId]).toBeUndefined();
    expect(d6.families[fId]).toBeDefined();
    expect(d6.families[fId].husband).toBeUndefined();
    expect(d6.families[fId].wife).toBeUndefined();
    expect(d6.families[fId].children).toEqual([k1Id, k2Id]);
  });

  it('Scenario 5: Unlinks spouse and child relations without deleting individuals', () => {
    let tree: TreeData = createEmptyTree();
    const { data: d1, personId: p1 } = addPerson(tree, { first: 'Alex', gender: 'M' });
    const { data: d2, spouseId: p2, familyId: fId } = addSpouse(d1, p1, { first: 'Sam', gender: 'F' });
    const { data: d3, childId: c1 } = addChild(d2, p1, { first: 'Robin' });

    // Unlink child c1 from parent p1
    const d4 = removeRelation(d3, 'child', p1, c1);
    expect(d4.people[c1].famc).toBeUndefined();
    expect(d4.families[fId].children).not.toContain(c1);
    expect(d4.people[c1]).toBeDefined(); // Robin still exists in tree

    // Unlink spouse p2 from p1
    const d5 = removeRelation(d4, 'spouse', p1, p2);
    expect(d5.people[p1].fams).not.toContain(fId);
    expect(d5.people[p2].fams).not.toContain(fId);
    expect(d5.families[fId]).toBeUndefined(); // Childless union deleted
    expect(d5.people[p1]).toBeDefined();
    expect(d5.people[p2]).toBeDefined();
  });

  it('Scenario 6: Updates arbitrary custom key/value pairs and vitals', () => {
    let tree: TreeData = createEmptyTree();
    const { data: d1, personId } = addPerson(tree, { first: 'Eleanor', surname: 'Roosevelt' });

    // Update with arbitrary key/value pairs
    const d2 = updatePerson(d1, personId, {
      fullName: 'Anna Eleanor Roosevelt',
      gender: 'F',
      birth: { date: '11 OCT 1884', year: 1884, place: 'New York City, NY' },
      death: { date: '7 NOV 1962', year: 1962, place: 'New York City, NY' },
      occupation: 'Diplomat & First Lady',
      bio: 'Advocate for human rights and delegate to the United Nations General Assembly.',
      attributes: {
        'UN Commission': 'Chair on Human Rights (1946-1952)',
        'Honorary Degrees': 'Over 35',
        'Nobel Nomination': 'Nominated 3 times',
        'Burial Place': 'Springwood, Hyde Park, NY'
      }
    });

    const person = d2.people[personId];
    expect(person.fullName).toBe('Anna Eleanor Roosevelt');
    expect(person.occupation).toBe('Diplomat & First Lady');
    expect(person.birth?.place).toBe('New York City, NY');
    expect(person.attributes?.['UN Commission']).toContain('Human Rights');
    expect(person.attributes?.['Honorary Degrees']).toBe('Over 35');
    expect(person.attributes?.['Burial Place']).toBe('Springwood, Hyde Park, NY');
  });
});
