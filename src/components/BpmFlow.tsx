import { useCallback, useEffect, useMemo, useState } from "react";
import ReactFlow, {
  Background, Controls, MiniMap,
  type Node, type Edge, type Connection,
  addEdge, useNodesState, useEdgesState, MarkerType, ReactFlowProvider, useReactFlow,
} from "reactflow";
import "reactflow/dist/style.css";
import dagre from "dagre";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Save, Trash2, Maximize2, Minimize2, LayoutGrid, List as ListIcon, Workflow, ArrowDown, MoreVertical, Link2 } from "lucide-react";
import { saveActivity, deleteActivity, saveEdge, deleteEdge, saveCanvasLayout } from "@/lib/processes.functions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const TYPE_COLORS: Record<string, string> = {
  start: "bg-emerald-100 border-emerald-400 text-emerald-900",
  task: "bg-orange-50 border-orange-300 text-orange-900",
  decision: "bg-amber-100 border-amber-400 text-amber-900",
  wait: "bg-slate-100 border-slate-400 text-slate-900",
  approval: "bg-blue-100 border-blue-400 text-blue-900",
  end: "bg-rose-100 border-rose-400 text-rose-900",
  info_in: "bg-violet-100 border-violet-400 text-violet-900",
  info_out: "bg-violet-50 border-violet-300 text-violet-900",
};

const TYPE_LABELS: Record<string, string> = {
  start: "Início", task: "Atividade", decision: "Decisão", wait: "Espera",
  approval: "Aprovação", end: "Fim", info_in: "Info ↘", info_out: "Info ↗",
};

const NODE_W = 180;
const NODE_H = 56;

type Activity = {
  id: string; process_id: string; type: string; title: string; responsible: string;
  area: string; systems: string[]; time_minutes: number; notes: string; x: number; y: number; ordering: number;
};
type EdgeRow = { id: string; process_id: string; source_id: string; target_id: string; label: string };

function layoutWithDagre(nodes: Node[], edges: Edge[]): Node[] {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: "TB", nodesep: 40, ranksep: 60, marginx: 20, marginy: 20 });
  g.setDefaultEdgeLabel(() => ({}));
  nodes.forEach((n) => g.setNode(n.id, { width: NODE_W, height: NODE_H }));
  edges.forEach((e) => g.setEdge(e.source, e.target));
  dagre.layout(g);
  return nodes.map((n) => {
    const p = g.node(n.id);
    return { ...n, position: { x: p.x - NODE_W / 2, y: p.y - NODE_H / 2 } };
  });
}

export function BpmFlow(props: { processId: string; activities: Activity[]; edges: EdgeRow[] }) {
  return (
    <ReactFlowProvider>
      <BpmFlowInner {...props} />
    </ReactFlowProvider>
  );
}

