import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { createCronoSession, listProcesses } from "@/lib/processes.functions";
import { listCompanies } from "@/lib/interviews.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/cronoanalise/nova")({
  component: CronoNova,
});

function CronoNova() {
  const router = useRouter();
  const [companies, setCompanies] = useState<any[]>([]);
  const [processes, setProcesses] = useState<any[]>([]);
  const [form, setForm] = useState({
    company_id: "", process_id: "", production_line: "", machine: "", product: "",
    observer: "", observation_date: new Date().toISOString().slice(0, 10),
    takt_time: "", notes: "",
  });

  useEffect(() => { Promise.all([listCompanies(), listProcesses()]).then(([c, p]) => { setCompanies(c); setProcesses(p); }); }, []);

  async function submit() {
    if (!form.product) return toast.error("Informe o produto");
    try {
      const row = await createCronoSession({
        data: {
          company_id: form.company_id || null,
          process_id: form.process_id || null,
          production_line: form.production_line,
          machine: form.machine,
          product: form.product,
          observer: form.observer,
          observation_date: form.observation_date,
          takt_time: form.takt_time ? Number(form.takt_time) : null,
          notes: form.notes,
        },
      });
      toast.success("Sessão criada");
      router.navigate({ to: "/cronoanalise/$id", params: { id: row.id } });
    } catch (e: any) { toast.error(e?.message ?? "Erro"); }
  }

  return (
    <div className="max-w-2xl space-y-4">
      <Link to="/cronoanalise" className="inline-flex items-center text-sm text-muted-foreground"><ArrowLeft className="h-4 w-4 mr-1" /> Voltar</Link>
      <h1 className="text-2xl font-bold">Nova sessão de cronoanálise</h1>
      <Card className="p-4 space-y-3">
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Label>Empresa</Label>
            <Select value={form.company_id} onValueChange={(v) => setForm({ ...form, company_id: v })}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>{companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Processo</Label>
            <Select value={form.process_id} onValueChange={(v) => setForm({ ...form, process_id: v })}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>{processes.filter((p) => !form.company_id || p.company_id === form.company_id).map((p) => <SelectItem key={p.id} value={p.id}>N{p.level} — {p.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Linha de produção</Label><Input value={form.production_line} onChange={(e) => setForm({ ...form, production_line: e.target.value })} /></div>
          <div><Label>Máquina</Label><Input value={form.machine} onChange={(e) => setForm({ ...form, machine: e.target.value })} /></div>
          <div><Label>Produto *</Label><Input value={form.product} onChange={(e) => setForm({ ...form, product: e.target.value })} /></div>
          <div><Label>Observador</Label><Input value={form.observer} onChange={(e) => setForm({ ...form, observer: e.target.value })} /></div>
          <div><Label>Data</Label><Input type="date" value={form.observation_date} onChange={(e) => setForm({ ...form, observation_date: e.target.value })} /></div>
          <div><Label>Takt time (min)</Label><Input type="number" step="0.01" value={form.takt_time} onChange={(e) => setForm({ ...form, takt_time: e.target.value })} /></div>
        </div>
        <Button className="w-full" size="lg" onClick={submit}>Criar e iniciar observações</Button>
      </Card>
    </div>
  );
}
