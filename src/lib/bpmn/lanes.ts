import type { FlowGraph } from "./graph";
import { forwardEdges } from "./graph";

/* Agrupa atividades em raias por responsável, na ordem de aparição
 * a partir dos starts (BFS em forward edges). "Não definido" no fim. */

export type Lanes = {
  order: string[]; // chaves das raias em ordem de exibição
  members: Map<string, string[]>; // key -> [activityId]
  laneOf: Map<string, string>; // activityId -> key
};

const UNDEFINED_LANE = "Não definido";

export function computeLanes(g: FlowGraph): Lanes {
  const keyOf = (id: string) => {
    const a = g.nodes.get(id)!.activity;
    if (a.type === "start" || a.type === "end") return null; // eventos ficam na raia da primeira/última atividade
    const r = (a.responsible ?? "").trim();
    return r || UNDEFINED_LANE;
  };

  const order: string[] = [];
  const seen = new Set<string>();
  const push = (key: string | null) => {
    if (!key) return;
    if (seen.has(key)) return;
    seen.add(key);
    order.push(key);
  };

  // BFS a partir dos starts para descobrir a ordem natural de aparição
  const fwd = forwardEdges(g);
  const adj = new Map<string, string[]>();
  for (const id of g.nodes.keys()) adj.set(id, []);
  for (const c of fwd) adj.get(c.from_activity_id)!.push(c.to_activity_id);

  const visited = new Set<string>();
  const queue: string[] = [...g.starts];
  while (queue.length) {
    const u = queue.shift()!;
    if (visited.has(u)) continue;
    visited.add(u);
    push(keyOf(u));
    for (const v of adj.get(u) ?? []) if (!visited.has(v)) queue.push(v);
  }
  // Nós não alcançáveis pelos starts
  for (const id of g.nodes.keys()) if (!visited.has(id)) push(keyOf(id));

  // Garante que "Não definido", se existir, fique por último
  const idx = order.indexOf(UNDEFINED_LANE);
  if (idx >= 0) {
    order.splice(idx, 1);
    order.push(UNDEFINED_LANE);
  }
  if (order.length === 0) order.push(UNDEFINED_LANE);

  // Atribui cada atividade a uma raia; eventos start/end herdam vizinho
  const laneOf = new Map<string, string>();
  const members = new Map<string, string[]>();
  for (const k of order) members.set(k, []);

  for (const a of g.activities) {
    let k = keyOf(a.id);
    if (!k) {
      // start → raia do primeiro sucessor; end → raia do primeiro predecessor
      const neighbors =
        a.type === "start"
          ? g.nodes.get(a.id)!.outs.map((c) => c.to_activity_id)
          : g.nodes.get(a.id)!.ins.map((c) => c.from_activity_id);
      for (const nid of neighbors) {
        const nk = keyOf(nid);
        if (nk) { k = nk; break; }
      }
      if (!k) k = order[0];
    }
    if (!members.has(k)) { members.set(k, []); order.push(k); }
    members.get(k)!.push(a.id);
    laneOf.set(a.id, k);
  }

  return { order, members, laneOf };
}
