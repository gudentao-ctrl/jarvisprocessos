import { useMemo } from "react";
import ReactFlow, {
  Background,
  Controls,
  MarkerType,
  type Edge,
  type Node,
} from "reactflow";
import "reactflow/dist/style.css";
import dagre from "dagre";
import type { FlowActivity, FlowConnection, FlowDecision } from "./FlowEditor";

/* Renderização automática BPMN-like (read-only) a partir do Fluxo mestre.
 * Formas:
 *  - start/end: círculo
 *  - decision: losango
 *  - parallel gateway: quadrado com "+"
 *  - task/approval/wait: retângulo arredondado
 */

const NODE_W = 170;
const NODE_H = 60;
const GATEWAY = 60;

type Shape = "circle" | "diamond" | "rect" | "gateway";

function shapeFor(type: string): Shape {
  if (type === "start" || type === "end") return "circle";
  if (type === "decision") return "diamond";
  return "rect";
}

function styleFor(type: string): string {
  switch (type) {
    case "start":
      return "bg-emerald-100 border-emerald-500 text-emerald-900";
    case "end":
      return "bg-rose-100 border-rose-500 text-rose-900";
    case "decision":
      return "bg-amber-100 border-amber-500 text-amber-900";
    case "approval":
      return "bg-blue-100 border-blue-500 text-blue-900";
    case "wait":
      return "bg-slate-100 border-slate-400 text-slate-900";
    default:
      return "bg-white border-primary/60 text-foreground";
  }
}

function layout(nodes: Node[], edges: Edge[]): Node[] {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: "TB", nodesep: 50, ranksep: 70, marginx: 20, marginy: 20 });
  g.setDefaultEdgeLabel(() => ({}));
  nodes.forEach((n) => {
    const w = n.data?.shape === "diamond" ? GATEWAY : NODE_W;
    const h = n.data?.shape === "diamond" ? GATEWAY : NODE_H;
    g.setNode(n.id, { width: w, height: h });
  });
  edges.forEach((e) => g.setEdge(e.source, e.target));
  dagre.layout(g);
  return nodes.map((n) => {
    const p = g.node(n.id);
    const w = n.data?.shape === "diamond" ? GATEWAY : NODE_W;
    const h = n.data?.shape === "diamond" ? GATEWAY : NODE_H;
    return { ...n, position: { x: p.x - w / 2, y: p.y - h / 2 } };
  });
}

export function FlowBpmnPreview({
  activities,
  connections,
  decisions,
}: {
  activities: FlowActivity[];
  connections: FlowConnection[];
  decisions: FlowDecision[];
}) {
  const { nodes, edges } = useMemo(() => {
    const decByAct = new Map(decisions.map((d) => [d.activity_id, d.question]));
    const rawNodes: Node[] = activities.map((a) => {
      const shape = shapeFor(a.type);
      const isCircle = shape === "circle";
      const isDiamond = shape === "diamond";
      const question = decByAct.get(a.id);
      return {
        id: a.id,
        position: { x: 0, y: 0 },
        data: { shape, label: a.title, sub: isDiamond ? question ?? "" : a.responsible ?? "" },
        type: "default",
        draggable: false,
        selectable: false,
        connectable: false,
        style: isDiamond
          ? { width: GATEWAY, height: GATEWAY, borderRadius: 0, transform: "rotate(45deg)" }
          : isCircle
            ? { width: NODE_H, height: NODE_H, borderRadius: "50%" }
            : { width: NODE_W, minHeight: NODE_H, borderRadius: 8 },
        className: `border-2 shadow-sm text-xs font-medium ${styleFor(a.type)}`,
      };
    });

    const rawEdges: Edge[] = connections.map((c) => {
      const color =
        c.type === "decision"
          ? "hsl(43 96% 50%)"
          : c.type === "parallel"
            ? "hsl(217 91% 60%)"
            : c.type === "return"
              ? "hsl(0 84% 60%)"
              : c.type === "subprocess"
                ? "hsl(270 80% 60%)"
                : "hsl(215 20% 50%)";
      return {
        id: c.id,
        source: c.from_activity_id,
        target: c.to_activity_id,
        label: c.label || undefined,
        type: c.type === "return" ? "step" : "smoothstep",
        animated: c.type === "return",
        style: { stroke: color, strokeWidth: 1.5, strokeDasharray: c.type === "parallel" ? "4 3" : undefined },
        labelStyle: { fill: color, fontSize: 10, fontWeight: 600 },
        labelBgStyle: { fill: "hsl(var(--background))" },
        markerEnd: { type: MarkerType.ArrowClosed, color },
      };
    });

    return { nodes: layout(rawNodes, rawEdges), edges: rawEdges };
  }, [activities, connections, decisions]);

  if (activities.length === 0) {
    return (
      <div className="rounded-lg border-2 border-dashed p-8 text-center text-sm text-muted-foreground">
        Nenhuma atividade no fluxo. Adicione atividades na aba <b>Fluxo</b>.
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-background bpmn-preview" style={{ height: "70vh" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnScroll
        zoomOnPinch
        proOptions={{ hideAttribution: true }}
      >
        <Background />
        <Controls showInteractive={false} />
      </ReactFlow>
      <style>{`
        .bpmn-preview .react-flow__node-default > div {
          display: none;
        }
        .bpmn-preview .react-flow__node-default::before {
          content: attr(data-label);
        }
      `}</style>
    </div>
  );
}
