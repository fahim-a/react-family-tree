import { describe, it, expect } from 'vitest';
import {
  calculateRelationship,
  getAncestors,
  getDescendants
} from '../analysis/relationshipCalculator';
import { parseGedcom } from '../parser/gedcomParser';
import { SAMPLE_GEDCOM_STRING } from '../demo/sampleData';
import { createEmptyTree, addPerson, addSpouse, addChild } from '../editor/treeMutations';
import { TreeData } from '../types';

/**
 * Test Suite: Advanced Kinship & Lineage Tracing Scenarios
 *
 * Verifies complex genealogical relationship mathematics and lineage queries:
 * - Scenario 1: Second Cousins (sharing great-grandparents, 6 degrees of kinship).
 * - Scenario 2: Cousins Once & Twice Removed (generational skew between collateral branches).
 * - Scenario 3: Half-Siblings vs Full Siblings (sharing 1 parent vs 2 parents).
 * - Scenario 4: Multi-generation Great-Aunts / Great-Uncles & Grand-Nieces / Grand-Nephews.
 * - Scenario 5: Distinguishing Genetic Blood Relatives (`isDirectBlood: true`) from Marital Affinity In-Laws.
 * - Scenario 6: Upstream Direct Ancestor Traversal (`getAncestors`) with generational depth mapping.
 * - Scenario 7: Downstream Direct Descendant Traversal (`getDescendants`) across multi-branch offspring.
 */
