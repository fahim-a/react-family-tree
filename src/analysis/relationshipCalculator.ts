import { TreeData, Person } from '../types';

export type RelationshipType =
  | 'self'
  | 'parent'
  | 'child'
  | 'sibling'
  | 'half-sibling'
  | 'spouse'
  | 'grandparent'
  | 'grandchild'
  | 'great-grandparent'
  | 'great-grandchild'
  | 'aunt-uncle'
  | 'niece-nephew'
  | 'great-aunt-uncle'
  | 'great-niece-nephew'
  | 'cousin'
  | 'in-law'
  | 'step'
  | 'indirect'
  | 'unrelated';

export interface RelationshipResult {
  personA: Person;
  personB: Person;
  relationshipName: string;      // e.g. "Paternal Grandfather", "First Cousin", "Wife"
  inverseName: string;           // e.g. "Paternal Grandson"
  type: RelationshipType;
  isDirectBlood: boolean;        // True if connected purely through genetic ancestor/descendant lineage
  degreeOfKinship?: number;      // Degrees of separation in civil law
  commonAncestors: Person[];     // Most recent common ancestor(s)
  path: string[];                // Ordered array of person and family IDs connecting A to B
  description: string;           // Rich plain-English sentence explaining the connection
}

/**
 * Returns all direct ancestors of a person along with their generational distance.
 * Distance 1 = parents, 2 = grandparents, etc.
 */
export function getAncestors(data: TreeData, personId: string): Map<string, number> {
  const ancestors = new Map<string, number>();
  const queue: Array<{ id: string; distance: number }> = [{ id: personId, distance: 0 }];
  const visited = new Set<string>([personId]);

  while (queue.length > 0) {
    const { id, distance } = queue.shift()!;
    const person = data.people[id];
    if (!person || !person.famc) continue;

    const fam = data.families[person.famc];
    if (!fam) continue;

    const parents = [fam.husband, fam.wife].filter((p): p is string => typeof p === 'string' && !visited.has(p));
    for (const pId of parents) {
      visited.add(pId);
      const nextDist = distance + 1;
      ancestors.set(pId, nextDist);
      queue.push({ id: pId, distance: nextDist });
    }
  }

  return ancestors;
}

/**
 * Returns all direct descendants of a person along with their generational distance.
 * Distance 1 = children, 2 = grandchildren, etc.
 */
export function getDescendants(data: TreeData, personId: string): Map<string, number> {
  const descendants = new Map<string, number>();
  const queue: Array<{ id: string; distance: number }> = [{ id: personId, distance: 0 }];
  const visited = new Set<string>([personId]);

  while (queue.length > 0) {
    const { id, distance } = queue.shift()!;
    const person = data.people[id];
    if (!person || !person.fams) continue;

    for (const famId of person.fams) {
      const fam = data.families[famId];
      if (!fam) continue;

      for (const childId of fam.children) {
        if (!visited.has(childId)) {
          visited.add(childId);
          const nextDist = distance + 1;
          descendants.set(childId, nextDist);
          queue.push({ id: childId, distance: nextDist });
        }
      }
    }
  }

  return descendants;
}

/**
 * Finds the shortest path between Person A and Person B in the kinship graph.
 */
export function findShortestKinshipPath(data: TreeData, personAId: string, personBId: string): string[] {
  if (personAId === personBId) return [personAId];

  // Adjacency graph
  const adj = new Map<string, string[]>();
  function addEdge(u: string, v: string) {
    if (!adj.has(u)) adj.set(u, []);
    if (!adj.has(v)) adj.set(v, []);
    adj.get(u)!.push(v);
    adj.get(v)!.push(u);
  }

  // Connect families to spouses and children
  Object.values(data.families).forEach(fam => {
    if (fam.husband) addEdge(fam.husband, fam.id);
    if (fam.wife) addEdge(fam.wife, fam.id);
    fam.children.forEach(cid => addEdge(fam.id, cid));
  });

  const queue: string[] = [personAId];
  const visited = new Set<string>([personAId]);
  const parent = new Map<string, string>();

  while (queue.length > 0) {
    const curr = queue.shift()!;
    if (curr === personBId) {
      // Reconstruct path
      const path: string[] = [];
      let temp: string | undefined = personBId;
      while (temp) {
        path.unshift(temp);
        temp = parent.get(temp);
      }
      return path;
    }

    const neighbors = adj.get(curr) || [];
    for (const n of neighbors) {
      if (!visited.has(n)) {
        visited.add(n);
        parent.set(n, curr);
        queue.push(n);
      }
    }
  }

  return [];
}

