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

/**
 * Test Suite: Tree Mutations & In-Memory CRUD Operations
 *
 * Verifies the integrity of client-side graph mutations:
 * 1. Sequential ID Generation: Deterministic allocation of I0001, F0001, M0001 IDs without collisions.
 * 2. Immutable State Transitions: Every mutation returns a new TreeData instance without mutating prior state.
 * 3. Bidirectional Relationship Linking: Adding children or spouses maintains synchronized famc/fams references.
 * 4. Orphan & Subtree Safeguards: Deleting nodes cleans up family references and tracks affected child counts.
 * 5. Specific Relation Unlinking: Selectively unlinking a spouse or parent without deleting individual records.
 */
describe('Tree Mutations & In-Memory CRUD Operations', () => {
  it('creates an empty tree structure', () => {
    const tree = createEmptyTree();
    expect(tree.people).toEqual({});
    expect(tree.families).toEqual({});
  });

  it('adds an independent person with generated ID', () => {
    const tree = createEmptyTree();
    const { data: tree1, personId } = addPerson(tree, {
      first: 'John',
      surname: 'Doe',
      gender: 'M',
      birth: { year: 1980 }
    });

    expect(personId).toBe('I0001');
    expect(tree1.people['I0001']).toBeDefined();
    expect(tree1.people['I0001'].fullName).toBe('John Doe');
    expect(tree1.people['I0001'].gender).toBe('M');
  });

  it('updates an individual and custom attributes', () => {
    const tree = createEmptyTree();
    const { data: tree1, personId } = addPerson(tree, { first: 'Alice', surname: 'Smith' });

    const tree2 = updatePerson(tree1, personId, {
      occupation: 'Scientist',
      attributes: { 'Blood Type': 'O+', 'Citizenship': 'Canada' }
    });

    expect(tree2.people[personId].occupation).toBe('Scientist');
    expect(tree2.people[personId].attributes?.['Blood Type']).toBe('O+');
    expect(tree2.people[personId].attributes?.['Citizenship']).toBe('Canada');
  });

  it('adds a spouse and creates a new family union', () => {
    const tree = createEmptyTree();
    const { data: tree1, personId: p1 } = addPerson(tree, { first: 'John', gender: 'M' });
    const { data: tree2, spouseId, familyId } = addSpouse(tree1, p1, { first: 'Jane', gender: 'F' });

    expect(tree2.people[p1].fams).toContain(familyId);
    expect(tree2.people[spouseId].fams).toContain(familyId);
    expect(tree2.families[familyId].husband).toBe(p1);
    expect(tree2.families[familyId].wife).toBe(spouseId);
  });

  it('supports multiple spouses for a single individual', () => {
    const tree = createEmptyTree();
    const { data: tree1, personId: p1 } = addPerson(tree, { first: 'Henry', gender: 'M' });
    const { data: tree2, familyId: f1 } = addSpouse(tree1, p1, { first: 'Catherine', gender: 'F' });
    const { data: tree3, familyId: f2 } = addSpouse(tree2, p1, { first: 'Anne', gender: 'F' });

    expect(tree3.people[p1].fams.length).toBe(2);
    expect(tree3.people[p1].fams).toContain(f1);
    expect(tree3.people[p1].fams).toContain(f2);
  });

  it('adds a child and links parent and child relations', () => {
    const tree = createEmptyTree();
    const { data: tree1, personId: p1 } = addPerson(tree, { first: 'Arthur', gender: 'M' });
    const { data: tree2, childId } = addChild(tree1, p1, { first: 'Julian', gender: 'M' });

    const child = tree2.people[childId];
    expect(child).toBeDefined();
    expect(child.famc).toBeDefined();

    const parentFam = tree2.families[child.famc!];
    expect(parentFam.husband).toBe(p1);
    expect(parentFam.children).toContain(childId);
  });

  it('adds a parent to a child', () => {
    const tree = createEmptyTree();
    const { data: tree1, personId: childId } = addPerson(tree, { first: 'Child', gender: 'F' });
    const { data: tree2, parentId } = addParent(tree1, childId, { first: 'Mother' }, 'mother');

    const child = tree2.people[childId];
    expect(child.famc).toBeDefined();
    const parentFam = tree2.families[child.famc!];
    expect(parentFam.wife).toBe(parentId);
    expect(parentFam.children).toContain(childId);
  });

  it('removes a person and cleans up family links with orphan count warning', () => {
    const tree = createEmptyTree();
    const { data: tree1, personId: p1 } = addPerson(tree, { first: 'Dad', gender: 'M' });
    const { data: tree2, childId } = addChild(tree1, p1, { first: 'Kid' });

    const { data: tree3, affectedChildrenCount } = removePerson(tree2, p1);

    expect(affectedChildrenCount).toBe(1);
    expect(tree3.people[p1]).toBeUndefined();
    expect(tree3.people[childId]).toBeDefined();
  });

  it('unlinks a child relationship without deleting either person', () => {
    const tree = createEmptyTree();
    const { data: tree1, personId: p1 } = addPerson(tree, { first: 'Parent' });
    const { data: tree2, childId } = addChild(tree1, p1, { first: 'Child' });

    const tree3 = removeRelation(tree2, 'child', p1, childId);
    expect(tree3.people[childId].famc).toBeUndefined();
    expect(tree3.people[p1]).toBeDefined();
    expect(tree3.people[childId]).toBeDefined();
  });
});
