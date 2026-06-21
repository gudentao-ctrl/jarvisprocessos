import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, ClipboardList, Trash2 } from "lucide-react";
import { listActionPlans, saveActionPlan, deleteActionPlan } from "@/lib/processes.functions";
import { listCompanies } from "@/lib/interviews.functions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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

function PlanosPage() {
  const [list, setList] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [filter, setFilter] = useState<"all" | "aberto" | "em_andamento" | "concluido">("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", responsible: "", company_id: "", priority: "media", status: "aberto", due_date: "" });
  const reload = () => listActionPlans().then(setList);
  useEffect(() => { reload(); listCompanies().then(setCompanies); }, []);

  async function submit() {
    if (!form.title) return toast.error("Título obrigatório");
    try {
      await saveActionPlan({ data: { ...form, company_id: form.company_id || null, due_date: form.due_date || null, priority: form.priority as any, status: form.status as any } });
      toast.success("Salvo"); setOpen(false); setForm({ title: "", description: "", responsible: "", company_id: "", priority: "media", status: "aberto", due_date: "" });
      reload();
    } catch (e: any) { toast.error(e?.message); }
  }
  async function updateStatus(p: any, status: string) {
    await saveActionPlan({ data: { id: p.id, title: p.title, status: status as any } });
    reload();
  }

  const filtered = filter === "all" ? list : list.filter((p) => p.status === filter);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Planos de Ação</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" /> Novo</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo plano de ação</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Título *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
              <div><Label>Descrição</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Responsável</Label><Input value={form.responsible} onChange={(e) => setForm({ ...form, responsible: e.target.value })} /></div>
                <div><Label>Prazo</Label><Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Prioridade</Label>
                  <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{["baixa", "media", "alta", "critica"].map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Empresa</Label>
                  <Select value={form.company_id} onValueChange={(v) => setForm({ ...form, company_id: v })}>
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>{companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={submit} className="w-full">Criar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

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
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
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
              <Button size="icon" variant="ghost" onClick={async () => { if (confirm("Excluir?")) { await deleteActionPlan({ data: { id: p.id } }); reload(); } }}><Trash2 className="h-4 w-4" /></Button>
            </div>
          </Card>
        ))}</div>
      )}
    </div>
  );
}
