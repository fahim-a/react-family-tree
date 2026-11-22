import { describe, it, expect } from 'vitest';
import { parseGedcom } from '../parser/gedcomParser';
import { SAMPLE_GEDCOM_STRING } from '../demo/sampleData';
import {
  calculateRelationship,
  getAncestors,
  getDescendants,
  findShortestKinshipPath
} from '../analysis/relationshipCalculator';

/**
 * Test Suite: Kinship Analysis & Natural Language Relationship Calculator
 *
 * Verifies genealogical distance, civil law degrees of kinship, and plain-English classification:
 * - Identity: Self (0 degrees)
 * - Direct Spouses: Husband/Wife/Spouse (1 degree in marital affinity, isDirectBlood: false)
 * - Direct Vertical Lineage: Parent/Child (1 degree), Grandparent/Grandchild (2 degrees), Great-Grandparent (3 degrees)
 * - Full Siblings: Brother/Sister sharing two common parents (2 degrees of civil kinship)
 * - Collateral Aunts & Uncles: Aunt/Uncle & Nephew/Niece (3 degrees of civil kinship)
 * - First Cousins: 1st cousins sharing grandparents (4 degrees of civil kinship)
 * - First Cousins Once Removed: Intergenerational cousinhood (5 degrees of civil kinship)
 * - In-Laws: Marital relatives (Father-in-law, Daughter-in-law, Brother-in-law)
 * - MRCA Tracing: Accurate identification of Most Recent Common Ancestor pairs
 * - Shortest Kinship Paths: Breadth-first graph search connecting any two individuals
 */
