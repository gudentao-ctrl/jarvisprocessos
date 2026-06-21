import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Map, Trash2, Plus } from "lucide-react";
import { listPains, savePain, deletePain } from "@/lib/processes.functions";
import { listCompanies } from "@/lib/interviews.functions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/mapas/dores")({
  component: MapaDores,
});

const CATEGORIES = ["processo", "informacao", "governanca", "pessoas", "tecnologia", "planejamento", "qualidade", "producao", "compras", "logistica"] as const;
const CAT_LABEL: any = {
  processo: "Processo", informacao: "Informação", governanca: "Governança", pessoas: "Pessoas",
  tecnologia: "Tecnologia", planejamento: "Planejamento", qualidade: "Qualidade",
  producao: "Produção", compras: "Compras", logistica: "Logística",
};

function MapaDores() {
  const [list, setList] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ company_id: "", category: "processo", description: "", severity: 3 });
  const reload = () => listPains().then(setList);
  useEffect(() => { reload(); listCompanies().then(setCompanies); }, []);

  const grouped = CATEGORIES.map((c) => ({ cat: c, items: list.filter((p) => p.category === c) }));

  async function submit() {
    if (!form.description) return toast.error("Descrição obrigatória");
    try {
      await savePain({ data: { ...form, company_id: form.company_id || null, category: form.category as any } });
      setOpen(false); setForm({ company_id: "", category: "processo", description: "", severity: 3 });
      reload();
    } catch (e: any) { toast.error(e?.message); }
  }
  async function reclassify(p: any, cat: string) {
    await savePain({ data: { id: p.id, category: cat as any, description: p.description, severity: p.severity, source: p.source } });
    reload();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Mapa de Dores</h1>
          <p className="text-sm text-muted-foreground">Consolidado de problemas por categoria</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" /> Nova dor</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nova dor</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Descrição *</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Categoria</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{CAT_LABEL[c]}</SelectItem>)}</SelectContent>
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

      {list.length === 0 ? (
        <Card className="p-8 text-center"><Map className="h-10 w-10 mx-auto mb-2 text-muted-foreground" /><p className="text-sm text-muted-foreground">Sem dores registradas.</p></Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">{grouped.filter((g) => g.items.length > 0).map((g) => (
          <Card key={g.cat} className="p-3">
            <p className="text-xs uppercase font-bold text-primary mb-2">{CAT_LABEL[g.cat]} <span className="text-muted-foreground font-normal">({g.items.length})</span></p>
            <div className="space-y-2">{g.items.map((p) => (
              <div key={p.id} className="text-sm border-l-2 border-primary/30 pl-2 group">
                <p>{p.description}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] text-muted-foreground">{p.companies?.name} · {p.source}</span>
                  <Select value={p.category} onValueChange={(v) => reclassify(p, v)}>
                    <SelectTrigger className="h-6 text-[10px] w-28 ml-auto"><SelectValue /></SelectTrigger>
                    <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{CAT_LABEL[c]}</SelectItem>)}</SelectContent>
                  </Select>
                  <button onClick={async () => { await deletePain({ data: { id: p.id } }); reload(); }} className="opacity-0 group-hover:opacity-100"><Trash2 className="h-3 w-3" /></button>
                </div>
              </div>
            ))}</div>
          </Card>
        ))}</div>
      )}
    </div>
  );
}
