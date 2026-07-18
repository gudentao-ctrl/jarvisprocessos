import { useState } from "react";
import { Plus, MoreVertical, ArrowDown, GitBranch, GitMerge, Repeat, Layers, Circle, CheckCircle2, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  addActivityRelative,
  reorderFlowActivities,
  saveFlowActivity,
} from "@/lib/flow.functions";
import { autofixFlow } from "@/lib/flow-autofix.functions";
import { ActivitySheet } from "./ActivitySheet";
import { FlowIssuesPanel, type FlowIssue } from "./FlowIssuesPanel";
import { FlowOptimizePanel } from "./FlowOptimizePanel";

export type FlowActivity = {
  id: string;
  title: string;
  type: string;
  responsible: string | null;
  area: string | null;
  time_minutes: number | null;
  description: string | null;
  ordering: number;
};

export type FlowConnection = {
  id: string;
  from_activity_id: string;
  to_activity_id: string;
  type: "sequential" | "decision" | "parallel" | "return" | "subprocess";
  label: string;
  order_index: number;
};

export type FlowDecision = { id: string; activity_id: string; question: string };

const TYPE_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  start: Circle,
  end: CheckCircle2,
  decision: GitBranch,
  task: Layers,
  wait: Repeat,
  approval: CheckCircle2,
};

const TYPE_LABEL: Record<string, string> = {
  start: "Início",
  end: "Fim",
  decision: "Decisão",
  task: "Atividade",
  wait: "Espera",
  approval: "Aprovação",
  info_in: "Info in",
  info_out: "Info out",
};

