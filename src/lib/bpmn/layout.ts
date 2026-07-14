import type { FlowGraph } from "./graph";
import { forwardEdges } from "./graph";
import { rankNodes, ranksToLayers } from "./ranking";
import { computeLanes, type Lanes } from "./lanes";

/* Layout engine.
 * X = rank * RANK_GAP (colunas alinhadas).
 * Y = por raia + ordenação intra-rank por barycenter (reduz cruzamentos).
 * Pós-processo: centraliza gateways entre filhos; alinha eventos start/end;
 * simetria de decisões. */

export type Box = { x: number; y: number; w: number; h: number };

export const RANK_GAP = 150;
export const NODE_W = 130;
export const NODE_H = 76;
export const GATEWAY = 50;
export const EVENT = 36;
export const LANE_PAD_Y = 24;
export const LANE_MIN_H = 130;
export const LANE_TITLE_W = 30;
export const POOL_MARGIN = 40;
export const NODE_V_GAP = 32;

export function nodeSize(type: string): { w: number; h: number } {
  if (type === "start" || type === "end") return { w: EVENT, h: EVENT };
  if (type === "decision") return { w: GATEWAY, h: GATEWAY };
  return { w: NODE_W, h: NODE_H };
}

export type LayoutResult = {
  positions: Map<string, Box>;
  lanes: Lanes;
  rank: Map<string, number>;
  laneBounds: Map<string, { y: number; h: number }>;
  poolBounds: { x: number; y: number; w: number; h: number };
};

