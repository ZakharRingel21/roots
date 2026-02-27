// Genealogical tree layout engine
// Returns only person node positions (no family-node intermediaries).

export const LEVEL_HEIGHT = 160;
export const NODE_WIDTH   = 140;
export const NODE_HEIGHT  = 80;
const SIBLING_GAP  = 32;
const GAP_PARTNER  = 28;

interface RawEdge {
  id: string; source: string; target: string;
  data?: { relationship_type?: string };
}
interface RawNode { id: string; data: any }

export function computeLayout(rawNodes: RawNode[], rawEdges: RawEdge[]) {
  const personIds = rawNodes.map(n => n.id);

  const parentEdges  = rawEdges.filter(e => e.data?.relationship_type === 'parent');
  const spouseEdges  = rawEdges.filter(e => e.data?.relationship_type === 'spouse');

  const p2c = new Map<string, string[]>(); // parent → children
  const c2p = new Map<string, string[]>(); // child  → parents

  for (const e of parentEdges) {
    if (!p2c.has(e.source)) p2c.set(e.source, []);
    p2c.get(e.source)!.push(e.target);
    if (!c2p.has(e.target)) c2p.set(e.target, []);
    c2p.get(e.target)!.push(e.source);
  }

  const spouseMap = new Map<string, string[]>();
  const spousePairs: [string, string][] = [];
  for (const e of spouseEdges) {
    if (!spouseMap.has(e.source)) spouseMap.set(e.source, []);
    spouseMap.get(e.source)!.push(e.target);
    if (!spouseMap.has(e.target)) spouseMap.set(e.target, []);
    spouseMap.get(e.target)!.push(e.source);
    spousePairs.push([e.source, e.target]);
  }

  // ── 1. Assign generations ──────────────────────────────
  const gen = new Map<string, number>();
  const roots = personIds.filter(id => !(c2p.get(id)?.length));
  const queue = [...roots];
  for (const r of roots) gen.set(r, 0);

  while (queue.length) {
    const cur = queue.shift()!;
    const g   = gen.get(cur)!;
    for (const ch of p2c.get(cur) || []) {
      if (!gen.has(ch)) { gen.set(ch, g + 1); queue.push(ch); }
    }
  }
  for (const id of personIds) { if (!gen.has(id)) gen.set(id, 0); }

  // Spouse same-level rule
  let changed = true;
  while (changed) {
    changed = false;
    for (const [A, B] of spousePairs) {
      const gA = gen.get(A) ?? 0, gB = gen.get(B) ?? 0;
      if (gA !== gB) { const m = Math.min(gA, gB); gen.set(A, m); gen.set(B, m); changed = true; }
    }
  }

  // ── 2. Place nodes (subtree-width model) ──────────────
  const positions = new Map<string, { x: number; y: number }>();
  const placed    = new Set<string>();
  let xCursor     = 0;

  const widthMemo = new Map<string, number>();

  function subtreeWidth(id: string): number {
    if (widthMemo.has(id)) return widthMemo.get(id)!;
    const children  = p2c.get(id) || [];
    const hasSpouse = (spouseMap.get(id) || []).length > 0;
    const coupleW   = hasSpouse ? NODE_WIDTH + GAP_PARTNER + NODE_WIDTH : NODE_WIDTH;
    if (!children.length) { widthMemo.set(id, coupleW); return coupleW; }
    const childW = children.reduce((s, c) => s + subtreeWidth(c), 0)
                 + SIBLING_GAP * (children.length - 1);
    const result = Math.max(coupleW, childW);
    widthMemo.set(id, result);
    return result;
  }

  function placeNode(id: string): number /* center X */ {
    if (placed.has(id)) return (positions.get(id)?.x ?? 0) + NODE_WIDTH / 2;
    placed.add(id);

    const g        = gen.get(id) ?? 0;
    const children = p2c.get(id) || [];
    const spouses  = (spouseMap.get(id) || []).filter(s => !placed.has(s));

    if (!children.length) {
      const cx = xCursor + NODE_WIDTH / 2;
      positions.set(id, { x: xCursor, y: g * LEVEL_HEIGHT });
      xCursor += NODE_WIDTH + (spouses.length ? GAP_PARTNER : SIBLING_GAP);
      for (const sp of spouses) {
        placed.add(sp);
        positions.set(sp, { x: xCursor, y: (gen.get(sp) ?? 0) * LEVEL_HEIGHT });
        xCursor += NODE_WIDTH + SIBLING_GAP;
      }
      return cx;
    }

    const childCenters = children.map(c => placeNode(c));
    const childCenter  = (childCenters[0] + childCenters[childCenters.length - 1]) / 2;

    if (spouses.length) {
      const sp    = spouses[0];
      const pairW = NODE_WIDTH + GAP_PARTNER + NODE_WIDTH;
      const left  = childCenter - pairW / 2;
      positions.set(id, { x: left, y: g * LEVEL_HEIGHT });
      placed.add(sp);
      positions.set(sp, { x: left + NODE_WIDTH + GAP_PARTNER, y: (gen.get(sp) ?? 0) * LEVEL_HEIGHT });
      xCursor = Math.max(xCursor, left + pairW + SIBLING_GAP);
    } else {
      const nx = childCenter - NODE_WIDTH / 2;
      positions.set(id, { x: nx, y: g * LEVEL_HEIGHT });
      xCursor = Math.max(xCursor, nx + NODE_WIDTH + SIBLING_GAP);
    }
    return childCenter;
  }

  const allRoots = personIds.filter(id => !(c2p.get(id)?.length));
  for (const root of allRoots) { if (!placed.has(root)) placeNode(root); }
  for (const id of personIds) {
    if (!placed.has(id)) {
      positions.set(id, { x: xCursor, y: (gen.get(id) ?? 0) * LEVEL_HEIGHT });
      xCursor += NODE_WIDTH + SIBLING_GAP;
    }
  }

  return positions; // Map<personId, {x, y}>
}