export function FlowEditor({
  processId,
  activities,
  connections,
  decisions,
  onChange,
}: {
  processId: string;
  activities: FlowActivity[];
  connections: FlowConnection[];
  decisions: FlowDecision[];
  onChange: () => void;
}) {
  const [openId, setOpenId] = useState<string | null>(null);

  const sorted = [...activities].sort((a, b) => a.ordering - b.ordering);
  const active = activities.find((a) => a.id === openId) ?? null;

  const issues = computeIssues(sorted, connections, decisions);

  async function addFirst() {
    try {
      await saveFlowActivity({
        data: { process_id: processId, title: "Nova atividade", type: "task" },
      });
      toast.success("Atividade criada");
      onChange();
    } catch (e: any) {
      toast.error(e?.message ?? "Erro");
    }
  }

  async function addAfter(refId: string) {
    try {
      await addActivityRelative({
        data: { process_id: processId, relative_to: refId, mode: "after", title: "Nova atividade", type: "task" },
      });
      toast.success("Atividade adicionada");
      onChange();
    } catch (e: any) {
      toast.error(e?.message ?? "Erro");
    }
  }

  async function runAutofix() {
    try {
      const r = await autofixFlow({ data: { process_id: processId } });
      const parts: string[] = [];
      if (r.duplicatesRemoved) parts.push(`${r.duplicatesRemoved} duplicadas removidas`);
      if (r.endCreated) parts.push("evento Fim criado");
      if (r.decisionLabelsSet) parts.push(`${r.decisionLabelsSet} rótulos de decisão`);
      if (r.orphansConnected) parts.push(`${r.orphansConnected} órfãos conectados`);
      toast.success(parts.length ? `Corrigido: ${parts.join(" · ")}` : "Nenhuma correção necessária");
      onChange();
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao corrigir");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 justify-end">
        <FlowOptimizePanel processId={processId} />
      </div>
      {issues.length > 0 && (
        <FlowIssuesPanel issues={issues} activities={sorted} onFocus={(id) => setOpenId(id)} onAutofix={runAutofix} />
      )}

      {sorted.length === 0 ? (
        <Card className="p-8 text-center space-y-3">
          <p className="text-sm text-muted-foreground">Fluxo vazio. Adicione a primeira atividade.</p>
          <Button onClick={addFirst}><Plus className="h-4 w-4 mr-1" /> Primeira atividade</Button>
        </Card>
      ) : (
        <div className="space-y-2">
          {sorted.map((a, idx) => {
            const outgoing = connections.filter((c) => c.from_activity_id === a.id);
            const decision = decisions.find((d) => d.activity_id === a.id);
            const Icon = TYPE_ICON[a.type] ?? Layers;
            const isDecision = a.type === "decision";
            return (
              <div key={a.id}>
                <Card
                  className="p-3 active:scale-[0.99] transition-transform cursor-pointer hover:bg-secondary/50"
                  onClick={() => setOpenId(a.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className={`shrink-0 grid h-9 w-9 place-items-center rounded-lg ${isDecision ? "bg-amber-500/10 text-amber-600" : "bg-primary/10 text-primary"}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm truncate">{a.title}</p>
                        <Badge variant="outline" className="text-[10px] py-0 h-4">{TYPE_LABEL[a.type] ?? a.type}</Badge>
                      </div>
                      {isDecision && decision?.question && (
                        <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">? {decision.question}</p>
                      )}
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-xs text-muted-foreground">
                        {a.responsible && <span>👤 {a.responsible}</span>}
                        {a.area && <span>📂 {a.area}</span>}
                        {a.time_minutes ? <span>⏱ {a.time_minutes} min</span> : null}
                      </div>
                    </div>
                    <MoreVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                  </div>
                </Card>

                {/* Outgoing connections rendered as branches */}
                {outgoing.length > 0 ? (
                  <div className="pl-4 py-1 space-y-1">
                    {outgoing.map((c) => (
                      <ConnectionArrow key={c.id} connection={c} activities={activities} />
                    ))}
                  </div>
                ) : idx < sorted.length - 1 ? (
                  <div className="flex items-center justify-center py-1">
                    <button
                      onClick={() => addAfter(a.id)}
                      className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
                    >
                      <ArrowDown className="h-3 w-3" /> conectar
                    </button>
                  </div>
                ) : null}
              </div>
            );
          })}

          <div className="flex justify-center pt-2">
            <Button variant="outline" size="sm" onClick={addFirst}>
              <Plus className="h-4 w-4 mr-1" /> Nova atividade
            </Button>
          </div>
        </div>
      )}

      {active && (
        <ActivitySheet
          key={active.id}
          activity={active}
          processId={processId}
          activities={activities}
          connections={connections}
          decisions={decisions}
          onClose={() => setOpenId(null)}
          onChange={onChange}
        />
      )}
    </div>
  );
}

function ConnectionArrow({
  connection,
  activities,
}: {
  connection: FlowConnection;
  activities: FlowActivity[];
}) {
  const target = activities.find((a) => a.id === connection.to_activity_id);
  const typeColor: Record<string, string> = {
    sequential: "text-muted-foreground",
    decision: "text-amber-600",
    parallel: "text-blue-600",
    return: "text-red-600",
    subprocess: "text-purple-600",
  };
  const typeIcon: Record<string, React.ComponentType<{ className?: string }>> = {
    sequential: ArrowDown,
    decision: GitBranch,
    parallel: GitMerge,
    return: Repeat,
    subprocess: Layers,
  };
  const Icon = typeIcon[connection.type] ?? ArrowDown;
  return (
    <div className={`flex items-center gap-2 text-xs ${typeColor[connection.type]}`}>
      <Icon className="h-3 w-3" />
      {connection.label && <span className="font-medium">{connection.label}</span>}
      <span className="text-muted-foreground">→ {target?.title ?? "?"}</span>
    </div>
  );
}

function computeIssues(
  activities: FlowActivity[],
  connections: FlowConnection[],
  decisions: FlowDecision[],
): FlowIssue[] {
  const issues: FlowIssue[] = [];
  if (activities.length === 0) return issues;

  const incoming = new Map<string, number>();
  const outgoing = new Map<string, number>();
  for (const a of activities) {
    incoming.set(a.id, 0);
    outgoing.set(a.id, 0);
  }
  for (const c of connections) {
    outgoing.set(c.from_activity_id, (outgoing.get(c.from_activity_id) ?? 0) + 1);
    incoming.set(c.to_activity_id, (incoming.get(c.to_activity_id) ?? 0) + 1);
  }

  const hasStart = activities.some((a) => a.type === "start") || activities.some((a) => (incoming.get(a.id) ?? 0) === 0);
  const hasEnd = activities.some((a) => a.type === "end") || activities.some((a) => (outgoing.get(a.id) ?? 0) === 0);
  if (!hasStart) issues.push({ severity: "error", message: "Fluxo sem início", activityId: null });
  if (!hasEnd) issues.push({ severity: "error", message: "Fluxo sem fim", activityId: null });

  for (const a of activities) {
    if (!a.responsible || a.responsible.trim() === "") {
      issues.push({ severity: "warn", message: `"${a.title}" sem responsável`, activityId: a.id });
    }
    if (a.type === "decision") {
      const dec = decisions.find((d) => d.activity_id === a.id);
      if (!dec || !dec.question?.trim()) {
        issues.push({ severity: "warn", message: `Decisão "${a.title}" sem pergunta`, activityId: a.id });
      }
      if ((outgoing.get(a.id) ?? 0) < 2) {
        issues.push({ severity: "warn", message: `Decisão "${a.title}" sem respostas`, activityId: a.id });
      }
    }
    if (a.type !== "end" && (outgoing.get(a.id) ?? 0) === 0 && activities.length > 1) {
      issues.push({ severity: "warn", message: `"${a.title}" sem saída`, activityId: a.id });
    }
    if (a.type !== "start" && (incoming.get(a.id) ?? 0) === 0 && activities.length > 1) {
      issues.push({ severity: "info", message: `"${a.title}" sem entrada`, activityId: a.id });
    }
  }
  return issues;
}
