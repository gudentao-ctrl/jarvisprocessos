import type { FlowActivity, FlowConnection, FlowDecision } from "@/components/flow/FlowEditor";

/* FlowGraph — modelo lógico normalizado do fluxo.
 * Fonte de verdade: activities + connections + decisions.
 * Detecta back-edges (loops/retrabalho) via DFS a partir dos starts. */

export type FlowNode = {
  id: string;
  activity: FlowActivity;
  outs: FlowConnection[];
  ins: FlowConnection[];
};

export type FlowGraph = {
  nodes: Map<string, FlowNode>;
  activities: FlowActivity[];
  connections: FlowConnection[];
  decisions: Map<string, FlowDecision>;
  starts: string[];
  ends: string[];
  backEdges: Set<string>; // ids de conexões que fecham ciclos
};

export function buildFlowGraph(
  activities: FlowActivity[],
  connections: FlowConnection[],
  decisions: FlowDecision[],
): FlowGraph {
  const nodes = new Map<string, FlowNode>();
  for (const a of activities) {
    nodes.set(a.id, { id: a.id, activity: a, outs: [], ins: [] });
  }
  const validConns: FlowConnection[] = [];
  for (const c of connections) {
    const s = nodes.get(c.from_activity_id);
    const t = nodes.get(c.to_activity_id);
    if (!s || !t) continue;
    s.outs.push(c);
    t.ins.push(c);
    validConns.push(c);
  }
  // Ordenação estável por order_index para as saídas (labels Sim/Não coerentes)
  for (const n of nodes.values()) {
    n.outs.sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
  }

  const starts = activities.filter((a) => a.type === "start").map((a) => a.id);
  const ends = activities.filter((a) => a.type === "end").map((a) => a.id);
  // Se não houver start explícito, considera nós sem entrada.
  if (starts.length === 0) {
    for (const n of nodes.values()) if (n.ins.length === 0) starts.push(n.id);
  }

  // DFS para marcar back-edges
  const backEdges = new Set<string>();
  const color = new Map<string, 0 | 1 | 2>(); // 0=white,1=gray,2=black
  for (const id of nodes.keys()) color.set(id, 0);

  const stack: string[] = [];
  const visit = (u: string) => {
    color.set(u, 1);
    stack.push(u);
    for (const c of nodes.get(u)!.outs) {
      const v = c.to_activity_id;
      const cv = color.get(v);
      if (cv === 0) visit(v);
      else if (cv === 1) backEdges.add(c.id); // aresta que fecha ciclo
    }
    color.set(u, 2);
    stack.pop();
  };
  for (const s of starts) if (color.get(s) === 0) visit(s);
  // Cobre nós não alcançáveis
  for (const id of nodes.keys()) if (color.get(id) === 0) visit(id);

  // Reforço: tipo "return" sempre é back-edge
  for (const c of validConns) if (c.type === "return") backEdges.add(c.id);

  const decMap = new Map<string, FlowDecision>();
  for (const d of decisions) decMap.set(d.activity_id, d);

  return {
    nodes,
    activities,
    connections: validConns,
    decisions: decMap,
    starts,
    ends,
    backEdges,
  };
}

/** Retorna arestas "para frente" (exclui back-edges). */
export function forwardEdges(g: FlowGraph): FlowConnection[] {
  return g.connections.filter((c) => !g.backEdges.has(c.id));
}