/**
 * Returns ordinal string (e.g. 1st, 2nd, 3rd, 4th).
 */
function getOrdinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/**
 * Calculates the exact genealogical relationship between two individuals.
 *
 * Kinship Calculation Architecture:
 * ---------------------------------
 * 1. Identity Check: personA === personB -> 'Self'.
 * 2. Marital Check: Shared family union where A is husband and B is wife (or vice versa) -> 'Spouse'.
 * 3. Direct Lineage Check:
 *    - If A is in B's ancestor map: Parent, Grandparent, Great-Grandparent, Nx Great-Grandparent.
 *    - If B is in A's ancestor map: Child, Grandchild, Great-Grandchild, Nx Great-Grandchild.
 * 4. Collateral Blood Kinship (MRCA Resolution):
 *    - Locates the Most Recent Common Ancestor(s) minimizing total generational distance (distA + distB).
 *    - distA = 1, distB = 1 -> Full or Half Sibling (based on sharing 2 vs 1 parents).
 *    - min(dist) = 1, max(dist) >= 2 -> Aunt/Uncle or Niece/Nephew (with Great- prefixes for genDiff >= 2).
 *    - distA >= 2, distB >= 2 -> Cousin Calculation:
 *        * Cousin Degree = min(distA, distB) - 1  (e.g., min dist 2 = 1st Cousin, 3 = 2nd Cousin)
 *        * Removal = |distA - distB|             (e.g., 0 = same gen, 1 = once removed, 2 = twice removed)
 *        * Civil Law Kinship Degree = distA + distB
 * 5. Marital In-Laws & Indirect Paths:
 *    - Uses Breadth-First Search (BFS) to find shortest path across marriages (e.g. Son-in-law, Sister-in-law).
 */
