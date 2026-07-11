import { BpmnRenderer } from "./BpmnRenderer";
import type { FlowActivity, FlowConnection, FlowDecision } from "./FlowEditor";

/* Compat: mantém a API antiga; delega para o BpmnRenderer 2.0 profissional. */

export function FlowBpmnPreview({
  activities,
  connections,
  decisions,
  processName,
  companyName,
}: {
  activities: FlowActivity[];
  connections: FlowConnection[];
  decisions: FlowDecision[];
  processName?: string;
  companyName?: string;
}) {
  return (
    <BpmnRenderer
      activities={activities}
      connections={connections}
      decisions={decisions}
      processName={processName}
      companyName={companyName}
    />
  );
}
