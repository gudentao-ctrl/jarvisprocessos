import { useCallback, useEffect, useMemo, useState } from "react";
import ReactFlow, {
  Background, Controls, MiniMap,
  type Node, type Edge, type Connection,
  addEdge, useNodesState, useEdgesState, MarkerType,
} from "reactflow";
import "reactflow/dist/style.css";
import { Button } from "@/components/ui/button";
import { Plus, Save, Trash2 } from "lucide-react";
import { saveActivity, deleteActivity, saveEdge, deleteEdge, saveCanvasLayout } from "@/lib/processes.functions";
import { toast } from "sonner";

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

type Activity = {
  id: string; process_id: string; type: string; title: string; responsible: string;
  area: string; systems: string[]; time_minutes: number; notes: string; x: number; y: number; ordering: number;
};
type EdgeRow = { id: string; process_id: string; source_id: string; target_id: string; label: string };

export function BpmFlow({
  processId, activities: initialActivities, edges: initialEdges,
}: { processId: string; activities: Activity[]; edges: EdgeRow[] }) {
  const initialNodes: Node[] = useMemo(
    () => initialActivities.map((a) => ({
      id: a.id,
      position: { x: Number(a.x ?? 0), y: Number(a.y ?? 0) },
      data: { ...a, label: a.title },
      type: "default",
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
  const [activitiesIndex, setActivitiesIndex] = useState<Record<string, Activity>>(
    Object.fromEntries(initialActivities.map((a) => [a.id, a])),
  );

  useEffect(() => { setNodes(initialNodes); }, [initialNodes, setNodes]);
  useEffect(() => { setEdges(initialFlowEdges); }, [initialFlowEdges, setEdges]);

  const onConnect = useCallback(async (conn: Connection) => {
    if (!conn.source || !conn.target) return;
    try {
      const row = await saveEdge({ data: { process_id: processId, source_id: conn.source, target_id: conn.target, label: "" } });
      setEdges((eds) => addEdge({ id: row.id, source: conn.source!, target: conn.target!, markerEnd: { type: MarkerType.ArrowClosed } }, eds));
    } catch (e: any) { toast.error(e?.message ?? "Erro"); }
  }, [processId, setEdges]);

  async function addNode(type: string) {
    const row = await saveActivity({
      data: {
        process_id: processId, ordering: nodes.length, type: type as any,
        title: TYPE_LABELS[type] ?? "Nova atividade", x: 100 + Math.random() * 200, y: 50 + nodes.length * 30,
      },
    });
    const newNode: Node = {
      id: row.id, position: { x: row.x, y: row.y },
      data: { ...row, label: row.title }, type: "default",
      className: `rounded-lg border-2 px-3 py-2 text-sm font-medium shadow-sm ${TYPE_COLORS[type] ?? TYPE_COLORS.task}`,
    };
    setNodes((nds) => nds.concat(newNode));
    setActivitiesIndex((idx) => ({ ...idx, [row.id]: row as any }));
  }

  async function persistLayout() {
    const positions = nodes.map((n) => ({ id: n.id, x: n.position.x, y: n.position.y }));
    await saveCanvasLayout({ data: { positions } });
    toast.success("Layout salvo");
  }

  async function removeSelected() {
    if (!selected) return;
    try {
      await deleteActivity({ data: { id: selected.id } });
      setNodes((nds) => nds.filter((n) => n.id !== selected.id));
      setEdges((eds) => eds.filter((e) => e.source !== selected.id && e.target !== selected.id));
      setSelected(null);
      toast.success("Atividade removida");
    } catch (e: any) { toast.error(e?.message ?? "Erro"); }
  }

  async function updateSelectedField(patch: Partial<Activity>) {
    if (!selected) return;
    const current = activitiesIndex[selected.id];
    const updated = { ...current, ...patch };
    setActivitiesIndex((idx) => ({ ...idx, [selected.id]: updated }));
    setNodes((nds) =>
      nds.map((n) =>
        n.id === selected.id
          ? { ...n, data: { ...n.data, ...patch, label: patch.title ?? n.data.label },
              className: `rounded-lg border-2 px-3 py-2 text-sm font-medium shadow-sm ${TYPE_COLORS[(patch.type as string) ?? current.type] ?? TYPE_COLORS.task}` }
          : n,
      ),
    );
    try {
      await saveActivity({ data: { ...updated, id: selected.id } as any });
    } catch (e: any) { toast.error(e?.message ?? "Erro ao salvar"); }
  }

  const sel = selected ? activitiesIndex[selected.id] : null;

  return (
    <div className="flex h-[70vh] gap-3">
      <div className="w-40 shrink-0 border rounded-lg bg-background p-2 space-y-1 overflow-y-auto">
        <p className="text-[10px] uppercase font-semibold text-muted-foreground px-2 py-1">Paleta</p>
        {Object.keys(TYPE_LABELS).map((t) => (
          <button
            key={t}
            onClick={() => addNode(t)}
            className={`w-full text-left text-xs rounded px-2 py-1.5 border ${TYPE_COLORS[t]} hover:opacity-80`}
          >
            + {TYPE_LABELS[t]}
          </button>
        ))}
        <div className="pt-2 border-t mt-2 space-y-1">
          <Button size="sm" variant="outline" className="w-full" onClick={persistLayout}>
            <Save className="h-3 w-3 mr-1" /> Salvar layout
          </Button>
        </div>
      </div>
      <div className="flex-1 border rounded-lg bg-background overflow-hidden">
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
          deleteKeyCode={null}
        >
          <Background />
          <Controls />
          <MiniMap pannable zoomable />
        </ReactFlow>
      </div>
      {sel && (
        <div className="w-72 shrink-0 border rounded-lg bg-background p-3 space-y-2 overflow-y-auto">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase font-semibold text-muted-foreground">Atividade</p>
            <Button size="sm" variant="ghost" onClick={removeSelected}><Trash2 className="h-3.5 w-3.5" /></Button>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Tipo</label>
            <select
              className="w-full text-sm border rounded px-2 py-1.5 bg-background"
              value={sel.type}
              onChange={(e) => updateSelectedField({ type: e.target.value })}
            >
              {Object.entries(TYPE_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </div>
          <Field label="Título" value={sel.title} onChange={(v) => updateSelectedField({ title: v })} />
          <Field label="Responsável" value={sel.responsible} onChange={(v) => updateSelectedField({ responsible: v })} />
          <Field label="Área" value={sel.area} onChange={(v) => updateSelectedField({ area: v })} />
          <Field label="Tempo (min)" type="number" value={String(sel.time_minutes ?? 0)} onChange={(v) => updateSelectedField({ time_minutes: Number(v) || 0 })} />
          <Field label="Sistemas (vírgula)" value={(sel.systems ?? []).join(", ")} onChange={(v) => updateSelectedField({ systems: v.split(",").map((s) => s.trim()).filter(Boolean) })} />
          <div>
            <label className="text-xs text-muted-foreground">Observações</label>
            <textarea
              className="w-full text-sm border rounded px-2 py-1.5 bg-background min-h-20"
              value={sel.notes ?? ""}
              onChange={(e) => updateSelectedField({ notes: e.target.value })}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="text-xs text-muted-foreground">{label}</label>
      <input
        type={type}
        className="w-full text-sm border rounded px-2 py-1.5 bg-background"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