export function calculateRelationship(data: TreeData, personAId: string, personBId: string): RelationshipResult {
  const pA = data.people[personAId];
  const pB = data.people[personBId];

  if (!pA || !pB) {
    throw new Error('Both Person A and Person B must exist in the dataset');
  }

  // 1. Same Person
  if (personAId === personBId) {
    return {
      personA: pA,
      personB: pB,
      relationshipName: 'Self',
      inverseName: 'Self',
      type: 'self',
      isDirectBlood: true,
      degreeOfKinship: 0,
      commonAncestors: [],
      path: [personAId],
      description: `${pA.fullName} is the same person.`
    };
  }

  // 2. Direct Spouses
  const isSpouse = pA.fams.some(fId => {
    const fam = data.families[fId];
    return fam && ((fam.husband === personAId && fam.wife === personBId) || (fam.wife === personAId && fam.husband === personBId));
  });

  if (isSpouse) {
    const nameA = pA.gender === 'M' ? 'Husband' : pA.gender === 'F' ? 'Wife' : 'Spouse';
    const nameB = pB.gender === 'M' ? 'Husband' : pB.gender === 'F' ? 'Wife' : 'Spouse';
    const famId = pA.fams.find(f => pB.fams.includes(f));
    const path = famId ? [personAId, famId, personBId] : [personAId, personBId];

    return {
      personA: pA,
      personB: pB,
      relationshipName: nameA,
      inverseName: nameB,
      type: 'spouse',
      isDirectBlood: false,
      degreeOfKinship: 1,
      commonAncestors: [],
      path,
      description: `${pA.fullName} is the ${nameA.toLowerCase()} of ${pB.fullName}.`
    };
  }

  // 3. Find Most Recent Common Ancestor(s)
  const ancestorsA = getAncestors(data, personAId);
  const ancestorsB = getAncestors(data, personBId);

  // Check if A is direct ancestor of B
  if (ancestorsB.has(personAId)) {
    const dist = ancestorsB.get(personAId)!;
    const path = findShortestKinshipPath(data, personAId, personBId);
    let relA = '';
    let relB = '';

    if (dist === 1) {
      relA = pA.gender === 'M' ? 'Father' : pA.gender === 'F' ? 'Mother' : 'Parent';
      relB = pB.gender === 'M' ? 'Son' : pB.gender === 'F' ? 'Daughter' : 'Child';
    } else if (dist === 2) {
      relA = pA.gender === 'M' ? 'Grandfather' : pA.gender === 'F' ? 'Grandmother' : 'Grandparent';
      relB = pB.gender === 'M' ? 'Grandson' : pB.gender === 'F' ? 'Granddaughter' : 'Grandchild';
    } else if (dist === 3) {
      relA = pA.gender === 'M' ? 'Great-grandfather' : pA.gender === 'F' ? 'Great-grandmother' : 'Great-grandparent';
      relB = pB.gender === 'M' ? 'Great-grandson' : pB.gender === 'F' ? 'Great-granddaughter' : 'Great-grandchild';
    } else {
      const greats = dist - 2;
      relA = `${greats}x Great-${pA.gender === 'M' ? 'grandfather' : pA.gender === 'F' ? 'grandmother' : 'grandparent'}`;
      relB = `${greats}x Great-${pB.gender === 'M' ? 'grandson' : pB.gender === 'F' ? 'granddaughter' : 'grandchild'}`;
    }

    return {
      personA: pA,
      personB: pB,
      relationshipName: relA,
      inverseName: relB,
      type: dist === 1 ? 'parent' : dist === 2 ? 'grandparent' : 'great-grandparent',
      isDirectBlood: true,
      degreeOfKinship: dist,
      commonAncestors: [pA],
      path,
      description: `${pA.fullName} is the direct ${relA.toLowerCase()} of ${pB.fullName} (${dist} generations apart).`
    };
  }

  // Check if B is direct ancestor of A
  if (ancestorsA.has(personBId)) {
    const dist = ancestorsA.get(personBId)!;
    const path = findShortestKinshipPath(data, personAId, personBId);
    let relA = '';
    let relB = '';

    if (dist === 1) {
      relA = pA.gender === 'M' ? 'Son' : pA.gender === 'F' ? 'Daughter' : 'Child';
      relB = pB.gender === 'M' ? 'Father' : pB.gender === 'F' ? 'Mother' : 'Parent';
    } else if (dist === 2) {
      relA = pA.gender === 'M' ? 'Grandson' : pA.gender === 'F' ? 'Granddaughter' : 'Grandchild';
      relB = pB.gender === 'M' ? 'Grandfather' : pB.gender === 'F' ? 'Grandmother' : 'Grandparent';
    } else if (dist === 3) {
      relA = pA.gender === 'M' ? 'Great-grandson' : pA.gender === 'F' ? 'Great-granddaughter' : 'Great-grandchild';
      relB = pB.gender === 'M' ? 'Great-grandfather' : pB.gender === 'F' ? 'Great-grandmother' : 'Great-grandparent';
    } else {
      const greats = dist - 2;
      relA = `${greats}x Great-${pA.gender === 'M' ? 'grandson' : pA.gender === 'F' ? 'granddaughter' : 'grandchild'}`;
      relB = `${greats}x Great-${pB.gender === 'M' ? 'grandfather' : pB.gender === 'F' ? 'grandmother' : 'grandparent'}`;
    }

    return {
      personA: pA,
      personB: pB,
      relationshipName: relA,
      inverseName: relB,
      type: dist === 1 ? 'child' : dist === 2 ? 'grandchild' : 'great-grandchild',
      isDirectBlood: true,
      degreeOfKinship: dist,
      commonAncestors: [pB],
      path,
      description: `${pA.fullName} is the direct ${relA.toLowerCase()} of ${pB.fullName} (${dist} generations apart).`
    };
  }

  // Find shared common ancestors
  const sharedAncestorIds: string[] = [];
  for (const aId of ancestorsA.keys()) {
    if (ancestorsB.has(aId)) {
      sharedAncestorIds.push(aId);
    }
  }

  if (sharedAncestorIds.length > 0) {
    // Sort to find the MRCA with minimal total distance
    sharedAncestorIds.sort((id1, id2) => {
      const total1 = ancestorsA.get(id1)! + ancestorsB.get(id1)!;
      const total2 = ancestorsA.get(id2)! + ancestorsB.get(id2)!;
      return total1 - total2;
    });

    const mrcaId = sharedAncestorIds[0];
    const distA = ancestorsA.get(mrcaId)!;
    const distB = ancestorsB.get(mrcaId)!;
    const path = findShortestKinshipPath(data, personAId, personBId);

    // Group common ancestors of the same tier (e.g. married couple)
    const mrcaGroup = sharedAncestorIds
      .filter(id => ancestorsA.get(id) === distA && ancestorsB.get(id) === distB)
      .map(id => data.people[id]);

    const ancestorNames = mrcaGroup.map(a => a.fullName).join(' and ');

    // Siblings
    if (distA === 1 && distB === 1) {
      const isFull = mrcaGroup.length >= 2;
      const relA = pA.gender === 'M' ? 'Brother' : pA.gender === 'F' ? 'Sister' : 'Sibling';
      const relB = pB.gender === 'M' ? 'Brother' : pB.gender === 'F' ? 'Sister' : 'Sibling';
      const prefix = isFull ? '' : 'Half-';

      return {
        personA: pA,
        personB: pB,
        relationshipName: `${prefix}${relA}`,
        inverseName: `${prefix}${relB}`,
        type: isFull ? 'sibling' : 'half-sibling',
        isDirectBlood: true,
        degreeOfKinship: 2,
        commonAncestors: mrcaGroup,
        path,
        description: `${pA.fullName} and ${pB.fullName} are ${prefix.toLowerCase()}${relA.toLowerCase()}s (shared parents: ${ancestorNames}).`
      };
    }

    // Uncle / Aunt / Nephew / Niece
    if (distA === 1 && distB >= 2) {
      // Person A is aunt/uncle of Person B
      const genDiff = distB - 1; // 1 = aunt/uncle, 2 = great-aunt/uncle
      let relA = '';
      let relB = '';

      if (genDiff === 1) {
        relA = pA.gender === 'M' ? 'Uncle' : pA.gender === 'F' ? 'Aunt' : 'Paternal/Maternal Sibling';
        relB = pB.gender === 'M' ? 'Nephew' : pB.gender === 'F' ? 'Niece' : 'Sibling Child';
      } else if (genDiff === 2) {
        relA = pA.gender === 'M' ? 'Great-uncle' : pA.gender === 'F' ? 'Great-aunt' : 'Great-aunt/uncle';
        relB = pB.gender === 'M' ? 'Great-nephew' : pB.gender === 'F' ? 'Great-niece' : 'Great-niece/nephew';
      } else {
        const greats = genDiff - 1;
        relA = `${greats}x Great-${pA.gender === 'M' ? 'uncle' : pA.gender === 'F' ? 'aunt' : 'aunt/uncle'}`;
        relB = `${greats}x Great-${pB.gender === 'M' ? 'nephew' : pB.gender === 'F' ? 'niece' : 'niece/nephew'}`;
      }

      return {
        personA: pA,
        personB: pB,
        relationshipName: relA,
        inverseName: relB,
        type: genDiff === 1 ? 'aunt-uncle' : 'great-aunt-uncle',
        isDirectBlood: true,
        degreeOfKinship: distA + distB,
        commonAncestors: mrcaGroup,
        path,
        description: `${pA.fullName} is the ${relA.toLowerCase()} of ${pB.fullName} through ${ancestorNames}.`
      };
    }

    if (distB === 1 && distA >= 2) {
      // Person B is aunt/uncle of Person A (inversely, A is nephew/niece)
      const genDiff = distA - 1;
      let relA = '';
      let relB = '';

      if (genDiff === 1) {
        relA = pA.gender === 'M' ? 'Nephew' : pA.gender === 'F' ? 'Niece' : 'Sibling Child';
        relB = pB.gender === 'M' ? 'Uncle' : pB.gender === 'F' ? 'Aunt' : 'Paternal/Maternal Sibling';
      } else if (genDiff === 2) {
        relA = pA.gender === 'M' ? 'Great-nephew' : pA.gender === 'F' ? 'Great-niece' : 'Great-niece/nephew';
        relB = pB.gender === 'M' ? 'Great-uncle' : pB.gender === 'F' ? 'Great-aunt' : 'Great-aunt/uncle';
      } else {
        const greats = genDiff - 1;
        relA = `${greats}x Great-${pA.gender === 'M' ? 'nephew' : pA.gender === 'F' ? 'niece' : 'niece/nephew'}`;
        relB = `${greats}x Great-${pB.gender === 'M' ? 'uncle' : pB.gender === 'F' ? 'aunt' : 'aunt/uncle'}`;
      }

      return {
        personA: pA,
        personB: pB,
        relationshipName: relA,
        inverseName: relB,
        type: genDiff === 1 ? 'niece-nephew' : 'great-niece-nephew',
        isDirectBlood: true,
        degreeOfKinship: distA + distB,
        commonAncestors: mrcaGroup,
        path,
        description: `${pA.fullName} is the ${relA.toLowerCase()} of ${pB.fullName} through ${ancestorNames}.`
      };
    }

    // Cousins
    if (distA >= 2 && distB >= 2) {
      const minD = Math.min(distA, distB);
      const cousinDegree = minD - 1; // 1 = 1st cousin, 2 = 2nd cousin
      const removal = Math.abs(distA - distB);

      const degreeStr = `${getOrdinal(cousinDegree)} Cousin`;
      const removalStr = removal === 0 ? '' : removal === 1 ? ' once removed' : ` ${removal} times removed`;
      const fullCousinName = `${degreeStr}${removalStr}`;

      return {
        personA: pA,
        personB: pB,
        relationshipName: fullCousinName,
        inverseName: fullCousinName,
        type: 'cousin',
        isDirectBlood: true,
        degreeOfKinship: distA + distB,
        commonAncestors: mrcaGroup,
        path,
        description: `${pA.fullName} and ${pB.fullName} are ${fullCousinName.toLowerCase()}s (common ancestors: ${ancestorNames}).`
      };
    }
  }

  // 4. In-Laws and Indirect Marriage Connections
  const shortestPath = findShortestKinshipPath(data, personAId, personBId);
  if (shortestPath.length > 0) {
    // Check specific in-law patterns
    // A's child married B: son-in-law / daughter-in-law
    const isSonOrDaughterInLaw = pA.fams.some(fId => {
      const fam = data.families[fId];
      if (!fam) return false;
      return fam.children.some(cid => {
        const child = data.people[cid];
        return child && child.fams.some(cfId => {
          const cFam = data.families[cfId];
          return cFam && (cFam.husband === personBId || cFam.wife === personBId);
        });
      });
    });

    if (isSonOrDaughterInLaw) {
      const relB = pB.gender === 'M' ? 'Son-in-law' : pB.gender === 'F' ? 'Daughter-in-law' : 'Child-in-law';
      const relA = pA.gender === 'M' ? 'Father-in-law' : pA.gender === 'F' ? 'Mother-in-law' : 'Parent-in-law';
      return {
        personA: pA,
        personB: pB,
        relationshipName: relA,
        inverseName: relB,
        type: 'in-law',
        isDirectBlood: false,
        commonAncestors: [],
        path: shortestPath,
        description: `${pA.fullName} is the ${relA.toLowerCase()} of ${pB.fullName} (spouse of child).`
      };
    }

    // B's child married A
    const isChildInLawOfB = pB.fams.some(fId => {
      const fam = data.families[fId];
      if (!fam) return false;
      return fam.children.some(cid => {
        const child = data.people[cid];
        return child && child.fams.some(cfId => {
          const cFam = data.families[cfId];
          return cFam && (cFam.husband === personAId || cFam.wife === personAId);
        });
      });
    });

    if (isChildInLawOfB) {
      const relA = pA.gender === 'M' ? 'Son-in-law' : pA.gender === 'F' ? 'Daughter-in-law' : 'Child-in-law';
      const relB = pB.gender === 'M' ? 'Father-in-law' : pB.gender === 'F' ? 'Mother-in-law' : 'Parent-in-law';
      return {
        personA: pA,
        personB: pB,
        relationshipName: relA,
        inverseName: relB,
        type: 'in-law',
        isDirectBlood: false,
        commonAncestors: [],
        path: shortestPath,
        description: `${pA.fullName} is the ${relA.toLowerCase()} of ${pB.fullName} (married to their child).`
      };
    }

    // Generic indirect marriage connection
    return {
      personA: pA,
      personB: pB,
      relationshipName: 'Related by Marriage',
      inverseName: 'Related by Marriage',
      type: 'indirect',
      isDirectBlood: false,
      commonAncestors: [],
      path: shortestPath,
      description: `${pA.fullName} and ${pB.fullName} are related by marriage (${Math.floor((shortestPath.length - 1) / 2)} degrees of separation).`
    };
  }

  // 5. No relationship found
  return {
    personA: pA,
    personB: pB,
    relationshipName: 'No direct relationship',
    inverseName: 'No direct relationship',
    type: 'unrelated',
    isDirectBlood: false,
    commonAncestors: [],
    path: [],
    description: `No recorded relationship connects ${pA.fullName} and ${pB.fullName} in this tree.`
  };
}