export function layoutFlow(g: FlowGraph): LayoutResult {
  const rank = rankNodes(g);
  const layers = ranksToLayers(rank);
  const lanes = computeLanes(g);

  // 1) Ordenação intra-rank por barycenter (2 passes) para reduzir cruzamentos
  const orderInLayer = new Map<string, number>();
  const fwd = forwardEdges(g);
  const preds = new Map<string, string[]>();
  for (const id of g.nodes.keys()) preds.set(id, []);
  for (const c of fwd) preds.get(c.to_activity_id)!.push(c.from_activity_id);

  // Inicializa cada layer pela ordem original de atividades (ordering)
  const orderingOf = new Map<string, number>();
  for (const a of g.activities) orderingOf.set(a.id, a.ordering ?? 0);
  layers.forEach((layer) => {
    layer.sort((a, b) => (orderingOf.get(a) ?? 0) - (orderingOf.get(b) ?? 0));
    layer.forEach((id, i) => orderInLayer.set(id, i));
  });
  // Barycenter passes
  for (let pass = 0; pass < 4; pass++) {
    for (let r = 1; r < layers.length; r++) {
      const layer = layers[r];
      const bary = new Map<string, number>();
      for (const id of layer) {
        const ps = preds.get(id) ?? [];
        if (ps.length === 0) bary.set(id, orderInLayer.get(id) ?? 0);
        else bary.set(id, ps.reduce((s, p) => s + (orderInLayer.get(p) ?? 0), 0) / ps.length);
      }
      layer.sort((a, b) => (bary.get(a) ?? 0) - (bary.get(b) ?? 0));
      layer.forEach((id, i) => orderInLayer.set(id, i));
    }
  }

  // 2) Atribuição de X por rank
  const positions = new Map<string, Box>();
  for (let r = 0; r < layers.length; r++) {
    for (const id of layers[r]) {
      const a = g.nodes.get(id)!.activity;
      const { w, h } = nodeSize(a.type);
      // Centraliza X na coluna do rank (usa o maior width por rank)
      const x = POOL_MARGIN + LANE_TITLE_W + 40 + r * RANK_GAP + (NODE_W - w) / 2;
      positions.set(id, { x, y: 0, w, h });
    }
  }

  // 3) Y por raia
  // Para cada raia, empilha suas atividades ordenadas por rank e depois por orderInLayer
  const laneBounds = new Map<string, { y: number; h: number }>();
  let cursorY = POOL_MARGIN;

  for (const key of lanes.order) {
    const ids = lanes.members.get(key) ?? [];
    if (ids.length === 0) {
      laneBounds.set(key, { y: cursorY, h: LANE_MIN_H });
      cursorY += LANE_MIN_H;
      continue;
    }
    // Agrupa por rank
    const byRank = new Map<number, string[]>();
    for (const id of ids) {
      const r = rank.get(id) ?? 0;
      if (!byRank.has(r)) byRank.set(r, []);
      byRank.get(r)!.push(id);
    }
    // Altura da raia: maior stack entre ranks
    let maxStack = 0;
    for (const arr of byRank.values()) {
      arr.sort((a, b) => (orderInLayer.get(a) ?? 0) - (orderInLayer.get(b) ?? 0));
      const total = arr.reduce((s, id) => s + positions.get(id)!.h + NODE_V_GAP, -NODE_V_GAP);
      if (total > maxStack) maxStack = total;
    }
    const laneH = Math.max(LANE_MIN_H, maxStack + LANE_PAD_Y * 2);
    const laneY = cursorY;

    for (const [_r, arr] of byRank) {
      const total = arr.reduce((s, id) => s + positions.get(id)!.h + NODE_V_GAP, -NODE_V_GAP);
      let y = laneY + (laneH - total) / 2;
      for (const id of arr) {
        const p = positions.get(id)!;
        p.y = y;
        y += p.h + NODE_V_GAP;
      }
    }
    laneBounds.set(key, { y: laneY, h: laneH });
    cursorY += laneH;
  }

  // 4) Simetria de gateways: centraliza gateway entre suas filhas quando na mesma raia
  for (const a of g.activities) {
    if (a.type !== "decision") continue;
    const gwLane = lanes.laneOf.get(a.id);
    const outs = g.nodes.get(a.id)!.outs.filter((c) => !g.backEdges.has(c.id));
    const targets = outs
      .map((c) => c.to_activity_id)
      .filter((tid) => lanes.laneOf.get(tid) === gwLane);
    if (targets.length < 2) continue;
    const ys = targets.map((tid) => {
      const p = positions.get(tid)!;
      return p.y + p.h / 2;
    });
    const centerY = ys.reduce((a2, b) => a2 + b, 0) / ys.length;
    const p = positions.get(a.id)!;
    const laneB = laneBounds.get(gwLane!)!;
    const minY = laneB.y + 8;
    const maxY = laneB.y + laneB.h - p.h - 8;
    p.y = Math.min(maxY, Math.max(minY, centerY - p.h / 2));
  }

  // 5) Alinha start com o próximo nó, end com o anterior — verticalmente
  for (const a of g.activities) {
    if (a.type !== "start" && a.type !== "end") continue;
    const neighborIds =
      a.type === "start"
        ? g.nodes.get(a.id)!.outs.map((c) => c.to_activity_id)
        : g.nodes.get(a.id)!.ins.map((c) => c.from_activity_id);
    if (neighborIds.length === 0) continue;
    const np = positions.get(neighborIds[0]);
    if (!np) continue;
    const p = positions.get(a.id)!;
    const laneB = laneBounds.get(lanes.laneOf.get(a.id)!)!;
    const desired = np.y + np.h / 2 - p.h / 2;
    p.y = Math.min(laneB.y + laneB.h - p.h - 8, Math.max(laneB.y + 8, desired));
  }

  // 6) Pool bounds
  const xs = [...positions.values()];
  const minX = xs.length ? Math.min(...xs.map((p) => p.x)) : POOL_MARGIN;
  const maxX = xs.length ? Math.max(...xs.map((p) => p.x + p.w)) : POOL_MARGIN + 400;
  const poolX = POOL_MARGIN;
  const poolY = POOL_MARGIN;
  const poolW = maxX - poolX + 60;
  const poolH = cursorY - poolY;

  // ajusta minX para caber margin interno
  const shiftX = poolX + LANE_TITLE_W + 30 - minX;
  if (shiftX !== 0) {
    for (const p of positions.values()) p.x += shiftX;
  }

  return {
    positions,
    lanes,
    rank,
    laneBounds,
    poolBounds: { x: poolX, y: poolY, w: poolW, h: poolH },
  };
}
