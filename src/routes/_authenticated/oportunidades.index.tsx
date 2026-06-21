import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import {
  listOpportunities, updateOpportunity, deleteOpportunity,
  approveOpportunityAsPlan, rejectOpportunity, createOpportunity,
} from "@/lib/analysis.functions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Check, X, Trash2, Edit3, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { listProcesses } from "@/lib/processes.functions";
import { listCompanies } from "@/lib/interviews.functions";

export const Route = createFileRoute("/_authenticated/oportunidades")({
  component: Page,
});

const PRIO_COLOR: Record<string, string> = {
  critica: "bg-red-500/15 text-red-600 border-red-500/30",
  alta: "bg-orange-500/15 text-orange-600 border-orange-500/30",
  media: "bg-yellow-500/15 text-yellow-700 border-yellow-500/30",
  baixa: "bg-muted text-muted-foreground border-border",
};

const STATUS_LABEL: Record<string, string> = {
  sugerida: "Sugerida", aprovada: "Aprovada", rejeitada: "Rejeitada",
  em_andamento: "Em andamento", implementada: "Implementada",
};

function Page() {
  const list = useServerFn(listOpportunities);
  const upd = useServerFn(updateOpportunity);
  const del = useServerFn(deleteOpportunity);
  const approve = useServerFn(approveOpportunityAsPlan);
  const reject = useServerFn(rejectOpportunity);
  const { data = [], isLoading } = useQuery({ queryKey: ["opportunities"], queryFn: () => list() });
  const qc = useQueryClient();

  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPrio, setFilterPrio] = useState<string>("all");
  const [editId, setEditId] = useState<string | null>(null);

  const filtered = useMemo(() =>
    data.filter((o) =>
      (filterStatus === "all" || o.status === filterStatus) &&
      (filterPrio === "all" || o.priority === filterPrio)
    ), [data, filterStatus, filterPrio]);

  function mutate(fn: (id: string) => Promise<unknown>, msg: string) {
    return (id: string) => fn(id).then(() => {
      toast.success(msg);
      qc.invalidateQueries({ queryKey: ["opportunities"] });
    }).catch((e: Error) => toast.error(e.message));
  }

  const doDelete = mutate((id) => del({ data: { id } }), "Excluída");
  const doReject = mutate((id) => reject({ data: { id } }), "Rejeitada");

  async function doApprove(id: string) {
    try {
      await approve({ data: { id, responsible: "" } });
      toast.success("Aprovada — plano de ação criado");
      qc.invalidateQueries({ queryKey: ["opportunities"] });
    } catch (e) { toast.error((e as Error).message); }
  }

  async function changeStatus(id: string, status: string) {
    await upd({ data: { id, patch: { status: status as never } } });
    qc.invalidateQueries({ queryKey: ["opportunities"] });
  }

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Matriz de Oportunidades</h1>
          <p className="text-muted-foreground mt-1">Aprove, ajuste e converta em planos de ação.</p>
        </div>
        <NewOpportunityDialog onCreated={() => qc.invalidateQueries({ queryKey: ["opportunities"] })} />
      </div>

      <div className="flex flex-wrap gap-2">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos status</SelectItem>
            {Object.entries(STATUS_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterPrio} onValueChange={setFilterPrio}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Prioridade" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas prioridades</SelectItem>
            {["critica", "alta", "media", "baixa"].map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading && <p className="text-muted-foreground">Carregando...</p>}

      <div className="grid gap-3">
        {filtered.map((o) => (
          <Card key={o.id}>
            <CardContent className="p-4 space-y-2">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{o.title}</span>
                    <Badge variant="outline" className={PRIO_COLOR[o.priority]}>{o.priority}</Badge>
                    <Badge variant="secondary">{STATUS_LABEL[o.status]}</Badge>
                    <Badge variant="outline">{o.category}</Badge>
                    {o.source === "ia" && <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">IA</Badge>}
                  </div>
                  {o.description && <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{o.description}</p>}
                  <div className="text-xs text-muted-foreground mt-2 flex flex-wrap gap-3">
                    {(o as { processes?: { name?: string } }).processes?.name && <span>Processo: {(o as { processes: { name: string } }).processes.name}</span>}
                    {(o as { companies?: { name?: string } }).companies?.name && <span>Empresa: {(o as { companies: { name: string } }).companies.name}</span>}
                    <span>Esforço {o.effort} · Impacto {o.impact} · Score {Number(o.priority_score).toFixed(1)}</span>
                  </div>
                  {o.expected_benefit && <p className="text-xs mt-1"><span className="font-medium">Benefício:</span> {o.expected_benefit}</p>}
                </div>
                <div className="flex flex-wrap gap-1 shrink-0">
                  {o.status === "sugerida" && (
                    <>
                      <Button size="sm" onClick={() => doApprove(o.id)}><Check className="h-3.5 w-3.5 mr-1" />Aprovar</Button>
                      <Button size="sm" variant="outline" onClick={() => doReject(o.id)}><X className="h-3.5 w-3.5 mr-1" />Rejeitar</Button>
                    </>
                  )}
                  {o.status === "aprovada" && (
                    <Button size="sm" variant="outline" onClick={() => changeStatus(o.id, "em_andamento")}>Iniciar</Button>
                  )}
                  {o.status === "em_andamento" && (
                    <Button size="sm" variant="outline" onClick={() => changeStatus(o.id, "implementada")}>Concluir</Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => setEditId(o.id)}><Edit3 className="h-3.5 w-3.5" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => doDelete(o.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  {(o as { action_plan_id?: string }).action_plan_id && (
                    <Button size="sm" variant="ghost" asChild>
                      <Link to="/planos-acao"><ClipboardList className="h-3.5 w-3.5" /></Link>
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {!isLoading && filtered.length === 0 && (
          <Card><CardContent className="p-8 text-center text-muted-foreground">Nenhuma oportunidade.</CardContent></Card>
        )}
      </div>

      {editId && <EditDialog id={editId} onClose={() => setEditId(null)} item={data.find((x) => x.id === editId)!} />}
    </div>
  );
}

function NewOpportunityDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const companiesFn = useServerFn(listCompanies);
  const processesFn = useServerFn(listProcesses);
  const create = useServerFn(createOpportunity);
  const { data: companies = [] } = useQuery({ queryKey: ["companies"], queryFn: () => companiesFn(), enabled: open });
  const { data: processes = [] } = useQuery({ queryKey: ["processes"], queryFn: () => processesFn(), enabled: open });

  const [form, setForm] = useState({
    company_id: "", process_id: "", title: "", description: "",
    category: "desperdicio", expected_benefit: "", effort: "medio" as "baixo" | "medio" | "alto",
    impact: "medio" as "baixo" | "medio" | "alto",
  });

  async function submit() {
    if (!form.company_id || !form.title) { toast.error("Empresa e título obrigatórios"); return; }
    try {
      await create({ data: { ...form, process_id: form.process_id || null } });
      toast.success("Oportunidade criada");
      setOpen(false);
      setForm({ ...form, title: "", description: "", expected_benefit: "" });
      onCreated();
    } catch (e) { toast.error((e as Error).message); }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button><Plus className="mr-1 h-4 w-4" />Nova oportunidade</Button></DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Nova oportunidade</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Empresa</Label>
            <Select value={form.company_id} onValueChange={(v) => setForm({ ...form, company_id: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>{companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Processo (opcional)</Label>
            <Select value={form.process_id} onValueChange={(v) => setForm({ ...form, process_id: v })}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>{processes.filter((p) => !form.company_id || p.company_id === form.company_id).map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Título</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div><Label>Descrição</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div><Label>Benefício esperado</Label><Input value={form.expected_benefit} onChange={(e) => setForm({ ...form, expected_benefit: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Esforço</Label>
              <Select value={form.effort} onValueChange={(v) => setForm({ ...form, effort: v as "baixo" | "medio" | "alto" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["baixo", "medio", "alto"].map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Impacto</Label>
              <Select value={form.impact} onValueChange={(v) => setForm({ ...form, impact: v as "baixo" | "medio" | "alto" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["baixo", "medio", "alto"].map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter><Button onClick={submit}>Criar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditDialog({ id, item, onClose }: { id: string; item: { title: string; description: string; expected_benefit: string; effort: string; impact: string }; onClose: () => void }) {
  const upd = useServerFn(updateOpportunity);
  const qc = useQueryClient();
  const [form, setForm] = useState({
    title: item.title, description: item.description, expected_benefit: item.expected_benefit,
    effort: item.effort as "baixo" | "medio" | "alto", impact: item.impact as "baixo" | "medio" | "alto",
  });
  async function save() {
    try {
      await upd({ data: { id, patch: form } });
      toast.success("Salvo");
      qc.invalidateQueries({ queryKey: ["opportunities"] });
      onClose();
    } catch (e) { toast.error((e as Error).message); }
  }
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Editar oportunidade</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Título</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div><Label>Descrição</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div><Label>Benefício esperado</Label><Input value={form.expected_benefit} onChange={(e) => setForm({ ...form, expected_benefit: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Esforço</Label>
              <Select value={form.effort} onValueChange={(v) => setForm({ ...form, effort: v as "baixo" | "medio" | "alto" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["baixo", "medio", "alto"].map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Impacto</Label>
              <Select value={form.impact} onValueChange={(v) => setForm({ ...form, impact: v as "baixo" | "medio" | "alto" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["baixo", "medio", "alto"].map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter><Button onClick={save}>Salvar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
