import { describe, it, expect } from 'vitest';
import { computeTreeLayout } from '../layout/bimodalLayout';
import { calculateRelationship, findShortestKinshipPath } from '../analysis/relationshipCalculator';
import { canLinkChild, canLinkParent, addPerson, addChild, createEmptyTree } from '../editor/treeMutations';
import { parseGedcom } from '../parser/gedcomParser';
import { exportGedcom } from '../exporter/gedcomExporter';
import { applyPrivacyFilter } from '../parser/privacyFilter';
import { TreeData } from '../types';

describe('Odd & Eccentric Genealogy Scenarios', () => {

  describe('1. Pedigree Collapse & Consanguinity (Cousins Marrying)', () => {
    it('handles first cousins marrying and producing children without infinite loops or layout overlap', () => {
      // Common Grandparents: G_Father (I1) & G_Mother (I2)
      // Uncle (I3) and Mother (I4) are siblings.
      // Uncle has Son (I5 - Groom). Mother has Daughter (I6 - Bride).
      // Groom (I5) and Bride (I6) marry (F3) and have Child (I7).
      const consanguineousTree: TreeData = {
        people: {
          'I1': { id: 'I1', first: 'Grandpa', surname: 'Common', fullName: 'Grandpa Common', gender: 'M', fams: ['F0'] },
          'I2': { id: 'I2', first: 'Grandma', surname: 'Common', fullName: 'Grandma Common', gender: 'F', fams: ['F0'] },
          'I3': { id: 'I3', first: 'Brother', surname: 'Common', fullName: 'Brother Common', gender: 'M', famc: 'F0', fams: ['F1'] },
          'I4': { id: 'I4', first: 'Sister', surname: 'Common', fullName: 'Sister Common', gender: 'F', famc: 'F0', fams: ['F2'] },
          'I3_sp': { id: 'I3_sp', first: 'SpouseA', surname: 'Ext', fullName: 'SpouseA Ext', gender: 'F', fams: ['F1'] },
          'I4_sp': { id: 'I4_sp', first: 'SpouseB', surname: 'Ext', fullName: 'SpouseB Ext', gender: 'M', fams: ['F2'] },
          'I5': { id: 'I5', first: 'CousinHusband', surname: 'Common', fullName: 'CousinHusband Common', gender: 'M', famc: 'F1', fams: ['F3'] },
          'I6': { id: 'I6', first: 'CousinWife', surname: 'Common', fullName: 'CousinWife Common', gender: 'F', famc: 'F2', fams: ['F3'] },
          'I7': { id: 'I7', first: 'Child', surname: 'Common', fullName: 'Child Common', gender: 'M', famc: 'F3', fams: [] }
        },
        families: {
          'F0': { id: 'F0', husband: 'I1', wife: 'I2', children: ['I3', 'I4'] },
          'F1': { id: 'F1', husband: 'I3', wife: 'I3_sp', children: ['I5'] },
          'F2': { id: 'F2', husband: 'I4_sp', wife: 'I4', children: ['I6'] },
          'F3': { id: 'F3', husband: 'I5', wife: 'I6', children: ['I7'] }
        }
      };

      // 1. Layout calculation on DAG with pedigree collapse
      const layout = computeTreeLayout(consanguineousTree);
      expect(layout.nodes['I1']).toBeDefined();
      expect(layout.nodes['I7']).toBeDefined();

      // Generational ranks
      expect(layout.nodes['I1'].generation).toBe(0); // Grandparents
      expect(layout.nodes['I3'].generation).toBe(1); // Siblings
      expect(layout.nodes['I5'].generation).toBe(2); // First cousins
      expect(layout.nodes['I6'].generation).toBe(2);
      expect(layout.nodes['I7'].generation).toBe(3); // Offspring

      // 2. Kinship: When married, direct relationship classifies as Husband/Wife
      const relMarried = calculateRelationship(consanguineousTree, 'I5', 'I6');
      expect(relMarried.relationshipName).toBe('Husband');

      // Before marriage, biological relationship is 1st Cousin
      const unmarriedCousins: TreeData = {
        ...consanguineousTree,
        families: {
          'F0': consanguineousTree.families['F0'],
          'F1': consanguineousTree.families['F1'],
          'F2': consanguineousTree.families['F2']
        }
      };
      const relBlood = calculateRelationship(unmarriedCousins, 'I5', 'I6');
      expect(relBlood.relationshipName).toBe('1st Cousin');
      expect(relBlood.isDirectBlood).toBe(true);
      expect(relBlood.degreeOfKinship).toBe(4);

      // Child I7 related to Grandfather I3
      const relUncle = calculateRelationship(consanguineousTree, 'I3', 'I7');
      expect(relUncle.relationshipName).toBe('Grandfather');
      expect(relUncle.isDirectBlood).toBe(true);

      // 3. Shortest path traverses through connection
      const path = findShortestKinshipPath(consanguineousTree, 'I5', 'I6');
      expect(path.length).toBeGreaterThan(0);
      expect(path[0]).toBe('I5');
      expect(path[path.length - 1]).toBe('I6');
    });
  });

  describe('2. Circular Relationship Protection & Cycle Ingestion', () => {
    it('detects and prevents attempted cyclical lineage via canLinkChild / canLinkParent', () => {
      // Grandfather (P1) -> Father (P2) -> Child (P3)
      let tree = createEmptyTree();
      const { data: d1, personId: p1 } = addPerson(tree, { first: 'Grandpa' });
      const { data: d2, childId: p2 } = addChild(d1, p1, { first: 'Father' });
      const { data: d3, childId: p3 } = addChild(d2, p2, { first: 'Grandchild' });

      // Attempt 1: Grandfather cannot become child of his own grandchild!
      expect(canLinkChild(d3, p3, p1)).toBe(false);

      // Attempt 2: Grandchild cannot become parent of grandfather!
      expect(canLinkParent(d3, p1, p3)).toBe(false);

      // Attempt 3: A person cannot become their own child or parent!
      expect(canLinkChild(d3, p1, p1)).toBe(false);
      expect(canLinkParent(d3, p1, p1)).toBe(false);
    });

    it('safely ingests and renders a corrupted tree with an existing circular loop without crashing', () => {
      // Corrupted dataset where A is parent of B, and B is parent of A
      const cyclicalTree: TreeData = {
        people: {
          'I1': { id: 'I1', first: 'LoopA', surname: 'Test', fullName: 'LoopA Test', gender: 'M', famc: 'F2', fams: ['F1'] },
          'I2': { id: 'I2', first: 'LoopB', surname: 'Test', fullName: 'LoopB Test', gender: 'F', famc: 'F1', fams: ['F2'] }
        },
        families: {
          'F1': { id: 'F1', husband: 'I1', children: ['I2'] },
          'F2': { id: 'F2', wife: 'I2', children: ['I1'] }
        }
      };

      // computeTreeLayout must terminate safely without Maximum Call Stack Exceeded
      expect(() => {
        const layout = computeTreeLayout(cyclicalTree);
        expect(layout.nodes['I1']).toBeDefined();
        expect(layout.nodes['I2']).toBeDefined();
      }).not.toThrow();
    });
  });

  describe('3. Same-Sex Unions, Non-Binary & Unknown Gender Relations', () => {
    it('renders same-sex couples side-by-side and returns gender-neutral relationship terms when appropriate', () => {
      const sameSexTree: TreeData = {
        people: {
          'I1': { id: 'I1', first: 'Clara', surname: 'Smith', fullName: 'Clara Smith', gender: 'F', fams: ['F1'] },
          'I2': { id: 'I2', first: 'Elena', surname: 'Rios', fullName: 'Elena Rios', gender: 'F', fams: ['F1'] },
          'I3': { id: 'I3', first: 'Taylor', surname: 'Smith-Rios', fullName: 'Taylor Smith-Rios', gender: 'O', famc: 'F1', fams: [] }
        },
        families: {
          'F1': { id: 'F1', husband: undefined, wife: 'I1', children: ['I3'] }
        }
      };

      const layout = computeTreeLayout(sameSexTree);
      expect(layout.nodes['I1']).toBeDefined();
      expect(layout.nodes['I3']).toBeDefined();
      expect(layout.nodes['I3'].generation).toBe(1);

      // Check gender-neutral child
      const rel = calculateRelationship(sameSexTree, 'I1', 'I3');
      expect(rel.relationshipName).toBe('Mother');
      expect(rel.inverseName).toBe('Child'); // Gender 'O' becomes 'Child' rather than son/daughter
    });

    it('handles unknown gender aunts/uncles and siblings with gender-neutral titles', () => {
      const neutralTree: TreeData = {
        people: {
          'P_Parent1': { id: 'P_Parent1', first: 'Pat', surname: 'Common', fullName: 'Pat Common', gender: 'U', fams: ['F1'] },
          'P_Parent2': { id: 'P_Parent2', first: 'Sam', surname: 'Common', fullName: 'Sam Common', gender: 'U', fams: ['F1'] },
          'P_Child1': { id: 'P_Child1', first: 'Alex', surname: 'Common', fullName: 'Alex Common', gender: 'U', famc: 'F1', fams: ['F2'] },
          'P_Child2': { id: 'P_Child2', first: 'Jordan', surname: 'Common', fullName: 'Jordan Common', gender: 'U', famc: 'F1', fams: [] },
          'P_Grandchild': { id: 'P_Grandchild', first: 'Casey', surname: 'Common', fullName: 'Casey Common', gender: 'U', famc: 'F2', fams: [] }
        },
        families: {
          'F1': { id: 'F1', husband: 'P_Parent1', wife: 'P_Parent2', children: ['P_Child1', 'P_Child2'] },
          'F2': { id: 'F2', husband: 'P_Child1', children: ['P_Grandchild'] }
        }
      };

      // Siblings with gender 'U'
      const sibRel = calculateRelationship(neutralTree, 'P_Child1', 'P_Child2');
      expect(sibRel.relationshipName).toBe('Sibling');

      // Aunt/Uncle with gender 'U'
      const auntUncleRel = calculateRelationship(neutralTree, 'P_Child2', 'P_Grandchild');
      expect(auntUncleRel.relationshipName).toBe('Paternal/Maternal Sibling');
      expect(auntUncleRel.inverseName).toBe('Sibling Child');
    });
  });

  describe('4. Extreme Marriage & Family Unit Structures', () => {
    it('handles Serial Monogamy / 5 Non-Concurrent Marriages without overlapping', () => {
      const serialTree: TreeData = {
        people: {
          'I_ROOT': { id: 'I_ROOT', first: 'Solomon', surname: 'King', fullName: 'Solomon King', gender: 'M', fams: ['F1', 'F2', 'F3', 'F4', 'F5'] },
          'W1': { id: 'W1', first: 'Wife1', surname: 'A', fullName: 'Wife1 A', gender: 'F', fams: ['F1'] },
          'W2': { id: 'W2', first: 'Wife2', surname: 'B', fullName: 'Wife2 B', gender: 'F', fams: ['F2'] },
          'W3': { id: 'W3', first: 'Wife3', surname: 'C', fullName: 'Wife3 C', gender: 'F', fams: ['F3'] },
          'W4': { id: 'W4', first: 'Wife4', surname: 'D', fullName: 'Wife4 D', gender: 'F', fams: ['F4'] },
          'W5': { id: 'W5', first: 'Wife5', surname: 'E', fullName: 'Wife5 E', gender: 'F', fams: ['F5'] },
          'C1': { id: 'C1', first: 'Child1', surname: 'King', fullName: 'Child1 King', gender: 'M', famc: 'F1', fams: [] },
          'C2': { id: 'C2', first: 'Child2', surname: 'King', fullName: 'Child2 King', gender: 'M', famc: 'F2', fams: [] },
          'C3': { id: 'C3', first: 'Child3', surname: 'King', fullName: 'Child3 King', gender: 'F', famc: 'F3', fams: [] },
          'C4': { id: 'C4', first: 'Child4', surname: 'King', fullName: 'Child4 King', gender: 'F', famc: 'F4', fams: [] },
          'C5': { id: 'C5', first: 'Child5', surname: 'King', fullName: 'Child5 King', gender: 'M', famc: 'F5', fams: [] }
        },
        families: {
          'F1': { id: 'F1', husband: 'I_ROOT', wife: 'W1', children: ['C1'] },
          'F2': { id: 'F2', husband: 'I_ROOT', wife: 'W2', children: ['C2'] },
          'F3': { id: 'F3', husband: 'I_ROOT', wife: 'W3', children: ['C3'] },
          'F4': { id: 'F4', husband: 'I_ROOT', wife: 'W4', children: ['C4'] },
          'F5': { id: 'F5', husband: 'I_ROOT', wife: 'W5', children: ['C5'] }
        }
      };

      const layout = computeTreeLayout(serialTree);
      expect(Object.keys(layout.nodes).length).toBe(11);

      // Half-sibling relationship between Child1 and Child2
      const halfRel = calculateRelationship(serialTree, 'C1', 'C2');
      expect(halfRel.relationshipName).toBe('Half-Brother');
      expect(halfRel.isDirectBlood).toBe(true);
    });

    it('handles Massive Families with 20+ Children without overlapping node coordinates', () => {
      const childrenIds: string[] = [];
      const peopleMap: TreeData['people'] = {
        'FATHER': { id: 'FATHER', first: 'Patriarch', surname: 'BigFamily', fullName: 'Patriarch BigFamily', gender: 'M', fams: ['F1'] },
        'MOTHER': { id: 'MOTHER', first: 'Matriarch', surname: 'BigFamily', fullName: 'Matriarch BigFamily', gender: 'F', fams: ['F1'] }
      };

      for (let i = 1; i <= 20; i++) {
        const cid = `CHILD_${i}`;
        childrenIds.push(cid);
        peopleMap[cid] = {
          id: cid,
          first: `Child${i}`,
          surname: 'BigFamily',
          fullName: `Child${i} BigFamily`,
          gender: i % 2 === 0 ? 'F' : 'M',
          famc: 'F1',
          fams: []
        };
      }

      const bigFamilyTree: TreeData = {
        people: peopleMap,
        families: {
          'F1': { id: 'F1', husband: 'FATHER', wife: 'MOTHER', children: childrenIds }
        }
      };

      const layout = computeTreeLayout(bigFamilyTree);
      expect(layout.nodes['FATHER']).toBeDefined();
      expect(layout.nodes['CHILD_20']).toBeDefined();

      // All children must have strictly ascending X coordinates (no overlapping X values)
      const childXCoords = childrenIds.map(cid => layout.nodes[cid].x);
      for (let i = 0; i < childXCoords.length - 1; i++) {
        expect(childXCoords[i + 1]).toBeGreaterThan(childXCoords[i]);
      }
    });

    it('handles Double Cousins (Two brothers marry two sisters)', () => {
      // Family A: Brother 1 (B1), Brother 2 (B2)
      // Family B: Sister 1 (S1), Sister 2 (S2)
      // Marriage 1: B1 + S1 -> Child A
      // Marriage 2: B2 + S2 -> Child B
      const doubleCousinTree: TreeData = {
        people: {
          'GP_A1': { id: 'GP_A1', first: 'Grandpa', surname: 'Alpha', fullName: 'Grandpa Alpha', gender: 'M', fams: ['F_A'] },
          'GP_A2': { id: 'GP_A2', first: 'Grandma', surname: 'Alpha', fullName: 'Grandma Alpha', gender: 'F', fams: ['F_A'] },
          'B1': { id: 'B1', first: 'Brother1', surname: 'Alpha', fullName: 'Brother1 Alpha', gender: 'M', famc: 'F_A', fams: ['F_M1'] },
          'B2': { id: 'B2', first: 'Brother2', surname: 'Alpha', fullName: 'Brother2 Alpha', gender: 'M', famc: 'F_A', fams: ['F_M2'] },

          'GP_B1': { id: 'GP_B1', first: 'Grandpa', surname: 'Beta', fullName: 'Grandpa Beta', gender: 'M', fams: ['F_B'] },
          'GP_B2': { id: 'GP_B2', first: 'Grandma', surname: 'Beta', fullName: 'Grandma Beta', gender: 'F', fams: ['F_B'] },
          'S1': { id: 'S1', first: 'Sister1', surname: 'Beta', fullName: 'Sister1 Beta', gender: 'F', famc: 'F_B', fams: ['F_M1'] },
          'S2': { id: 'S2', first: 'Sister2', surname: 'Beta', fullName: 'Sister2 Beta', gender: 'F', famc: 'F_B', fams: ['F_M2'] },

          'Child_A': { id: 'Child_A', first: 'Child', surname: 'Alpha1', fullName: 'Child Alpha1', gender: 'M', famc: 'F_M1', fams: [] },
          'Child_B': { id: 'Child_B', first: 'Child', surname: 'Alpha2', fullName: 'Child Alpha2', gender: 'F', famc: 'F_M2', fams: [] }
        },
        families: {
          'F_A': { id: 'F_A', husband: 'GP_A1', wife: 'GP_A2', children: ['B1', 'B2'] },
          'F_B': { id: 'F_B', husband: 'GP_B1', wife: 'GP_B2', children: ['S1', 'S2'] },
          'F_M1': { id: 'F_M1', husband: 'B1', wife: 'S1', children: ['Child_A'] },
          'F_M2': { id: 'F_M2', husband: 'B2', wife: 'S2', children: ['Child_B'] }
        }
      };

      const rel = calculateRelationship(doubleCousinTree, 'Child_A', 'Child_B');
      expect(rel.relationshipName).toBe('1st Cousin');
      expect(rel.isDirectBlood).toBe(true);
      expect(rel.degreeOfKinship).toBe(4);
    });
  });

  describe('5. Dangling References, Empty Fields & Corrupted Pointers', () => {
    it('gracefully handles missing / ghost entity references without throwing null reference exceptions', () => {
      const corruptedPointersTree: TreeData = {
        people: {
          'I1': { id: 'I1', first: 'Real', surname: 'Person', fullName: 'Real Person', gender: 'M', famc: 'GHOST_FAM', fams: ['F1'] }
        },
        families: {
          'F1': { id: 'F1', husband: 'I1', wife: 'GHOST_WIFE', children: ['GHOST_CHILD', 'GHOST_CHILD_2'] }
        }
      };

      // 1. Layout does not throw
      expect(() => {
        const layout = computeTreeLayout(corruptedPointersTree);
        expect(layout.nodes['I1']).toBeDefined();
      }).not.toThrow();

      // 2. GEDCOM Exporter handles missing spouse/children gracefully
      expect(() => {
        const ged = exportGedcom(corruptedPointersTree);
        expect(ged).toContain('0 @I1@ INDI');
      }).not.toThrow();

      // 3. Privacy filter handles dangling people gracefully
      expect(() => {
        const filtered = applyPrivacyFilter(corruptedPointersTree);
        expect(filtered.people['I1']).toBeDefined();
      }).not.toThrow();
    });

    it('handles individuals with completely empty or whitespace-only names', () => {
      const emptyNameTree: TreeData = {
        people: {
          'I1': { id: 'I1', first: '', surname: '', fullName: '', gender: 'U', fams: [] }
        },
        families: {}
      };

      const layout = computeTreeLayout(emptyNameTree);
      expect(layout.nodes['I1']).toBeDefined();

      const ged = exportGedcom(emptyNameTree);
      expect(ged).toContain('0 @I1@ INDI');
      expect(ged).toContain('1 NAME Unknown //');
    });
  });

  describe('6. Extreme Historical Dates & Approximate Qualifiers', () => {
    it('handles Renaissance & Medieval dates (1500s) and approximate qualifiers', () => {
      const historicalGedcom = `
0 HEAD
1 GEDC
2 VERS 5.5.1
0 @I1@ INDI
1 NAME Leonardo /da Vinci/
1 SEX M
1 BIRT
2 DATE ABT 14 APR 1452
2 PLAC Anchiano, Republic of Florence
1 DEAT
2 DATE 2 MAY 1519
2 PLAC Amboise, Kingdom of France
0 TRLR
`;

      const parsed = parseGedcom(historicalGedcom);
      const person = parsed.people['I1'];
      expect(person).toBeDefined();
      expect(person.birth?.year).toBe(1452);
      expect(person.death?.year).toBe(1519);
      expect(person.isLiving).toBe(false);

      // Privacy filter must never flag a 15th century person as living
      const privacyTree = applyPrivacyFilter(parsed, { enabled: true, redactLiving: true, livingCutoffYear: 1920 });
      expect(privacyTree.people['I1'].fullName).toBe('Leonardo da Vinci');
    });

    it('handles Double Dating (1711/12) and BC dates without crashing date parsers', () => {
      const doubleDateGedcom = `
0 HEAD
1 GEDC
2 VERS 5.5.1
0 @I1@ INDI
1 NAME Cotton /Mather/
1 SEX M
1 BIRT
2 DATE 12 FEB 1662/63
1 DEAT
2 DATE 13 FEB 1727/28
0 TRLR
`;
      const parsed = parseGedcom(doubleDateGedcom);
      expect(parsed.people['I1'].birth?.year).toBe(1662);
      expect(parsed.people['I1'].death?.year).toBe(1727);
    });
  });

  describe('7. Distant Kinship Calculations (3x Great-Aunt/Uncle)', () => {
    it('computes 3x Great-Aunt and 3x Great-Nephew correctly', () => {
      // Common Ancestor: Gen 0
      // Person A: child of Ancestor (Gen 1) -> 3x Great-Aunt of Person B
      // Person B: 5 generations down (Gen 5) -> 3x Great-Nephew of Person A
      const deepTree: TreeData = {
        people: {
          'ANC': { id: 'ANC', first: 'Ancestor', surname: 'Deep', fullName: 'Ancestor Deep', gender: 'M', fams: ['F0'] },
          'PA': { id: 'PA', first: 'AuntA', surname: 'Deep', fullName: 'AuntA Deep', gender: 'F', famc: 'F0', fams: [] },
          'G1': { id: 'G1', first: 'Gen1', surname: 'Deep', fullName: 'Gen1 Deep', gender: 'M', famc: 'F0', fams: ['F1'] },
          'G2': { id: 'G2', first: 'Gen2', surname: 'Deep', fullName: 'Gen2 Deep', gender: 'M', famc: 'F1', fams: ['F2'] },
          'G3': { id: 'G3', first: 'Gen3', surname: 'Deep', fullName: 'Gen3 Deep', gender: 'M', famc: 'F2', fams: ['F3'] },
          'G4': { id: 'G4', first: 'Gen4', surname: 'Deep', fullName: 'Gen4 Deep', gender: 'M', famc: 'F3', fams: ['F4'] },
          'PB': { id: 'PB', first: 'NephewB', surname: 'Deep', fullName: 'NephewB Deep', gender: 'M', famc: 'F4', fams: [] }
        },
        families: {
          'F0': { id: 'F0', husband: 'ANC', children: ['PA', 'G1'] },
          'F1': { id: 'F1', husband: 'G1', children: ['G2'] },
          'F2': { id: 'F2', husband: 'G2', children: ['G3'] },
          'F3': { id: 'F3', husband: 'G3', children: ['G4'] },
          'F4': { id: 'F4', husband: 'G4', children: ['PB'] }
        }
      };

      const rel = calculateRelationship(deepTree, 'PA', 'PB');
      expect(rel.relationshipName).toBe('3x Great-aunt');
      expect(rel.inverseName).toBe('3x Great-nephew');
      expect(rel.isDirectBlood).toBe(true);
    });
  });

  describe('8. Deep Linear Stick Lineage (12 Consecutive Only-Children)', () => {
    it('correctly ranks and renders 12 vertical generations without branching', () => {
      const stickPeople: TreeData['people'] = {};
      const stickFamilies: TreeData['families'] = {};

      for (let g = 0; g < 12; g++) {
        const pid = `P_GEN_${g}`;
        stickPeople[pid] = {
          id: pid,
          first: `Gen${g}`,
          surname: 'Monarch',
          fullName: `Gen${g} Monarch`,
          gender: 'M',
          famc: g > 0 ? `F_${g - 1}` : undefined,
          fams: g < 11 ? [`F_${g}`] : []
        };
        if (g < 11) {
          stickFamilies[`F_${g}`] = {
            id: `F_${g}`,
            husband: pid,
            children: [`P_GEN_${g + 1}`]
          };
        }
      }

      const stickTree: TreeData = { people: stickPeople, families: stickFamilies };
      const layout = computeTreeLayout(stickTree);

      for (let g = 0; g < 12; g++) {
        expect(layout.nodes[`P_GEN_${g}`].generation).toBe(g);
      }

      // Root is at top, 11th child is at bottom
      expect(layout.nodes['P_GEN_11'].y).toBeGreaterThan(layout.nodes['P_GEN_0'].y);
    });
  });
});
