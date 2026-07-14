import type { Box } from "./layout";

/* Roteador ortogonal (Manhattan) com escolha automática de porta.
 * Cada aresta produz waypoints com segmentos horizontais/verticais,
 * evitando cruzamentos com caixas intermediárias e usando back-edge
 * para conexões de retorno (loops). */

export type Pt = { x: number; y: number };

export type Port = "L" | "R" | "T" | "B";

export type EdgeCtx = {
  sourceIndex: number;
  sourceCount: number;
  targetIndex: number;
  targetCount: number;
  isReturn: boolean;
};

const CLEAR = 20;
const RETURN_DROP = 70;
const PARALLEL_SPACING = 10;

function anchor(box: Box, port: Port, idx: number, count: number): Pt {
  const usable = Math.max((port === "L" || port === "R" ? box.h : box.w) - 12, 12);
  const step = count > 1 ? usable / (count - 1) : 0;
  const off = count > 1 ? -usable / 2 + idx * step : 0;
  switch (port) {
    case "L": return { x: box.x, y: box.y + box.h / 2 + off };
    case "R": return { x: box.x + box.w, y: box.y + box.h / 2 + off };
    case "T": return { x: box.x + box.w / 2 + off, y: box.y };
    case "B": return { x: box.x + box.w / 2 + off, y: box.y + box.h };
  }
}

/** Escolhe portas ideais para source/target dado posicionamento relativo. */
function chooseSides(s: Box, t: Box, isReturn: boolean): { sp: Port; tp: Port } {
  if (isReturn) return { sp: "B", tp: "B" };
  const sMidX = s.x + s.w / 2;
  const tMidX = t.x + t.w / 2;
  const sMidY = s.y + s.h / 2;
  const tMidY = t.y + t.h / 2;
  // Fluxo esquerda→direita por padrão
  if (tMidX >= sMidX + s.w / 2) return { sp: "R", tp: "L" };
  // Alvo à esquerda: usa top/bottom conforme posição vertical
  if (Math.abs(tMidY - sMidY) > (s.h + t.h) / 2) {
    return sMidY < tMidY ? { sp: "B", tp: "T" } : { sp: "T", tp: "B" };
  }
  return { sp: "L", tp: "R" };
}

export function routeEdge(
  source: Box,
  target: Box,
  ctx: EdgeCtx,
  allBoxes: Box[],
): Pt[] {
  const { sp, tp } = chooseSides(source, target, ctx.isReturn);

  const sPt = anchor(source, sp, ctx.sourceIndex, ctx.sourceCount);
  const tPt = anchor(target, tp, ctx.targetIndex, ctx.targetCount);

  // Back-edge / retorno: contorna por baixo
  if (ctx.isReturn) {
    const bottom = Math.max(
      source.y + source.h,
      target.y + target.h,
      ...allBoxes.map((b) => b.y + b.h),
    ) + RETURN_DROP;
    const p1: Pt = { x: sPt.x, y: sPt.y };
    const p2: Pt = { x: sPt.x, y: bottom };
    const p3: Pt = { x: tPt.x, y: bottom };
    const p4: Pt = { x: tPt.x, y: tPt.y };
    return [p1, p2, p3, p4];
  }

  // Roteamento padrão: L-shaped ou Z-shaped conforme portas
  const offset = (ctx.sourceIndex - (ctx.sourceCount - 1) / 2) * PARALLEL_SPACING;

  if (sp === "R" && tp === "L") {
    const elbowX = (sPt.x + tPt.x) / 2 + offset;
    const adj = avoidElbow(elbowX, sPt.y, tPt.y, allBoxes, source, target);
    return [sPt, { x: adj, y: sPt.y }, { x: adj, y: tPt.y }, tPt];
  }
  if (sp === "L" && tp === "R") {
    // Alvo à esquerda mas mesma altura — contorna por cima
    const top = Math.min(source.y, target.y) - CLEAR - Math.abs(offset);
    return [sPt, { x: sPt.x - CLEAR, y: sPt.y }, { x: sPt.x - CLEAR, y: top }, { x: tPt.x + CLEAR, y: top }, { x: tPt.x + CLEAR, y: tPt.y }, tPt];
  }
  if (sp === "B" && tp === "T") {
    const midY = (sPt.y + tPt.y) / 2 + offset;
    return [sPt, { x: sPt.x, y: midY }, { x: tPt.x, y: midY }, tPt];
  }
  if (sp === "T" && tp === "B") {
    const midY = (sPt.y + tPt.y) / 2 + offset;
    return [sPt, { x: sPt.x, y: midY }, { x: tPt.x, y: midY }, tPt];
  }
  // Fallback
  return [sPt, { x: tPt.x, y: sPt.y }, tPt];
}

function avoidElbow(elbowX: number, y1: number, y2: number, boxes: Box[], src: Box, tgt: Box): number {
  const yMin = Math.min(y1, y2);
  const yMax = Math.max(y1, y2);
  for (const b of boxes) {
    if (b === src || b === tgt) continue;
    const withinX = elbowX > b.x - CLEAR && elbowX < b.x + b.w + CLEAR;
    const withinY = yMax > b.y - CLEAR && yMin < b.y + b.h + CLEAR;
    if (withinX && withinY) {
      return b.x + b.w + CLEAR;
    }
  }
  return elbowX;
}
