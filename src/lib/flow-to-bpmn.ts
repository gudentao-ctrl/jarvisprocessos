import type { FlowActivity, FlowConnection, FlowDecision } from "@/components/flow/FlowEditor";
import { buildFlowGraph } from "./bpmn/graph";
import { emitBpmn } from "./bpmn/emit";

/* Compat: mantém a API antiga. Delegado para o novo engine em src/lib/bpmn/*.
 * O novo engine faz layering longest-path, lanes por responsável (ordem de aparição),
 * simetria de gateways, Manhattan routing com portas L/R/T/B e back-edges por baixo. */

export type BpmnBuildOptions = {
  processName?: string;
  companyName?: string;
  direction?: "LR" | "TB"; // aceito por compat; sempre LR na v2
};

export function buildBpmnXml(
  activities: FlowActivity[],
  connections: FlowConnection[],
  decisions: FlowDecision[],
  opts: BpmnBuildOptions = {},
): { xml: string; laneCount: number; usedElements: Set<string> } {
  const g = buildFlowGraph(activities, connections, decisions);
  const { xml, usedElements, laneCount } = emitBpmn(g, {
    processName: opts.processName,
    companyName: opts.companyName,
  });
  return { xml, laneCount, usedElements };
}
