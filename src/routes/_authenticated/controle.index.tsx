import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getProjectAlerts } from "@/lib/alerts.functions";
import { useActiveCompany } from "@/lib/active-company";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Building2,
  AlertTriangle,
  BarChart3,
  TrendingDown,
  ClipboardX,
  CalendarClock,
  ChevronRight,
  Info,
  AlertCircle,
  Clock,
  ClipboardList,
  Workflow,
  Mic,
  Save,
  Star,
  Plus,
  Trash2,
  Copy,
  Gauge,
  Calculator,
  TrendingUp,
  Target,
  LayoutDashboard,
  ArrowUpRight,
  DollarSign,
  PieChart,
  Calendar,
  CheckCircle2,
} from "lucide-react";
import { PhaseMenu, PhaseGrid } from "@/components/PhaseMenu";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  PILARES_MATURIDADE,
  calculateMaturityAverages,
  getDefaultMaturityRecord,
  type MonthlyMaturityRecord,
} from "@/lib/torre-controle-storage";
import { fetchMaturityRecords, importLegacyTorreData, saveMaturityRecord } from "@/lib/torre-storage";
import { DreTab } from "@/components/torre/DreTab";
import { EvolucaoFinanceiraTab } from "@/components/torre/EvolucaoFinanceiraTab";

