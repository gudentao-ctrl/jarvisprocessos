import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Trash2, Plus, HeartCrack } from "lucide-react";
import { PageHeader, StatPill } from "@/components/mapping/PageHeader";
import { EmptyState } from "@/components/mapping/EmptyState";
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

  const severe = list.filter((p) => (p.severity ?? 0) >= 4).length;
  const activeCats = grouped.filter((g) => g.items.length > 0);

  const newButton = (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button className="min-h-10"><Plus className="h-4 w-4 mr-1" /> Nova dor</Button></DialogTrigger>
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
          <Button onClick={submit} className="w-full min-h-11">Criar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Mapa de Dores"
        subtitle="Consolidado de problemas por categoria"
        icon={HeartCrack}
        accent="pain"
        actions={newButton}
        stats={
          <>
            <StatPill label="Dores" value={list.length} accent="pain" />
            <StatPill label="Categorias" value={activeCats.length} accent="decision" />
            <StatPill label="Alta severidade" value={severe} accent="process" />
          </>
        }
      />

      {list.length === 0 ? (
        <EmptyState
          icon={HeartCrack}
          accent="pain"
          title="Sem dores registradas"
          description="Registre manualmente ou gere automaticamente a partir das entrevistas."
          action={newButton}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {activeCats.map((g) => (
            <section key={g.cat} className="overflow-hidden rounded-2xl border border-border/70 bg-card">
              <div className="flex items-center gap-2 border-b border-border/60 bg-map-pain/8 px-3 py-2">
                <span className="h-2 w-2 shrink-0 rounded-full bg-map-pain" />
                <p className="min-w-0 truncate text-xs font-bold uppercase tracking-wide text-map-pain">{CAT_LABEL[g.cat]}</p>
                <span className="ml-auto shrink-0 rounded-full bg-background px-2 py-0.5 text-[10px] font-bold tabular-nums text-muted-foreground">
                  {g.items.length}
                </span>
              </div>
              <div className="space-y-2 p-3">
                {g.items.map((p) => (
                  <div key={p.id} className="group rounded-xl border border-border/60 bg-background/60 p-2.5">
                    <p className="text-sm">{p.description}</p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <span className="min-w-0 truncate text-[10px] text-muted-foreground">
                        {p.companies?.name ?? "—"} · {p.source ?? "manual"}
                      </span>
                      <div className="ml-auto flex shrink-0 items-center gap-1">
                        <Select value={p.category} onValueChange={(v) => reclassify(p, v)}>
                          <SelectTrigger className="h-7 w-28 text-[10px]"><SelectValue /></SelectTrigger>
                          <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{CAT_LABEL[c]}</SelectItem>)}</SelectContent>
                        </Select>
                        <button
                          aria-label="Excluir dor"
                          onClick={async () => { await deletePain({ data: { id: p.id } }); reload(); }}
                          className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
