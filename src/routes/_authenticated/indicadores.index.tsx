import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Trash2, BarChart3, Link2, Copy, Settings2, MessageCircle, Check } from "lucide-react";
import { saveIndicator, deleteIndicator, listProcesses } from "@/lib/processes.functions";
import { listCompanies } from "@/lib/interviews.functions";
import { listIndicatorStatus, updateIndicatorPublicSettings, listCollections } from "@/lib/indicator-collections.functions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/indicadores/")({
  component: IndicadoresPage,
});

const STATUS_STYLES: Record<string, { dot: string; label: string; chip: string }> = {
  ok:           { dot: "bg-emerald-500", label: "Dentro da meta", chip: "bg-emerald-100 text-emerald-900 border-emerald-300" },
  abaixo_meta:  { dot: "bg-amber-500",   label: "Abaixo da meta", chip: "bg-amber-100 text-amber-900 border-amber-300" },
  critico:      { dot: "bg-red-500",     label: "Crítico",        chip: "bg-red-100 text-red-900 border-red-300" },
  atrasado:     { dot: "bg-orange-500",  label: "Atrasado",       chip: "bg-orange-100 text-orange-900 border-orange-300" },
  sem_coleta:   { dot: "bg-slate-400",   label: "Sem coleta",     chip: "bg-slate-100 text-slate-700 border-slate-300" },
};

const FREQUENCIES = [
  { value: "diario",     label: "Diário" },
  { value: "semanal",    label: "Semanal" },
  { value: "quinzenal",  label: "Quinzenal" },
  { value: "mensal",     label: "Mensal" },
  { value: "trimestral", label: "Trimestral" },
];

