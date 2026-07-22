/* Auto-layout profissional via bpmn-auto-layout (bpmn.io oficial).
 * Recebe um XML BPMN 2.0 (com semântica: processo, lanes, flowNodes,
 * sequenceFlows) e devolve XML com DI (BPMNDiagram) recalculado — sem
 * cruzamentos e com espaçamento correto entre elementos. */

let cachedFn: ((xml: string) => Promise<string>) | null = null;

async function getLayoutProcess() {
  if (cachedFn) return cachedFn;
  const mod: any = await import("bpmn-auto-layout");
  cachedFn = (mod.layoutProcess ?? mod.default ?? mod).bind(mod);
  return cachedFn!;
}

export async function autoLayoutBpmn(xml: string): Promise<string> {
  try {
    const layoutProcess = await getLayoutProcess();
    const out = await layoutProcess(xml);
    if (typeof out === "string" && out.includes("<bpmndi:BPMNDiagram")) return out;
    return xml;
  } catch (e) {
    console.warn("[autoLayoutBpmn] fallback para layout interno:", e);
    return xml;
  }
}
