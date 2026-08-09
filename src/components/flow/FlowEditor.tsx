import { memo, useMemo, useState } from "react";
import { Plus, MoreVertical, ArrowDown, GitBranch, GitMerge, Repeat, Layers, Circle, CheckCircle2, GripVertical, User, Clock, Folder, HelpCircle } from "lucide-react";
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

/* Cores semânticas por tipo (tokens do design system). */
const TYPE_ACCENT: Record<string, { chip: string; bar: string; text: string }> = {
  start: { chip: "bg-map-time/10 text-map-time", bar: "bg-map-time", text: "text-map-time" },
  end: { chip: "bg-map-pain/10 text-map-pain", bar: "bg-map-pain", text: "text-map-pain" },
  decision: { chip: "bg-map-decision/10 text-map-decision", bar: "bg-map-decision", text: "text-map-decision" },
  approval: { chip: "bg-map-info/10 text-map-info", bar: "bg-map-info", text: "text-map-info" },
  wait: { chip: "bg-muted text-muted-foreground", bar: "bg-muted-foreground/40", text: "text-muted-foreground" },
  task: { chip: "bg-map-process/10 text-map-process", bar: "bg-map-process", text: "text-map-process" },
};
const accentOf = (t: string) => TYPE_ACCENT[t] ?? TYPE_ACCENT.task;


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
  const [focusId, setFocusId] = useState<string | null>(null);

  // Ordenação e pré-agrupamento (evita O(n²) por render).
  const sorted = useMemo(
    () => [...activities].sort((a, b) => a.ordering - b.ordering),
    [activities],
  );

  const outgoingByFrom = useMemo(() => {
    const m = new Map<string, FlowConnection[]>();
    for (const c of connections) {
      const arr = m.get(c.from_activity_id);
      if (arr) arr.push(c);
      else m.set(c.from_activity_id, [c]);
    }
    return m;
  }, [connections]);

  const incomingByTo = useMemo(() => {
    const m = new Map<string, FlowConnection[]>();
    for (const c of connections) {
      const arr = m.get(c.to_activity_id);
      if (arr) arr.push(c);
      else m.set(c.to_activity_id, [c]);
    }
    return m;
  }, [connections]);

  const decisionByActivity = useMemo(() => {
    const m = new Map<string, FlowDecision>();
    for (const d of decisions) m.set(d.activity_id, d);
    return m;
  }, [decisions]);

  const activityById = useMemo(() => {
    const m = new Map<string, FlowActivity>();
    for (const a of activities) m.set(a.id, a);
    return m;
  }, [activities]);

  const active = openId ? activityById.get(openId) ?? null : null;
  const focused = focusId ? activityById.get(focusId) ?? null : null;

  const issues = useMemo(
    () => computeIssues(sorted, connections, decisions),
    [sorted, connections, decisions],
  );

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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  async function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = sorted.findIndex((a) => a.id === active.id);
    const newIdx = sorted.findIndex((a) => a.id === over.id);
    if (oldIdx < 0 || newIdx < 0) return;
    const next = arrayMove(sorted, oldIdx, newIdx);
    try {
      await reorderFlowActivities({
        data: { process_id: processId, items: next.map((a, i) => ({ id: a.id, ordering: i })) },
      });
      onChange();
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao reordenar");
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <FlowStats activities={sorted} connections={connections} />
        <FlowOptimizePanel processId={processId} />
      </div>
      {issues.length > 0 && (
        <FlowIssuesPanel issues={issues} activities={sorted} onFocus={(id) => { setFocusId(id); setOpenId(id); }} onAutofix={runAutofix} />
      )}

      {sorted.length === 0 ? (
        <Card className="p-8 text-center space-y-3">
          <p className="text-sm text-muted-foreground">Fluxo vazio. Adicione a primeira atividade.</p>
          <Button onClick={addFirst}><Plus className="h-4 w-4 mr-1" /> Primeira atividade</Button>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="relative min-w-0">
            {/* trilho vertical do fluxo */}
            <div className="pointer-events-none absolute left-[26px] top-4 bottom-14 w-px bg-border md:left-[30px]" aria-hidden />
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={sorted.map((a) => a.id)} strategy={verticalListSortingStrategy}>
                {sorted.map((a, idx) => {
                  const outgoing = outgoingByFrom.get(a.id) ?? [];
                  const decision = decisionByActivity.get(a.id);
                  return (
                    <SortableActivityCard
                      key={a.id}
                      activity={a}
                      index={idx}
                      processId={processId}
                      decision={decision}
                      outgoing={outgoing}
                      activityById={activityById}
                      isLast={idx === sorted.length - 1}
                      isFocused={focusId === a.id}
                      onFocus={() => setFocusId(a.id)}
                      onOpen={() => setOpenId(a.id)}
                      onAddAfter={() => addAfter(a.id)}
                      onChange={onChange}
                    />
                  );
                })}
              </SortableContext>
            </DndContext>

            <div className="flex justify-center pt-3">
              <Button variant="outline" size="sm" onClick={addFirst}>
                <Plus className="h-4 w-4 mr-1" /> Nova atividade
              </Button>
            </div>
          </div>


          <aside className="hidden lg:block">
            <div className="sticky top-4">
              <ActivityDetailsPanel
                activity={focused}
                decision={focused ? decisionByActivity.get(focused.id) : undefined}
                outgoing={focused ? outgoingByFrom.get(focused.id) ?? [] : []}
                incoming={focused ? incomingByTo.get(focused.id) ?? [] : []}
                activityById={activityById}
                onOpen={() => focused && setOpenId(focused.id)}
              />
            </div>
          </aside>
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

function FlowStats({ activities, connections }: { activities: FlowActivity[]; connections: FlowConnection[] }) {
  const decisions = activities.filter((a) => a.type === "decision").length;
  const responsaveis = new Set(activities.map((a) => (a.responsible ?? "").trim()).filter(Boolean)).size;
  const minutos = activities.reduce((s, a) => s + (a.time_minutes ?? 0), 0);
  const items: Array<[string, string | number]> = [
    ["Etapas", activities.length],
    ["Conexões", connections.length],
    ["Decisões", decisions],
    ["Responsáveis", responsaveis],
  ];
  if (minutos > 0) items.push(["Tempo", minutos >= 60 ? `${(minutos / 60).toFixed(1)} h` : `${minutos} min`]);
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-1.5">
      {items.map(([label, value]) => (
        <span
          key={label}
          className="inline-flex items-center gap-1 rounded-full border bg-card px-2.5 py-1 text-[11px] text-muted-foreground"
        >
          <b className="text-foreground tabular-nums">{value}</b> {label}
        </span>
      ))}
    </div>
  );
}

type SortableCardProps = {
  activity: FlowActivity;
  index: number;
  processId: string;
  decision: FlowDecision | undefined;
  outgoing: FlowConnection[];
  activityById: Map<string, FlowActivity>;
  isLast: boolean;
  isFocused: boolean;
  onFocus: () => void;
  onOpen: () => void;
  onAddAfter: () => void;
  onChange: () => void;
};

const SortableActivityCard = memo(function SortableActivityCard({
  activity: a,
  index,
  processId,
  decision,
  outgoing,
  activityById,
  isLast,
  isFocused,
  onFocus,
  onOpen,
  onAddAfter,
  onChange,
}: SortableCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: a.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 20 : undefined,
  };
  const Icon = TYPE_ICON[a.type] ?? Layers;
  const isDecision = a.type === "decision";
  const accent = accentOf(a.type);
  return (
    <div ref={setNodeRef} style={style} className="relative">
      <div className="flex items-stretch gap-2 md:gap-3">
        {/* marcador de sequência */}
        <div className="relative z-10 flex w-[52px] shrink-0 flex-col items-center pt-3 md:w-[60px]">
          <span
            className={`grid h-8 w-8 place-items-center rounded-full border-2 border-background text-[11px] font-bold tabular-nums shadow-sm ${accent.chip}`}
          >
            {index + 1}
          </span>
          <button
            {...attributes}
            {...listeners}
            onClick={(e) => e.stopPropagation()}
            className="mt-1 grid h-6 w-6 place-items-center rounded text-muted-foreground/60 hover:text-foreground cursor-grab active:cursor-grabbing touch-none"
            aria-label="Arrastar"
          >
            <GripVertical className="h-3.5 w-3.5" />
          </button>
        </div>

        <Card
          className={`relative flex-1 min-w-0 overflow-hidden p-3 pl-4 my-1 transition-all cursor-pointer hover:shadow-md hover:bg-secondary/40 ${
            isFocused ? "ring-2 ring-primary/40 shadow-sm" : ""
          } ${isDragging ? "shadow-lg" : ""}`}
          onMouseEnter={onFocus}
          onClick={() => { onFocus(); onOpen(); }}
        >
          <span className={`absolute inset-y-0 left-0 w-1 ${accent.bar}`} aria-hidden />
          <div className="flex items-start gap-2.5">
            <div className={`shrink-0 grid h-9 w-9 place-items-center rounded-lg ${accent.chip}`}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <InlineTitle activity={a} processId={processId} onChange={onChange} />
                <Badge variant="outline" className={`text-[10px] py-0 h-4 ${accent.text}`}>
                  {TYPE_LABEL[a.type] ?? a.type}
                </Badge>
              </div>
              {isDecision && decision?.question && (
                <p className={`text-xs mt-0.5 ${accent.text}`}>? {decision.question}</p>
              )}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1.5 text-xs text-muted-foreground">
                <InlineResponsible activity={a} processId={processId} onChange={onChange} />
                {a.area && (
                  <span className="inline-flex items-center gap-1"><Folder className="h-3 w-3" /> {a.area}</span>
                )}
                {a.time_minutes ? (
                  <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {a.time_minutes} min</span>
                ) : null}
              </div>
            </div>
            <MoreVertical className="h-4 w-4 text-muted-foreground shrink-0" />
          </div>
        </Card>
      </div>

      {outgoing.length > 0 ? (
        <div className="ml-[60px] flex flex-wrap gap-1 py-0.5 md:ml-[72px]">
          {outgoing.map((c) => (
            <ConnectionArrow key={c.id} connection={c} activityById={activityById} />
          ))}
        </div>
      ) : !isLast ? (
        <div className="ml-[60px] py-1 md:ml-[72px]">
          <button
            onClick={(e) => { e.stopPropagation(); onAddAfter(); }}
            className="inline-flex items-center gap-1 rounded-full border border-dashed px-2.5 py-1 text-[11px] text-muted-foreground hover:border-primary hover:text-primary"
          >
            <ArrowDown className="h-3 w-3" /> conectar à próxima
          </button>
        </div>
      ) : null}
    </div>
  );
});


function ActivityDetailsPanel({
  activity,
  decision,
  outgoing,
  incoming,
  activityById,
  onOpen,
}: {
  activity: FlowActivity | null;
  decision: FlowDecision | undefined;
  outgoing: FlowConnection[];
  incoming: FlowConnection[];
  activityById: Map<string, FlowActivity>;
  onOpen: () => void;
}) {
  if (!activity) {
    return (
      <Card className="p-4 text-xs text-muted-foreground">
        Passe o mouse sobre uma atividade para ver detalhes.
      </Card>
    );
  }
  const Icon = TYPE_ICON[activity.type] ?? Layers;
  const isDecision = activity.type === "decision";
  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center gap-2">
        <div className={`grid h-8 w-8 place-items-center rounded-lg ${isDecision ? "bg-amber-500/10 text-amber-600" : "bg-primary/10 text-primary"}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-sm truncate">{activity.title}</p>
          <p className="text-[11px] text-muted-foreground">{TYPE_LABEL[activity.type] ?? activity.type}</p>
        </div>
      </div>

      <div className="space-y-1.5 text-xs">
        <DetailRow icon={User} label="Responsável" value={activity.responsible} />
        <DetailRow icon={Folder} label="Área" value={activity.area} />
        <DetailRow icon={Clock} label="Tempo" value={activity.time_minutes ? `${activity.time_minutes} min` : null} />
        {isDecision && (
          <DetailRow icon={HelpCircle} label="Pergunta" value={decision?.question ?? null} />
        )}
      </div>

      {activity.description && (
        <div className="text-xs">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Descrição</p>
          <p className="text-muted-foreground line-clamp-4 whitespace-pre-wrap">{activity.description}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Entradas ({incoming.length})</p>
          <ul className="space-y-0.5">
            {incoming.length === 0 && <li className="text-muted-foreground/70 italic">—</li>}
            {incoming.slice(0, 4).map((c) => (
              <li key={c.id} className="truncate text-muted-foreground">← {activityById.get(c.from_activity_id)?.title ?? "?"}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Saídas ({outgoing.length})</p>
          <ul className="space-y-0.5">
            {outgoing.length === 0 && <li className="text-muted-foreground/70 italic">—</li>}
            {outgoing.slice(0, 4).map((c) => (
              <li key={c.id} className="truncate text-muted-foreground">
                {c.label ? <span className="font-medium">{c.label}: </span> : null}
                → {activityById.get(c.to_activity_id)?.title ?? "?"}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <Button size="sm" variant="outline" className="w-full" onClick={onOpen}>
        Editar em detalhes
      </Button>
    </Card>
  );
}

function DetailRow({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string | null }) {
  return (
    <div className="flex items-start gap-1.5">
      <Icon className="h-3 w-3 mt-0.5 text-muted-foreground shrink-0" />
      <span className="text-muted-foreground w-20 shrink-0">{label}</span>
      <span className="min-w-0 flex-1 break-words">
        {value || <span className="italic opacity-60">—</span>}
      </span>
    </div>
  );
}

function InlineTitle({ activity, processId, onChange }: { activity: FlowActivity; processId: string; onChange: () => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(activity.title);
  const [busy, setBusy] = useState(false);

  async function commit() {
    const v = value.trim();
    if (!v || v === activity.title) { setEditing(false); setValue(activity.title); return; }
    setBusy(true);
    try {
      await saveFlowActivity({ data: { id: activity.id, process_id: processId, title: v, type: activity.type as any } });
      toast.success("Título atualizado");
      onChange();
    } catch (e: any) {
      toast.error(e?.message ?? "Erro");
      setValue(activity.title);
    } finally {
      setBusy(false);
      setEditing(false);
    }
  }

  if (editing) {
    return (
      <input
        autoFocus
        value={value}
        disabled={busy}
        onChange={(e) => setValue(e.target.value)}
        onClick={(e) => e.stopPropagation()}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); (e.target as HTMLInputElement).blur(); }
          if (e.key === "Escape") { setValue(activity.title); setEditing(false); }
        }}
        className="font-medium text-sm bg-background border border-input rounded px-1.5 py-0.5 outline-none focus:ring-2 focus:ring-primary/40 min-w-0 flex-1"
      />
    );
  }
  return (
    <p
      className="font-medium text-sm truncate hover:underline decoration-dotted"
      onClick={(e) => { e.stopPropagation(); setEditing(true); }}
      title="Clique para editar"
    >
      {activity.title}
    </p>
  );
}

function InlineResponsible({ activity, processId, onChange }: { activity: FlowActivity; processId: string; onChange: () => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(activity.responsible ?? "");
  const [busy, setBusy] = useState(false);

  async function commit() {
    const v = value.trim();
    if (v === (activity.responsible ?? "")) { setEditing(false); return; }
    setBusy(true);
    try {
      await saveFlowActivity({ data: { id: activity.id, process_id: processId, title: activity.title, type: activity.type as any, responsible: v } });
      onChange();
    } catch (e: any) {
      toast.error(e?.message ?? "Erro");
      setValue(activity.responsible ?? "");
    } finally {
      setBusy(false);
      setEditing(false);
    }
  }

  if (editing) {
    return (
      <input
        autoFocus
        value={value}
        disabled={busy}
        placeholder="responsável"
        onChange={(e) => setValue(e.target.value)}
        onClick={(e) => e.stopPropagation()}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); (e.target as HTMLInputElement).blur(); }
          if (e.key === "Escape") { setValue(activity.responsible ?? ""); setEditing(false); }
        }}
        className="text-xs bg-background border border-input rounded px-1.5 py-0.5 outline-none focus:ring-2 focus:ring-primary/40 w-32"
      />
    );
  }
  return (
    <span
      className="hover:underline decoration-dotted cursor-text"
      onClick={(e) => { e.stopPropagation(); setEditing(true); }}
      title="Clique para editar"
    >
      👤 {activity.responsible || <span className="italic opacity-60">definir</span>}
    </span>
  );
}

const ConnectionArrow = memo(function ConnectionArrow({
  connection,
  activityById,
}: {
  connection: FlowConnection;
  activityById: Map<string, FlowActivity>;
}) {
  const target = activityById.get(connection.to_activity_id);
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
});

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
