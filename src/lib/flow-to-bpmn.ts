import dagre from "dagre";
import type { FlowActivity, FlowConnection, FlowDecision } from "@/components/flow/FlowEditor";

/* ============================================================
 * Gerador de BPMN 2.0 XML a partir do Fluxo mestre.
 * Faz layout via dagre e emite Collaboration + Participant + LaneSet
 * com raias por Responsável.
 * ============================================================ */

export type BpmnBuildOptions = {
  processName?: string;
  companyName?: string;
  direction?: "LR" | "TB";
};

const NODE_W = 120;
const NODE_H = 80;
const GATEWAY = 50;
const EVENT = 36;
const LANE_TITLE_W = 30;
const LANE_PAD_Y = 20;
const LANE_MIN_H = 140;

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

function isParallelGateway(activity: FlowActivity, outs: FlowConnection[], ins: FlowConnection[]): boolean {
  // implicit AND: activity has multiple parallel outgoing or incoming
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

  // Group activities into lanes by responsible
  const laneKeyOf = (a: FlowActivity) => (a.responsible?.trim() || "Não definido");
  const laneOrder: string[] = [];
  const laneMap = new Map<string, FlowActivity[]>();
  for (const a of [...activities].sort((x, y) => x.ordering - y.ordering)) {
    const key = laneKeyOf(a);
    if (!laneMap.has(key)) { laneMap.set(key, []); laneOrder.push(key); }
    laneMap.get(key)!.push(a);
  }

  // Build dagre graph with lane-aware ranks (lane -> row)
  const g = new dagre.graphlib.Graph({ compound: true });
  g.setGraph({
    rankdir: direction,
    nodesep: 50,
    ranksep: 90,
    marginx: 30,
    marginy: 30,
  });
  g.setDefaultEdgeLabel(() => ({}));

  for (const a of activities) {
    const { w, h } = nodeSize(a.type);
    g.setNode(a.id, { width: w, height: h });
  }
  for (const c of connections) {
    if (!activities.find((a) => a.id === c.from_activity_id)) continue;
    if (!activities.find((a) => a.id === c.to_activity_id)) continue;
    g.setEdge(c.from_activity_id, c.to_activity_id, {
      minlen: c.type === "return" ? 1 : 1,
    });
  }
  dagre.layout(g);

  // Compute lane boxes: each lane spans full width; y = stacked
  const positions = new Map<string, { x: number; y: number; w: number; h: number }>();
  activities.forEach((a) => {
    const p = g.node(a.id);
    const { w, h } = nodeSize(a.type);
    positions.set(a.id, { x: p.x - w / 2, y: p.y - h / 2, w, h });
  });

  // Recompute lane vertical positions: place lane rows based on activities they contain.
  // Rearrange y so each lane's activities cluster on their lane row.
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

  // Normalize: sort lanes by their current top, then stack them vertically without overlap
  const sortedLanes = [...laneOrder].sort((a, b) =>
    (laneRows.get(a)!.top) - (laneRows.get(b)!.top)
  );
  let cursorY = 40;
  const laneBounds = new Map<string, { y: number; h: number }>();
  for (const key of sortedLanes) {
    const r = laneRows.get(key)!;
    const h = Math.max(LANE_MIN_H, r.bottom - r.top);
    const shift = cursorY - r.top;
    // shift all activities in that lane by `shift`
    const acts = laneMap.get(key)!;
    for (const a of acts) {
      const p = positions.get(a.id)!;
      p.y += shift;
    }
    laneBounds.set(key, { y: cursorY, h });
    cursorY += h;
  }

  // Compute pool bounds
  const allX = [...positions.values()].map((p) => p.x);
  const allXe = [...positions.values()].map((p) => p.x + p.w);
  const poolX = 40;
  const contentMinX = allX.length ? Math.min(...allX) : 100;
  const contentMaxX = allXe.length ? Math.max(...allXe) : 600;
  const contentWidth = contentMaxX - contentMinX;
  const poolW = LANE_TITLE_W + contentWidth + 60;
  const poolY = 40;
  const poolH = cursorY - poolY;

  // Shift x so that activities align inside lane (after title stripe)
  const xShift = poolX + LANE_TITLE_W + 20 - contentMinX;
  for (const p of positions.values()) p.x += xShift;

  // ---- Emit BPMN 2.0 XML ----
  const decisionByAct = new Map(decisions.map((d) => [d.activity_id, d.question]));
  const usedElements = new Set<string>();

  const processElems: string[] = [];
  const flowRefs: string[] = [];

  // Emit lane set
  const laneSetXml = sortedLanes.map((key) => {
    const acts = laneMap.get(key)!;
    return `      <bpmn:lane id="Lane_${slug(key)}" name="${escapeXml(key)}">
${acts.map((a) => `        <bpmn:flowNodeRef>Act_${a.id}</bpmn:flowNodeRef>`).join("\n")}
      </bpmn:lane>`;
  }).join("\n");

  // Emit flow nodes
  for (const a of activities) {
    const outs = connections.filter((c) => c.from_activity_id === a.id);
    const ins = connections.filter((c) => c.to_activity_id === a.id);
    let elem = bpmnElementFor(a.type);

    // Promote to parallelGateway when applicable (activity used as pure fanout of parallel)
    if (a.type !== "decision" && a.type !== "start" && a.type !== "end") {
      if (isParallelGateway(a, outs, ins) && outs.length >= 2 && ins.length <= 1) {
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

  // Emit sequence flows
  for (const c of connections) {
    if (!positions.has(c.from_activity_id) || !positions.has(c.to_activity_id)) continue;
    const label = c.label ? ` name="${escapeXml(c.label)}"` : "";
    flowRefs.push(
      `      <bpmn:sequenceFlow id="Flow_${c.id}"${label} sourceRef="Act_${c.from_activity_id}" targetRef="Act_${c.to_activity_id}" />`
    );
  }

  // ---- BPMNDI ----
  const shapes: string[] = [];
  // Pool + lanes
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
  const edges: string[] = [];
  for (const c of connections) {
    const s = positions.get(c.from_activity_id);
    const t = positions.get(c.to_activity_id);
    if (!s || !t) continue;
    const sx = s.x + s.w / 2, sy = s.y + s.h / 2;
    const tx = t.x + t.w / 2, ty = t.y + t.h / 2;
    edges.push(
      `      <bpmndi:BPMNEdge id="Edge_${c.id}" bpmnElement="Flow_${c.id}">
        <di:waypoint x="${round(sx)}" y="${round(sy)}" />
        <di:waypoint x="${round(tx)}" y="${round(ty)}" />
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
