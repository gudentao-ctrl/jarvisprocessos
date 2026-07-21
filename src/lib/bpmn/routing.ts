import type { Box } from "./layout";

/* Roteador ortogonal (Manhattan) com escolha automática de porta.
 * Objetivos:
 *  - Gateways com múltiplas saídas em raias diferentes: cada saída ganha
 *    um "canal" vertical próprio, evitando sobreposição.
 *  - Nunca cruzar caixas: quando o cotovelo colide com uma atividade,
 *    procura o próximo corredor livre.
 *  - Back-edges por baixo do desenho. */

export type Pt = { x: number; y: number };

export type Port = "L" | "R" | "T" | "B";

export type EdgeCtx = {
  sourceIndex: number;
  sourceCount: number;
  targetIndex: number;
  targetCount: number;
  isReturn: boolean;
};

const CLEAR = 24;
const RETURN_DROP = 70;
const CHANNEL = 18;

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
function chooseSides(s: Box, t: Box, ctx: EdgeCtx): { sp: Port; tp: Port } {
  if (ctx.isReturn) return { sp: "B", tp: "B" };
  const sMidX = s.x + s.w / 2;
  const tMidX = t.x + t.w / 2;
  const sMidY = s.y + s.h / 2;
  const tMidY = t.y + t.h / 2;
  const dy = tMidY - sMidY;
  const targetIsRight = tMidX >= sMidX + s.w / 2;
  const verticallyFar = Math.abs(dy) > (s.h + t.h) / 2 + 8;

  if (targetIsRight) {
    // Fan-out vertical: se o gateway tem várias saídas e o alvo está em outra
    // raia, sai por baixo/topo para não sobrepor a saída horizontal principal.
    if (ctx.sourceCount > 1 && verticallyFar) {
      return { sp: dy > 0 ? "B" : "T", tp: "L" };
    }
    return { sp: "R", tp: "L" };
  }
  // Alvo à esquerda ou sobreposto: contorna por cima/baixo
  if (verticallyFar) {
    return dy > 0 ? { sp: "B", tp: "T" } : { sp: "T", tp: "B" };
  }
  return { sp: "L", tp: "R" };
}

export function routeEdge(
  source: Box,
  target: Box,
  ctx: EdgeCtx,
  allBoxes: Box[],
): Pt[] {
  const { sp, tp } = chooseSides(source, target, ctx);

  const sPt = anchor(source, sp, ctx.sourceIndex, ctx.sourceCount);
  const tPt = anchor(target, tp, ctx.targetIndex, ctx.targetCount);

  // Back-edge / retorno: contorna por baixo de todo o desenho
  if (ctx.isReturn) {
    const bottom = Math.max(
      source.y + source.h,
      target.y + target.h,
      ...allBoxes.map((b) => b.y + b.h),
    ) + RETURN_DROP;
    return [sPt, { x: sPt.x, y: bottom }, { x: tPt.x, y: bottom }, tPt];
  }

  // Offset de canal por sourceIndex (fan-out simétrico)
  const half = (ctx.sourceCount - 1) / 2;
  const channelOff = (ctx.sourceIndex - half) * CHANNEL;

  // R -> L : Z-shape horizontal
  if (sp === "R" && tp === "L") {
    const rawElbow = (sPt.x + tPt.x) / 2 + channelOff;
    const elbowX = findFreeVerticalX(rawElbow, sPt.y, tPt.y, allBoxes, source, target);
    return [sPt, { x: elbowX, y: sPt.y }, { x: elbowX, y: tPt.y }, tPt];
  }

  // B/T -> L : saída vertical do gateway até canal comum, depois horizontal, depois entra no alvo
  if ((sp === "B" || sp === "T") && tp === "L") {
    const dropDir = sp === "B" ? 1 : -1;
    const rawChannelY =
      sp === "B"
        ? Math.max(source.y + source.h, tPt.y) + CLEAR + Math.abs(channelOff)
        : Math.min(source.y, tPt.y) - CLEAR - Math.abs(channelOff);
    const channelY = findFreeHorizontalY(rawChannelY, sPt.x, tPt.x - CLEAR, allBoxes, source, target, dropDir);
    return [
      sPt,
      { x: sPt.x, y: channelY },
      { x: tPt.x - CLEAR, y: channelY },
      { x: tPt.x - CLEAR, y: tPt.y },
      tPt,
    ];
  }

  // L -> R : alvo à esquerda mesma altura — contorna por cima
  if (sp === "L" && tp === "R") {
    const top = Math.min(source.y, target.y) - CLEAR - Math.abs(channelOff);
    return [
      sPt,
      { x: sPt.x - CLEAR, y: sPt.y },
      { x: sPt.x - CLEAR, y: top },
      { x: tPt.x + CLEAR, y: top },
      { x: tPt.x + CLEAR, y: tPt.y },
      tPt,
    ];
  }

  // B <-> T (vertical entre raias)
  if ((sp === "B" && tp === "T") || (sp === "T" && tp === "B")) {
    const midY = (sPt.y + tPt.y) / 2 + channelOff;
    return [sPt, { x: sPt.x, y: midY }, { x: tPt.x, y: midY }, tPt];
  }

  return [sPt, { x: tPt.x, y: sPt.y }, tPt];
}

/** Procura corredor vertical livre próximo a `x` que não corte nenhuma caixa
 *  entre y1 e y2. Se `x` estiver dentro de uma caixa, desloca para a direita
 *  ou esquerda em passos de CLEAR até achar espaço. */
function findFreeVerticalX(
  x: number,
  y1: number,
  y2: number,
  boxes: Box[],
  src: Box,
  tgt: Box,
): number {
  const yMin = Math.min(y1, y2) - 4;
  const yMax = Math.max(y1, y2) + 4;
  const hits = (candX: number) => {
    for (const b of boxes) {
      if (b === src || b === tgt) continue;
      const withinX = candX > b.x - CLEAR && candX < b.x + b.w + CLEAR;
      const withinY = yMax > b.y - 4 && yMin < b.y + b.h + 4;
      if (withinX && withinY) return b;
    }
    return null;
  };
  if (!hits(x)) return x;
  // tenta deslocar em ambos os sentidos
  for (let d = CLEAR; d < 800; d += CLEAR) {
    const right = x + d;
    if (!hits(right)) return right;
    const left = x - d;
    if (!hits(left)) return left;
  }
  return x;
}

/** Procura corredor horizontal livre em torno de `y` entre x1 e x2. */
function findFreeHorizontalY(
  y: number,
  x1: number,
  x2: number,
  boxes: Box[],
  src: Box,
  tgt: Box,
  dir: number,
): number {
  const xMin = Math.min(x1, x2) - 4;
  const xMax = Math.max(x1, x2) + 4;
  const hits = (candY: number) => {
    for (const b of boxes) {
      if (b === src || b === tgt) continue;
      const withinY = candY > b.y - CLEAR && candY < b.y + b.h + CLEAR;
      const withinX = xMax > b.x - 4 && xMin < b.x + b.w + 4;
      if (withinY && withinX) return b;
    }
    return null;
  };
  if (!hits(y)) return y;
  for (let d = CLEAR; d < 800; d += CLEAR) {
    const cand = y + dir * d;
    if (!hits(cand)) return cand;
  }
  return y;
}