export const Route = createFileRoute("/_authenticated/controle/")({
  validateSearch: (search: Record<string, unknown>) => ({
    tab: typeof search.tab === "string" ? search.tab : "painel",
  }),
  head: () => ({
    meta: [
      { title: "Torre de Controle · Jarvis Processos" },
      { name: "description", content: "Painel, maturidade, DRE personalizado do cliente e evolução financeira." },
      { property: "og:title", content: "Torre de Controle · Jarvis Processos" },
      { property: "og:description", content: "Painel, maturidade, DRE personalizado do cliente e evolução financeira." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ControlePage,
});

// ===========================================================
// SEVERITY & ICON MAPS
// ===========================================================
const SEV: Record<string, { dot: string; bg: string; text: string }> = {
  critical: { dot: "bg-destructive", bg: "bg-destructive/10", text: "text-destructive" },
  warning: { dot: "bg-amber-500", bg: "bg-amber-500/10", text: "text-amber-600" },
  info: { dot: "bg-sky-500", bg: "bg-sky-500/10", text: "text-sky-600" },
};

const CATEGORY_ICONS: any = {
  indicator_critical: AlertCircle,
  indicator_below_target: BarChart3,
  indicator_late: Clock,
  indicator_no_collection: BarChart3,
  plan_overdue: ClipboardList,
  plan_due_soon: ClipboardList,
  process_unvalidated: Workflow,
  interview_pending: Mic,
};

// ===========================================================
// HELPERS
// ===========================================================
const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function getCurrentMonthYear(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function generateMonthOptions(): { value: string; label: string }[] {
  const opts: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = -12; i <= 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    opts.push({ value: val, label: `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}` });
  }
  return opts;
}

const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const SCORE_LABELS: Record<number, string> = {
  1: "Muito Baixo",
  2: "Baixo",
  3: "Regular",
  4: "Bom",
  5: "Excelente",
};

// ===========================================================
// MAIN PAGE: TORRE DE CONTROLE
// ===========================================================
function ControlePage() {
  const { company, companyId, companies } = useActiveCompany();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const [activeTab, setActiveTab] = useState(search.tab || "painel");

  useEffect(() => {
    if (search.tab && search.tab !== activeTab) {
      setActiveTab(search.tab);
    }
  }, [search.tab]);

  const handleTabChange = (val: string) => {
    setActiveTab(val);
    navigate({ search: { tab: val } as any, replace: true });
  };

  // Recupera uma única vez o que a versão antiga guardou só neste navegador.
  const qc = useQueryClient();
  useEffect(() => {
    if (!companyId) return;
    let cancelled = false;
    importLegacyTorreData(companyId)
      .then((n) => {
        if (cancelled || n === 0) return;
        void qc.invalidateQueries({ queryKey: ["torre-dre-records", companyId] });
        void qc.invalidateQueries({ queryKey: ["torre-maturity", companyId] });
        toast.success(`${n} registro(s) deste computador foram enviados para a nuvem.`);
      })
      .catch((e) => console.warn("[torre] recuperação local", e));
    return () => {
      cancelled = true;
    };
  }, [companyId, qc]);

  if (!companyId) {
    return (
      <Card className="p-8 text-center">
        <Building2 className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
        <h1 className="text-lg font-semibold">Selecione uma empresa</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          A Torre de Controle mostra a situação consolidada da empresa ativa.
        </p>
        {companies.length === 0 && (
          <Link
            to="/empresas"
            className="mt-4 inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
          >
            Cadastrar empresa
          </Link>
        )}
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Torre de Controle</p>
          <h1 className="truncate text-2xl font-bold">{company?.name}</h1>
        </div>
        <PhaseMenu current="controle" />
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 h-auto p-1.5 gap-1.5">
          <TabsTrigger value="painel" className="gap-1.5 text-xs sm:text-sm py-2 min-h-[40px] sm:min-h-0">
            <LayoutDashboard className="h-4 w-4 shrink-0" />
            <span>Painel Geral</span>
          </TabsTrigger>
          <TabsTrigger value="maturidade" className="gap-1.5 text-xs sm:text-sm py-2 min-h-[40px] sm:min-h-0">
            <Target className="h-4 w-4 shrink-0" />
            <span>Maturidade da Empresa</span>
          </TabsTrigger>
          <TabsTrigger value="dre" className="gap-1.5 text-xs sm:text-sm py-2 min-h-[40px] sm:min-h-0">
            <Calculator className="h-4 w-4 shrink-0" />
            <span>DRE Gerencial</span>
          </TabsTrigger>
          <TabsTrigger value="evolucao" className="gap-1.5 text-xs sm:text-sm py-2 min-h-[40px] sm:min-h-0">
            <TrendingUp className="h-4 w-4 shrink-0" />
            <span>Evolução Financeira</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="painel" className="space-y-4 mt-4">
          <PainelDeControleTab key={companyId} companyId={companyId} company={company} />
        </TabsContent>

        <TabsContent value="maturidade" className="space-y-4 mt-4">
          <MaturidadeTab key={companyId} companyId={companyId} companyName={company?.name} />
        </TabsContent>

        <TabsContent value="dre" className="space-y-4 mt-4">
          <DreTab key={companyId} companyId={companyId} companyName={company?.name} />
        </TabsContent>

        <TabsContent value="evolucao" className="space-y-4 mt-4">
          <EvolucaoFinanceiraTab key={companyId} companyId={companyId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ===========================================================
// TAB 1: PAINEL DE CONTROLE (Alertas & Atividades)
// ===========================================================
function PainelDeControleTab({
  companyId,
  company,
}: {
  companyId: string;
  company: { id: string; name: string } | null;
}) {
  const fn = useServerFn(getProjectAlerts);
  const { data, isLoading } = useQuery({
    queryKey: ["company-alerts", companyId],
    queryFn: () => fn({ data: { companyId } as any }),
    enabled: !!companyId,
    refetchInterval: 60_000,
  });

  const h = data?.highlights ?? {
    sem_coleta: 0,
    abaixo_meta: 0,
    planos_atrasados: 0,
    reunioes_marcadas: 0,
  };
  const alerts = data?.alerts ?? [];
  const counts = data?.counts ?? { total: 0, critical: 0, warning: 0, info: 0 };
  const upcoming = data?.upcoming ?? [];

  const tiles = [
    { label: "Sem coleta", value: h.sem_coleta, icon: BarChart3, tone: "info", to: "/indicadores" },
    { label: "Abaixo da meta", value: h.abaixo_meta, icon: TrendingDown, tone: "warning", to: "/indicadores" },
    { label: "Planos atrasados", value: h.planos_atrasados, icon: ClipboardX, tone: "critical", to: "/planos-acao" },
    { label: "Reuniões", value: h.reunioes_marcadas, icon: CalendarClock, tone: "primary", to: "/calendario" },
  ] as const;

  const toneClasses: Record<string, { bg: string; text: string; ring: string }> = {
    info: { bg: "bg-sky-500/10", text: "text-sky-600", ring: "ring-sky-500/20" },
    warning: { bg: "bg-amber-500/10", text: "text-amber-600", ring: "ring-amber-500/20" },
    critical: { bg: "bg-destructive/10", text: "text-destructive", ring: "ring-destructive/20" },
    primary: { bg: "bg-primary/10", text: "text-primary", ring: "ring-primary/20" },
  };

  return (
    <>
      <div className="rounded-xl border bg-card p-3">
        <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Etapas da consultoria
        </p>
        <PhaseGrid />
      </div>

      <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        {tiles.map((t) => {
          const c = toneClasses[t.tone];
          const highlighted = t.value > 0;
          return (
            <Link key={t.label} to={t.to}>
              <Card
                className={`p-3 transition-all hover:shadow-md active:scale-[0.98] ${highlighted ? `ring-1 ${c.ring}` : ""}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${c.bg} ${c.text}`}
                  >
                    <t.icon className="h-4 w-4" />
                  </div>
                  <p
                    className={`text-2xl font-bold tabular-nums ${highlighted ? c.text : "text-muted-foreground"}`}
                  >
                    {isLoading ? "–" : t.value}
                  </p>
                </div>
                <p className="mt-2 text-xs font-medium leading-tight text-muted-foreground">
                  {t.label}
                </p>
              </Card>
            </Link>
          );
        })}
      </div>

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b bg-muted/30 p-4">
          <div className="flex min-w-0 items-center gap-3">
            <div
              className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${counts.critical > 0 ? "bg-destructive/10 text-destructive" : counts.warning > 0 ? "bg-amber-500/10 text-amber-600" : "bg-emerald-500/10 text-emerald-600"}`}
            >
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold">Alertas consolidados</p>
              <p className="truncate text-xs text-muted-foreground">
                {counts.total === 0
                  ? "Tudo em dia"
                  : `${counts.total} ${counts.total === 1 ? "item" : "itens"} requerem atenção`}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {counts.critical > 0 && (
              <Badge variant="destructive" className="h-6 px-2 text-xs">
                {counts.critical}
              </Badge>
            )}
            {counts.warning > 0 && (
              <Badge className="h-6 border-amber-500/30 bg-amber-500/10 px-2 text-xs text-amber-600 hover:bg-amber-500/20">
                {counts.warning}
              </Badge>
            )}
            {counts.info > 0 && (
              <Badge variant="secondary" className="h-6 px-2 text-xs">
                {counts.info}
              </Badge>
            )}
          </div>
        </div>
        {alerts.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            <Info className="mx-auto mb-2 h-6 w-6 opacity-50" />
            Nenhum alerta no momento.
          </div>
        ) : (
          <ul className="max-h-[420px] divide-y overflow-y-auto">
            {alerts.map((a) => {
              const s = SEV[a.severity];
              const Icon = CATEGORY_ICONS[a.category] ?? Info;
              return (
                <li key={a.id}>
                  <Link
                    to={a.href}
                    className="flex items-center gap-3 p-3 transition-colors hover:bg-muted/50"
                  >
                    <span className={`h-2 w-2 shrink-0 rounded-full ${s.dot}`} />
                    <div
                      className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${s.bg} ${s.text}`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{a.title || "Sem título"}</p>
                      {a.subtitle && (
                        <p className="truncate text-xs text-muted-foreground">{a.subtitle}</p>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {upcoming.length > 0 && (
        <Card className="overflow-hidden">
          <div className="flex items-center gap-2 border-b bg-muted/30 px-4 py-2.5">
            <CalendarClock className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold">Próximas reuniões</p>
            <span className="ml-auto text-xs tabular-nums text-muted-foreground">
              {upcoming.length}
            </span>
          </div>
          <ul className="divide-y">
            {upcoming.slice(0, 5).map((u: any) => (
              <li key={u.id} className="flex items-center gap-3 p-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                  <span className="text-xs font-bold tabular-nums">
                    {new Date(u.interview_date).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                    })}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{u.title}</p>
                  {u.participant && (
                    <p className="truncate text-xs text-muted-foreground">{u.participant}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}

// ===========================================================
// TAB 2: MATURIDADE DA EMPRESA (12 Perguntas nos 6 Pilares)
// ===========================================================
function MaturidadeTab({ companyId, companyName }: { companyId: string; companyName?: string }) {
  const monthOptions = useMemo(() => generateMonthOptions(), []);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthYear());

  const [record, setRecord] = useState<MonthlyMaturityRecord>(() => {
    const existing = getMaturityRecordsFromStorage(companyId);
    const found = existing.find((r) => r.month_year === selectedMonth);
    return found ?? getDefaultMaturityRecord(companyId, selectedMonth);
  });

  useEffect(() => {
    const existing = getMaturityRecordsFromStorage(companyId);
    const found = existing.find((r) => r.month_year === selectedMonth);
    setRecord(found ?? getDefaultMaturityRecord(companyId, selectedMonth));
  }, [selectedMonth, companyId]);

  const updateAnswer = useCallback(
    (questionId: number, score: number) => {
      setRecord((prev) => {
        const newAnswers = { ...prev.answers, [questionId]: score };
        const { pilar_averages, global_average } = calculateMaturityAverages(newAnswers);
        return { ...prev, answers: newAnswers, pilar_averages, global_average };
      });
    },
    []
  );

  const handleSave = () => {
    saveMaturityRecord(record);
    toast.success("Avaliação de maturidade salva com sucesso!");
  };

  const scoreColor = (val: number) => {
    if (val >= 4.0) return "text-emerald-600";
    if (val >= 3.0) return "text-amber-600";
    return "text-destructive";
  };

  const scoreBg = (val: number) => {
    if (val >= 4.0) return "bg-emerald-500";
    if (val >= 3.0) return "bg-amber-500";
    return "bg-destructive";
  };

  return (
    <>
      {/* Header: Período + Score Global */}
      <div className="grid gap-4 md:grid-cols-[1fr_auto]">
        <Card className="p-4">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">
            Período da Avaliação
          </Label>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="mt-1 w-full max-w-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="mt-2 text-xs text-muted-foreground">
            Avalie a empresa nos 6 pilares do Sincronismo 360° para este mês.
          </p>
        </Card>

        <Card className="flex flex-col items-center justify-center p-6">
          <div className="relative flex h-24 w-24 items-center justify-center">
            <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                className="text-muted/20"
              />
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                strokeDasharray={`${(record.global_average / 5) * 264} 264`}
                strokeLinecap="round"
                className={scoreColor(record.global_average)}
              />
            </svg>
            <span className={`absolute text-2xl font-bold ${scoreColor(record.global_average)}`}>
              {record.global_average.toFixed(1)}
            </span>
          </div>
          <p className="mt-2 text-xs font-semibold text-muted-foreground">Média Global</p>
          <p className="text-[10px] text-muted-foreground">de 5.0</p>
        </Card>
      </div>

      {/* Pilar Averages Summary */}
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-6">
        {PILARES_MATURIDADE.map((pilar) => {
          const avg = record.pilar_averages[pilar.id] ?? 3;
          return (
            <Card key={pilar.id} className="p-3 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground line-clamp-1">
                {pilar.nome}
              </p>
              <p className={`mt-1 text-xl font-bold ${scoreColor(avg)}`}>{avg.toFixed(1)}</p>
              <div className="mt-1.5 h-1.5 w-full rounded-full bg-muted/30">
                <div
                  className={`h-full rounded-full transition-all ${scoreBg(avg)}`}
                  style={{ width: `${(avg / 5) * 100}%` }}
                />
              </div>
            </Card>
          );
        })}
      </div>

      {/* Questionário por Pilar */}
      <div className="space-y-4">
        {PILARES_MATURIDADE.map((pilar) => (
          <Card key={pilar.id} className="overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b bg-muted/30 px-4 py-3">
              <div>
                <p className="text-sm font-semibold">
                  Pilar {pilar.id}: {pilar.nome}
                </p>
                <p className="text-xs text-muted-foreground">{pilar.descricao}</p>
              </div>
              <Badge variant="outline" className={scoreColor(record.pilar_averages[pilar.id] ?? 3)}>
                {(record.pilar_averages[pilar.id] ?? 3).toFixed(1)} / 5.0
              </Badge>
            </div>
            <div className="divide-y">
              {pilar.perguntas.map((q) => {
                const val = record.answers[q.id] ?? 3;
                return (
                  <div key={q.id} className="p-4">
                    <p className="mb-3 text-sm leading-relaxed">{q.texto}</p>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {[1, 2, 3, 4, 5].map((score) => (
                        <button
                          key={score}
                          type="button"
                          onClick={() => updateAnswer(q.id, score)}
                          className={`flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-all ${
                            val === score
                              ? "border-primary bg-primary text-primary-foreground shadow-sm"
                              : "border-border bg-card text-muted-foreground hover:border-primary/50 hover:bg-primary/5"
                          }`}
                        >
                          <Star
                            className={`h-3.5 w-3.5 ${val === score ? "fill-current" : ""}`}
                          />
                          {score} - {SCORE_LABELS[score]}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        ))}
      </div>

      {/* Observações + Salvar */}
      <Card className="p-4">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">
          Observações do Consultor (opcional)
        </Label>
        <Textarea
          className="mt-2"
          rows={3}
          placeholder="Anotações sobre a avaliação deste mês..."
          value={record.notes ?? ""}
          onChange={(e) => setRecord((prev) => ({ ...prev, notes: e.target.value }))}
        />
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} size="lg" className="gap-2">
          <Save className="h-4 w-4" />
          Salvar Avaliação
        </Button>
      </div>
    </>
  );
}

