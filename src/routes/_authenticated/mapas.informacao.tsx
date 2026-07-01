import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getCompanyMaps, listProcesses, saveInformationItem, deleteInformationItem,
} from "@/lib/processes.functions";
import { listCompanies } from "@/lib/interviews.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Pencil, Check } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/mapas/informacao")({
  component: MapaInfo,
});

type Item = {
  id?: string;
  process_id: string;
  activity_id?: string | null;
  origin: string;
  destination: string;
  medium: string;
  responsible: string;
  document: string;
  loss_risk: boolean;
  notes: string;
};

const EMPTY: Item = { process_id: "", origin: "", destination: "", medium: "", responsible: "", document: "", loss_risk: false, notes: "" };

function MapaInfo() {
  const qc = useQueryClient();
  const [companyId, setCompanyId] = useState("");
  const [editing, setEditing] = useState<Item | null>(null);
  const [open, setOpen] = useState(false);

  const comp = useServerFn(listCompanies);
  const proc = useServerFn(listProcesses);
  const maps = useServerFn(getCompanyMaps);
  const save = useServerFn(saveInformationItem);
  const del = useServerFn(deleteInformationItem);

  const { data: companies = [] } = useQuery({ queryKey: ["companies"], queryFn: () => comp() });
  const { data: processes = [] } = useQuery({ queryKey: ["processes"], queryFn: () => proc() });

  useEffect(() => { if (!companyId && companies[0]) setCompanyId(companies[0].id); }, [companies, companyId]);

  const { data } = useQuery({
    queryKey: ["maps", companyId, "information"],
    queryFn: () => maps({ data: { company_id: companyId } }),
    enabled: !!companyId,
  });
  const items: any[] = data?.information ?? [];

  const saveMut = useMutation({
    mutationFn: (payload: Item) => save({ data: payload as any }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["maps", companyId, "information"] }); setOpen(false); setEditing(null); toast.success("Salvo"); },
    onError: (e: any) => toast.error(e?.message),
  });
  const delMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["maps", companyId, "information"] }),
  });

  const companyProcesses = processes.filter((p: any) => p.company_id === companyId);

  function openNew() { setEditing({ ...EMPTY, process_id: companyProcesses[0]?.id ?? "" }); setOpen(true); }
  function openEdit(i: any) { setEditing({ ...EMPTY, ...i }); setOpen(true); }
  function submit() {
    if (!editing) return;
    if (!editing.process_id) return toast.error("Selecione um processo");
    saveMut.mutate(editing);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold sm:text-2xl">Mapa de Informação</h1>
        <div className="flex items-center gap-2">
          <Select value={companyId} onValueChange={setCompanyId}>
            <SelectTrigger className="w-52"><SelectValue placeholder="Empresa" /></SelectTrigger>
            <SelectContent>{companies.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={openNew} disabled={companyProcesses.length === 0} className="min-h-10"><Plus className="h-4 w-4 mr-1" /> Novo</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editing?.id ? "Editar" : "Novo"} fluxo de informação</DialogTitle></DialogHeader>
              {editing && (
                <div className="space-y-3">
                  <div>
                    <Label>Processo *</Label>
                    <Select value={editing.process_id} onValueChange={(v) => setEditing({ ...editing, process_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>{companyProcesses.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label>Origem</Label><Input value={editing.origin} onChange={(e) => setEditing({ ...editing, origin: e.target.value })} /></div>
                    <div><Label>Destino</Label><Input value={editing.destination} onChange={(e) => setEditing({ ...editing, destination: e.target.value })} /></div>
                    <div><Label>Meio</Label><Input value={editing.medium} onChange={(e) => setEditing({ ...editing, medium: e.target.value })} placeholder="e-mail, planilha…" /></div>
                    <div><Label>Responsável</Label><Input value={editing.responsible} onChange={(e) => setEditing({ ...editing, responsible: e.target.value })} /></div>
                    <div className="col-span-2"><Label>Documento</Label><Input value={editing.document} onChange={(e) => setEditing({ ...editing, document: e.target.value })} /></div>
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={editing.loss_risk} onChange={(e) => setEditing({ ...editing, loss_risk: e.target.checked })} />
                    Risco de perda da informação
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
        <Card className="p-6 text-center text-sm text-muted-foreground">Sem fluxos mapeados.</Card>
      ) : (
        <div className="grid gap-2">
          {items.map((i: any) => {
            const p = processes.find((x: any) => x.id === i.process_id);
            return (
              <Card key={i.id} className="p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase text-muted-foreground">{p?.name ?? "—"}</p>
                    <p className="font-semibold text-sm">
                      {i.origin || "—"} → {i.destination || "—"}
                      {i.loss_risk && <span className="ml-2 text-xs text-rose-600">⚠ risco</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Meio: <strong>{i.medium || "—"}</strong>
                      {i.responsible && ` · ${i.responsible}`}
                      {i.document && ` · ${i.document}`}
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
