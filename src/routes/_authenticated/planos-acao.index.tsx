import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, ClipboardList, Trash2, Pencil } from "lucide-react";
import { listActionPlans, saveActionPlan, deleteActionPlan } from "@/lib/processes.functions";
import { listCompanies } from "@/lib/interviews.functions";
import { useActiveCompany } from "@/lib/active-company";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/planos-acao/")({
  component: PlanosPage,
});

const STATUS_LABEL: any = { aberto: "Aberto", em_andamento: "Em andamento", concluido: "Concluído" };
const PRIORITY_COLORS: any = {
  baixa: "bg-slate-100 text-slate-700",
  media: "bg-blue-100 text-blue-700",
  alta: "bg-amber-100 text-amber-700",
  critica: "bg-rose-100 text-rose-700",
};

type FormState = {
  id?: string;
  title: string;
  description: string;
  problem: string;
  cause: string;
  responsible: string;
  company_id: string;
  priority: string;
  status: string;
  due_date: string;
  gravity: number;
  urgency: number;
  trend: number;
  expected_result: string;
  observations: string;
  origin: string;
};

function emptyForm(companyId: string | null): FormState {
  return {
    title: "", description: "", problem: "", cause: "", responsible: "",
    company_id: companyId ?? "", priority: "media", status: "aberto", due_date: "",
    gravity: 3, urgency: 3, trend: 3,
    expected_result: "", observations: "", origin: "",
  };
}