describe('Kinship & Lineage Analysis Scenarios', () => {
  const baseData = parseGedcom(SAMPLE_GEDCOM_STRING);

  it('Scenario 1: Detects second cousins sharing great-grandparents', () => {
    // Build a tree with 2nd cousins:
    // Common Great-Grandparents: GGF & GGM
    // Gen 2: Two sibling brothers: Brother A and Brother B
    // Gen 3: Children of Brother A (Cousin A) and Brother B (Cousin B) -> 1st Cousins
    // Gen 4: Child of Cousin A (Second Cousin 1) and Child of Cousin B (Second Cousin 2) -> 2nd Cousins
    let tree: TreeData = createEmptyTree();
    const { data: d1, personId: ggf } = addPerson(tree, { first: 'GGF', gender: 'M' });
    const { data: d2, spouseId: ggm } = addSpouse(d1, ggf, { first: 'GGM', gender: 'F' });

    // Gen 2: Two siblings
    const { data: d3, childId: broA } = addChild(d2, ggf, { first: 'BroA', gender: 'M' });
    const { data: d4, childId: broB } = addChild(d3, ggf, { first: 'BroB', gender: 'M' });

    // Gen 3: Children
    const { data: d5, childId: cosA } = addChild(d4, broA, { first: 'CosA', gender: 'M' });
    const { data: d6, childId: cosB } = addChild(d5, broB, { first: 'CosB', gender: 'F' });

    // Gen 4: Second Cousins
    const { data: d7, childId: sc1 } = addChild(d6, cosA, { first: 'SecondCousin1', gender: 'M' });
    const { data: d8, childId: sc2 } = addChild(d7, cosB, { first: 'SecondCousin2', gender: 'F' });

    const rel = calculateRelationship(d8, sc1, sc2);
    expect(rel.type).toBe('cousin');
    expect(rel.relationshipName).toBe('2nd Cousin');
    expect(rel.isDirectBlood).toBe(true);
    expect(rel.degreeOfKinship).toBe(6); // 3 steps up to GGF/GGM + 3 steps down
    expect(rel.commonAncestors.map(p => p.id)).toContain(ggf);
    expect(rel.commonAncestors.map(p => p.id)).toContain(ggm);
  });

  it('Scenario 2: Detects first cousins twice removed', () => {
    // Gen 1: Arthur Hawthorne (I1) & Eleanor Vance (I2)
    // Gen 2: Julian Hawthorne (I3) & Beatrice Hawthorne (I5) - Siblings
    // Gen 3: Oliver Hawthorne (I7, son of Julian) & Maya Chen (I10, daughter of Beatrice) - 1st Cousins
    // Gen 4: Emma Hawthorne (I12, daughter of Oliver) - 1st cousin once removed to Maya
    // Gen 5: Child of Emma -> 1st cousin twice removed to Maya
    let tree = { ...baseData };
    const { data: d1, childId: g5Child } = addChild(tree, 'I12', {
      first: 'Leo',
      surname: 'Hawthorne',
      gender: 'M',
      birth: { year: 2045 }
    });

    const rel = calculateRelationship(d1, g5Child, 'I10');
    expect(rel.type).toBe('cousin');
    expect(rel.relationshipName).toContain('1st Cousin');
    expect(rel.relationshipName).toContain('2 times removed');
    expect(rel.isDirectBlood).toBe(true);
  });

  it('Scenario 3: Classifies half-siblings sharing only one parent', () => {
    let tree: TreeData = createEmptyTree();
    // Father X
    const { data: d1, personId: dad } = addPerson(tree, { first: 'Father', gender: 'M' });
    // First marriage with Mother A
    const { data: d2, spouseId: momA } = addSpouse(d1, dad, { first: 'MotherA', gender: 'F' });
    const { data: d3, childId: childA } = addChild(d2, dad, { first: 'ChildA', gender: 'M' });

    // Second marriage with Mother B
    const { data: d4, spouseId: momB } = addSpouse(d3, dad, { first: 'MotherB', gender: 'F' });
    const { data: d5, childId: childB } = addChild(d4, momB, { first: 'ChildB', gender: 'F' });

    const rel = calculateRelationship(d5, childA, childB);
    expect(rel.type).toBe('half-sibling');
    expect(rel.relationshipName).toBe('Half-Brother');
    expect(rel.inverseName).toBe('Half-Sister');
    expect(rel.isDirectBlood).toBe(true);
    expect(rel.commonAncestors.map(p => p.id)).toEqual([dad]);
    expect(rel.commonAncestors.map(p => p.id)).not.toContain(momA);
    expect(rel.commonAncestors.map(p => p.id)).not.toContain(momB);
  });

  it('Scenario 4: Classifies great-aunts/uncles and great-nieces/nephews across multiple generations', () => {
    // In Hawthorne data:
    // I1 (Arthur) -> I3 (Julian) & I5 (Beatrice)
    // Julian -> Oliver (I7)
    // Oliver -> Emma (I12)
    // Beatrice (I5) is the Great-Aunt of Emma (I12)
    const greatAunt = calculateRelationship(baseData, 'I5', 'I12');
    expect(greatAunt.type).toBe('great-aunt-uncle');
    expect(greatAunt.relationshipName).toBe('Great-aunt');
    expect(greatAunt.inverseName).toBe('Great-niece');
    expect(greatAunt.isDirectBlood).toBe(true);

    // Inverse check: Emma -> Beatrice
    const greatNiece = calculateRelationship(baseData, 'I12', 'I5');
    expect(greatNiece.type).toBe('great-niece-nephew');
    expect(greatNiece.relationshipName).toBe('Great-niece');
    expect(greatNiece.inverseName).toBe('Great-aunt');
    expect(greatNiece.isDirectBlood).toBe(true);
  });

  it('Scenario 5: Classifies direct in-laws and indirect marriage connections', () => {
    // Clara Sterling (I4, wife of Julian I3) and Marcus Chen (I6, husband of Beatrice I5)
    // Both married into the Hawthorne family (their spouses are brother & sister)
    const res = calculateRelationship(baseData, 'I4', 'I6');
    expect(res.isDirectBlood).toBe(false);
    expect(res.path.length).toBeGreaterThan(0);
    expect(res.type).toBe('indirect');
    expect(res.relationshipName).toBe('Related by Marriage');

    // Son-in-law: Marcus Chen (I6) to Arthur Hawthorne (I1)
    const sonInLaw = calculateRelationship(baseData, 'I6', 'I1');
    expect(sonInLaw.isDirectBlood).toBe(false);
    expect(sonInLaw.relationshipName).toBe('Son-in-law');
    expect(sonInLaw.inverseName).toBe('Father-in-law');
  });

  it('Scenario 6: Correctly reports unrelated individuals in disconnected subtrees', () => {
    let tree: TreeData = createEmptyTree();
    const { data: d1, personId: p1 } = addPerson(tree, { first: 'Person1' });
    const { data: d2, personId: p2 } = addPerson(d1, { first: 'Person2' });

    const rel = calculateRelationship(d2, p1, p2);
    expect(rel.type).toBe('unrelated');
    expect(rel.relationshipName).toBe('No direct relationship');
    expect(rel.isDirectBlood).toBe(false);
    expect(rel.path).toEqual([]);
  });

  it('Scenario 7: Lineage boundary tests (root ancestor vs leaf descendant)', () => {
    // Root ancestor Arthur (I1) has 0 ancestors
    const rootAncestors = getAncestors(baseData, 'I1');
    expect(rootAncestors.size).toBe(0);

    // Leaf node Emma (I12) has 0 descendants
    const leafDescendants = getDescendants(baseData, 'I12');
    expect(leafDescendants.size).toBe(0);

    // Total ancestors of Emma (I12): Parents(2) + Grandparents(2) + Great-Grandparents(2) = 6
    const emmaAncestors = getAncestors(baseData, 'I12');
    expect(emmaAncestors.size).toBe(6);
  });
});
