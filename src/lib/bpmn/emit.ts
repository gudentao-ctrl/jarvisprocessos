import type { FlowGraph } from "./graph";
import { layoutFlow, LANE_TITLE_W, type LayoutResult } from "./layout";
import { routeEdge } from "./routing";

/* Serializa BPMN 2.0 XML a partir do FlowGraph + layout. */

export type EmitOptions = {
  processName?: string;
  companyName?: string;
};

export type EmitResult = {
  xml: string;
  usedElements: Set<string>;
  laneCount: number;
  layout: LayoutResult;
};

export function emitBpmn(g: FlowGraph, opts: EmitOptions = {}): EmitResult {
  const processName = opts.processName ?? "Processo";
  const companyName = opts.companyName ?? "Empresa";
  const layout = layoutFlow(g);

  const usedElements = new Set<string>();
  const processElems: string[] = [];
  const flowRefs: string[] = [];

  // LaneSet
  const laneSetXml = layout.lanes.order.map((key) => {
    const ids = layout.lanes.members.get(key) ?? [];
    return `      <bpmn:lane id="Lane_${slug(key)}" name="${escapeXml(key)}">
${ids.map((id) => `        <bpmn:flowNodeRef>Act_${id}</bpmn:flowNodeRef>`).join("\n")}
      </bpmn:lane>`;
  }).join("\n");

  // Detecta gateway paralelo
  const isParallel = (id: string) => {
    const n = g.nodes.get(id)!;
    const parOuts = n.outs.filter((c) => c.type === "parallel").length;
    const parIns = n.ins.filter((c) => c.type === "parallel").length;
    return parOuts >= 2 || parIns >= 2;
  };

  // Flow nodes
  for (const a of g.activities) {
    let elem = bpmnElementFor(a.type);
    if (a.type !== "decision" && a.type !== "start" && a.type !== "end") {
      const n = g.nodes.get(a.id)!;
      if (isParallel(a.id) && n.outs.length >= 2 && n.ins.length <= 1) {
        elem = "parallelGateway";
      }
    }
    usedElements.add(elem);

    const n = g.nodes.get(a.id)!;
    const inFlows = n.ins.map((c) => `        <bpmn:incoming>Flow_${c.id}</bpmn:incoming>`).join("\n");
    const outFlows = n.outs.map((c) => `        <bpmn:outgoing>Flow_${c.id}</bpmn:outgoing>`).join("\n");
    const q = g.decisions.get(a.id)?.question;
    const label = a.type === "decision" && q ? `${a.title} — ${q}` : a.title;

    processElems.push(
      `      <bpmn:${elem} id="Act_${a.id}" name="${escapeXml(label)}">
${inFlows}
${outFlows}
      </bpmn:${elem}>`
    );
  }

  // Sequence flows
  for (const c of g.connections) {
    const label = c.label ? ` name="${escapeXml(c.label)}"` : "";
    flowRefs.push(
      `      <bpmn:sequenceFlow id="Flow_${c.id}"${label} sourceRef="Act_${c.from_activity_id}" targetRef="Act_${c.to_activity_id}" />`
    );
  }

  // BPMNDI: shapes
  const shapes: string[] = [];
  shapes.push(
    `      <bpmndi:BPMNShape id="Shape_Pool" bpmnElement="Participant_1" isHorizontal="true">
        <dc:Bounds x="${layout.poolBounds.x}" y="${layout.poolBounds.y}" width="${layout.poolBounds.w}" height="${layout.poolBounds.h}" />
      </bpmndi:BPMNShape>`
  );
  for (const key of layout.lanes.order) {
    const lb = layout.laneBounds.get(key);
    if (!lb) continue;
    shapes.push(
      `      <bpmndi:BPMNShape id="Shape_Lane_${slug(key)}" bpmnElement="Lane_${slug(key)}" isHorizontal="true">
        <dc:Bounds x="${layout.poolBounds.x + LANE_TITLE_W}" y="${lb.y}" width="${layout.poolBounds.w - LANE_TITLE_W}" height="${lb.h}" />
      </bpmndi:BPMNShape>`
    );
  }
  for (const a of g.activities) {
    const p = layout.positions.get(a.id)!;
    shapes.push(
      `      <bpmndi:BPMNShape id="Shape_${a.id}" bpmnElement="Act_${a.id}">
        <dc:Bounds x="${round(p.x)}" y="${round(p.y)}" width="${p.w}" height="${p.h}" />
      </bpmndi:BPMNShape>`
    );
  }

  // BPMNDI: edges
  const allBoxes = [...layout.positions.values()];
  const outsByNode = new Map<string, string[]>();
  const insByNode = new Map<string, string[]>();
  for (const c of g.connections) {
    if (!outsByNode.has(c.from_activity_id)) outsByNode.set(c.from_activity_id, []);
    if (!insByNode.has(c.to_activity_id)) insByNode.set(c.to_activity_id, []);
    outsByNode.get(c.from_activity_id)!.push(c.id);
    insByNode.get(c.to_activity_id)!.push(c.id);
  }
  const edges: string[] = [];
  for (const c of g.connections) {
    const s = layout.positions.get(c.from_activity_id);
    const t = layout.positions.get(c.to_activity_id);
    if (!s || !t) continue;
    const sArr = outsByNode.get(c.from_activity_id) ?? [c.id];
    const tArr = insByNode.get(c.to_activity_id) ?? [c.id];
    const pts = routeEdge(s, t, {
      sourceIndex: Math.max(0, sArr.indexOf(c.id)),
      sourceCount: sArr.length,
      targetIndex: Math.max(0, tArr.indexOf(c.id)),
      targetCount: tArr.length,
      isReturn: g.backEdges.has(c.id) || c.type === "return",
    }, allBoxes);
    const waypoints = pts.map((p) => `        <di:waypoint x="${round(p.x)}" y="${round(p.y)}" />`).join("\n");
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

  return { xml, usedElements, laneCount: layout.lanes.order.length, layout };
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

function round(n: number) { return Math.round(n * 10) / 10; }
function slug(s: string): string {
  return s.replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_|_$/g, "") || "x";
}