function PlanosPage() {
  const { companyId } = useActiveCompany();
  const [list, setList] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [filter, setFilter] = useState<"all" | "aberto" | "em_andamento" | "concluido">("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm(companyId));

  const reload = () =>
    listActionPlans({ data: companyId ? { company_id: companyId } : {} })
      .then(setList)
      .catch(() => setList([]));

  useEffect(() => { reload(); listCompanies().then(setCompanies); }, [companyId]);
  useEffect(() => {
    if (companyId) setForm((f) => ({ ...f, company_id: f.company_id || companyId }));
  }, [companyId]);

  function openNew() {
    setForm(emptyForm(companyId));
    setOpen(true);
  }
  function openEdit(p: any) {
    setForm({
      id: p.id,
      title: p.title ?? "",
      description: p.description ?? "",
      problem: p.problem ?? "",
      cause: p.cause ?? "",
      responsible: p.responsible ?? "",
      company_id: p.company_id ?? companyId ?? "",
      priority: p.priority ?? "media",
      status: p.status ?? "aberto",
      due_date: p.due_date ?? "",
      gravity: p.gravity ?? 3,
      urgency: p.urgency ?? 3,
      trend: p.trend ?? 3,
      expected_result: p.expected_result ?? "",
      observations: p.observations ?? "",
      origin: p.origin ?? "",
    });
    setOpen(true);
  }

  async function submit() {
    if (!form.title) return toast.error("Título obrigatório");
    try {
      await saveActionPlan({
        data: {
          ...(form.id ? { id: form.id } : {}),
          title: form.title,
          description: form.description,
          problem: form.problem || null,
          cause: form.cause || null,
          responsible: form.responsible,
          company_id: form.company_id || companyId || null,
          due_date: form.due_date || null,
          priority: form.priority as any,
          status: form.status as any,
          gravity: form.gravity,
          urgency: form.urgency,
          trend: form.trend,
          expected_result: form.expected_result || null,
          observations: form.observations || null,
          origin: form.origin || null,
        },
      });
      toast.success(form.id ? "Alterações salvas" : "Plano criado");
      setOpen(false);
      setForm(emptyForm(companyId));
      reload();
    } catch (e: any) { console.error(e); toast.error(e?.message ?? "Erro ao salvar plano"); }
  }

  async function updateStatus(p: any, status: string) {
    try {
      await saveActionPlan({ data: { id: p.id, title: p.title, status: status as any } });
      reload();
    } catch (e: any) { toast.error(e?.message ?? "Erro"); }
  }

  async function remove(p: any) {
    if (!confirm(`Excluir plano "${p.title}"?`)) return;
    try {
      await deleteActionPlan({ data: { id: p.id } });
      toast.success("Excluído");
      reload();
    } catch (e: any) { toast.error(e?.message ?? "Erro ao excluir"); }
  }

  const filtered = filter === "all" ? list : list.filter((p) => p.status === filter);
  const isEdit = !!form.id;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Planos de Ação</h1>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Novo</Button>
      </div>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setForm(emptyForm(companyId)); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEdit ? "Editar plano de ação" : "Novo plano de ação"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-[70vh] overflow-y-auto">
            <div><Label>Título *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div><Label>Origem</Label><Input placeholder="Entrevista, cronoanálise, indicador..." value={form.origin} onChange={(e) => setForm({ ...form, origin: e.target.value })} /></div>
            <div><Label>Problema</Label><Textarea rows={2} value={form.problem} onChange={(e) => setForm({ ...form, problem: e.target.value })} /></div>
            <div><Label>Causa</Label><Textarea rows={2} value={form.cause} onChange={(e) => setForm({ ...form, cause: e.target.value })} /></div>
            <div><Label>Descrição / Ação</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div><Label>Resultado esperado</Label><Textarea rows={2} value={form.expected_result} onChange={(e) => setForm({ ...form, expected_result: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Responsável</Label><Input value={form.responsible} onChange={(e) => setForm({ ...form, responsible: e.target.value })} /></div>
              <div><Label>Prazo</Label><Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></div>
            </div>
            <div className="rounded-md border p-3 bg-muted/30">
              <p className="text-xs font-semibold mb-2">Matriz GUT (1–5) · pontuação: <span className="tabular-nums text-primary">{form.gravity * form.urgency * form.trend}</span></p>
              <div className="grid grid-cols-3 gap-2">
                <div><Label className="text-xs">Gravidade</Label><Input type="number" min={1} max={5} value={form.gravity} onChange={(e) => setForm({ ...form, gravity: Math.min(5, Math.max(1, Number(e.target.value) || 1)) })} /></div>
                <div><Label className="text-xs">Urgência</Label><Input type="number" min={1} max={5} value={form.urgency} onChange={(e) => setForm({ ...form, urgency: Math.min(5, Math.max(1, Number(e.target.value) || 1)) })} /></div>
                <div><Label className="text-xs">Tendência</Label><Input type="number" min={1} max={5} value={form.trend} onChange={(e) => setForm({ ...form, trend: Math.min(5, Math.max(1, Number(e.target.value) || 1)) })} /></div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Prioridade</Label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["baixa", "media", "alta", "critica"].map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(STATUS_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v as string}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Empresa</Label>
              <Select value={form.company_id} onValueChange={(v) => setForm({ ...form, company_id: v })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>{companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Observações</Label><Textarea rows={2} value={form.observations} onChange={(e) => setForm({ ...form, observations: e.target.value })} /></div>
            <Button onClick={submit} className="w-full min-h-11">{isEdit ? "Salvar alterações" : "Criar"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex gap-2 flex-wrap">
        {(["all", "aberto", "em_andamento", "concluido"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`text-xs px-3 py-1.5 rounded-full border ${filter === f ? "bg-primary text-primary-foreground border-primary" : "hover:bg-secondary"}`}>
            {f === "all" ? "Todos" : STATUS_LABEL[f]}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card className="p-8 text-center"><ClipboardList className="h-10 w-10 mx-auto mb-2 text-muted-foreground" /><p className="text-sm text-muted-foreground">Sem planos.</p></Card>
      ) : (
        <div className="space-y-2">{filtered.map((p) => (
          <Card key={p.id} className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className={`text-[10px] uppercase font-bold rounded px-1.5 py-0.5 ${PRIORITY_COLORS[p.priority]}`}>{p.priority}</span>
                  <p className="font-medium">{p.title}</p>
                </div>
                {p.description && <p className="text-sm text-muted-foreground">{p.description}</p>}
                <p className="text-xs text-muted-foreground mt-1">
                  {p.companies?.name && `${p.companies.name} · `}
                  {p.processes?.name && (<>Processo: <Link to="/processos/$id" params={{ id: p.process_id }} className="text-primary hover:underline">{p.processes.name}</Link> · </>)}
                  {p.responsible && `${p.responsible} · `}
                  {p.due_date && `prazo ${p.due_date}`}
                </p>
              </div>
              <Select value={p.status} onValueChange={(v) => updateStatus(p, v)}>
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(STATUS_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v as string}</SelectItem>)}</SelectContent>
              </Select>
              <Button size="icon" variant="ghost" onClick={() => openEdit(p)} title="Editar">
                <Pencil className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => remove(p)} title="Excluir">
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </Card>
        ))}</div>
      )}
    </div>
  );
}
