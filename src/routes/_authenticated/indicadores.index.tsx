import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Trash2, BarChart3 } from "lucide-react";
import { listIndicators, saveIndicator, deleteIndicator, listProcesses } from "@/lib/processes.functions";
import { listCompanies } from "@/lib/interviews.functions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/indicadores/")({
  component: IndicadoresPage,
});

function IndicadoresPage() {
  const [list, setList] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [processes, setProcesses] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ company_id: "", process_id: "", name: "", unit: "", target: "", frequency: "" });
  const reload = () => listIndicators().then(setList);
  useEffect(() => { reload(); listCompanies().then(setCompanies); listProcesses().then(setProcesses); }, []);

  async function submit() {
    if (!form.name) return toast.error("Nome obrigatório");
    try {
      await saveIndicator({ data: {
        company_id: form.company_id || null, process_id: form.process_id || null,
        name: form.name, unit: form.unit, target: form.target ? Number(form.target) : null, frequency: form.frequency,
      } });
      toast.success("Salvo"); setOpen(false); setForm({ company_id: "", process_id: "", name: "", unit: "", target: "", frequency: "" });
      reload();
    } catch (e: any) { toast.error(e?.message); }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Indicadores</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" /> Novo</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo indicador</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Nome *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Unidade</Label><Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} /></div>
                <div><Label>Meta</Label><Input type="number" value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })} /></div>
              </div>
              <div><Label>Frequência</Label><Input value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })} placeholder="diário, semanal…" /></div>
              <div><Label>Empresa</Label>
                <Select value={form.company_id} onValueChange={(v) => setForm({ ...form, company_id: v })}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>{companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Processo</Label>
                <Select value={form.process_id} onValueChange={(v) => setForm({ ...form, process_id: v })}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>{processes.filter((p) => !form.company_id || p.company_id === form.company_id).map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Button onClick={submit} className="w-full">Criar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {list.length === 0 ? (
        <Card className="p-8 text-center"><BarChart3 className="h-10 w-10 mx-auto mb-2 text-muted-foreground" /><p className="text-sm text-muted-foreground">Sem indicadores.</p></Card>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">{list.map((i) => (
          <Card key={i.id} className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium">{i.name}</p>
                <p className="text-xs text-muted-foreground">{i.companies?.name} · {i.processes?.name}</p>
                <p className="text-xs text-muted-foreground mt-1">Meta {i.target ?? "—"} {i.unit} · {i.frequency}</p>
              </div>
              <Button size="icon" variant="ghost" onClick={async () => { if (confirm("Excluir?")) { await deleteIndicator({ data: { id: i.id } }); reload(); } }}><Trash2 className="h-4 w-4" /></Button>
            </div>
          </Card>
        ))}</div>
      )}
    </div>
  );
}
