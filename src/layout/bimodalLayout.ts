import { TreeData, LayoutNode, LayoutFamilyNode, LayoutEdge, TreeLayout } from '../types';

export interface LayoutOptions {
  nodeWidth: number;
  nodeHeight: number;
  horizontalSpacing: number;
  verticalSpacing: number;
  spouseSpacing: number;
}

export const DEFAULT_LAYOUT_OPTIONS: LayoutOptions = {
  nodeWidth: 200,
  nodeHeight: 88,
  horizontalSpacing: 48,
  verticalSpacing: 140,
  spouseSpacing: 20,
};

interface LayoutUnit {
  id: string;
  peopleIds: string[];
  familyId?: string;
  generation: number;
  width: number;
  subtreeWidth: number;
  x: number;
  childrenUnits: LayoutUnit[];
}

/**
 * Calculates responsive, non-overlapping hierarchical 2D coordinates
 * for people cards, intermediate family union gates, and cubic bezier connector curves.
 *
 * Algorithm Architecture (5-Stage Bimodal DAG Solver):
 * ----------------------------------------------------
 * 1. Generational Rank Calculation:
 *    Traverses parent-child lineage DAG to assign each individual an integer generation index
 *    (root ancestors at Gen 0, children at Gen 1, etc.).
 *    Spouses are leveled to the maximum generation rank between them to ensure horizontal alignment.
 *    Ancestral cycles are caught via a recursion visited set to prevent infinite loops.
 *
 * 2. Recursive Subtree Construction:
 *    Groups spouses into unified `LayoutUnit` couple nodes (width = 2 * nodeWidth + spouseSpacing).
 *    Recursively identifies all children families and builds downstream subtrees.
 *
 * 3. Bottom-Up Subtree Width Accumulation:
 *    Calculates cumulative bounding width required for each branch so that siblings and
 *    their respective spouses never collide or overlap horizontally.
 *
 * 4. Coordinate Assignment & Normalization:
 *    Distributes horizontal X positions symmetrically around union midpoints.
 *    Vertical Y positions are assigned strictly by generation (`gen * verticalSpacing`).
 *    All coordinates are shifted to positive world space with configurable canvas padding.
 *
 * 5. Union Gate Positioning & Cubic Bezier Curve Generation:
 *    Positions intermediate marriage junction diamonds exactly midway between spouses.
 *    Generates smooth SVG cubic bezier paths (`M startX startY C ... endX endY`) from parents
 *    to the union gate, and from the union gate down to each child node.
 */