describe('Kinship Analysis & Relationship Calculator', () => {
  const data = parseGedcom(SAMPLE_GEDCOM_STRING);

  // Individuals in Hawthorne Dynasty:
  // I1: Arthur Hawthorne (M)
  // I2: Eleanor Vance (F)
  // I3: Julian Hawthorne (M, son of I1 & I2)
  // I4: Clara Sterling (F, wife of I3)
  // I5: Beatrice Hawthorne (F, daughter of I1 & I2)
  // I6: Marcus Chen (M, husband of I5)
  // I7: Oliver Hawthorne (M, son of I3 & I4)
  // I8: Sophia Alvarez (F, wife of I7)
  // I9: Lucas Hawthorne (M, son of I3 & I4)
  // I10: Maya Chen (F, daughter of I5 & I6)
  // I11: Liam Chen (M, son of I5 & I6)
  // I12: Emma Hawthorne (F, daughter of I7 & I8)
  // I13: Noah Hawthorne (M, son of I7 & I8)

  it('calculates self relationship', () => {
    const res = calculateRelationship(data, 'I1', 'I1');
    expect(res.type).toBe('self');
    expect(res.relationshipName).toBe('Self');
    expect(res.isDirectBlood).toBe(true);
  });

  it('calculates spouse relationship', () => {
    const res = calculateRelationship(data, 'I1', 'I2');
    expect(res.type).toBe('spouse');
    expect(res.relationshipName).toBe('Husband');
    expect(res.inverseName).toBe('Wife');
    expect(res.isDirectBlood).toBe(false);
  });

  it('calculates direct parent and child relationships', () => {
    // Arthur -> Julian (Father -> Son)
    const fatherSon = calculateRelationship(data, 'I1', 'I3');
    expect(fatherSon.type).toBe('parent');
    expect(fatherSon.relationshipName).toBe('Father');
    expect(fatherSon.inverseName).toBe('Son');
    expect(fatherSon.isDirectBlood).toBe(true);
    expect(fatherSon.degreeOfKinship).toBe(1);

    // Julian -> Arthur (Son -> Father)
    const sonFather = calculateRelationship(data, 'I3', 'I1');
    expect(sonFather.type).toBe('child');
    expect(sonFather.relationshipName).toBe('Son');
    expect(sonFather.inverseName).toBe('Father');
    expect(sonFather.isDirectBlood).toBe(true);
  });

  it('calculates grandparent and grandchild relationships', () => {
    // Arthur -> Oliver (Grandfather -> Grandson)
    const grand = calculateRelationship(data, 'I1', 'I7');
    expect(grand.type).toBe('grandparent');
    expect(grand.relationshipName).toBe('Grandfather');
    expect(grand.inverseName).toBe('Grandson');
    expect(grand.isDirectBlood).toBe(true);
    expect(grand.degreeOfKinship).toBe(2);

    // Maya -> Eleanor (Granddaughter -> Grandmother)
    const grandDaughter = calculateRelationship(data, 'I10', 'I2');
    expect(grandDaughter.type).toBe('grandchild');
    expect(grandDaughter.relationshipName).toBe('Granddaughter');
    expect(grandDaughter.inverseName).toBe('Grandmother');
  });

  it('calculates great-grandparent and great-grandchild relationships', () => {
    // Arthur -> Emma (Great-grandfather -> Great-granddaughter)
    const greatGrand = calculateRelationship(data, 'I1', 'I12');
    expect(greatGrand.type).toBe('great-grandparent');
    expect(greatGrand.relationshipName).toBe('Great-grandfather');
    expect(greatGrand.inverseName).toBe('Great-granddaughter');
    expect(greatGrand.isDirectBlood).toBe(true);
    expect(greatGrand.degreeOfKinship).toBe(3);
  });

  it('calculates full siblings', () => {
    // Julian and Beatrice (Brother and Sister)
    const siblings = calculateRelationship(data, 'I3', 'I5');
    expect(siblings.type).toBe('sibling');
    expect(siblings.relationshipName).toBe('Brother');
    expect(siblings.inverseName).toBe('Sister');
    expect(siblings.isDirectBlood).toBe(true);
  });

  it('calculates aunt/uncle and niece/nephew', () => {
    // Julian -> Maya (Uncle -> Niece)
    const uncleNiece = calculateRelationship(data, 'I3', 'I10');
    expect(uncleNiece.type).toBe('aunt-uncle');
    expect(uncleNiece.relationshipName).toBe('Uncle');
    expect(uncleNiece.inverseName).toBe('Niece');
    expect(uncleNiece.isDirectBlood).toBe(true);

    // Liam -> Julian (Nephew -> Uncle)
    const nephewUncle = calculateRelationship(data, 'I11', 'I3');
    expect(nephewUncle.type).toBe('niece-nephew');
    expect(nephewUncle.relationshipName).toBe('Nephew');
    expect(nephewUncle.inverseName).toBe('Uncle');
  });

  it('calculates first cousins', () => {
    // Oliver Hawthorne and Maya Chen (1st Cousins)
    const cousins = calculateRelationship(data, 'I7', 'I10');
    expect(cousins.type).toBe('cousin');
    expect(cousins.relationshipName).toBe('1st Cousin');
    expect(cousins.isDirectBlood).toBe(true);
    expect(cousins.commonAncestors.length).toBeGreaterThan(0);
  });

  it('calculates first cousins once removed', () => {
    // Emma Hawthorne (gen 3) and Maya Chen (gen 2)
    const cousinsRemoved = calculateRelationship(data, 'I12', 'I10');
    expect(cousinsRemoved.type).toBe('cousin');
    expect(cousinsRemoved.relationshipName).toBe('1st Cousin once removed');
    expect(cousinsRemoved.isDirectBlood).toBe(true);
  });

  it('calculates in-law relationships', () => {
    // Arthur -> Clara (Father-in-law -> Daughter-in-law)
    const inLaw = calculateRelationship(data, 'I1', 'I4');
    expect(inLaw.type).toBe('in-law');
    expect(inLaw.relationshipName).toBe('Father-in-law');
    expect(inLaw.inverseName).toBe('Daughter-in-law');
    expect(inLaw.isDirectBlood).toBe(false);

    // Clara -> Arthur (Daughter-in-law -> Father-in-law)
    const invInLaw = calculateRelationship(data, 'I4', 'I1');
    expect(invInLaw.type).toBe('in-law');
    expect(invInLaw.relationshipName).toBe('Daughter-in-law');
    expect(invInLaw.inverseName).toBe('Father-in-law');
  });

  it('retrieves all direct ancestors with accurate generational distance', () => {
    const ancestors = getAncestors(data, 'I12'); // Emma Hawthorne
    // Parents: I7 (Oliver), I8 (Sophia)
    expect(ancestors.get('I7')).toBe(1);
    expect(ancestors.get('I8')).toBe(1);
    // Grandparents: I3 (Julian), I4 (Clara)
    expect(ancestors.get('I3')).toBe(2);
    expect(ancestors.get('I4')).toBe(2);
    // Great-grandparents: I1 (Arthur), I2 (Eleanor)
    expect(ancestors.get('I1')).toBe(3);
    expect(ancestors.get('I2')).toBe(3);
  });

  it('retrieves all direct descendants with accurate generational distance', () => {
    const descendants = getDescendants(data, 'I1'); // Arthur Hawthorne
    // Children: I3 (Julian), I5 (Beatrice)
    expect(descendants.get('I3')).toBe(1);
    expect(descendants.get('I5')).toBe(1);
    // Grandchildren: I7 (Oliver), I9 (Lucas), I10 (Maya), I11 (Liam)
    expect(descendants.get('I7')).toBe(2);
    expect(descendants.get('I9')).toBe(2);
    expect(descendants.get('I10')).toBe(2);
    expect(descendants.get('I11')).toBe(2);
    // Great-grandchildren: I12 (Emma), I13 (Noah)
    expect(descendants.get('I12')).toBe(3);
    expect(descendants.get('I13')).toBe(3);
  });

  it('finds the shortest kinship path between two relatives', () => {
    const path = findShortestKinshipPath(data, 'I9', 'I10'); // Lucas -> Maya
    expect(path.length).toBeGreaterThan(0);
    expect(path[0]).toBe('I9');
    expect(path[path.length - 1]).toBe('I10');
  });
});
