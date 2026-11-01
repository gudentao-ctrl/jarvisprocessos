import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { listRoadmap, saveRoadmapItem, deleteRoadmapItem } from "@/lib/analysis.functions";
import { listCompanies } from "@/lib/interviews.functions";
import { useActiveCompany } from "@/lib/active-company";
import { usePermissions } from "@/hooks/usePermissions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  Trash2,
  Sparkles,
  Save,
  FileDown,
  Pencil,
  TrendingUp,
  TrendingDown,
  Target,
  Layers,
  ArrowUpRight,
  ShieldAlert,
  CheckCircle2,
  Clock,
  Building2,
  Waves,
} from "lucide-react";
import { toast } from "sonner";
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  Tooltip as RechartsTooltip,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import {
  enrichCockpitWithTorreInputs,
  getDefaultRoadmapCockpitData,
  type RoadmapCockpitData,
} from "@/lib/torre-controle-storage";
import {
  fetchDreRecords,
  fetchMaturityRecords,
  fetchRoadmapCockpit,
  importLegacyTorreData,
  saveRoadmapCockpit,
  summarizeDreForCockpit,
} from "@/lib/torre-storage";

export const Route = createFileRoute("/_authenticated/roadmap/")({
  head: () => ({
    meta: [
      { title: "Roadmap & Gestão à Vista · Jarvis Processos" },
      { name: "description", content: "Cockpit executivo do cliente: KPIs de impacto, iceberg do projeto, maturidade 360° e ROI." },
      { property: "og:title", content: "Roadmap & Gestão à Vista · Jarvis Processos" },
      { property: "og:description", content: "Cockpit executivo do cliente: KPIs de impacto, iceberg do projeto, maturidade 360° e ROI." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

const HORIZON_LABELS = {
  curto: "Curto prazo",
  medio: "Médio prazo",
  longo: "Longo prazo",
} as const;

const brl = (n: number) =>
  `R$ ${Number(n ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

type Front = RoadmapCockpitData["iceberg"]["underwater_milestones"][number]["front"];
type Severity = RoadmapCockpitData["iceberg"]["surface_symptoms"][number]["severity"];
const FRONTS: Front[] = ["Financeiro / Comercial", "Processos / BPM", "Pessoas / Cultura"];

function Page() {
  const { company, companyId } = useActiveCompany();
  const [activeTab, setActiveTab] = useState<"cockpit" | "iniciativas">("cockpit");

  return (
    <div className="mx-auto max-w-7xl space-y-4 sm:space-y-6">
      <div className="space-y-3 border-b pb-4 sm:flex sm:items-end sm:justify-between sm:gap-4 sm:space-y-0">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Cockpit executivo</p>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl lg:text-3xl">Roadmap & Gestão à Vista</h1>
          <p className="mt-1 truncate text-xs text-muted-foreground sm:text-sm">
            {company ? company.name : "Selecione uma empresa"}
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "cockpit" | "iniciativas")} className="w-full sm:w-auto">
          <TabsList className="grid h-auto w-full grid-cols-2 gap-1 p-1 sm:w-auto">
            <TabsTrigger value="cockpit" className="min-h-[40px] py-2 text-xs sm:min-h-0 sm:text-sm">
              Cockpit
            </TabsTrigger>
            <TabsTrigger value="iniciativas" className="min-h-[40px] py-2 text-xs sm:min-h-0 sm:text-sm">
              Iniciativas
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {activeTab === "cockpit" ? (
        companyId ? (
          <CockpitExecutivoView key={companyId} companyId={companyId} companyName={company?.name || "Empresa"} />
        ) : (
          <Card className="p-8 text-center">
            <Building2 className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm font-semibold">Selecione uma empresa para ver o cockpit.</p>
          </Card>
        )
      ) : (
        <IniciativasView />
      )}
    </div>
  );
}

// =========================================================================
// COCKPIT EXECUTIVO DE GESTÃO À VISTA
// =========================================================================

function SectionTitle({ index, title, children }: { index: number; title: string; children?: ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
      <p className="min-w-0 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        <span className="mr-1.5 inline-grid h-5 w-5 place-items-center rounded-full bg-primary/10 text-[10px] text-primary">
          {index}
        </span>
        {title}
      </p>
      {children && <div className="flex shrink-0 items-center gap-1.5">{children}</div>}
    </div>
  );
}

function CockpitExecutivoView({ companyId, companyName }: { companyId: string; companyName: string }) {
  const qc = useQueryClient();
  const { hasAccess } = usePermissions();
  const canEdit = hasAccess("roadmap", "update") || hasAccess("roadmap", "create");

  useEffect(() => {
    let cancelled = false;
    importLegacyTorreData(companyId)
      .then((n) => {
        if (!cancelled && n > 0) void qc.invalidateQueries({ queryKey: ["roadmap-cockpit", companyId] });
      })
      .catch((e) => console.warn("[roadmap] recuperação local", e));
    return () => {
      cancelled = true;
    };
  }, [companyId, qc]);

  const cockpitQ = useQuery({
    queryKey: ["roadmap-cockpit", companyId],
    queryFn: async () => {
      const [saved, dre, maturity] = await Promise.all([
        fetchRoadmapCockpit(companyId),
        fetchDreRecords(companyId),
        fetchMaturityRecords(companyId),
      ]);
      const base = saved ?? getDefaultRoadmapCockpitData(companyId, companyName);
      return {
        exists: !!saved,
        data: enrichCockpitWithTorreInputs(base, summarizeDreForCockpit(dre), maturity),
      };
    },
  });

  const [draft, setDraft] = useState<RoadmapCockpitData | null>(null);
  const data = draft ?? cockpitQ.data?.data ?? null;
  const [editingKpis, setEditingKpis] = useState(false);
  const [editingGaps, setEditingGaps] = useState(false);

  const saveMut = useMutation({
    mutationFn: (next: RoadmapCockpitData) => saveRoadmapCockpit(companyId, next),
    onSuccess: () => {
      setDraft(null);
      setEditingKpis(false);
      setEditingGaps(false);
      void qc.invalidateQueries({ queryKey: ["roadmap-cockpit", companyId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const commit = (next: RoadmapCockpitData, message?: string) =>
    saveMut.mutate(next, { onSuccess: () => message && toast.success(message) });

  const patch = (next: RoadmapCockpitData) => setDraft(next);

  const handleRegenerate = () => {
    if (!window.confirm("Recriar o cockpit a partir do modelo e dos dados da Torre de Controle? As edições manuais serão substituídas.")) return;
    commit(getDefaultRoadmapCockpitData(companyId, companyName), "Cockpit recriado com os dados da Torre de Controle.");
  };

  const handleExportPdf = async () => {
    if (!data) return;
    try {
      const { exportRoadmapExecutivePdf } = await import("@/lib/roadmap-pdf");
      exportRoadmapExecutivePdf(data, companyName);
      toast.success("Status Report gerado.");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao gerar o PDF do relatório.");
    }
  };

  const chartTick = useMemo(() => ({ fill: "var(--muted-foreground)", fontSize: 10 }), []);

  if (cockpitQ.isError) {
    return <Card className="p-6 text-center text-sm text-destructive">Não foi possível carregar o cockpit. Tente novamente.</Card>;
  }
  if (!data) {
    return <Card className="p-6 text-center text-sm text-muted-foreground">Carregando cockpit…</Card>;
  }

  const kpiCards = [
    { key: "revenue", label: "Faturamento", value: `${data.kpis.revenue_growth_pct >= 0 ? "+" : ""}${data.kpis.revenue_growth_pct}%`, note: data.kpis.revenue_growth_note, icon: TrendingUp, tone: "text-acc-emerald", border: "border-l-acc-emerald", pct: "revenue_growth_pct" as const, noteKey: "revenue_growth_note" as const },
    { key: "maturity", label: "Maturidade", value: `+${data.kpis.maturity_growth_pct}%`, note: data.kpis.maturity_growth_note, icon: Target, tone: "text-acc-blue", border: "border-l-acc-blue", pct: "maturity_growth_pct" as const, noteKey: "maturity_growth_note" as const },
    { key: "cost", label: "Custos", value: `-${data.kpis.cost_reduction_pct}%`, note: data.kpis.cost_reduction_note, icon: TrendingDown, tone: "text-acc-amber", border: "border-l-acc-amber", pct: "cost_reduction_pct" as const, noteKey: "cost_reduction_note" as const },
    { key: "roi", label: "ROI", value: `${data.kpis.roi_multiplier}x`, note: "Retorno sobre o investimento em consultoria", icon: ArrowUpRight, tone: "text-acc-violet", border: "border-l-acc-violet", pct: "roi_multiplier" as const, noteKey: null },
  ];

  const dirty = draft !== null;

  return (
    <div className="space-y-6">
      {/* Barra de ações */}
      <Card className="space-y-3 p-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-4 w-4 shrink-0 text-primary" />
          <span className="min-w-0 truncate">
            {cockpitQ.data?.exists
              ? `Atualizado em ${new Date(data.last_updated).toLocaleString("pt-BR")}`
              : "Modelo inicial — ajuste e salve para este cliente"}
          </span>
          {dirty && <Badge variant="outline" className="ml-auto shrink-0 text-[10px]">Não salvo</Badge>}
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">
          {canEdit && (
            <Button variant="outline" size="sm" onClick={handleRegenerate} className="h-10 gap-1.5 text-xs sm:h-9">
              <Sparkles className="h-4 w-4 text-acc-violet" /> Recriar
            </Button>
          )}
          {canEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => commit(data, "Cockpit salvo. Já aparece no computador e no celular.")}
              disabled={saveMut.isPending}
              className="h-10 gap-1.5 text-xs sm:h-9"
            >
              <Save className="h-4 w-4 text-acc-emerald" /> {saveMut.isPending ? "Salvando…" : "Salvar"}
            </Button>
          )}
          <Button size="sm" onClick={handleExportPdf} className="col-span-2 h-10 gap-1.5 text-xs sm:col-span-1 sm:h-9">
            <FileDown className="h-4 w-4" /> Status Report (PDF)
          </Button>
        </div>
      </Card>

      {/* 1. KPIs */}
      <section className="space-y-2">
        <SectionTitle index={1} title="KPIs de impacto">
          {canEdit && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditingKpis(!editingKpis)}
              className="h-8 gap-1 text-xs text-muted-foreground"
            >
              <Pencil className="h-3.5 w-3.5" />
              {editingKpis ? "Concluir" : "Editar"}
            </Button>
          )}
        </SectionTitle>
        <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-4">
          {kpiCards.map((k) => (
            <Card key={k.key} className={`min-w-0 border-l-4 p-3 sm:p-4 ${k.border}`}>
              <div className="flex items-start justify-between gap-2">
                <span className="min-w-0 text-[10px] font-semibold uppercase leading-tight text-muted-foreground sm:text-xs">
                  {k.label}
                </span>
                <k.icon className={`h-4 w-4 shrink-0 ${k.tone}`} />
              </div>
              {editingKpis ? (
                <div className="mt-2 space-y-1">
                  <Input
                    type="number"
                    inputMode="decimal"
                    aria-label={`Valor de ${k.label}`}
                    value={data.kpis[k.pct]}
                    onChange={(e) => patch({ ...data, kpis: { ...data.kpis, [k.pct]: Number(e.target.value) || 0 } })}
                    className="h-9 text-base font-bold"
                  />
                  {k.noteKey && (
                    <Textarea
                      rows={2}
                      aria-label={`Descrição de ${k.label}`}
                      value={data.kpis[k.noteKey]}
                      onChange={(e) => patch({ ...data, kpis: { ...data.kpis, [k.noteKey!]: e.target.value } })}
                      className="min-h-0 text-xs"
                    />
                  )}
                </div>
              ) : (
                <>
                  <p className={`mt-1.5 text-2xl font-extrabold tabular-nums sm:text-3xl ${k.tone}`}>{k.value}</p>
                  <p className="mt-1 line-clamp-3 text-[11px] leading-snug text-muted-foreground sm:text-xs">{k.note}</p>
                </>
              )}
            </Card>
          ))}
        </div>
      </section>

      {/* 2. Iceberg */}
      <section className="space-y-2">
        <SectionTitle index={2} title="Raio-X do projeto: iceberg" />
        {canEdit && (
          <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end">
            <SymptomDialog onAdd={(s) => commit({ ...data, iceberg: { ...data.iceberg, surface_symptoms: [...data.iceberg.surface_symptoms, s] } }, "Sintoma adicionado.")} />
            <MilestoneDialog onAdd={(m) => commit({ ...data, iceberg: { ...data.iceberg, underwater_milestones: [...data.iceberg.underwater_milestones, m] } }, "Marco adicionado.")} />
          </div>
        )}

        <div className="overflow-hidden rounded-2xl border shadow-sm">
          {/* Superfície */}
          <div className="border-b bg-acc-blue/10 p-3 sm:p-5">
            <div className="mb-3 flex items-center gap-2">
              <span className="h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-acc-blue" />
              <h3 className="min-w-0 text-sm font-bold">Superfície: sintomas do diagnóstico</h3>
              <Badge variant="secondary" className="ml-auto hidden shrink-0 text-[10px] sm:inline-flex">
                Percepção da diretoria
              </Badge>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:gap-3 md:grid-cols-2 lg:grid-cols-3">
              {data.iceberg.surface_symptoms.map((symptom) => (
                <div key={symptom.id} className="flex items-start gap-2 rounded-xl border bg-card p-3">
                  <div className="min-w-0 flex-1 space-y-1">
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${
                        symptom.severity === "critica"
                          ? "border-destructive text-destructive"
                          : symptom.severity === "alta"
                            ? "border-acc-amber text-acc-amber"
                            : "border-acc-blue text-acc-blue"
                      }`}
                    >
                      {symptom.severity.toUpperCase()}
                    </Badge>
                    <p className="text-xs font-medium leading-relaxed">{symptom.text}</p>
                  </div>
                  {canEdit && (
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Excluir sintoma"
                      onClick={() =>
                        commit({ ...data, iceberg: { ...data.iceberg, surface_symptoms: data.iceberg.surface_symptoms.filter((s) => s.id !== symptom.id) } })
                      }
                      className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              ))}
              {data.iceberg.surface_symptoms.length === 0 && (
                <p className="text-xs text-muted-foreground">Nenhum sintoma cadastrado.</p>
              )}
            </div>
          </div>

          {/* Linha d'água */}
          <div className="flex items-center justify-center gap-1.5 bg-acc-blue px-3 py-2 text-center text-[10px] font-bold uppercase tracking-wider text-primary-foreground sm:text-[11px]">
            <Waves className="h-3.5 w-3.5 shrink-0" />
            <span className="sm:hidden">Linha d'água · trabalho invisível</span>
            <span className="hidden sm:inline">Nível de percepção do cliente vs. trabalho invisível da consultoria</span>
          </div>

          {/* Subsolo */}
          <div className="space-y-3 bg-muted/40 p-3 sm:p-5">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 shrink-0 text-acc-violet" />
              <h3 className="min-w-0 text-sm font-bold">Subsolo: marcos pelas 3 frentes</h3>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:gap-3 md:grid-cols-2 lg:grid-cols-3">
              {data.iceberg.underwater_milestones.map((m) => {
                const frontColor = m.front.startsWith("Financeiro")
                  ? "border-acc-emerald text-acc-emerald"
                  : m.front.startsWith("Processos")
                    ? "border-acc-blue text-acc-blue"
                    : "border-acc-violet text-acc-violet";
                return (
                  <Card key={m.id} className="space-y-2 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <Badge variant="outline" className={`text-[10px] font-semibold ${frontColor}`}>
                        {m.front}
                      </Badge>
                      {canEdit && (
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Excluir marco"
                          onClick={() =>
                            commit({ ...data, iceberg: { ...data.iceberg, underwater_milestones: data.iceberg.underwater_milestones.filter((x) => x.id !== m.id) } })
                          }
                          className="-mr-1 -mt-1 h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                    <p className="text-xs font-bold">{m.title}</p>
                    <p className="text-xs leading-relaxed text-muted-foreground">{m.impact}</p>
                    <button
                      type="button"
                      disabled={!canEdit}
                      onClick={() =>
                        commit({
                          ...data,
                          iceberg: {
                            ...data.iceberg,
                            underwater_milestones: data.iceberg.underwater_milestones.map((x) =>
                              x.id === m.id ? { ...x, status: x.status === "resolvido" ? "em_andamento" : "resolvido" } : x,
                            ),
                          },
                        })
                      }
                      className={`flex w-full items-center gap-1 border-t pt-2 text-[11px] font-medium ${m.status === "resolvido" ? "text-acc-emerald" : "text-acc-amber"}`}
                    >
                      {m.status === "resolvido" ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
                      {m.status === "resolvido" ? "Tratado & homologado" : "Em resolução"}
                    </button>
                  </Card>
                );
              })}
              {data.iceberg.underwater_milestones.length === 0 && (
                <p className="text-xs text-muted-foreground">Nenhum marco cadastrado.</p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 3 & 4. Radar e ROI */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="space-y-3 p-3 sm:p-5">
          <SectionTitle index={3} title="Radar de maturidade 360°">
            {canEdit && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditingGaps(!editingGaps)}
                className="h-8 gap-1 text-xs text-muted-foreground"
              >
                <Pencil className="h-3.5 w-3.5" />
                {editingGaps ? "Concluir" : "Narrativa"}
              </Button>
            )}
          </SectionTitle>
          <p className="text-xs text-muted-foreground">Donos vs. gestão vs. colaboradores</p>
          <div className="h-[300px] w-full sm:h-[340px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={data.radar_360.pilars} outerRadius="62%">
                <PolarGrid stroke="var(--border)" strokeDasharray="3 3" />
                <PolarAngleAxis dataKey="shortName" tick={chartTick} />
                <PolarRadiusAxis angle={30} domain={[0, 5]} tick={{ fontSize: 9 }} stroke="var(--border)" />
                <Radar name="Donos" dataKey="donos" stroke="var(--acc-violet)" fill="var(--acc-violet)" fillOpacity={0.22} />
                <Radar name="Gestão" dataKey="gestao" stroke="var(--acc-blue)" fill="var(--acc-blue)" fillOpacity={0.18} />
                <Radar name="Colaboradores" dataKey="colaboradores" stroke="var(--acc-emerald)" fill="var(--acc-emerald)" fillOpacity={0.18} />
                <Radar name="Atual" dataKey="mes_atual" stroke="var(--acc-amber)" fill="var(--acc-amber)" fillOpacity={0.12} strokeDasharray="4 4" />
                <Legend wrapperStyle={{ fontSize: 11 }} iconSize={9} />
                <RechartsTooltip />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1 rounded-xl border bg-muted/40 p-3">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <ShieldAlert className="h-3.5 w-3.5 text-acc-amber" /> Gaps de alinhamento
            </p>
            {editingGaps ? (
              <Textarea
                rows={4}
                value={data.radar_360.gaps_narrative}
                onChange={(e) => patch({ ...data, radar_360: { ...data.radar_360, gaps_narrative: e.target.value } })}
                className="text-xs"
              />
            ) : (
              <p className="text-xs leading-relaxed">{data.radar_360.gaps_narrative}</p>
            )}
          </div>
        </Card>

        <Card className="space-y-3 p-3 sm:p-5">
          <SectionTitle index={4} title="ROI e tendência financeira" />
          <p className="text-xs text-muted-foreground">Faturamento vs. custos e resultado</p>
          <div className="h-[260px] w-full sm:h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data.roi_timeline} margin={{ left: -14, right: 6 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="period" tick={chartTick} interval="preserveStartEnd" tickFormatter={(v: string) => (v.length > 10 ? `${v.slice(0, 9)}…` : v)} />
                <YAxis tick={chartTick} tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`} />
                <RechartsTooltip formatter={(val: unknown, name: unknown) => [brl(Number(val)), String(name)]} />
                <Legend wrapperStyle={{ fontSize: 11 }} iconSize={9} />
                <Area type="monotone" dataKey="revenue" name="Faturamento" fill="var(--acc-emerald)" fillOpacity={0.15} stroke="var(--acc-emerald)" strokeWidth={2.5} />
                <Area type="monotone" dataKey="costs" name="Custos" fill="var(--acc-red)" fillOpacity={0.1} stroke="var(--acc-red)" strokeWidth={2} />
                <Line type="monotone" dataKey="profit" name="Lucro" stroke="var(--acc-blue)" strokeWidth={3} dot={{ r: 4 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2 rounded-xl border bg-muted/40 p-3">
            <p className="text-xs font-semibold text-muted-foreground">Onde a consultoria agiu</p>
            <ol className="relative space-y-3 border-l border-primary/30 pl-4">
              {data.roi_timeline.map((point, idx) => (
                <li key={idx} className="relative text-xs">
                  <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full border-2 border-background bg-primary" />
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className="font-semibold text-primary">{point.period}</span>
                    {point.intervention_pin?.front && (
                      <Badge variant="secondary" className="text-[10px]">{point.intervention_pin.front}</Badge>
                    )}
                  </div>
                  <p className="mt-0.5 font-medium">{point.intervention_pin?.title}</p>
                  {point.intervention_pin?.description && (
                    <p className="text-[11px] text-muted-foreground">{point.intervention_pin.description}</p>
                  )}
                </li>
              ))}
            </ol>
          </div>
        </Card>
      </div>

      {dirty && canEdit && (
        <div className="sticky bottom-0 z-10 -mx-1 border-t bg-background/95 px-1 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="flex gap-2 sm:justify-end">
            <Button variant="outline" className="h-11 flex-1 sm:flex-none" onClick={() => { setDraft(null); setEditingKpis(false); setEditingGaps(false); }}>
              Descartar
            </Button>
            <Button className="h-11 flex-1 gap-2 sm:flex-none" disabled={saveMut.isPending} onClick={() => commit(data, "Cockpit salvo.")}>
              <Save className="h-4 w-4" /> {saveMut.isPending ? "Salvando…" : "Salvar alterações"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function SymptomDialog({ onAdd }: { onAdd: (s: RoadmapCockpitData["iceberg"]["surface_symptoms"][number]) => void }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [severity, setSeverity] = useState<Severity>("alta");
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-10 gap-1 text-xs sm:h-8">
          <Plus className="h-3.5 w-3.5" /> Sintoma
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Novo sintoma da superfície</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="sym-text">Sintoma ou dor do diagnóstico</Label>
            <Textarea id="sym-text" rows={3} value={text} onChange={(e) => setText(e.target.value)} />
          </div>
          <div>
            <Label>Gravidade</Label>
            <Select value={severity} onValueChange={(v) => setSeverity(v as Severity)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="critica">Crítica</SelectItem>
                <SelectItem value="alta">Alta</SelectItem>
                <SelectItem value="media">Média</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button
            className="h-11 w-full sm:w-auto"
            disabled={!text.trim()}
            onClick={() => {
              onAdd({ id: crypto.randomUUID(), text: text.trim(), severity });
              setText("");
              setOpen(false);
            }}
          >
            Adicionar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MilestoneDialog({ onAdd }: { onAdd: (m: RoadmapCockpitData["iceberg"]["underwater_milestones"][number]) => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [impact, setImpact] = useState("");
  const [front, setFront] = useState<Front>("Processos / BPM");
  const [status, setStatus] = useState<"resolvido" | "em_andamento">("em_andamento");
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-10 gap-1 text-xs sm:h-8">
          <Plus className="h-3.5 w-3.5" /> Marco
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Novo marco do subsolo</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="ms-title">Título</Label>
            <Input id="ms-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="ms-impact">Impacto gerado</Label>
            <Textarea id="ms-impact" rows={3} value={impact} onChange={(e) => setImpact(e.target.value)} />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label>Frente</Label>
              <Select value={front} onValueChange={(v) => setFront(v as Front)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FRONTS.map((f) => (
                    <SelectItem key={f} value={f}>{f}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Situação</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as "resolvido" | "em_andamento")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="em_andamento">Em resolução</SelectItem>
                  <SelectItem value="resolvido">Tratado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            className="h-11 w-full sm:w-auto"
            disabled={!title.trim()}
            onClick={() => {
              onAdd({ id: crypto.randomUUID(), title: title.trim(), impact: impact.trim(), front, status });
              setTitle("");
              setImpact("");
              setOpen(false);
            }}
          >
            Adicionar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// =========================================================================
// INICIATIVAS DO ROADMAP (EXISTENTE PRESERVADO)
// =========================================================================

function IniciativasView() {
  const listFn = useServerFn(listRoadmap);
  const delFn = useServerFn(deleteRoadmapItem);
  const { data = [] } = useQuery({ queryKey: ["roadmap"], queryFn: () => listFn() });
  const qc = useQueryClient();

  const grouped = { curto: [], medio: [], longo: [] } as Record<string, typeof data>;
  data.forEach((i) => grouped[i.horizon]?.push(i));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-bold tracking-tight sm:text-xl">Iniciativas por Horizonte</h2>
          <p className="text-muted-foreground text-xs sm:text-sm">
            Planejamento tático e estratégico agrupado por curto, médio e longo prazo.
          </p>
        </div>
        <NewItemDialog onSaved={() => qc.invalidateQueries({ queryKey: ["roadmap"] })} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(["curto", "medio", "longo"] as const).map((h) => (
          <div key={h} className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2 text-sm">
              {HORIZON_LABELS[h]}
              <Badge variant="secondary">{grouped[h]?.length || 0}</Badge>
            </h3>
            {grouped[h]?.map((i) => (
              <Card key={i.id}>
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 font-semibold text-sm">{i.title}</div>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Excluir iniciativa"
                      className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={async () => {
                        if (!window.confirm(`Excluir a iniciativa "${i.title}"?`)) return;
                        await delFn({ data: { id: i.id } });
                        qc.invalidateQueries({ queryKey: ["roadmap"] });
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                  {i.description && (
                    <p className="text-xs text-muted-foreground">{i.description}</p>
                  )}
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
            {(!grouped[h] || grouped[h].length === 0) && (
              <p className="text-xs text-muted-foreground">Vazio</p>
            )}
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
  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: () => companiesFn(),
    enabled: open,
  });

  const [form, setForm] = useState({
    company_id: "",
    title: "",
    description: "",
    horizon: "curto" as "curto" | "medio" | "longo",
    theme: "",
    area: "",
    responsible: "",
    deadline: "",
    priority: "media" as "baixa" | "media" | "alta" | "critica",
    effort: "medio" as "baixo" | "medio" | "alto",
    expected_impact: "",
    status: "planejado" as "planejado" | "em_andamento" | "concluido" | "cancelado",
  });

  async function submit() {
    if (!form.company_id || !form.title) {
      toast.error("Empresa e título obrigatórios");
      return;
    }
    try {
      await saveFn({ data: form });
      toast.success("Adicionado");
      setOpen(false);
      setForm({ ...form, title: "", description: "" });
      onSaved();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-1 h-4 w-4" />
          Nova iniciativa
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova iniciativa</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Empresa</Label>
            <Select
              value={form.company_id}
              onValueChange={(v) => setForm({ ...form, company_id: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Título</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label>Horizonte</Label>
              <Select
                value={form.horizon}
                onValueChange={(v) =>
                  setForm({ ...form, horizon: v as "curto" | "medio" | "longo" })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="curto">Curto</SelectItem>
                  <SelectItem value="medio">Médio</SelectItem>
                  <SelectItem value="longo">Longo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Prioridade</Label>
              <Select
                value={form.priority}
                onValueChange={(v) =>
                  setForm({ ...form, priority: v as "baixa" | "media" | "alta" | "critica" })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["baixa", "media", "alta", "critica"].map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Esforço</Label>
              <Select
                value={form.effort}
                onValueChange={(v) => setForm({ ...form, effort: v as "baixo" | "medio" | "alto" })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["baixo", "medio", "alto"].map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Prazo</Label>
              <Input
                type="date"
                value={form.deadline}
                onChange={(e) => setForm({ ...form, deadline: e.target.value })}
              />
            </div>
            <div>
              <Label>Responsável</Label>
              <Input
                value={form.responsible}
                onChange={(e) => setForm({ ...form, responsible: e.target.value })}
              />
            </div>
            <div>
              <Label>Área</Label>
              <Input
                value={form.area}
                onChange={(e) => setForm({ ...form, area: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2">
              <Label>Tema</Label>
              <Input
                value={form.theme}
                onChange={(e) => setForm({ ...form, theme: e.target.value })}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button className="h-11 w-full sm:w-auto" onClick={submit}>Adicionar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