export function computeTreeLayout(data: TreeData, options: Partial<LayoutOptions> = {}): TreeLayout {
  const opts = { ...DEFAULT_LAYOUT_OPTIONS, ...options };
  
  // =========================================================================
  // Stage 1: Generational Rank Resolution (Topological DAG Ranking)
  // =========================================================================
  const generations = new Map<string, number>();
  
  function getPersonGen(personId: string, visited = new Set<string>()): number {
    if (generations.has(personId)) return generations.get(personId)!;
    // Break circular references if corrupted input contains an ancestral loop
    if (visited.has(personId)) return 0;
    visited.add(personId);

    const person = data.people[personId];
    if (!person || !person.famc) {
      generations.set(personId, 0);
      return 0;
    }

    const fam = data.families[person.famc];
    if (!fam) {
      generations.set(personId, 0);
      return 0;
    }

    let maxParentGen = 0;
    if (fam.husband) {
      maxParentGen = Math.max(maxParentGen, getPersonGen(fam.husband, new Set(visited)));
    }
    if (fam.wife) {
      maxParentGen = Math.max(maxParentGen, getPersonGen(fam.wife, new Set(visited)));
    }

    const gen = maxParentGen + 1;
    generations.set(personId, gen);
    return gen;
  }

  // Populate generational depth for every person in the tree
  Object.keys(data.people).forEach(id => getPersonGen(id));

  // Level spouses to the exact same generation tier to avoid vertical displacement
  Object.values(data.families).forEach(fam => {
    if (fam.husband && fam.wife) {
      const gH = generations.get(fam.husband) ?? 0;
      const gW = generations.get(fam.wife) ?? 0;
      const commonGen = Math.max(gH, gW);
      generations.set(fam.husband, commonGen);
      generations.set(fam.wife, commonGen);
    }
  });

  const visitedPeople = new Set<string>();
  const nodes: Record<string, LayoutNode> = {};
  const familyNodes: Record<string, LayoutFamilyNode> = {};
  const edges: LayoutEdge[] = [];

  // =========================================================================
  // Stage 2: Recursive Subtree Construction (Couple Units & Children Branches)
  // =========================================================================
  function buildSubtree(pids: string[], famId: string | undefined, gen: number): LayoutUnit {
    pids.forEach(p => visitedPeople.add(p));
    const isCouple = pids.length === 2;
    const unitWidth = isCouple ? opts.nodeWidth * 2 + opts.spouseSpacing : opts.nodeWidth;

    const unit: LayoutUnit = {
      id: famId || pids.join('+'),
      peopleIds: pids,
      familyId: famId,
      generation: gen,
      width: unitWidth,
      subtreeWidth: 0,
      x: 0,
      childrenUnits: []
    };

    let activeFamId = famId;
    if (!activeFamId) {
      for (const pid of pids) {
        if (data.people[pid]?.fams[0]) {
          activeFamId = data.people[pid].fams[0];
          break;
        }
      }
    }

    if (activeFamId && data.families[activeFamId]) {
      unit.familyId = activeFamId;
      const fam = data.families[activeFamId];
      fam.children.forEach(childId => {
        if (visitedPeople.has(childId)) return;
        const child = data.people[childId];
        if (!child) return;
        const childGen = generations.get(childId) ?? (gen + 1);

        let childFamId: string | undefined;
        let spouseId: string | undefined;
        for (const cfId of child.fams) {
          const f = data.families[cfId];
          if (f) {
            const sp = f.husband === childId ? f.wife : f.husband;
            if (sp && !visitedPeople.has(sp)) {
              childFamId = cfId;
              spouseId = sp;
              break;
            }
          }
        }

        if (spouseId) {
          unit.childrenUnits.push(buildSubtree([childId, spouseId], childFamId, childGen));
        } else {
          unit.childrenUnits.push(buildSubtree([childId], childFamId, childGen));
        }
      });
    }

    return unit;
  }

  // =========================================================================
  // Stage 3: Root Unit Identification (Foundational Ancestors & Standalone Nodes)
  // =========================================================================
  const rootUnits: LayoutUnit[] = [];

  // Identify couple roots: families where neither spouse has an upstream biological parent
  Object.values(data.families).forEach(fam => {
    const husb = fam.husband ? data.people[fam.husband] : null;
    const wife = fam.wife ? data.people[fam.wife] : null;
    const husbHasParents = !!husb?.famc;
    const wifeHasParents = !!wife?.famc;

    if (!husbHasParents && !wifeHasParents && (fam.husband || fam.wife)) {
      const pids = [fam.husband, fam.wife].filter((p): p is string => typeof p === 'string' && !visitedPeople.has(p));
      if (pids.length > 0) {
        rootUnits.push(buildSubtree(pids, fam.id, 0));
      }
    }
  });

  // Identify disconnected individuals who have neither parents nor marriages
  Object.values(data.people).forEach(person => {
    if (!visitedPeople.has(person.id) && !person.famc && person.fams.length === 0) {
      rootUnits.push(buildSubtree([person.id], undefined, generations.get(person.id) ?? 0));
    }
  });

  // =========================================================================
  // Stage 4: Two-Pass Horizontal Space Calculation (Bottom-Up Accumulation)
  // =========================================================================
  function calcSubtreeWidth(u: LayoutUnit): number {
    if (u.childrenUnits.length === 0) {
      u.subtreeWidth = u.width;
      return u.subtreeWidth;
    }
    let childrenTotal = 0;
    u.childrenUnits.forEach((cu, idx) => {
      childrenTotal += calcSubtreeWidth(cu) + (idx > 0 ? opts.horizontalSpacing : 0);
    });
    // Subtree must be at least as wide as the couple itself, or the total width of all children
    u.subtreeWidth = Math.max(u.width, childrenTotal);
    return u.subtreeWidth;
  }
  rootUnits.forEach(calcSubtreeWidth);

  // =========================================================================
  // Stage 5: Top-Down Coordinate Placement & Spouse Placement
  // =========================================================================
  function assignPositions(units: LayoutUnit[], startX: number) {
    let currentX = startX;
    units.forEach(u => {
      const unitCenterX = currentX + u.subtreeWidth / 2;
      const unitStartX = unitCenterX - u.width / 2;
      u.x = unitStartX;

      const y = u.generation * (opts.nodeHeight + opts.verticalSpacing) + 60;

      // Position couple side-by-side with spouseSpacing gap
      if (u.peopleIds.length === 2) {
        const [p1, p2] = u.peopleIds;
        nodes[p1] = {
          ...data.people[p1],
          x: unitStartX,
          y,
          width: opts.nodeWidth,
          height: opts.nodeHeight,
          generation: u.generation
        };
        nodes[p2] = {
          ...data.people[p2],
          x: unitStartX + opts.nodeWidth + opts.spouseSpacing,
          y,
          width: opts.nodeWidth,
          height: opts.nodeHeight,
          generation: u.generation
        };
      } else if (u.peopleIds.length === 1) {
        // Position single individual
        const p1 = u.peopleIds[0];
        nodes[p1] = {
          ...data.people[p1],
          x: unitStartX,
          y,
          width: opts.nodeWidth,
          height: opts.nodeHeight,
          generation: u.generation
        };
      }

      if (u.childrenUnits.length > 0) {
        const childrenTotalW = u.childrenUnits.reduce(
          (acc, c, idx) => acc + c.subtreeWidth + (idx > 0 ? opts.horizontalSpacing : 0),
          0
        );
        const childrenStartX = unitCenterX - childrenTotalW / 2;
        assignPositions(u.childrenUnits, childrenStartX);
      }

      currentX += u.subtreeWidth + opts.horizontalSpacing;
    });
  }

  // Start root units at positive offset 80
  assignPositions(rootUnits, 80);

  // Fallback for any unvisited individuals (e.g. disconnected nodes)
  Object.keys(data.people).forEach(pid => {
    if (!nodes[pid]) {
      const gen = generations.get(pid) ?? 0;
      const y = gen * (opts.nodeHeight + opts.verticalSpacing) + 60;
      const existingInGen = Object.values(nodes).filter(n => n.generation === gen);
      const maxX = existingInGen.length > 0 ? Math.max(...existingInGen.map(n => n.x + n.width)) : 80;
      nodes[pid] = {
        ...data.people[pid],
        x: maxX + opts.horizontalSpacing,
        y,
        width: opts.nodeWidth,
        height: opts.nodeHeight,
        generation: gen
      };
    }
  });

  // =========================================================================
  // Stage 6: Coordinate Normalization (Ensure Strict Positive World Space)
  // =========================================================================
  let rawMinX = Infinity;
  let rawMinY = Infinity;
  Object.values(nodes).forEach(n => {
    rawMinX = Math.min(rawMinX, n.x);
    rawMinY = Math.min(rawMinY, n.y);
  });

  // Ensure minimum left margin of 80px so no cards are clipped against the canvas edge
  if (rawMinX < 60) {
    const shiftX = 80 - rawMinX;
    Object.values(nodes).forEach(n => {
      n.x += shiftX;
    });
  }

  // =========================================================================
  // Stage 7: Family Union Gates & Cubic Bezier Curve Generation
  // =========================================================================
  Object.values(data.families).forEach(fam => {
    const husbNode = fam.husband ? nodes[fam.husband] : undefined;
    const wifeNode = fam.wife ? nodes[fam.wife] : undefined;

    // Skip corrupted families with neither parent node present
    if (!husbNode && !wifeNode) return;

    let famX = 0;
    let famY = 0;
    let famGen = 0;

    // Drop union diamond 45% of the vertical generational distance below parent cards
    const gateDrop = opts.nodeHeight + opts.verticalSpacing * 0.45;

    // Center gate between both spouses, or below single parent if only one spouse exists
    if (husbNode && wifeNode) {
      const husbCenterX = husbNode.x + opts.nodeWidth / 2;
      const wifeCenterX = wifeNode.x + opts.nodeWidth / 2;
      famX = (husbCenterX + wifeCenterX) / 2;
      famY = husbNode.y + gateDrop;
      famGen = husbNode.generation;
    } else if (husbNode) {
      famX = husbNode.x + opts.nodeWidth / 2;
      famY = husbNode.y + gateDrop;
      famGen = husbNode.generation;
    } else if (wifeNode) {
      famX = wifeNode.x + opts.nodeWidth / 2;
      famY = wifeNode.y + gateDrop;
      famGen = wifeNode.generation;
    }

    familyNodes[fam.id] = {
      ...fam,
      x: famX,
      y: famY,
      width: 14,
      height: 14,
      generation: famGen
    };

    // Construct smooth vertical S-curve bezier from husband bottom center to union gate
    if (husbNode) {
      const startX = husbNode.x + opts.nodeWidth / 2;
      const startY = husbNode.y + opts.nodeHeight;
      const midY = (startY + famY) / 2;
      edges.push({
        id: `${husbNode.id}->${fam.id}`,
        fromId: husbNode.id,
        toId: fam.id,
        type: 'parent-to-family',
        path: `M ${startX} ${startY} C ${startX} ${midY}, ${famX} ${midY}, ${famX} ${famY}`
      });
    }

    // Construct smooth vertical S-curve bezier from wife bottom center to union gate
    if (wifeNode) {
      const startX = wifeNode.x + opts.nodeWidth / 2;
      const startY = wifeNode.y + opts.nodeHeight;
      const midY = (startY + famY) / 2;
      edges.push({
        id: `${wifeNode.id}->${fam.id}`,
        fromId: wifeNode.id,
        toId: fam.id,
        type: 'parent-to-family',
        path: `M ${startX} ${startY} C ${startX} ${midY}, ${famX} ${midY}, ${famX} ${famY}`
      });
    }

    // Construct downward branching bezier curves from union gate to top center of each child
    fam.children.forEach(childId => {
      const childNode = nodes[childId];
      if (childNode) {
        const startX = famX;
        const startY = famY;
        const endX = childNode.x + opts.nodeWidth / 2;
        const endY = childNode.y;
        const midY = (startY + endY) / 2;

        edges.push({
          id: `${fam.id}->${childId}`,
          fromId: fam.id,
          toId: childId,
          type: 'family-to-child',
          path: `M ${startX} ${startY} C ${startX} ${midY}, ${endX} ${midY}, ${endX} ${endY}`
        });
      }
    });
  });

  // 6. Calculate Bounding Box
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  Object.values(nodes).forEach(n => {
    minX = Math.min(minX, n.x);
    maxX = Math.max(maxX, n.x + n.width);
    minY = Math.min(minY, n.y);
    maxY = Math.max(maxY, n.y + n.height);
  });
  Object.values(familyNodes).forEach(f => {
    minX = Math.min(minX, f.x - 10);
    maxX = Math.max(maxX, f.x + 10);
    minY = Math.min(minY, f.y - 10);
    maxY = Math.max(maxY, f.y + 10);
  });

  if (minX === Infinity) {
    minX = 0; maxX = 800; minY = 0; maxY = 600;
  }

  const padding = 80;
  return {
    nodes,
    familyNodes,
    edges,
    bounds: {
      minX: Math.max(0, minX - padding),
      maxX: maxX + padding,
      minY: Math.max(0, minY - padding),
      maxY: maxY + padding,
      width: (maxX - Math.max(0, minX - padding)) + padding,
      height: (maxY - Math.max(0, minY - padding)) + padding
    }
  };
}
