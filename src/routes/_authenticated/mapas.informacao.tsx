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
import { Plus, Trash2, Pencil, Check, Share2, ArrowRight, AlertTriangle, FileText, User } from "lucide-react";
import { PageHeader, StatPill } from "@/components/mapping/PageHeader";
import { EmptyState } from "@/components/mapping/EmptyState";
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

function Chip({ icon: Icon, children }: { icon?: any; children: React.ReactNode }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
      {Icon && <Icon className="h-3 w-3 shrink-0" />}
      <span className="truncate">{children}</span>
    </span>
  );
}

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
  const riskCount = items.filter((i) => i.loss_risk).length;

  function openNew() { setEditing({ ...EMPTY, process_id: companyProcesses[0]?.id ?? "" }); setOpen(true); }
  function openEdit(i: any) { setEditing({ ...EMPTY, ...i }); setOpen(true); }
  function submit() {
    if (!editing) return;
    if (!editing.process_id) return toast.error("Selecione um processo");
    saveMut.mutate(editing);
  }

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
    </>
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Mapa de Informação"
        subtitle="Como a informação circula entre áreas e sistemas"
        icon={Share2}
        accent="info"
        actions={actions}
        stats={
          <>
            <StatPill label="Fluxos" value={items.length} accent="info" />
            <StatPill label="Com risco" value={riskCount} accent="pain" />
            <StatPill label="Processos" value={companyProcesses.length} accent="process" />
          </>
        }
      />

      {companyProcesses.length === 0 && (
        <Card className="p-6 text-center text-sm text-muted-foreground">Cadastre processos nesta empresa primeiro.</Card>
      )}

      {items.length === 0 ? (
        <EmptyState
          icon={Share2}
          accent="info"
          title="Sem fluxos mapeados"
          description="Registre origem, destino e meio de cada informação que circula no processo."
        />
      ) : (
        <div className="grid gap-2.5 lg:grid-cols-2">
          {items.map((i: any) => {
            const p = processes.find((x: any) => x.id === i.process_id);
            return (
              <div
                key={i.id}
                className="group relative overflow-hidden rounded-2xl border border-border/70 bg-card p-4 pl-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
              >
                <span className="absolute inset-y-0 left-0 w-1 bg-map-info" />
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{p?.name ?? "—"}</p>
                    <div className="mt-1 flex min-w-0 flex-wrap items-center gap-2 text-sm font-bold">
                      <span className="truncate">{i.origin || "—"}</span>
                      <ArrowRight className="h-4 w-4 shrink-0 text-map-info" />
                      <span className="truncate">{i.destination || "—"}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {i.medium && <Chip icon={Share2}>{i.medium}</Chip>}
                      {i.responsible && <Chip icon={User}>{i.responsible}</Chip>}
                      {i.document && <Chip icon={FileText}>{i.document}</Chip>}
                      {i.loss_risk && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-map-pain/12 px-2 py-0.5 text-[11px] font-semibold text-map-pain">
                          <AlertTriangle className="h-3 w-3" /> risco de perda
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(i)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" className="text-destructive" onClick={() => confirm("Excluir?") && delMut.mutate(i.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
