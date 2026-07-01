import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listWorkHours, saveWorkHours, deleteWorkHours } from "@/lib/work-hours.functions";
import { listProjects } from "@/lib/projects.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Clock, Pencil, Check } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/horas/")({
  component: HorasPage,
});

type Row = {
  id?: string;
  project_id: string | null;
  company_id: string | null;
  responsible: string;
  activity_type: "consultoria" | "execucao" | "reuniao" | "outro";
  work_date: string;
  hours: number;
  notes: string;
};

const TYPES = [
  { value: "consultoria", label: "Consultoria" },
  { value: "execucao", label: "Execução" },
  { value: "reuniao", label: "Reunião" },
  { value: "outro", label: "Outro" },
] as const;

const empty = (): Row => ({
  project_id: null,
  company_id: null,
  responsible: "",
  activity_type: "consultoria",
  work_date: new Date().toISOString().slice(0, 10),
  hours: 1,
  notes: "",
});

function HorasPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<string>("__all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);

  const list = useServerFn(listWorkHours);
  const projs = useServerFn(listProjects);
  const save = useServerFn(saveWorkHours);
  const del = useServerFn(deleteWorkHours);

  const { data: projects = [] } = useQuery({ queryKey: ["projects"], queryFn: () => projs() });
  const { data: rows = [] } = useQuery({
    queryKey: ["work-hours", filter],
    queryFn: () => list({ data: filter === "__all" ? {} : { project_id: filter } }),
  });

  const saveMut = useMutation({
    mutationFn: (payload: Row) => save({ data: payload as any }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["work-hours"] }); setOpen(false); setEditing(null); toast.success("Salvo"); },
    onError: (e: any) => toast.error(e?.message),
  });
  const delMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["work-hours"] }),
  });

  useEffect(() => { if (!editing && open) setEditing(empty()); }, [open, editing]);

  function openNew() { setEditing(empty()); setOpen(true); }
  function openEdit(r: any) {
    setEditing({
      id: r.id, project_id: r.project_id, company_id: r.company_id,
      responsible: r.responsible, activity_type: r.activity_type,
      work_date: r.work_date, hours: Number(r.hours), notes: r.notes ?? "",
    });
    setOpen(true);
  }
  function submit() {
    if (!editing) return;
    if (!editing.responsible.trim()) return toast.error("Informe o responsável");
    if (!editing.hours || editing.hours <= 0) return toast.error("Horas > 0");
    const project = projects.find((p: any) => p.id === editing.project_id);
    saveMut.mutate({ ...editing, company_id: project?.company_id ?? editing.company_id });
  }

  const total = rows.reduce((s: number, r: any) => s + Number(r.hours ?? 0), 0);
  const byResp: Record<string, number> = {};
  for (const r of rows) byResp[r.responsible ?? "—"] = (byResp[r.responsible ?? "—"] ?? 0) + Number(r.hours ?? 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Horas Trabalhadas</h1>
          <p className="text-xs text-muted-foreground">Registro por projeto e responsável</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-52"><SelectValue placeholder="Projeto" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">Todos os projetos</SelectItem>
              {projects.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
            <DialogTrigger asChild>
              <Button onClick={openNew} className="min-h-10"><Plus className="h-4 w-4 mr-1" /> Registrar</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editing?.id ? "Editar" : "Registrar"} horas</DialogTitle></DialogHeader>
              {editing && (
                <div className="space-y-3">
                  <div>
                    <Label>Projeto</Label>
                    <Select value={editing.project_id ?? ""} onValueChange={(v) => setEditing({ ...editing, project_id: v || null })}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>{projects.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}{p.companies?.name ? ` · ${p.companies.name}` : ""}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label>Data</Label><Input type="date" value={editing.work_date} onChange={(e) => setEditing({ ...editing, work_date: e.target.value })} /></div>
                    <div><Label>Horas</Label><Input type="number" step="0.25" min="0" value={editing.hours} onChange={(e) => setEditing({ ...editing, hours: Number(e.target.value) })} /></div>
                    <div><Label>Responsável</Label><Input value={editing.responsible} onChange={(e) => setEditing({ ...editing, responsible: e.target.value })} /></div>
                    <div>
                      <Label>Tipo</Label>
                      <Select value={editing.activity_type} onValueChange={(v) => setEditing({ ...editing, activity_type: v as any })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div><Label>Observações</Label><Textarea value={editing.notes} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} /></div>
                  <Button onClick={submit} className="w-full min-h-11" disabled={saveMut.isPending}>
                    <Check className="h-4 w-4 mr-1" /> {saveMut.isPending ? "Salvando…" : "Salvar"}
                  </Button>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Card className="p-3">
          <p className="text-[10px] uppercase text-muted-foreground">Total</p>
          <p className="text-2xl font-bold tabular-nums">{total.toFixed(1)} h</p>
        </Card>
        <Card className="p-3">
          <p className="text-[10px] uppercase text-muted-foreground">Registros</p>
          <p className="text-2xl font-bold tabular-nums">{rows.length}</p>
        </Card>
        <Card className="p-3 col-span-2">
          <p className="text-[10px] uppercase text-muted-foreground mb-1">Por responsável</p>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(byResp).map(([name, h]) => (
              <span key={name} className="rounded-full bg-primary/10 text-primary px-2 py-0.5 text-xs">
                {name}: <strong className="tabular-nums">{h.toFixed(1)}h</strong>
              </span>
            ))}
            {Object.keys(byResp).length === 0 && <span className="text-xs text-muted-foreground">Sem registros</span>}
          </div>
        </Card>
      </div>

      {rows.length === 0 ? (
        <Card className="p-8 text-center">
          <Clock className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Nenhum registro de horas ainda.</p>
        </Card>
      ) : (
        <div className="grid gap-2">
          {rows.map((r: any) => (
            <Card key={r.id} className="p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] uppercase text-muted-foreground">
                    {r.projects?.name ?? "Sem projeto"}{r.companies?.name ? ` · ${r.companies.name}` : ""}
                  </p>
                  <p className="font-semibold">
                    <span className="tabular-nums">{Number(r.hours).toFixed(1)} h</span> · {r.responsible || "—"}
                  </p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {new Date(r.work_date + "T00:00:00").toLocaleDateString("pt-BR")} · {r.activity_type}
                    {r.notes && ` · ${r.notes}`}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button size="icon" variant="ghost" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" className="text-destructive" onClick={() => confirm("Excluir?") && delMut.mutate(r.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
