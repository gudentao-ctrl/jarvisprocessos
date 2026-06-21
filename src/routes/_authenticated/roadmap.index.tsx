import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { listRoadmap, saveRoadmapItem, deleteRoadmapItem } from "@/lib/analysis.functions";
import { listCompanies } from "@/lib/interviews.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/roadmap")({ component: Page });

const HORIZON_LABELS = { curto: "Curto prazo", medio: "Médio prazo", longo: "Longo prazo" } as const;

function Page() {
  const listFn = useServerFn(listRoadmap);
  const saveFn = useServerFn(saveRoadmapItem);
  const delFn = useServerFn(deleteRoadmapItem);
  const { data = [] } = useQuery({ queryKey: ["roadmap"], queryFn: () => listFn() });
  const qc = useQueryClient();

  const grouped = { curto: [], medio: [], longo: [] } as Record<string, typeof data>;
  data.forEach((i) => grouped[i.horizon].push(i));

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Roadmap</h1>
          <p className="text-muted-foreground mt-1">Iniciativas por horizonte. Agrupe por tema ou área.</p>
        </div>
        <NewItemDialog onSaved={() => qc.invalidateQueries({ queryKey: ["roadmap"] })} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(["curto", "medio", "longo"] as const).map((h) => (
          <div key={h} className="space-y-3">
            <h2 className="font-semibold flex items-center gap-2">{HORIZON_LABELS[h]}<Badge variant="secondary">{grouped[h].length}</Badge></h2>
            {grouped[h].map((i) => (
              <Card key={i.id}>
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-semibold text-sm">{i.title}</div>
                    <Button size="sm" variant="ghost" onClick={async () => { await delFn({ data: { id: i.id } }); qc.invalidateQueries({ queryKey: ["roadmap"] }); }}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                  {i.description && <p className="text-xs text-muted-foreground">{i.description}</p>}
                  <div className="flex flex-wrap gap-1 text-xs">
                    <Badge variant="outline">{i.priority}</Badge>
                    <Badge variant="outline">esforço {i.effort}</Badge>
                    <Badge variant="outline">{i.status}</Badge>
                  </div>
                  {(i.responsible || i.area || i.theme) && (
                    <div className="text-xs text-muted-foreground">
                      {i.responsible && <span>{i.responsible}</span>}
                      {i.area && <span> · {i.area}</span>}
                      {i.theme && <span> · {i.theme}</span>}
                      {i.deadline && <span> · {new Date(i.deadline).toLocaleDateString()}</span>}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
            {grouped[h].length === 0 && <p className="text-xs text-muted-foreground">Vazio</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

function NewItemDialog({ onSaved }: { onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const saveFn = useServerFn(saveRoadmapItem);
  const companiesFn = useServerFn(listCompanies);
  const { data: companies = [] } = useQuery({ queryKey: ["companies"], queryFn: () => companiesFn(), enabled: open });

  const [form, setForm] = useState({
    company_id: "", title: "", description: "",
    horizon: "curto" as "curto" | "medio" | "longo",
    theme: "", area: "", responsible: "", deadline: "",
    priority: "media" as "baixa" | "media" | "alta" | "critica",
    effort: "medio" as "baixo" | "medio" | "alto", expected_impact: "",
    status: "planejado" as "planejado" | "em_andamento" | "concluido" | "cancelado",
  });

  async function submit() {
    if (!form.company_id || !form.title) { toast.error("Empresa e título obrigatórios"); return; }
    try {
      await saveFn({ data: form });
      toast.success("Adicionado");
      setOpen(false); setForm({ ...form, title: "", description: "" });
      onSaved();
    } catch (e) { toast.error((e as Error).message); }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button><Plus className="mr-1 h-4 w-4" />Nova iniciativa</Button></DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Nova iniciativa</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Empresa</Label>
            <Select value={form.company_id} onValueChange={(v) => setForm({ ...form, company_id: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>{companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Título</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div><Label>Descrição</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Horizonte</Label>
              <Select value={form.horizon} onValueChange={(v) => setForm({ ...form, horizon: v as "curto" | "medio" | "longo" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="curto">Curto</SelectItem><SelectItem value="medio">Médio</SelectItem><SelectItem value="longo">Longo</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>Prioridade</Label>
              <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v as "baixa" | "media" | "alta" | "critica" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["baixa", "media", "alta", "critica"].map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Esforço</Label>
              <Select value={form.effort} onValueChange={(v) => setForm({ ...form, effort: v as "baixo" | "medio" | "alto" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["baixo", "medio", "alto"].map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Prazo</Label><Input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} /></div>
            <div><Label>Responsável</Label><Input value={form.responsible} onChange={(e) => setForm({ ...form, responsible: e.target.value })} /></div>
            <div><Label>Área</Label><Input value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} /></div>
            <div className="col-span-2"><Label>Tema</Label><Input value={form.theme} onChange={(e) => setForm({ ...form, theme: e.target.value })} /></div>
          </div>
        </div>
        <DialogFooter><Button onClick={submit}>Adicionar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
