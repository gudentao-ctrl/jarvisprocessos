import dagre from "dagre";
import type { FlowActivity, FlowConnection, FlowDecision } from "@/components/flow/FlowEditor";
import { routeOrthogonal, type Box } from "./bpmn-routing";

/* ============================================================
 * Gerador de BPMN 2.0 XML a partir do Fluxo mestre.
 * - Layout dagre LR + refino (raias por Responsável)
 * - Roteamento ortogonal (Manhattan) com waypoints múltiplos
 * - Pool "Empresa" + LaneSet com uma raia por responsável
 * - Detecção implícita de gateways paralelos (AND)
 * ============================================================ */

export type BpmnBuildOptions = {
  processName?: string;
  companyName?: string;
  direction?: "LR" | "TB";
};

const NODE_W = 130;
const NODE_H = 76;
const GATEWAY = 50;
const EVENT = 36;
const LANE_TITLE_W = 30;
const LANE_PAD_Y = 24;
const LANE_MIN_H = 130;
const POOL_MARGIN = 40;

function nodeSize(type: string): { w: number; h: number } {
  if (type === "start" || type === "end") return { w: EVENT, h: EVENT };
  if (type === "decision") return { w: GATEWAY, h: GATEWAY };
  return { w: NODE_W, h: NODE_H };
}

function bpmnElementFor(type: string): string {
  switch (type) {
    case "start": return "startEvent";
    case "end": return "endEvent";
    case "decision": return "exclusiveGateway";
    case "approval": return "userTask";
    case "wait": return "receiveTask";
    default: return "task";
  }
}

