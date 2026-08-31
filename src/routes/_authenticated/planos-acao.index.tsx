import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Plus, ClipboardList, Trash2, Pencil, Flame, Search, Trophy } from "lucide-react";
import { listActionPlans, saveActionPlan, deleteActionPlan } from "@/lib/processes.functions";
import { listCompanies } from "@/lib/interviews.functions";
import { useActiveCompany } from "@/lib/active-company";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PageHeader, StatPill, accentBar } from "@/components/mapping/PageHeader";
import { EmptyState } from "@/components/mapping/EmptyState";

export const Route = createFileRoute("/_authenticated/planos-acao/")({
  component: PlanosPage,
  head: () => ({
    meta: [
      { title: "Planos de Ação — JARVIS" },
      { name: "description", content: "Ranking de prioridade GUT dos planos de ação da consultoria operacional." },
      { property: "og:title", content: "Planos de Ação — JARVIS" },
      { property: "og:description", content: "Ranking de prioridade GUT dos planos de ação." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const STATUS_LABEL: any = { aberto: "Aberto", em_andamento: "Em andamento", concluido: "Concluído" };

const DEMAND_LABEL: Record<string, string> = { processo: "Processo", pessoas: "Pessoas", negocio: "Negócio" };

type Tier = { label: string; accent: "pain" | "time" | "process" | "info"; bar: string; chip: string };

function gut(p: any) {
  const g = Number(p?.gravity ?? 0) || 0;
  const u = Number(p?.urgency ?? 0) || 0;
  const t = Number(p?.trend ?? 0) || 0;
  return g * u * t;
}

function tierOf(score: number): Tier {
  if (score >= 75) return { label: "Crítico", accent: "pain", bar: "bg-map-pain", chip: "bg-map-pain/10 text-map-pain border-map-pain/30" };
  if (score >= 40) return { label: "Alto", accent: "time", bar: "bg-map-process", chip: "bg-map-process/10 text-map-process border-map-process/30" };
  if (score >= 15) return { label: "Médio", accent: "info", bar: "bg-map-info", chip: "bg-map-info/10 text-map-info border-map-info/30" };
  return { label: "Baixo", accent: "process", bar: "bg-muted-foreground/40", chip: "bg-muted text-muted-foreground border-border" };
}

type FormState = {
  id?: string;
  title: string;
  description: string;
  problem: string;
  cause: string;
  responsible: string;
  sector: string;
  company_id: string;
  status: string;
  due_date: string;
  gravity: number;
  urgency: number;
  trend: number;
  expected_result: string;
  observations: string;
  origin: string;
  demand_type: string;
};

function emptyForm(companyId: string | null): FormState {
  return {
    title: "", description: "", problem: "", cause: "", responsible: "", sector: "",
    company_id: companyId ?? "", status: "aberto", due_date: "",
    gravity: 3, urgency: 3, trend: 3,
    expected_result: "", observations: "", origin: "", demand_type: "processo",
  };
}

function PlanosPage() {
  const { companyId } = useActiveCompany();
  const [list, setList] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [filter, setFilter] = useState<"all" | "aberto" | "em_andamento" | "concluido">("all");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm(companyId));

  const reload = () =>
    listActionPlans({ data: companyId ? { company_id: companyId } : {} })
      .then(setList)
      .catch(() => setList([]));

  useEffect(() => { reload(); listCompanies().then(setCompanies); }, [companyId]);
  useEffect(() => {
    if (companyId) setForm((f) => ({ ...f, company_id: f.company_id || companyId }));
  }, [companyId]);

  function openNew() {
    setForm(emptyForm(companyId));
    setOpen(true);
  }
  function openEdit(p: any) {
    setForm({
      id: p.id,
      title: p.title ?? "",
      description: p.description ?? "",
      problem: p.problem ?? "",
      cause: p.cause ?? "",
      responsible: p.responsible ?? "",
      sector: p.sector ?? "",
      company_id: p.company_id ?? companyId ?? "",
      status: p.status ?? "aberto",
      due_date: p.due_date ?? "",
      gravity: p.gravity ?? 3,
      urgency: p.urgency ?? 3,
      trend: p.trend ?? 3,
      expected_result: p.expected_result ?? "",
      observations: p.observations ?? "",
      origin: p.origin ?? "",
      demand_type: p.demand_type ?? "processo",
    });
    setOpen(true);
  }

  async function submit() {
    if (!form.title) return toast.error("Título obrigatório");
    try {
      await saveActionPlan({
        data: {
          ...(form.id ? { id: form.id } : {}),
          title: form.title,
          description: form.description,
          problem: form.problem || null,
          cause: form.cause || null,
          responsible: form.responsible,
          company_id: form.company_id || companyId || null,
          due_date: form.due_date || null,
          priority: form.priority as any,
          status: form.status as any,
          gravity: form.gravity,
          urgency: form.urgency,
          trend: form.trend,
          expected_result: form.expected_result || null,
          observations: form.observations || null,
          origin: form.origin || null,
          demand_type: (form.demand_type || null) as any,
        },
      });
      toast.success(form.id ? "Alterações salvas" : "Plano criado");
      setOpen(false);
      setForm(emptyForm(companyId));
      reload();
    } catch (e: any) { console.error(e); toast.error(e?.message ?? "Erro ao salvar plano"); }
  }

  async function updateStatus(p: any, status: string) {
    try {
      await saveActionPlan({ data: { id: p.id, title: p.title, status: status as any } });
      reload();
    } catch (e: any) { toast.error(e?.message ?? "Erro"); }
  }

  async function remove(p: any) {
    if (!confirm(`Excluir plano "${p.title}"?`)) return;
    try {
      await deleteActionPlan({ data: { id: p.id } });
      toast.success("Excluído");
      reload();
    } catch (e: any) { toast.error(e?.message ?? "Erro ao excluir"); }
  }

  const ranked = useMemo(() => {
    const open = list.filter((p) => p.status !== "concluido");
    const sorted = [...open].sort((a, b) => gut(b) - gut(a));
    const rankById = new Map<string, number>();
    sorted.forEach((p, i) => rankById.set(p.id, i + 1));
    return [...list]
      .sort((a, b) => {
        const ca = a.status === "concluido" ? 1 : 0;
        const cb = b.status === "concluido" ? 1 : 0;
        if (ca !== cb) return ca - cb;
        return gut(b) - gut(a);
      })
      .map((p) => ({ ...p, _gut: gut(p), _rank: rankById.get(p.id) ?? null }));
  }, [list]);

  const filtered = ranked.filter((p) => {
    if (filter !== "all" && p.status !== filter) return false;
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return [p.title, p.description, p.responsible, p.companies?.name, p.origin]
      .filter(Boolean)
      .some((v: string) => String(v).toLowerCase().includes(q));
  });

  const criticos = ranked.filter((p) => p.status !== "concluido" && p._gut >= 75).length;
  const abertos = ranked.filter((p) => p.status !== "concluido").length;
  const concluidos = ranked.filter((p) => p.status === "concluido").length;
  const isEdit = !!form.id;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Planos de Ação"
        subtitle="Priorização por matriz GUT (Gravidade × Urgência × Tendência)"
        icon={ClipboardList}
        accent="pain"
        actions={<Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Novo</Button>}
        stats={
          <>
            <StatPill label="Em aberto" value={abertos} accent="process" />
            <StatPill label="Críticos" value={criticos} accent="pain" />
            <StatPill label="Concluídos" value={concluidos} accent="time" />
            <StatPill label="Total" value={ranked.length} accent="info" />
          </>
        }
      />

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setForm(emptyForm(companyId)); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEdit ? "Editar plano de ação" : "Novo plano de ação"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-[70vh] overflow-y-auto">
            <div><Label>Título *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div><Label>Origem</Label><Input placeholder="Entrevista, cronoanálise, indicador..." value={form.origin} onChange={(e) => setForm({ ...form, origin: e.target.value })} /></div>
            <div><Label>Tipo de demanda *</Label>
              <Select value={form.demand_type} onValueChange={(v) => setForm({ ...form, demand_type: v })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>{Object.entries(DEMAND_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Problema</Label><Textarea rows={2} value={form.problem} onChange={(e) => setForm({ ...form, problem: e.target.value })} /></div>
            <div><Label>Causa</Label><Textarea rows={2} value={form.cause} onChange={(e) => setForm({ ...form, cause: e.target.value })} /></div>
            <div><Label>Descrição / Ação</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div><Label>Resultado esperado</Label><Textarea rows={2} value={form.expected_result} onChange={(e) => setForm({ ...form, expected_result: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Responsável</Label><Input value={form.responsible} onChange={(e) => setForm({ ...form, responsible: e.target.value })} /></div>
              <div><Label>Prazo</Label><Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></div>
            </div>
            <div className="rounded-xl border p-3 bg-muted/30">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold">Matriz GUT (1–5)</p>
                <span className={cn("rounded-full border px-2 py-0.5 text-xs font-black tabular-nums", tierOf(form.gravity * form.urgency * form.trend).chip)}>
                  {form.gravity * form.urgency * form.trend} · {tierOf(form.gravity * form.urgency * form.trend).label}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div><Label className="text-xs">Gravidade</Label><Input type="number" min={1} max={5} value={form.gravity} onChange={(e) => setForm({ ...form, gravity: Math.min(5, Math.max(1, Number(e.target.value) || 1)) })} /></div>
                <div><Label className="text-xs">Urgência</Label><Input type="number" min={1} max={5} value={form.urgency} onChange={(e) => setForm({ ...form, urgency: Math.min(5, Math.max(1, Number(e.target.value) || 1)) })} /></div>
                <div><Label className="text-xs">Tendência</Label><Input type="number" min={1} max={5} value={form.trend} onChange={(e) => setForm({ ...form, trend: Math.min(5, Math.max(1, Number(e.target.value) || 1)) })} /></div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Prioridade</Label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["baixa", "media", "alta", "critica"].map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(STATUS_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v as string}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Empresa</Label>
              <Select value={form.company_id} onValueChange={(v) => setForm({ ...form, company_id: v })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>{companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Observações</Label><Textarea rows={2} value={form.observations} onChange={(e) => setForm({ ...form, observations: e.target.value })} /></div>
            <Button onClick={submit} className="w-full min-h-11">{isEdit ? "Salvar alterações" : "Criar"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por título, responsável, empresa..."
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {(["all", "aberto", "em_andamento", "concluido"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                filter === f ? "border-primary bg-primary text-primary-foreground" : "hover:bg-secondary",
              )}
            >
              {f === "all" ? "Todos" : STATUS_LABEL[f]}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          accent="pain"
          title="Nenhum plano encontrado"
          description="Crie um plano de ação para começar a priorizar as melhorias."
          action={<Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Novo plano</Button>}
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((p) => {
            const tier = tierOf(p._gut);
            const done = p.status === "concluido";
            const top3 = !done && p._rank !== null && p._rank <= 3;
            return (
              <Card
                key={p.id}
                className={cn(
                  "relative overflow-hidden p-4 pl-5 transition-shadow hover:shadow-md",
                  done && "opacity-70",
                )}
              >
                <span className={cn("absolute inset-y-0 left-0 w-1.5", done ? "bg-muted-foreground/30" : tier.bar)} />
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                  <div className="flex shrink-0 items-center gap-3">
                    <div
                      className={cn(
                        "grid h-12 w-12 shrink-0 place-items-center rounded-xl border text-center",
                        done ? "border-border bg-muted text-muted-foreground" : tier.chip,
                      )}
                      title={`GUT ${p._gut} · G${p.gravity ?? "-"} U${p.urgency ?? "-"} T${p.trend ?? "-"}`}
                    >
                      <span className="text-base font-black leading-none tabular-nums">{p._gut || "—"}</span>
                      <span className="text-[9px] font-bold uppercase tracking-wide">GUT</span>
                    </div>
                    <div className="sm:hidden">
                      {p._rank && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-bold">
                          {top3 ? <Trophy className="h-3 w-3 text-map-time" /> : null}#{p._rank}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      {p._rank && (
                        <span className="hidden items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-bold sm:inline-flex">
                          {top3 ? <Trophy className="h-3 w-3 text-map-time" /> : null}#{p._rank}
                        </span>
                      )}
                      <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase", tier.chip)}>
                        {p._gut >= 75 && <Flame className="h-3 w-3" />}{tier.label}
                      </span>
                      {p.demand_type && (
                        <span className="inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-bold uppercase text-muted-foreground">
                          {DEMAND_LABEL[p.demand_type] ?? p.demand_type}
                        </span>
                      )}
                      <p className={cn("font-semibold", done && "line-through")}>{p.title}</p>
                    </div>
                    {p.description && <p className="text-sm text-muted-foreground">{p.description}</p>}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {p.companies?.name && `${p.companies.name} · `}
                      {p.processes?.name && (<>Processo: <Link to="/processos/$id" params={{ id: p.process_id }} className="text-primary hover:underline">{p.processes.name}</Link> · </>)}
                      {p.responsible && `${p.responsible} · `}
                      {p.due_date && `prazo ${p.due_date}`}
                    </p>
                    <div className="mt-2 flex items-center gap-3 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      <span>G <b className="text-foreground tabular-nums">{p.gravity ?? "—"}</b></span>
                      <span>U <b className="text-foreground tabular-nums">{p.urgency ?? "—"}</b></span>
                      <span>T <b className="text-foreground tabular-nums">{p.trend ?? "—"}</b></span>
                      <div className="hidden h-1.5 flex-1 overflow-hidden rounded-full bg-muted sm:block">
                        <div className={cn("h-full rounded-full", tier.bar)} style={{ width: `${Math.min(100, (p._gut / 125) * 100)}%` }} />
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    <Select value={p.status} onValueChange={(v) => updateStatus(p, v)}>
                      <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                      <SelectContent>{Object.entries(STATUS_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v as string}</SelectItem>)}</SelectContent>
                    </Select>
                    <Button size="icon" variant="ghost" onClick={() => openEdit(p)} title="Editar">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => remove(p)} title="Excluir">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
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