function BpmFlowInner({
  processId, activities: initialActivities, edges: initialEdges,
}: { processId: string; activities: Activity[]; edges: EdgeRow[] }) {
  const initialNodes: Node[] = useMemo(
    () => initialActivities.map((a) => ({
      id: a.id,
      position: { x: Number(a.x ?? 0), y: Number(a.y ?? 0) },
      data: { ...a, label: a.title },
      type: "default",
      style: { width: NODE_W, minHeight: NODE_H },
      className: `rounded-lg border-2 px-3 py-2 text-sm font-medium shadow-sm ${TYPE_COLORS[a.type] ?? TYPE_COLORS.task}`,
    })),
    [initialActivities],
  );
  const initialFlowEdges: Edge[] = useMemo(
    () => initialEdges.map((e) => ({
      id: e.id, source: e.source_id, target: e.target_id, label: e.label,
      markerEnd: { type: MarkerType.ArrowClosed }, animated: false,
    })),
    [initialEdges],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialFlowEdges);
  const [selected, setSelected] = useState<Node | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [mode, setMode] = useState<"flow" | "list">(typeof window !== "undefined" && window.innerWidth < 768 ? "list" : "flow");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [connectFromId, setConnectFromId] = useState<string | null>(null);
  const [activitiesIndex, setActivitiesIndex] = useState<Record<string, Activity>>(
    Object.fromEntries(initialActivities.map((a) => [a.id, a])),
  );
  const rf = useReactFlow();

  useEffect(() => { setNodes(initialNodes); setActivitiesIndex(Object.fromEntries(initialActivities.map((a) => [a.id, a]))); }, [initialNodes, initialActivities, setNodes]);
  useEffect(() => { setEdges(initialFlowEdges); }, [initialFlowEdges, setEdges]);

  const orderedActivities = useMemo(
    () => Object.values(activitiesIndex).sort((a, b) => (a.ordering ?? 0) - (b.ordering ?? 0)),
    [activitiesIndex],
  );

  const onConnect = useCallback(async (conn: Connection) => {
    if (!conn.source || !conn.target) return;
    try {
      const row = await saveEdge({ data: { process_id: processId, source_id: conn.source, target_id: conn.target, label: "" } });
      setEdges((eds) => addEdge({ id: row.id, source: conn.source!, target: conn.target!, markerEnd: { type: MarkerType.ArrowClosed } }, eds));
    } catch (e: any) { toast.error(e?.message ?? "Erro"); }
  }, [processId, setEdges]);

  async function addNode(type: string, opts?: { connectFromId?: string }) {
    const ordering = nodes.length;
    const row = await saveActivity({
      data: {
        process_id: processId, ordering, type: type as any,
        title: TYPE_LABELS[type] ?? "Nova atividade",
        x: 100 + (ordering % 4) * 220, y: 80 + Math.floor(ordering / 4) * 120,
      },
    });
    const newNode: Node = {
      id: row.id, position: { x: Number(row.x ?? 0), y: Number(row.y ?? 0) },
      data: { ...row, label: row.title }, type: "default",
      style: { width: NODE_W, minHeight: NODE_H },
      className: `rounded-lg border-2 px-3 py-2 text-sm font-medium shadow-sm ${TYPE_COLORS[type] ?? TYPE_COLORS.task}`,
    };
    setNodes((nds) => nds.concat(newNode));
    setActivitiesIndex((idx) => ({ ...idx, [row.id]: row as any }));
    setPaletteOpen(false);

    if (opts?.connectFromId) {
      try {
        const edgeRow = await saveEdge({ data: { process_id: processId, source_id: opts.connectFromId, target_id: row.id, label: "" } });
        setEdges((eds) => eds.concat({ id: edgeRow.id, source: opts.connectFromId!, target: row.id, markerEnd: { type: MarkerType.ArrowClosed } }));
      } catch {}
    }
    return row.id as string;
  }

  async function autoLayout() {
    const laid = layoutWithDagre(nodes, edges);
    setNodes(laid);
    const positions = laid.map((n) => ({ id: n.id, x: n.position.x, y: n.position.y }));
    try {
      await saveCanvasLayout({ data: { positions } });
      toast.success("Organizado");
      setTimeout(() => rf.fitView({ padding: 0.2 }), 50);
    } catch (e: any) { toast.error(e?.message ?? "Erro"); }
  }

  async function persistLayout() {
    const positions = nodes.map((n) => ({ id: n.id, x: n.position.x, y: n.position.y }));
    await saveCanvasLayout({ data: { positions } });
    toast.success("Layout salvo");
  }

  async function removeNode(id: string) {
    try {
      await deleteActivity({ data: { id } });
      setNodes((nds) => nds.filter((n) => n.id !== id));
      setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
      setActivitiesIndex((idx) => { const { [id]: _, ...rest } = idx; return rest; });
      if (selected?.id === id) setSelected(null);
      toast.success("Removido");
    } catch (e: any) { toast.error(e?.message ?? "Erro"); }
  }

  async function connectNodes(sourceId: string, targetId: string) {
    if (sourceId === targetId) return;
    if (edges.some((e) => e.source === sourceId && e.target === targetId)) {
      toast.info("Conexão já existe"); return;
    }
    try {
      const row = await saveEdge({ data: { process_id: processId, source_id: sourceId, target_id: targetId, label: "" } });
      setEdges((eds) => eds.concat({ id: row.id, source: sourceId, target: targetId, markerEnd: { type: MarkerType.ArrowClosed } }));
      toast.success("Conectado");
    } catch (e: any) { toast.error(e?.message ?? "Erro"); }
  }

  async function updateActivity(id: string, patch: Partial<Activity>) {
    const current = activitiesIndex[id];
    if (!current) return;
    const updated = { ...current, ...patch };
    setActivitiesIndex((idx) => ({ ...idx, [id]: updated }));
    setNodes((nds) =>
      nds.map((n) =>
        n.id === id
          ? {
              ...n,
              data: { ...n.data, ...patch, label: patch.title ?? n.data.label },
              className: `rounded-lg border-2 px-3 py-2 text-sm font-medium shadow-sm ${TYPE_COLORS[(patch.type as string) ?? current.type] ?? TYPE_COLORS.task}`,
            }
          : n,
      ),
    );
    try {
      await saveActivity({ data: { ...updated, id } as any });
    } catch (e: any) { toast.error(e?.message ?? "Erro ao salvar"); }
  }

  const sel = selected ? activitiesIndex[selected.id] : null;

  const containerClass = cn(
    "flex flex-col gap-2 bg-background",
    fullscreen
      ? "fixed inset-0 z-50 p-2"
      : "relative h-[75vh] md:h-[80vh] rounded-lg border p-2",
  );

  return (
    <div className={containerClass}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-md border bg-background">
          <button
            onClick={() => setMode("list")}
            className={cn("inline-flex items-center gap-1 px-3 py-2 text-xs font-medium", mode === "list" && "bg-secondary")}
          >
            <ListIcon className="h-3.5 w-3.5" /> Lista
          </button>
          <button
            onClick={() => setMode("flow")}
            className={cn("inline-flex items-center gap-1 px-3 py-2 text-xs font-medium border-l", mode === "flow" && "bg-secondary")}
          >
            <Workflow className="h-3.5 w-3.5" /> Fluxo
          </button>
        </div>
        {mode === "flow" && (
          <Button size="sm" variant="outline" className="min-h-9" onClick={autoLayout}>
            <LayoutGrid className="h-4 w-4 mr-1" /> Auto-organizar
          </Button>
        )}
        {mode === "flow" && (
          <Button size="sm" variant="outline" className="min-h-9" onClick={persistLayout}>
            <Save className="h-4 w-4 mr-1" /> Salvar
          </Button>
        )}
        <Button size="sm" variant="outline" className="min-h-9" onClick={() => setPaletteOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Adicionar
        </Button>
        <div className="ml-auto">
          <Button size="sm" variant="ghost" className="min-h-9" onClick={() => setFullscreen((v) => !v)}>
            {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Body */}
      {mode === "flow" ? (
        <div className="flex-1 min-h-0 overflow-hidden rounded-lg border bg-background bpm-flow-container">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={(changes) => {
              onEdgesChange(changes);
              for (const c of changes) if (c.type === "remove") deleteEdge({ data: { id: c.id } }).catch(() => {});
            }}
            onConnect={onConnect}
            onNodeClick={(_, n) => setSelected(n)}
            onPaneClick={() => setSelected(null)}
            fitView
            connectionRadius={40}
            deleteKeyCode={null}
            panOnScroll
            zoomOnPinch
          >
            <Background />
            <Controls showInteractive={false} />
            <MiniMap pannable zoomable className="hidden md:block" />
          </ReactFlow>
          <style>{`
            .bpm-flow-container .react-flow__handle { width: 14px; height: 14px; border-width: 2px; }
            .bpm-flow-container .react-flow__handle-top { top: -8px; }
            .bpm-flow-container .react-flow__handle-bottom { bottom: -8px; }
          `}</style>
        </div>
      ) : (
        <ListView
          activities={orderedActivities}
          edges={edges}
          connectFromId={connectFromId}
          onSetConnectFrom={setConnectFromId}
          onAddAfter={(afterId) => addNode("task", { connectFromId: afterId })}
          onSelect={(id) => setSelected({ id } as any)}
          onConnect={connectNodes}
          onRemove={removeNode}
          onChangeType={(id, type) => updateActivity(id, { type })}
          onChangeTitle={(id, title) => updateActivity(id, { title })}
        />
      )}

      {/* Add palette sheet */}
      <Sheet open={paletteOpen} onOpenChange={setPaletteOpen}>
        <SheetContent side="bottom" className="h-auto max-h-[70vh]">
          <SheetHeader><SheetTitle>Adicionar etapa</SheetTitle></SheetHeader>
          <div className="grid grid-cols-2 gap-2 mt-3 pb-4">
            {Object.entries(TYPE_LABELS).map(([k, l]) => (
              <button
                key={k}
                onClick={() => addNode(k)}
                className={cn("min-h-12 rounded-lg border-2 px-3 py-2 text-sm font-medium text-left", TYPE_COLORS[k])}
              >
                + {l}
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      {/* Edit sheet */}
      <Sheet open={!!sel} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent side="bottom" className="h-auto max-h-[85vh] overflow-y-auto">
          {sel && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center justify-between gap-2">
                  <span className="truncate">{sel.title || "Atividade"}</span>
                  <Button size="sm" variant="ghost" onClick={() => removeNode(sel.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </SheetTitle>
              </SheetHeader>
              <div className="space-y-3 mt-3 pb-6">
                <div>
                  <label className="text-xs text-muted-foreground">Tipo</label>
                  <Select value={sel.type} onValueChange={(v) => updateActivity(sel.id, { type: v })}>
                    <SelectTrigger className="min-h-11"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(TYPE_LABELS).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Field label="Título" value={sel.title} onChange={(v) => updateActivity(sel.id, { title: v })} />
                <Field label="Responsável" value={sel.responsible ?? ""} onChange={(v) => updateActivity(sel.id, { responsible: v })} />
                <Field label="Área" value={sel.area ?? ""} onChange={(v) => updateActivity(sel.id, { area: v })} />
                <Field label="Tempo (min)" type="number" value={String(sel.time_minutes ?? 0)} onChange={(v) => updateActivity(sel.id, { time_minutes: Number(v) || 0 })} />
                <Field label="Sistemas (vírgula)" value={(sel.systems ?? []).join(", ")} onChange={(v) => updateActivity(sel.id, { systems: v.split(",").map((s) => s.trim()).filter(Boolean) })} />
                <div>
                  <label className="text-xs text-muted-foreground">Observações</label>
                  <textarea
                    className="w-full text-sm border rounded px-3 py-2 bg-background min-h-24"
                    value={sel.notes ?? ""}
                    onChange={(e) => updateActivity(sel.id, { notes: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Conectar para…</label>
                  <Select onValueChange={(v) => connectNodes(sel.id, v)}>
                    <SelectTrigger className="min-h-11"><SelectValue placeholder="Selecione destino" /></SelectTrigger>
                    <SelectContent>
                      {orderedActivities.filter((a) => a.id !== sel.id).map((a) => (
                        <SelectItem key={a.id} value={a.id}>{a.title || "(sem título)"}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function ListView({
  activities, edges, connectFromId, onSetConnectFrom, onAddAfter, onSelect, onConnect, onRemove, onChangeType, onChangeTitle,
}: {
  activities: Activity[];
  edges: Edge[];
  connectFromId: string | null;
  onSetConnectFrom: (id: string | null) => void;
  onAddAfter: (afterId: string) => Promise<string>;
  onSelect: (id: string) => void;
  onConnect: (source: string, target: string) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
  onChangeType: (id: string, type: string) => void;
  onChangeTitle: (id: string, title: string) => void;
}) {
  if (activities.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-center p-6 border-2 border-dashed rounded-lg">
        <div>
          <p className="text-sm text-muted-foreground mb-1">Nenhuma atividade ainda.</p>
          <p className="text-xs text-muted-foreground">Toque em "Adicionar" para criar a primeira etapa.</p>
        </div>
      </div>
    );
  }

  function outgoingFor(id: string): string[] {
    return edges.filter((e) => e.source === id).map((e) => e.target);
  }

  return (
    <div className="flex-1 overflow-y-auto space-y-1 py-2">
      {activities.map((a, idx) => {
        const out = outgoingFor(a.id);
        const isConnecting = connectFromId === a.id;
        return (
          <div key={a.id}>
            <div
              className={cn(
                "rounded-lg border-2 p-3 min-h-[80px] flex items-start gap-2",
                TYPE_COLORS[a.type] ?? TYPE_COLORS.task,
                isConnecting && "ring-2 ring-primary ring-offset-2",
              )}
            >
              <div className="flex-shrink-0 mt-1">
                <select
                  value={a.type}
                  onChange={(e) => onChangeType(a.id, e.target.value)}
                  className="text-[10px] font-bold uppercase bg-transparent border-0 px-0 cursor-pointer"
                >
                  {Object.entries(TYPE_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
              </div>
              <input
                value={a.title}
                onChange={(e) => onChangeTitle(a.id, e.target.value)}
                className="flex-1 min-w-0 bg-transparent border-0 text-sm font-medium focus:outline-none focus:ring-0"
                placeholder="Descreva a etapa"
              />
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => {
                    if (connectFromId && connectFromId !== a.id) {
                      onConnect(connectFromId, a.id).then(() => onSetConnectFrom(null));
                    } else {
                      onSetConnectFrom(isConnecting ? null : a.id);
                    }
                  }}
                  className="min-h-9 min-w-9 grid place-items-center rounded hover:bg-black/5"
                  title={isConnecting ? "Cancelar" : "Conectar a outra"}
                >
                  <Link2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => onSelect(a.id)}
                  className="min-h-9 min-w-9 grid place-items-center rounded hover:bg-black/5"
                  title="Editar"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
                <button
                  onClick={() => onRemove(a.id)}
                  className="min-h-9 min-w-9 grid place-items-center rounded hover:bg-black/5"
                  title="Remover"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {out.length > 0 && (
              <div className="ml-4 mt-1 mb-1 text-[11px] text-muted-foreground">
                {out.map((tid) => {
                  const t = activities.find((x) => x.id === tid);
                  return (
                    <div key={tid} className="flex items-center gap-1">
                      <ArrowDown className="h-3 w-3" />
                      <span className="truncate">{t?.title ?? "—"}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {idx < activities.length - 1 && out.length === 0 && (
              <button
                onClick={() => onConnect(a.id, activities[idx + 1].id)}
                className="w-full my-1 py-2 text-xs text-muted-foreground border-2 border-dashed rounded hover:bg-secondary min-h-10 flex items-center justify-center gap-1"
              >
                <ArrowDown className="h-3 w-3" /> Conectar à próxima
              </button>
            )}
          </div>
        );
      })}

      <button
        onClick={() => onAddAfter(activities[activities.length - 1].id)}
        className="w-full mt-3 py-3 text-sm font-medium border-2 border-dashed rounded-lg hover:bg-secondary min-h-12 flex items-center justify-center gap-1"
      >
        <Plus className="h-4 w-4" /> Adicionar próxima etapa
      </button>
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="text-xs text-muted-foreground">{label}</label>
      <input
        type={type}
        className="w-full text-sm border rounded px-3 py-2 bg-background min-h-11"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
