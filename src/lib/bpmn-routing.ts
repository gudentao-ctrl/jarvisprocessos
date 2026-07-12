/* Manhattan / orthogonal edge routing for BPMN.
 * Produz waypoints em segmentos horizontais e verticais, evitando
 * sobreposição com os retângulos das atividades e gateways. */

export type Box = { x: number; y: number; w: number; h: number };
export type Pt = { x: number; y: number };

const ELBOW_GAP = 24;        // distância horizontal padrão do "cotovelo"
const PARALLEL_SPACING = 8;  // offset entre múltiplas saídas de um mesmo nó
const NODE_CLEARANCE = 18;   // folga ao contornar um nó
const RETURN_DROP = 60;      // altura para caminho inferior de retrabalho

export type EdgeContext = {
  sourceIndex: number; // índice desta saída (0..n-1) do nó de origem
  sourceCount: number; // total de saídas do nó de origem
  targetIndex: number; // índice desta entrada do nó de destino
  targetCount: number;
  isReturn: boolean;   // conexão de retrabalho / back-edge
};

/** Roteia uma aresta em waypoints ortogonais Manhattan. */
export function routeOrthogonal(
  source: Box,
  target: Box,
  ctx: EdgeContext,
  allBoxes: Box[],
): Pt[] {
  const sxRight = source.x + source.w;
  const txLeft = target.x;

  // Ancoragem simétrica das saídas: se houver várias saídas, distribui em Y.
  const srcAnchorY = anchorY(source, ctx.sourceIndex, ctx.sourceCount);
  const tgtAnchorY = anchorY(target, ctx.targetIndex, ctx.targetCount);

  // Caso especial: back-edge / retorno → contornar por baixo.
  if (ctx.isReturn || target.x + target.w < source.x) {
    const bottom = Math.max(
      source.y + source.h,
      target.y + target.h,
      ...allBoxes.map((b) => b.y + b.h),
    ) + RETURN_DROP;
    const outX = sxRight + ELBOW_GAP;
    const inX = txLeft - ELBOW_GAP;
    return [
      { x: sxRight, y: srcAnchorY },
      { x: outX, y: srcAnchorY },
      { x: outX, y: bottom },
      { x: inX, y: bottom },
      { x: inX, y: tgtAnchorY },
      { x: txLeft, y: tgtAnchorY },
    ];
  }

  // Caso normal: elbow no meio, com offset por índice para não sobrepor.
  const offset = (ctx.sourceIndex - (ctx.sourceCount - 1) / 2) * PARALLEL_SPACING;
  const gap = Math.max(ELBOW_GAP, (txLeft - sxRight) / 2);
  const elbowX = sxRight + gap + offset;

  const pts: Pt[] = [
    { x: sxRight, y: srcAnchorY },
    { x: elbowX, y: srcAnchorY },
    { x: elbowX, y: tgtAnchorY },
    { x: txLeft, y: tgtAnchorY },
  ];

  // Se elbowX cai sobre uma caixa intermediária, empurra o cotovelo para fora.
  const adjusted = avoidBoxes(pts, allBoxes, source, target);
  return adjusted;
}

function anchorY(box: Box, index: number, count: number): number {
  if (count <= 1) return box.y + box.h / 2;
  const usable = Math.max(box.h - 12, 12);
  const step = usable / (count - 1);
  return box.y + 6 + index * step;
}

function avoidBoxes(pts: Pt[], boxes: Box[], src: Box, tgt: Box): Pt[] {
  if (pts.length < 4) return pts;
  const elbowX = pts[1].x;
  const yMin = Math.min(pts[1].y, pts[2].y);
  const yMax = Math.max(pts[1].y, pts[2].y);
  for (const b of boxes) {
    if (b === src || b === tgt) continue;
    const overlapsX = elbowX > b.x - NODE_CLEARANCE && elbowX < b.x + b.w + NODE_CLEARANCE;
    const overlapsY = yMax > b.y - NODE_CLEARANCE && yMin < b.y + b.h + NODE_CLEARANCE;
    if (overlapsX && overlapsY) {
      // Move o elbow para depois da caixa.
      const newX = b.x + b.w + NODE_CLEARANCE;
      return [pts[0], { x: newX, y: pts[0].y }, { x: newX, y: pts[3].y }, pts[3]];
    }
  }
  return pts;
}
