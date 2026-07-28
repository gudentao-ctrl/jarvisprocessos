import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getCompanyMaps, listProcesses, saveDecisionItem, deleteDecisionItem,
} from "@/lib/processes.functions";
import { listCompanies } from "@/lib/interviews.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Pencil, Check, GitBranch, ShieldCheck, Clock, User } from "lucide-react";
import { PageHeader, StatPill } from "@/components/mapping/PageHeader";
import { EmptyState } from "@/components/mapping/EmptyState";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/mapas/decisao")({
  component: MapaDec,
});

type Item = {
  id?: string;
  process_id: string;
  activity_id?: string | null;
  decider: string;
  decision: string;
  approval_required: boolean;
  reported_delay: string;
  notes: string;
};

const EMPTY: Item = { process_id: "", decider: "", decision: "", approval_required: false, reported_delay: "", notes: "" };

function MapaDec() {
  const qc = useQueryClient();
  const [companyId, setCompanyId] = useState("");
  const [editing, setEditing] = useState<Item | null>(null);
  const [open, setOpen] = useState(false);

  const comp = useServerFn(listCompanies);
  const proc = useServerFn(listProcesses);
  const maps = useServerFn(getCompanyMaps);
  const save = useServerFn(saveDecisionItem);
  const del = useServerFn(deleteDecisionItem);

  const { data: companies = [] } = useQuery({ queryKey: ["companies"], queryFn: () => comp() });
  const { data: processes = [] } = useQuery({ queryKey: ["processes"], queryFn: () => proc() });

  useEffect(() => { if (!companyId && companies[0]) setCompanyId(companies[0].id); }, [companies, companyId]);

  const { data } = useQuery({
    queryKey: ["maps", companyId, "decision"],
    queryFn: () => maps({ data: { company_id: companyId } }),
    enabled: !!companyId,
  });
  const items: any[] = data?.decision ?? [];

  const saveMut = useMutation({
    mutationFn: (payload: Item) => save({ data: payload as any }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["maps", companyId, "decision"] }); setOpen(false); setEditing(null); toast.success("Salvo"); },
    onError: (e: any) => toast.error(e?.message),
  });
  const delMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["maps", companyId, "decision"] }),
  });

  const companyProcesses = processes.filter((p: any) => p.company_id === companyId);

  function openNew() { setEditing({ ...EMPTY, process_id: companyProcesses[0]?.id ?? "" }); setOpen(true); }
  function openEdit(i: any) { setEditing({ ...EMPTY, ...i }); setOpen(true); }
  function submit() {
    if (!editing) return;
    if (!editing.process_id) return toast.error("Selecione um processo");
    if (!editing.decider && !editing.decision) return toast.error("Preencha decisor ou decisão");
    saveMut.mutate(editing);
  }

  const approvals = items.filter((i) => i.approval_required).length;
  const delays = items.filter((i) => !!i.reported_delay).length;

  const actions = (
    <>
      <Select value={companyId} onValueChange={setCompanyId}>
        <SelectTrigger className="h-10 w-40 sm:w-52"><SelectValue placeholder="Empresa" /></SelectTrigger>
        <SelectContent>{companies.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
      </Select>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button onClick={openNew} disabled={companyProcesses.length === 0} className="min-h-10"><Plus className="h-4 w-4 mr-1" /> Novo</Button>
        </DialogTrigger>

            <DialogContent>
              <DialogHeader><DialogTitle>{editing?.id ? "Editar" : "Nova"} decisão</DialogTitle></DialogHeader>
              {editing && (
                <div className="space-y-3">
                  <div>
                    <Label>Processo *</Label>
                    <Select value={editing.process_id} onValueChange={(v) => setEditing({ ...editing, process_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>{companyProcesses.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Decisor</Label><Input value={editing.decider} onChange={(e) => setEditing({ ...editing, decider: e.target.value })} /></div>
                  <div><Label>Decisão</Label><Input value={editing.decision} onChange={(e) => setEditing({ ...editing, decision: e.target.value })} /></div>
                  <div><Label>Atraso relatado</Label><Input value={editing.reported_delay} onChange={(e) => setEditing({ ...editing, reported_delay: e.target.value })} placeholder="ex.: 2 dias" /></div>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={editing.approval_required} onChange={(e) => setEditing({ ...editing, approval_required: e.target.checked })} />
                    Requer aprovação
                  </label>
                  <div><Label>Notas</Label><Textarea value={editing.notes} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} /></div>
                  <Button onClick={submit} className="w-full min-h-11" disabled={saveMut.isPending}>
                    <Check className="h-4 w-4 mr-1" /> {saveMut.isPending ? "Salvando…" : "Salvar"}
                  </Button>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {companyProcesses.length === 0 && (
        <Card className="p-6 text-center text-sm text-muted-foreground">Cadastre processos nesta empresa primeiro.</Card>
      )}

      {items.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">Sem decisões mapeadas.</Card>
      ) : (
        <div className="grid gap-2">
          {items.map((i: any) => {
            const p = processes.find((x: any) => x.id === i.process_id);
            return (
              <Card key={i.id} className="p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase text-muted-foreground">{p?.name ?? "—"}</p>
                    <p className="font-semibold">{i.decision || "(sem decisão)"}</p>
                    <p className="text-xs text-muted-foreground">
                      Decisor: <strong>{i.decider || "—"}</strong>
                      {i.approval_required && " · requer aprovação"}
                      {i.reported_delay && ` · atraso: ${i.reported_delay}`}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(i)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" className="text-destructive" onClick={() => confirm("Excluir?") && delMut.mutate(i.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