function IndicadoresPage() {
  const list = useServerFn(listIndicatorStatus);
  const comp = useServerFn(listCompanies);
  const proc = useServerFn(listProcesses);
  const qc = useQueryClient();

  const { data: items = [] } = useQuery({ queryKey: ["indicator-status"], queryFn: () => list({ data: {} }) });
  const { data: companies = [] } = useQuery({ queryKey: ["companies"], queryFn: () => comp() });
  const { data: processes = [] } = useQuery({ queryKey: ["processes"], queryFn: () => proc() });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState({ company_id: "", process_id: "", name: "", unit: "", target: "", frequency: "mensal" });

  const create = useMutation({
    mutationFn: (data: any) => saveIndicator({ data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["indicator-status"] });
      setOpen(false);
      setForm({ company_id: "", process_id: "", name: "", unit: "", target: "", frequency: "mensal" });
      toast.success("Indicador criado");
    },
    onError: (e: any) => { console.error(e); toast.error(e?.message ?? "Erro ao criar indicador"); },
  });

  const del = useMutation({
    mutationFn: (id: string) => deleteIndicator({ data: { id } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["indicator-status"] }); toast.success("Excluído"); },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao excluir"),
  });

  function submit() {
    if (!form.name) return toast.error("Nome obrigatório");
    create.mutate({
      company_id: form.company_id || null,
      process_id: form.process_id || null,
      name: form.name,
      unit: form.unit,
      target: form.target ? Number(form.target) : null,
      frequency: form.frequency,
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold sm:text-2xl">Indicadores</h1>
          <p className="text-xs text-muted-foreground">Coleta externa via link público</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="shrink-0 min-h-11"><Plus className="h-4 w-4 mr-1" /> Novo</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo indicador</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Nome *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Unidade</Label><Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="%, un, R$…" /></div>
                <div><Label>Meta</Label><Input type="number" value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })} /></div>
              </div>
              <div>
                <Label>Frequência</Label>
                <Select value={form.frequency} onValueChange={(v) => setForm({ ...form, frequency: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{FREQUENCIES.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Empresa</Label>
                <Select value={form.company_id} onValueChange={(v) => setForm({ ...form, company_id: v })}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>{companies.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Processo</Label>
                <Select value={form.process_id} onValueChange={(v) => setForm({ ...form, process_id: v })}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>{processes.filter((p: any) => !form.company_id || p.company_id === form.company_id).map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Button onClick={submit} className="w-full min-h-11" disabled={create.isPending}>
                {create.isPending ? "Criando…" : "Criar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {items.length === 0 ? (
        <Card className="p-8 text-center">
          <BarChart3 className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Sem indicadores ainda.</p>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map((i: any) => {
            const st = STATUS_STYLES[i.status] ?? STATUS_STYLES.sem_coleta;
            return (
              <Card key={i.id} className="p-4 space-y-3">
                <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-2">
                  <span className={cn("mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full", st.dot)} />
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{i.name}</p>
                    <p className="text-[10px] font-mono text-muted-foreground truncate">{i.code}</p>
                  </div>
                  <Button size="icon" variant="ghost" className="shrink-0" onClick={() => setEditing(i)}>
                    <Settings2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground">Último</p>
                    <p className="font-bold tabular-nums">{i.last_value ?? "—"} {i.unit}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground">Meta</p>
                    <p className="font-bold tabular-nums">{i.target ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground">Freq.</p>
                    <p className="font-bold capitalize">{i.frequency || "—"}</p>
                  </div>
                </div>
                <span className={cn("inline-flex items-center text-[11px] font-medium rounded-full border px-2 py-0.5", st.chip)}>
                  {st.label}
                </span>
                <div className="flex flex-wrap gap-2 pt-1 border-t">
                  <Button asChild size="sm" className="min-h-9">
                    <Link to="/indicadores/$id/coletar" params={{ id: i.id }}>
                      <Check className="h-3.5 w-3.5 mr-1" /> Registrar
                    </Link>
                  </Button>
                  <LinkButton token={i.public_token} indicatorName={i.name} />
                  <Button
                    size="sm"
                    variant="ghost"
                    className="ml-auto text-destructive"
                    onClick={() => { if (confirm("Excluir indicador e suas coletas?")) del.mutate(i.id); }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {editing && (
        <IndicatorSettingsSheet
          indicator={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); qc.invalidateQueries({ queryKey: ["indicator-status"] }); }}
        />
      )}
    </div>
  );
}

function publicUrl(token: string) {
  if (typeof window === "undefined") return `/c/${token}`;
  return `${window.location.origin}/c/${token}`;
}

function LinkButton({ token, indicatorName }: { token: string; indicatorName: string }) {
  async function copy() {
    const url = publicUrl(token);
    try { await navigator.clipboard.writeText(url); toast.success("Link copiado"); }
    catch { toast.error("Copie manualmente: " + url); }
  }
  function whatsapp() {
    const url = publicUrl(token);
    const text = `Olá! Por favor, registre o valor de "${indicatorName}" aqui: ${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  }
  return (
    <>
      <Button size="sm" variant="outline" onClick={copy} className="min-h-9">
        <Copy className="h-3.5 w-3.5 mr-1" /> Copiar link
      </Button>
      <Button size="sm" variant="ghost" onClick={whatsapp} className="min-h-9" title="WhatsApp">
        <MessageCircle className="h-4 w-4 text-emerald-600" />
      </Button>
    </>
  );
}

function IndicatorSettingsSheet({ indicator, onClose, onSaved }: { indicator: any; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    target: indicator.target ?? "",
    critical_min: indicator.critical_min ?? "",
    critical_max: indicator.critical_max ?? "",
    direction: indicator.direction ?? "higher_better",
    frequency: indicator.frequency ?? "mensal",
    unit: indicator.unit ?? "",
    responsible_name: indicator.responsible_name ?? "",
    responsible_email: indicator.responsible_email ?? "",
    instructions: indicator.instructions ?? "",
  });

  const cols = useServerFn(listCollections);
  const { data: collections = [] } = useQuery({
    queryKey: ["collections", indicator.id],
    queryFn: () => cols({ data: { indicator_id: indicator.id } }),
  });

  const save = useMutation({
    mutationFn: (data: any) => updateIndicatorPublicSettings({ data: { id: indicator.id, ...data } }),
    onSuccess: () => { toast.success("Salvo"); onSaved(); },
    onError: (e: any) => toast.error(e?.message),
  });

  function submit() {
    save.mutate({
      target: form.target === "" ? null : Number(form.target),
      critical_min: form.critical_min === "" ? null : Number(form.critical_min),
      critical_max: form.critical_max === "" ? null : Number(form.critical_max),
      direction: form.direction as any,
      frequency: form.frequency,
      unit: form.unit,
      responsible_name: form.responsible_name,
      responsible_email: form.responsible_email,
      instructions: form.instructions,
    });
  }

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="h-[90vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-left">{indicator.name}</SheetTitle>
          <p className="text-xs font-mono text-muted-foreground">{indicator.code}</p>
        </SheetHeader>

        <div className="space-y-4 mt-4 pb-8">
          <Card className="p-3 bg-muted/30">
            <p className="text-xs text-muted-foreground mb-1">Link público</p>
            <p className="text-xs font-mono break-all bg-background border rounded px-2 py-1.5">{publicUrl(indicator.public_token)}</p>
            <div className="flex gap-2 mt-2">
              <LinkButton token={indicator.public_token} indicatorName={indicator.name} />
            </div>
          </Card>

          <div className="grid grid-cols-2 gap-2">
            <div><Label>Meta</Label><Input type="number" value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })} /></div>
            <div>
              <Label>Direção</Label>
              <Select value={form.direction} onValueChange={(v) => setForm({ ...form, direction: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="higher_better">Maior é melhor</SelectItem>
                  <SelectItem value="lower_better">Menor é melhor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Limite crítico mín.</Label><Input type="number" value={form.critical_min} onChange={(e) => setForm({ ...form, critical_min: e.target.value })} /></div>
            <div><Label>Limite crítico máx.</Label><Input type="number" value={form.critical_max} onChange={(e) => setForm({ ...form, critical_max: e.target.value })} /></div>
            <div><Label>Unidade</Label><Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} /></div>
            <div>
              <Label>Frequência</Label>
              <Select value={form.frequency} onValueChange={(v) => setForm({ ...form, frequency: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{FREQUENCIES.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div><Label>Responsável (nome)</Label><Input value={form.responsible_name} onChange={(e) => setForm({ ...form, responsible_name: e.target.value })} /></div>
          <div><Label>Responsável (e-mail)</Label><Input type="email" value={form.responsible_email} onChange={(e) => setForm({ ...form, responsible_email: e.target.value })} /></div>
          <div><Label>Instruções para quem coleta</Label><Textarea value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })} placeholder="Como medir, fonte do dado, exceções…" /></div>

          <Button onClick={submit} className="w-full min-h-11" disabled={save.isPending}>
            {save.isPending ? "Salvando…" : "Salvar configurações"}
          </Button>

          <div className="pt-4 border-t">
            <p className="text-sm font-semibold mb-2">Histórico de coletas ({collections.length})</p>
            {collections.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhuma coleta ainda. Envie o link público para começar.</p>
            ) : (
              <div className="space-y-1">
                {collections.slice(0, 20).map((c: any) => (
                  <div key={c.id} className={cn(
                    "flex items-center justify-between gap-2 text-xs rounded border px-2 py-1.5",
                    STATUS_STYLES[c.evaluation === "ok" ? "ok" : c.evaluation]?.chip,
                  )}>
                    <div className="min-w-0">
                      <p className="font-bold tabular-nums">{c.value} {indicator.unit}</p>
                      <p className="truncate opacity-70">{c.submitted_by_name || "—"} · {new Date(c.submitted_at).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