function escapeXml(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function isParallelGateway(outs: FlowConnection[], ins: FlowConnection[]): boolean {
  const parOuts = outs.filter((c) => c.type === "parallel").length;
  const parIns = ins.filter((c) => c.type === "parallel").length;
  return parOuts >= 2 || parIns >= 2;
}

export function buildBpmnXml(
  activities: FlowActivity[],
  connections: FlowConnection[],
  decisions: FlowDecision[],
  opts: BpmnBuildOptions = {},
): { xml: string; laneCount: number; usedElements: Set<string> } {
  const direction = opts.direction ?? "LR";
  const processName = opts.processName ?? "Processo";
  const companyName = opts.companyName ?? "Empresa";

  // ---- Agrupamento por raia (responsável) ----
  const laneKeyOf = (a: FlowActivity) => (a.responsible?.trim() || "Não definido");
  const laneOrder: string[] = [];
  const laneMap = new Map<string, FlowActivity[]>();
  for (const a of [...activities].sort((x, y) => x.ordering - y.ordering)) {
    const key = laneKeyOf(a);
    if (!laneMap.has(key)) { laneMap.set(key, []); laneOrder.push(key); }
    laneMap.get(key)!.push(a);
  }

  // ---- Layout dagre ----
  const g = new dagre.graphlib.Graph();
  g.setGraph({
    rankdir: direction,
    nodesep: 70,
    ranksep: 110,
    edgesep: 30,
    marginx: 20,
    marginy: 20,
    align: "UL",
    ranker: "network-simplex",
  });
  g.setDefaultEdgeLabel(() => ({}));

  for (const a of activities) {
    const { w, h } = nodeSize(a.type);
    g.setNode(a.id, { width: w, height: h });
  }
  const actIds = new Set(activities.map((a) => a.id));
  // Detecta back-edges (return) para não distorcer o layout — dagre não aceita ciclos.
  const backEdges = new Set<string>();
  for (const c of connections) {
    if (!actIds.has(c.from_activity_id) || !actIds.has(c.to_activity_id)) continue;
    if (c.type === "return") {
      backEdges.add(c.id);
      continue;
    }
    g.setEdge(c.from_activity_id, c.to_activity_id, { minlen: 1 });
  }
  try { dagre.layout(g); } catch {
    // Se houver ciclo residual, tolera e usa posições padrão.
  }

  const positions = new Map<string, Box>();
  for (const a of activities) {
    const p: any = g.node(a.id) ?? { x: 0, y: 0 };
    const { w, h } = nodeSize(a.type);
    positions.set(a.id, { x: (p.x ?? 0) - w / 2, y: (p.y ?? 0) - h / 2, w, h });
  }

  // ---- Snap por raia: cada atividade fica no centro-Y da própria raia ----
  const laneRows = new Map<string, { top: number; bottom: number }>();
  laneOrder.forEach((k) => {
    const acts = laneMap.get(k)!;
    let top = Infinity, bottom = -Infinity;
    for (const a of acts) {
      const p = positions.get(a.id)!;
      if (p.y < top) top = p.y;
      if (p.y + p.h > bottom) bottom = p.y + p.h;
    }
    if (!isFinite(top)) { top = 0; bottom = LANE_MIN_H; }
    laneRows.set(k, { top: top - LANE_PAD_Y, bottom: bottom + LANE_PAD_Y });
  });

  const sortedLanes = [...laneOrder].sort((a, b) =>
    (laneRows.get(a)!.top) - (laneRows.get(b)!.top)
  );

  let cursorY = POOL_MARGIN;
  const laneBounds = new Map<string, { y: number; h: number }>();
  for (const key of sortedLanes) {
    const acts = laneMap.get(key)!;
    const r = laneRows.get(key)!;
    const h = Math.max(LANE_MIN_H, r.bottom - r.top);
    // Centro Y da raia
    const laneCenterY = cursorY + h / 2;
    for (const a of acts) {
      const p = positions.get(a.id)!;
      p.y = laneCenterY - p.h / 2;
    }
    laneBounds.set(key, { y: cursorY, h });
    cursorY += h;
  }

  // ---- Simetria por gateway: distribuir filhas em ±Y ao redor do gateway,
  //      mas somente quando todas as filhas caem na mesma raia. ----
  for (const a of activities) {
    if (a.type !== "decision") continue;
    const outs = connections.filter((c) => c.from_activity_id === a.id);
    if (outs.length < 2) continue;
    const gwLane = laneKeyOf(a);
    const targets = outs
      .map((c) => activities.find((x) => x.id === c.to_activity_id))
      .filter((t): t is FlowActivity => !!t && laneKeyOf(t) === gwLane);
    if (targets.length < 2) continue;
    const gwPos = positions.get(a.id)!;
    const centerY = gwPos.y + gwPos.h / 2;
    const spread = 45 * (targets.length - 1);
    targets.sort((t1, t2) => positions.get(t1.id)!.x - positions.get(t2.id)!.x);
    targets.forEach((t, i) => {
      const p = positions.get(t.id)!;
      const laneB = laneBounds.get(gwLane)!;
      const desired = centerY - spread / 2 + i * (spread / Math.max(1, targets.length - 1));
      // clamp dentro da raia
      const minY = laneB.y + 8;
      const maxY = laneB.y + laneB.h - p.h - 8;
      p.y = Math.min(maxY, Math.max(minY, desired - p.h / 2));
    });
  }

  // ---- Pool bounds ----
  const allX = [...positions.values()].map((p) => p.x);
  const allXe = [...positions.values()].map((p) => p.x + p.w);
  const poolX = POOL_MARGIN;
  const contentMinX = allX.length ? Math.min(...allX) : 100;
  const contentMaxX = allXe.length ? Math.max(...allXe) : 600;
  const contentWidth = contentMaxX - contentMinX;
  const poolW = LANE_TITLE_W + contentWidth + 80;
  const poolY = POOL_MARGIN;
  const poolH = cursorY - poolY;

  // Shift X para dentro da raia (após faixa do título)
  const xShift = poolX + LANE_TITLE_W + 30 - contentMinX;
  for (const p of positions.values()) p.x += xShift;

  // ---- Emit BPMN 2.0 XML ----
  const decisionByAct = new Map(decisions.map((d) => [d.activity_id, d.question]));
  const usedElements = new Set<string>();

  const processElems: string[] = [];
  const flowRefs: string[] = [];

  // laneSet
  const laneSetXml = sortedLanes.map((key) => {
    const acts = laneMap.get(key)!;
    return `      <bpmn:lane id="Lane_${slug(key)}" name="${escapeXml(key)}">
${acts.map((a) => `        <bpmn:flowNodeRef>Act_${a.id}</bpmn:flowNodeRef>`).join("\n")}
      </bpmn:lane>`;
  }).join("\n");

  // flow nodes
  for (const a of activities) {
    const outs = connections.filter((c) => c.from_activity_id === a.id);
    const ins = connections.filter((c) => c.to_activity_id === a.id);
    let elem = bpmnElementFor(a.type);
    if (a.type !== "decision" && a.type !== "start" && a.type !== "end") {
      if (isParallelGateway(outs, ins) && outs.length >= 2 && ins.length <= 1) {
        elem = "parallelGateway";
      }
    }
    usedElements.add(elem);
    const inFlows = ins.map((c) => `        <bpmn:incoming>Flow_${c.id}</bpmn:incoming>`).join("\n");
    const outFlows = outs.map((c) => `        <bpmn:outgoing>Flow_${c.id}</bpmn:outgoing>`).join("\n");
    const q = decisionByAct.get(a.id);
    const label = a.type === "decision" && q ? `${a.title} — ${q}` : a.title;

    processElems.push(
      `      <bpmn:${elem} id="Act_${a.id}" name="${escapeXml(label)}">
${inFlows}
${outFlows}
      </bpmn:${elem}>`
    );
  }

  // sequence flows
  for (const c of connections) {
    if (!positions.has(c.from_activity_id) || !positions.has(c.to_activity_id)) continue;
    const label = c.label ? ` name="${escapeXml(c.label)}"` : "";
    flowRefs.push(
      `      <bpmn:sequenceFlow id="Flow_${c.id}"${label} sourceRef="Act_${c.from_activity_id}" targetRef="Act_${c.to_activity_id}" />`
    );
  }

  // ---- BPMNDI ----
  const shapes: string[] = [];
  shapes.push(
    `      <bpmndi:BPMNShape id="Shape_Pool" bpmnElement="Participant_1" isHorizontal="true">
        <dc:Bounds x="${poolX}" y="${poolY}" width="${poolW}" height="${poolH}" />
      </bpmndi:BPMNShape>`
  );
  for (const key of sortedLanes) {
    const lb = laneBounds.get(key)!;
    shapes.push(
      `      <bpmndi:BPMNShape id="Shape_Lane_${slug(key)}" bpmnElement="Lane_${slug(key)}" isHorizontal="true">
        <dc:Bounds x="${poolX + LANE_TITLE_W}" y="${lb.y}" width="${poolW - LANE_TITLE_W}" height="${lb.h}" />
      </bpmndi:BPMNShape>`
    );
  }
  for (const a of activities) {
    const p = positions.get(a.id)!;
    shapes.push(
      `      <bpmndi:BPMNShape id="Shape_${a.id}" bpmnElement="Act_${a.id}">
        <dc:Bounds x="${round(p.x)}" y="${round(p.y)}" width="${p.w}" height="${p.h}" />
      </bpmndi:BPMNShape>`
    );
  }

  // ---- Roteamento ortogonal ----
  const allBoxes = [...positions.values()];
  // pré-computa índice de cada conexão dentro do source/target para ancoragem simétrica
  const outsByNode = new Map<string, FlowConnection[]>();
  const insByNode = new Map<string, FlowConnection[]>();
  for (const c of connections) {
    if (!outsByNode.has(c.from_activity_id)) outsByNode.set(c.from_activity_id, []);
    if (!insByNode.has(c.to_activity_id)) insByNode.set(c.to_activity_id, []);
    outsByNode.get(c.from_activity_id)!.push(c);
    insByNode.get(c.to_activity_id)!.push(c);
  }
  // ordena outs por Y do destino (para labels ficarem coerentes com posição)
  for (const arr of outsByNode.values()) {
    arr.sort((a, b) => {
      const pa = positions.get(a.to_activity_id);
      const pb = positions.get(b.to_activity_id);
      return (pa?.y ?? 0) - (pb?.y ?? 0);
    });
  }

  const edges: string[] = [];
  for (const c of connections) {
    const s = positions.get(c.from_activity_id);
    const t = positions.get(c.to_activity_id);
    if (!s || !t) continue;

    const sOuts = outsByNode.get(c.from_activity_id) ?? [c];
    const tIns = insByNode.get(c.to_activity_id) ?? [c];
    const sourceIndex = sOuts.findIndex((x) => x.id === c.id);
    const targetIndex = tIns.findIndex((x) => x.id === c.id);
    const isReturn = c.type === "return" || backEdges.has(c.id);

    const pts = routeOrthogonal(
      s, t,
      {
        sourceIndex: sourceIndex < 0 ? 0 : sourceIndex,
        sourceCount: sOuts.length,
        targetIndex: targetIndex < 0 ? 0 : targetIndex,
        targetCount: tIns.length,
        isReturn,
      },
      allBoxes,
    );

    const waypoints = pts
      .map((p) => `        <di:waypoint x="${round(p.x)}" y="${round(p.y)}" />`)
      .join("\n");

    edges.push(
      `      <bpmndi:BPMNEdge id="Edge_${c.id}" bpmnElement="Flow_${c.id}">
${waypoints}
      </bpmndi:BPMNEdge>`
    );
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  id="Definitions_1" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:collaboration id="Collaboration_1">
    <bpmn:participant id="Participant_1" name="${escapeXml(companyName + " — " + processName)}" processRef="Process_1" />
  </bpmn:collaboration>
  <bpmn:process id="Process_1" isExecutable="false">
    <bpmn:laneSet id="LaneSet_1">
${laneSetXml}
    </bpmn:laneSet>
${processElems.join("\n")}
${flowRefs.join("\n")}
  </bpmn:process>
  <bpmndi:BPMNDiagram id="Diagram_1">
    <bpmndi:BPMNPlane id="Plane_1" bpmnElement="Collaboration_1">
${shapes.join("\n")}
${edges.join("\n")}
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;

  return { xml, laneCount: sortedLanes.length, usedElements };
}

function round(n: number) { return Math.round(n * 10) / 10; }
function slug(s: string): string {
  return s.replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_|_$/g, "") || "x";
}
