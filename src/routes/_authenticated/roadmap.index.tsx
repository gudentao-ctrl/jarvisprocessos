import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { listRoadmap, saveRoadmapItem, deleteRoadmapItem } from "@/lib/analysis.functions";
import { listCompanies } from "@/lib/interviews.functions";
import { useActiveCompany } from "@/lib/active-company";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  Trash2,
  Sparkles,
  Save,
  FileDown,
  Pencil,
  Check,
  TrendingUp,
  TrendingDown,
  Target,
  DollarSign,
  Layers,
  ArrowUpRight,
  ShieldAlert,
  CheckCircle2,
  Clock,
  HelpCircle,
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
  getRoadmapCockpitFromStorage,
  saveRoadmapCockpitToStorage,
  getDefaultRoadmapCockpitData,
  type RoadmapCockpitData,
} from "@/lib/torre-controle-storage";
import { exportRoadmapExecutivePdf } from "@/lib/roadmap-pdf";

export const Route = createFileRoute("/_authenticated/roadmap/")({ component: Page });

const HORIZON_LABELS = {
  curto: "Curto prazo",
  medio: "Médio prazo",
  longo: "Longo prazo",
} as const;

const brl = (n: number) =>
  `R$ ${Number(n ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

function Page() {
  const { company, companyId } = useActiveCompany();
  const [activeTab, setActiveTab] = useState<"cockpit" | "iniciativas">("cockpit");

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header com Navegação e Controles */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Roadmap & Gestão à Vista</h1>
            <Badge variant="outline" className="text-primary font-semibold">
              Cockpit Executivo
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            {company ? `${company.name} · ` : ""}
            Painel consolidado de impacto, maturidade 360°, infográfico do projeto e ROI.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-auto">
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="cockpit">Cockpit Executivo</TabsTrigger>
            <TabsTrigger value="iniciativas">Iniciativas por Horizonte</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {activeTab === "cockpit" ? (
        <CockpitExecutivoView companyId={companyId || "default"} companyName={company?.name || "Empresa Ativa"} />
      ) : (
        <IniciativasView />
      )}
    </div>
  );
}

// =========================================================================
// COCKPIT EXECUTIVO DE GESTÃO À VISTA (BLOCO 15)
// =========================================================================

function CockpitExecutivoView({
  companyId,
  companyName,
}: {
  companyId: string;
  companyName: string;
}) {
  const [data, setData] = useState<RoadmapCockpitData>(() =>
    getRoadmapCockpitFromStorage(companyId, companyName)
  );

  useEffect(() => {
    setData(getRoadmapCockpitFromStorage(companyId, companyName));
  }, [companyId, companyName]);

  // Modos de Edição Inline
  const [editingKpis, setEditingKpis] = useState(false);
  const [editingGaps, setEditingGaps] = useState(false);
  const [editingMilestoneId, setEditingMilestoneId] = useState<string | null>(null);

  // Handlers
  const handleSave = () => {
    saveRoadmapCockpitToStorage(data);
    toast.success("Alterações salvas com sucesso!");
    setEditingKpis(false);
    setEditingGaps(false);
    setEditingMilestoneId(null);
  };

  const handleRegenerateWithAI = () => {
    // Sincroniza e regenera síntese inteligente com base no sistema
    const fresh = getDefaultRoadmapCockpitData(companyId, companyName);
    setData(fresh);
    saveRoadmapCockpitToStorage(fresh);
    toast.success("Cockpit regerado com IA cruzando diagnósticos e finanças!");
  };

  const handleExportPdf = () => {
    try {
      exportRoadmapExecutivePdf(data, companyName);
      toast.success("Status Report Executivo (PDF) gerado com sucesso!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao gerar PDF do relatório executivo.");
    }
  };

  const addSurfaceSymptom = () => {
    const text = prompt("Digite o novo sintoma ou dor do Diagnóstico 360°:");
    if (!text) return;
    const newSym = {
      id: crypto.randomUUID(),
      text,
      severity: "alta" as const,
    };
    const updated = {
      ...data,
      iceberg: {
        ...data.iceberg,
        surface_symptoms: [...data.iceberg.surface_symptoms, newSym],
      },
    };
    setData(updated);
    saveRoadmapCockpitToStorage(updated);
    toast.success("Sintoma adicionado.");
  };

  const removeSurfaceSymptom = (id: string) => {
    const updated = {
      ...data,
      iceberg: {
        ...data.iceberg,
        surface_symptoms: data.iceberg.surface_symptoms.filter((s) => s.id !== id),
      },
    };
    setData(updated);
    saveRoadmapCockpitToStorage(updated);
  };

  const addUnderwaterMilestone = () => {
    const title = prompt("Título do marco submerso tratado:");
    if (!title) return;
    const impact = prompt("Impacto mensurável gerado:", "Otimização de rotinas e redução de retrabalho.") || "";
    const newM = {
      id: crypto.randomUUID(),
      front: "Processos / BPM" as const,
      title,
      impact,
      status: "resolvido" as const,
    };
    const updated = {
      ...data,
      iceberg: {
        ...data.iceberg,
        underwater_milestones: [...data.iceberg.underwater_milestones, newM],
      },
    };
    setData(updated);
    saveRoadmapCockpitToStorage(updated);
    toast.success("Marco adicionado ao Subsolo Operacional.");
  };

  const removeUnderwaterMilestone = (id: string) => {
    const updated = {
      ...data,
      iceberg: {
        ...data.iceberg,
        underwater_milestones: data.iceberg.underwater_milestones.filter((m) => m.id !== id),
      },
    };
    setData(updated);
    saveRoadmapCockpitToStorage(updated);
  };

  return (
    <div className="space-y-6">
      {/* Barra de Ações do Consultor (Human-in-the-Loop) */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-muted/40 p-3 rounded-xl border">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-4 w-4 text-primary" />
          <span>Última sincronização: {new Date(data.last_updated).toLocaleString("pt-BR")}</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRegenerateWithAI} className="gap-1.5 text-xs">
            <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
            Regerar com IA
          </Button>

          <Button variant="outline" size="sm" onClick={handleSave} className="gap-1.5 text-xs bg-card">
            <Save className="h-3.5 w-3.5 text-emerald-600" />
            Salvar Alterações
          </Button>

          <Button size="sm" onClick={handleExportPdf} className="gap-1.5 text-xs bg-primary text-primary-foreground shadow-sm">
            <FileDown className="h-3.5 w-3.5" />
            Gerar Status Report Executivo (PDF)
          </Button>
        </div>
      </div>

      {/* BLOCO 1: KPIS DE IMPACTO (TOPO DO PAINEL) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            1. KPIs de Impacto & Valor Agregado
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setEditingKpis(!editingKpis)}
            className="h-7 text-xs text-muted-foreground gap-1"
          >
            <Pencil className="h-3 w-3" />
            {editingKpis ? "Concluir Edição" : "Editar KPIs"}
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Faturamento */}
          <Card className="p-4 border-l-4 border-l-emerald-500 hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase">Crescimento de Faturamento</span>
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600">
                <TrendingUp className="h-4 w-4" />
              </div>
            </div>
            {editingKpis ? (
              <div className="mt-2 space-y-1">
                <Input
                  type="number"
                  value={data.kpis.revenue_growth_pct}
                  onChange={(e) =>
                    setData({
                      ...data,
                      kpis: { ...data.kpis, revenue_growth_pct: Number(e.target.value) || 0 },
                    })
                  }
                  className="h-8 text-lg font-bold"
                />
                <Input
                  value={data.kpis.revenue_growth_note}
                  onChange={(e) =>
                    setData({
                      ...data,
                      kpis: { ...data.kpis, revenue_growth_note: e.target.value },
                    })
                  }
                  className="h-7 text-xs"
                />
              </div>
            ) : (
              <div className="mt-2">
                <p className="text-3xl font-extrabold text-emerald-600 tabular-nums">
                  +{data.kpis.revenue_growth_pct}%
                </p>
                <p className="mt-1 text-xs text-muted-foreground leading-tight">
                  {data.kpis.revenue_growth_note}
                </p>
              </div>
            )}
          </Card>

          {/* Card 2: Maturidade */}
          <Card className="p-4 border-l-4 border-l-sky-500 hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase">Evolução da Maturidade</span>
              <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-600">
                <Target className="h-4 w-4" />
              </div>
            </div>
            {editingKpis ? (
              <div className="mt-2 space-y-1">
                <Input
                  type="number"
                  value={data.kpis.maturity_growth_pct}
                  onChange={(e) =>
                    setData({
                      ...data,
                      kpis: { ...data.kpis, maturity_growth_pct: Number(e.target.value) || 0 },
                    })
                  }
                  className="h-8 text-lg font-bold"
                />
                <Input
                  value={data.kpis.maturity_growth_note}
                  onChange={(e) =>
                    setData({
                      ...data,
                      kpis: { ...data.kpis, maturity_growth_note: e.target.value },
                    })
                  }
                  className="h-7 text-xs"
                />
              </div>
            ) : (
              <div className="mt-2">
                <p className="text-3xl font-extrabold text-sky-600 tabular-nums">
                  +{data.kpis.maturity_growth_pct}%
                </p>
                <p className="mt-1 text-xs text-muted-foreground leading-tight">
                  {data.kpis.maturity_growth_note}
                </p>
              </div>
            )}
          </Card>

          {/* Card 3: Custos */}
          <Card className="p-4 border-l-4 border-l-amber-500 hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase">Otimização de Custos</span>
              <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600">
                <TrendingDown className="h-4 w-4" />
              </div>
            </div>
            {editingKpis ? (
              <div className="mt-2 space-y-1">
                <Input
                  type="number"
                  value={data.kpis.cost_reduction_pct}
                  onChange={(e) =>
                    setData({
                      ...data,
                      kpis: { ...data.kpis, cost_reduction_pct: Number(e.target.value) || 0 },
                    })
                  }
                  className="h-8 text-lg font-bold"
                />
                <Input
                  value={data.kpis.cost_reduction_note}
                  onChange={(e) =>
                    setData({
                      ...data,
                      kpis: { ...data.kpis, cost_reduction_note: e.target.value },
                    })
                  }
                  className="h-7 text-xs"
                />
              </div>
            ) : (
              <div className="mt-2">
                <p className="text-3xl font-extrabold text-amber-600 tabular-nums">
                  -{data.kpis.cost_reduction_pct}%
                </p>
                <p className="mt-1 text-xs text-muted-foreground leading-tight">
                  {data.kpis.cost_reduction_note}
                </p>
              </div>
            )}
          </Card>

          {/* Card 4: Multiplicador ROI */}
          <Card className="p-4 border-l-4 border-l-indigo-500 hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase">Múltiplo de ROI</span>
              <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-600">
                <ArrowUpRight className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2">
              <p className="text-3xl font-extrabold text-indigo-600 tabular-nums">
                {data.kpis.roi_multiplier}x
              </p>
              <p className="mt-1 text-xs text-muted-foreground leading-tight">
                Retorno financeiro líquido sobre o investimento em consultoria
              </p>
            </div>
          </Card>
        </div>
      </div>

      {/* BLOCO 2: O INFOGRÁFICO INTERATIVO DO ICEBERG ("RAIO-X DO PROJETO") */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            2. Raio-X do Projeto: O Infográfico do Iceberg
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={addSurfaceSymptom} className="h-7 text-xs gap-1">
              <Plus className="h-3 w-3" /> Sintoma Superfície
            </Button>
            <Button variant="outline" size="sm" onClick={addUnderwaterMilestone} className="h-7 text-xs gap-1">
              <Plus className="h-3 w-3" /> Marco Subsolo
            </Button>
          </div>
        </div>

        <div className="rounded-2xl border overflow-hidden shadow-sm">
          {/* TOPO DO ICEBERG (SUPERFÍCIE - ACIMA D'ÁGUA) */}
          <div className="bg-gradient-to-b from-sky-50 to-blue-100/60 dark:from-sky-950/30 dark:to-blue-900/20 p-5 border-b">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-sky-500 animate-pulse" />
                <h3 className="font-bold text-sm text-sky-950 dark:text-sky-200">
                  Superfície Visível: Sintomas e Dores Iniciais do Diagnóstico 360°
                </h3>
              </div>
              <Badge variant="secondary" className="text-xs bg-sky-200/60 dark:bg-sky-900 text-sky-900 dark:text-sky-100">
                Percepção da Diretoria
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {data.iceberg.surface_symptoms.map((symptom) => (
                <div
                  key={symptom.id}
                  className="flex items-start justify-between gap-2 p-3 bg-white/90 dark:bg-slate-900/90 rounded-xl border shadow-xs"
                >
                  <div className="space-y-1">
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${
                        symptom.severity === "critica"
                          ? "border-red-400 text-red-600 bg-red-50 dark:bg-red-950/30"
                          : symptom.severity === "alta"
                            ? "border-amber-400 text-amber-600 bg-amber-50 dark:bg-amber-950/30"
                            : "border-sky-400 text-sky-600 bg-sky-50 dark:bg-sky-950/30"
                      }`}
                    >
                      {symptom.severity.toUpperCase()}
                    </Badge>
                    <p className="text-xs text-slate-800 dark:text-slate-200 font-medium leading-relaxed">
                      {symptom.text}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeSurfaceSymptom(symptom.id)}
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* LINHA D'ÁGUA (DIVISOR VISUAL DO ICEBERG) */}
          <div className="relative py-2 bg-gradient-to-r from-blue-400 via-cyan-400 to-indigo-500 text-center text-white text-[11px] font-bold tracking-wider uppercase shadow-inner">
            <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-black/20 backdrop-blur-xs">
              〰️ Nível de Percepção do Cliente vs. Trabalho Invisível da Consultoria 〰️
            </span>
          </div>

          {/* SUBSOLO OPERACIONAL (ABAIXO D'ÁGUA - O TRABALHO INVISÍVEL TRATADO) */}
          <div className="bg-gradient-to-b from-blue-900/10 via-slate-900/10 to-indigo-950/20 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-indigo-600" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                  Subsolo Operacional: Marcos Estruturados pelas 3 Frentes de Execução
                </h3>
              </div>
              <Badge variant="outline" className="text-xs border-indigo-400 text-indigo-700 bg-indigo-50 dark:bg-indigo-950/30">
                Gargalos Ocultos Destrinchados
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {data.iceberg.underwater_milestones.map((m) => {
                const frontColor =
                  m.front.startsWith("Financeiro")
                    ? "border-emerald-500 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30"
                    : m.front.startsWith("Processos")
                      ? "border-sky-500 text-sky-700 bg-sky-50 dark:bg-sky-950/30"
                      : "border-purple-500 text-purple-700 bg-purple-50 dark:bg-purple-950/30";

                return (
                  <Card key={m.id} className="p-3.5 space-y-2 bg-card border hover:border-primary/50 transition-all">
                    <div className="flex items-start justify-between gap-2">
                      <Badge variant="outline" className={`text-[10px] font-semibold ${frontColor}`}>
                        {m.front}
                      </Badge>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeUnderwaterMilestone(m.id)}
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{m.title}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{m.impact}</p>

                    <div className="flex items-center justify-between pt-1 border-t text-[11px]">
                      <span className="flex items-center gap-1 text-emerald-600 font-medium">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {m.status === "resolvido" ? "Tratado & Homologado" : "Em Resolução"}
                      </span>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* BLOCO 3 & 4: RADAR DE MATURIDADE 360° & ROI DA CONSULTORIA (LADO A LADO) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* BLOCO 3: RADAR DE MATURIDADE 360° */}
        <Card className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                3. Radar de Maturidade 360°
              </p>
              <h3 className="text-sm font-semibold text-foreground">
                Visão Simultânea: Donos vs. Gestão vs. Colaboradores
              </h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditingGaps(!editingGaps)}
              className="h-7 text-xs text-muted-foreground gap-1"
            >
              <Pencil className="h-3 w-3" />
              {editingGaps ? "Concluir" : "Editar Narrativa"}
            </Button>
          </div>

          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={data.radar_360.pilars} outerRadius="75%">
                <PolarGrid stroke="#cbd5e1" strokeDasharray="3 3" />
                <PolarAngleAxis dataKey="shortName" tick={{ fill: "#64748b", fontSize: 11 }} />
                <PolarRadiusAxis angle={30} domain={[0, 5]} stroke="#94a3b8" />

                {/* Donos / Diretoria */}
                <Radar
                  name="Donos / Diretoria"
                  dataKey="donos"
                  stroke="#8b5cf6"
                  fill="#8b5cf6"
                  fillOpacity={0.25}
                />

                {/* Gestão / Liderança */}
                <Radar
                  name="Gestão / Liderança"
                  dataKey="gestao"
                  stroke="#0284c7"
                  fill="#0284c7"
                  fillOpacity={0.2}
                />

                {/* Colaboradores / Operação */}
                <Radar
                  name="Colaboradores"
                  dataKey="colaboradores"
                  stroke="#10b981"
                  fill="#10b981"
                  fillOpacity={0.2}
                />

                {/* Evolução Atual */}
                <Radar
                  name="Evolução Atual"
                  dataKey="mes_atual"
                  stroke="#f59e0b"
                  fill="#f59e0b"
                  fillOpacity={0.15}
                  strokeDasharray="4 4"
                />

                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                <RechartsTooltip />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* Narrativa de Gaps Organizacionais */}
          <div className="p-3 bg-muted/40 rounded-xl border space-y-1">
            <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <ShieldAlert className="h-3.5 w-3.5 text-amber-500" />
              Diagnóstico de Gaps de Alinhamento:
            </p>
            {editingGaps ? (
              <Textarea
                rows={3}
                value={data.radar_360.gaps_narrative}
                onChange={(e) =>
                  setData({
                    ...data,
                    radar_360: { ...data.radar_360, gaps_narrative: e.target.value },
                  })
                }
                className="text-xs"
              />
            ) : (
              <p className="text-xs text-foreground/90 leading-relaxed">
                {data.radar_360.gaps_narrative}
              </p>
            )}
          </div>
        </Card>

        {/* BLOCO 4: ROI DA CONSULTORIA & GRÁFICOS DE TENDÊNCIA */}
        <Card className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                4. ROI da Consultoria & Tendência Financeira
              </p>
              <h3 className="text-sm font-semibold text-foreground">
                Evolução Cruzada: Faturamento vs. Custos Otimizados
              </h3>
            </div>
            <Badge variant="outline" className="text-xs border-emerald-500 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30">
              Pins de Intervenção
            </Badge>
          </div>

          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data.roi_timeline}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="period" tick={{ fill: "#64748b", fontSize: 10 }} />
                <YAxis
                  tick={{ fill: "#64748b", fontSize: 10 }}
                  tickFormatter={(val) => `R$ ${(val / 1000).toFixed(0)}k`}
                />
                <RechartsTooltip
                  formatter={(val: any, name: any) => [brl(Number(val)), name]}
                />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />

                {/* Receita / Faturamento */}
                <Area
                  type="monotone"
                  dataKey="revenue"
                  name="Faturamento Bruto"
                  fill="#10b981"
                  fillOpacity={0.15}
                  stroke="#10b981"
                  strokeWidth={2.5}
                />

                {/* Custos Totais */}
                <Area
                  type="monotone"
                  dataKey="costs"
                  name="Custos Totais"
                  fill="#f43f5e"
                  fillOpacity={0.1}
                  stroke="#f43f5e"
                  strokeWidth={2}
                />

                {/* Lucro Operacional */}
                <Line
                  type="monotone"
                  dataKey="profit"
                  name="Lucro Líquido"
                  stroke="#2563eb"
                  strokeWidth={3}
                  dot={{ r: 5, fill: "#2563eb" }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Timeline de Pins de Intervenção */}
          <div className="p-3 bg-muted/40 rounded-xl border space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">
              Pontos de Inflexão (Onde a Consultoria Agiu):
            </p>
            <div className="space-y-1.5 max-h-36 overflow-y-auto divide-y divide-border/60">
              {data.roi_timeline.map((point, idx) => (
                <div key={idx} className="pt-1.5 first:pt-0 flex items-start justify-between gap-2 text-xs">
                  <div>
                    <span className="font-semibold text-primary">{point.period}: </span>
                    <span className="text-foreground/90">{point.intervention_pin?.title}</span>
                    <span className="text-muted-foreground block text-[11px]">
                      {point.intervention_pin?.description}
                    </span>
                  </div>
                  <Badge variant="secondary" className="shrink-0 text-[10px]">
                    {point.intervention_pin?.front}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
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
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Iniciativas por Horizonte</h2>
          <p className="text-muted-foreground text-sm">
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
                    <div className="font-semibold text-sm">{i.title}</div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
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
      <DialogContent className="max-w-lg">
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
          <div className="grid grid-cols-2 gap-3">
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
            <div className="col-span-2">
              <Label>Tema</Label>
              <Input
                value={form.theme}
                onChange={(e) => setForm({ ...form, theme: e.target.value })}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit}>Adicionar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
