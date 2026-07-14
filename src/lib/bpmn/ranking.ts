import { forwardEdges, type FlowGraph } from "./graph";

/* Longest-path layering: rank(v) = 1 + max(rank(u)) para todo u→v (forward edges).
 * Starts em rank 0. End alinhado ao maior rank. */

export function rankNodes(g: FlowGraph): Map<string, number> {
  const rank = new Map<string, number>();
  const fwd = forwardEdges(g);
  const outAdj = new Map<string, string[]>();
  const inAdj = new Map<string, string[]>();
  for (const n of g.nodes.keys()) {
    outAdj.set(n, []);
    inAdj.set(n, []);
  }
  for (const c of fwd) {
    outAdj.get(c.from_activity_id)!.push(c.to_activity_id);
    inAdj.get(c.to_activity_id)!.push(c.from_activity_id);
  }
  // Topological order via Kahn
  const indeg = new Map<string, number>();
  for (const [id, arr] of inAdj) indeg.set(id, arr.length);
  const queue: string[] = [];
  for (const [id, d] of indeg) if (d === 0) queue.push(id);
  for (const id of queue) rank.set(id, 0);

  while (queue.length) {
    const u = queue.shift()!;
    const ru = rank.get(u) ?? 0;
    for (const v of outAdj.get(u)!) {
      const rv = Math.max(rank.get(v) ?? 0, ru + 1);
      rank.set(v, rv);
      const nd = (indeg.get(v) ?? 0) - 1;
      indeg.set(v, nd);
      if (nd === 0) queue.push(v);
    }
  }
  // Nós não alcançáveis: fallback rank 0
  for (const id of g.nodes.keys()) if (!rank.has(id)) rank.set(id, 0);

  // Alinhar todos "end" ao maior rank
  const maxRank = Math.max(0, ...rank.values());
  for (const endId of g.ends) rank.set(endId, maxRank);

  return rank;
}

/** Agrupa nós por rank em ordem crescente. */
export function ranksToLayers(rank: Map<string, number>): string[][] {
  const layers: string[][] = [];
  for (const [id, r] of rank) {
    if (!layers[r]) layers[r] = [];
    layers[r].push(id);
  }
  return layers.map((l) => l ?? []);
}
