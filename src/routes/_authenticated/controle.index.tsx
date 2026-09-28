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
} from "lucide-react";
import { PhaseMenu, PhaseGrid } from "@/components/PhaseMenu";
import { useState, useEffect, useMemo, useCallback } from "react";
import { toast } from "sonner";
import {
  PILARES_MATURIDADE,
  calculateMaturityAverages,
  getDefaultMaturityRecord,
  getMaturityRecordsFromStorage,
  saveMaturityRecord,
  getDefaultDRERecord,
  getDRERecordsFromStorage,
  saveDRERecord,
  calculateDREMetrics,
  clonePreviousMonthDRE,
  type MonthlyMaturityRecord,
  type MonthlyDRERecord,
  type DREItem,
} from "@/lib/torre-controle-storage";

export const Route = createFileRoute("/_authenticated/controle/")({
  component: ControlePage,
});

// ===========================================================
// SEVERITY & ICON MAPS (existing)
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
// MAIN PAGE
// ===========================================================
function ControlePage() {
  const { company, companyId, companies } = useActiveCompany();

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

      <Tabs defaultValue="painel" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="painel">Painel de Controle</TabsTrigger>
          <TabsTrigger value="maturidade">Maturidade da Empresa</TabsTrigger>
          <TabsTrigger value="dre">Evolução Financeira (DRE)</TabsTrigger>
        </TabsList>

        <TabsContent value="painel" className="space-y-4 mt-4">
          <PainelDeControleTab companyId={companyId} company={company} />
        </TabsContent>

        <TabsContent value="maturidade" className="space-y-4 mt-4">
          <MaturidadeTab companyId={companyId} />
        </TabsContent>

        <TabsContent value="dre" className="space-y-4 mt-4">
          <DRETab companyId={companyId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ===========================================================
// TAB 1: PAINEL DE CONTROLE (existing alerts)
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
// TAB 2: MATURIDADE DA EMPRESA
// ===========================================================
function MaturidadeTab({ companyId }: { companyId: string }) {
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
            <SelectTrigger className="mt-1.5 w-full max-w-xs">
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

// ===========================================================
// TAB 3: EVOLUÇÃO FINANCEIRA (DRE)
// ===========================================================
function DRETab({ companyId }: { companyId: string }) {
  const monthOptions = useMemo(() => generateMonthOptions(), []);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthYear());
  const [mode, setMode] = useState<"realizado" | "orcado">("realizado");

  const [record, setRecord] = useState<MonthlyDRERecord>(() => {
    const existing = getDRERecordsFromStorage(companyId);
    const found = existing.find((r) => r.month_year === selectedMonth && r.mode === mode);
    return found ?? getDefaultDRERecord(companyId, selectedMonth, mode);
  });

  useEffect(() => {
    const existing = getDRERecordsFromStorage(companyId);
    const found = existing.find((r) => r.month_year === selectedMonth && r.mode === mode);
    setRecord(found ?? getDefaultDRERecord(companyId, selectedMonth, mode));
  }, [selectedMonth, mode, companyId]);

  const recalculate = useCallback((rec: MonthlyDRERecord): MonthlyDRERecord => {
    const metrics = calculateDREMetrics(
      rec.receita_bruta_items,
      rec.deducoes_items,
      rec.custos_variaveis_items,
      rec.custos_fixos_items
    );
    return { ...rec, ...metrics };
  }, []);

  const updateItems = (
    section: "receita_bruta_items" | "deducoes_items" | "custos_variaveis_items" | "custos_fixos_items",
    items: DREItem[]
  ) => {
    setRecord((prev) => recalculate({ ...prev, [section]: items }));
  };

  const addItem = (section: "receita_bruta_items" | "deducoes_items" | "custos_variaveis_items" | "custos_fixos_items") => {
    setRecord((prev) => {
      const newItem: DREItem = {
        id: crypto.randomUUID(),
        label: "Nova linha",
        amount: 0,
        isCustom: true,
      };
      return recalculate({ ...prev, [section]: [...prev[section], newItem] });
    });
  };

  const removeItem = (
    section: "receita_bruta_items" | "deducoes_items" | "custos_variaveis_items" | "custos_fixos_items",
    id: string
  ) => {
    setRecord((prev) =>
      recalculate({ ...prev, [section]: prev[section].filter((i) => i.id !== id) })
    );
  };

  const handleSave = () => {
    saveDRERecord(record);
    toast.success("DRE salvo com sucesso!");
  };

  const handleClone = () => {
    const cloned = clonePreviousMonthDRE(companyId, selectedMonth, mode);
    if (cloned) {
      setRecord(cloned);
      toast.success("Mês anterior clonado com sucesso!");
    } else {
      toast.error("Nenhum mês anterior encontrado para clonar.");
    }
  };

  return (
    <>
      {/* Controls */}
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <Label className="text-xs text-muted-foreground">Período</Label>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="mt-1 w-48">
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
        </div>

        <div>
          <Label className="text-xs text-muted-foreground">Modo</Label>
          <Select
            value={mode}
            onValueChange={(v) => setMode(v as "realizado" | "orcado")}
          >
            <SelectTrigger className="mt-1 w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="realizado">Realizado</SelectItem>
              <SelectItem value="orcado">Orçado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button variant="outline" onClick={handleClone} className="gap-1.5">
          <Copy className="h-3.5 w-3.5" />
          Clonar Mês Anterior
        </Button>
      </div>

      {/* DRE Table */}
      <Card className="overflow-hidden">
        <div className="border-b bg-muted/30 px-4 py-3">
          <div className="flex items-center gap-2">
            <Gauge className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold">
              DRE Gerencial —{" "}
              {mode === "realizado" ? "Realizado" : "Orçado"}
            </p>
          </div>
        </div>

        <div className="divide-y">
          {/* Receita Bruta */}
          <DRESection
            title="(+) Receita Bruta"
            items={record.receita_bruta_items}
            onUpdate={(items) => updateItems("receita_bruta_items", items)}
            onAdd={() => addItem("receita_bruta_items")}
            onRemove={(id) => removeItem("receita_bruta_items", id)}
            total={record.total_receita_bruta}
            totalLabel="Total Receita Bruta"
            accentClass="text-emerald-600"
          />

          {/* Deduções */}
          <DRESection
            title="(–) Deduções e Impostos"
            items={record.deducoes_items}
            onUpdate={(items) => updateItems("deducoes_items", items)}
            onAdd={() => addItem("deducoes_items")}
            onRemove={(id) => removeItem("deducoes_items", id)}
            total={record.total_deducoes}
            totalLabel="Total Deduções"
            accentClass="text-destructive"
          />

          {/* = Receita Líquida */}
          <div className="flex items-center justify-between bg-sky-50 px-4 py-3 dark:bg-sky-500/10">
            <p className="text-sm font-bold text-sky-700 dark:text-sky-400">
              = Receita Líquida
            </p>
            <p className="text-sm font-bold tabular-nums text-sky-700 dark:text-sky-400">
              {brl(record.receita_liquida)}
            </p>
          </div>

          {/* Custos Variáveis */}
          <DRESection
            title="(–) Custos Variáveis / CMV"
            items={record.custos_variaveis_items}
            onUpdate={(items) => updateItems("custos_variaveis_items", items)}
            onAdd={() => addItem("custos_variaveis_items")}
            onRemove={(id) => removeItem("custos_variaveis_items", id)}
            total={record.total_custos_variaveis}
            totalLabel="Total Custos Variáveis"
            accentClass="text-destructive"
          />

          {/* = Margem de Contribuição */}
          <div className="flex items-center justify-between bg-indigo-50 px-4 py-3 dark:bg-indigo-500/10">
            <p className="text-sm font-bold text-indigo-700 dark:text-indigo-400">
              = Margem de Contribuição
            </p>
            <div className="text-right">
              <p className="text-sm font-bold tabular-nums text-indigo-700 dark:text-indigo-400">
                {brl(record.margem_contribuicao)}
              </p>
              <p className="text-[10px] text-indigo-500">
                {record.margem_contribuicao_pct.toFixed(1)}% da Receita Líquida
              </p>
            </div>
          </div>

          {/* Custos Fixos */}
          <DRESection
            title="(–) Custos Fixos e Pessoal"
            items={record.custos_fixos_items}
            onUpdate={(items) => updateItems("custos_fixos_items", items)}
            onAdd={() => addItem("custos_fixos_items")}
            onRemove={(id) => removeItem("custos_fixos_items", id)}
            total={record.total_custos_fixos}
            totalLabel="Total Custos Fixos"
            accentClass="text-destructive"
          />

          {/* = Lucro Operacional */}
          <div
            className={`flex items-center justify-between px-4 py-4 ${
              record.lucro_operacional >= 0
                ? "bg-emerald-50 dark:bg-emerald-500/10"
                : "bg-red-50 dark:bg-red-500/10"
            }`}
          >
            <p
              className={`text-base font-bold ${
                record.lucro_operacional >= 0
                  ? "text-emerald-700 dark:text-emerald-400"
                  : "text-destructive"
              }`}
            >
              = LUCRO OPERACIONAL
            </p>
            <div className="text-right">
              <p
                className={`text-base font-bold tabular-nums ${
                  record.lucro_operacional >= 0
                    ? "text-emerald-700 dark:text-emerald-400"
                    : "text-destructive"
                }`}
              >
                {brl(record.lucro_operacional)}
              </p>
              <p
                className={`text-[10px] ${
                  record.lucro_operacional >= 0 ? "text-emerald-500" : "text-red-400"
                }`}
              >
                {record.lucro_operacional_pct.toFixed(1)}% da Receita Líquida
              </p>
            </div>
          </div>
        </div>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} size="lg" className="gap-2">
          <Save className="h-4 w-4" />
          Salvar DRE
        </Button>
      </div>
    </>
  );
}

// ===========================================================
// DRE Section Component (reusable)
// ===========================================================
function DRESection({
  title,
  items,
  onUpdate,
  onAdd,
  onRemove,
  total,
  totalLabel,
  accentClass,
}: {
  title: string;
  items: DREItem[];
  onUpdate: (items: DREItem[]) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
  total: number;
  totalLabel: string;
  accentClass: string;
}) {
  const updateItem = (id: string, field: "label" | "amount", value: string | number) => {
    onUpdate(
      items.map((i) =>
        i.id === id
          ? { ...i, [field]: field === "amount" ? Number(value) || 0 : value }
          : i
      )
    );
  };

  return (
    <div className="px-4 py-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{title}</p>
        <Button variant="ghost" size="sm" onClick={onAdd} className="h-7 gap-1 text-xs">
          <Plus className="h-3 w-3" />
          Linha
        </Button>
      </div>
      <div className="space-y-1.5">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-2">
            <Input
              value={item.label}
              onChange={(e) => updateItem(item.id, "label", e.target.value)}
              className="h-8 flex-1 text-xs"
            />
            <Input
              type="number"
              value={item.amount}
              onChange={(e) => updateItem(item.id, "amount", e.target.value)}
              className="h-8 w-32 text-right text-xs tabular-nums"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRemove(item.id)}
              className="h-8 w-8 shrink-0 p-0 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between border-t pt-2">
        <p className={`text-xs font-semibold ${accentClass}`}>{totalLabel}</p>
        <p className={`text-xs font-bold tabular-nums ${accentClass}`}>{brl(total)}</p>
      </div>
    </div>
  );
}
