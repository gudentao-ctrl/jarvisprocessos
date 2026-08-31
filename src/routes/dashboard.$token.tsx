import { createFileRoute, notFound } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { getPublicDashboard, getPublicPlanDetails } from "@/lib/public-portal.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar,
} from "recharts";
import {
  IndicatorSpark,
  IndicatorDetailChart,
  pickChartKind,
  chartKindLabel,
  formatValue,
} from "@/components/portal/indicator-chart";

import {
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Circle,
  ChevronRight,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/dashboard/$token")({
  ssr: false,
  loader: async ({ params }) => {
    const data = await getPublicDashboard({ data: { token: params.token } });
    if (!data) throw notFound();
    return { data };
  },
  notFoundComponent: () => (
    <div className="min-h-screen grid place-items-center px-4">
      <div className="text-center max-w-sm">
        <h1 className="text-2xl font-bold mb-2">Página indisponível</h1>
        <p className="text-sm text-muted-foreground">
          Este link é inválido ou foi desativado pela consultoria.
        </p>
      </div>
    </div>
  ),
  head: () => ({
    meta: [
      { title: "Dashboard executivo" },
      { name: "robots", content: "noindex" },
      { name: "description", content: "Portal executivo de acompanhamento — JARVIS" },
    ],
  }),
  component: PublicDashboard,
});

type Period = "week" | "month" | "quarter" | "year" | "custom";

function startOf(period: Period, custom?: { from: string; to: string }) {
  const now = new Date();
  const to = new Date(now);
  const from = new Date(now);
  if (period === "week") from.setDate(now.getDate() - 7);
  else if (period === "month") from.setMonth(now.getMonth() - 1);
  else if (period === "quarter") from.setMonth(now.getMonth() - 3);
  else if (period === "year") from.setFullYear(now.getFullYear() - 1);
  else if (period === "custom" && custom) {
    return { from: new Date(custom.from + "T00:00:00"), to: new Date(custom.to + "T23:59:59") };
  }
  return { from, to };
}

function PublicDashboard() {
  const { token } = Route.useParams();
  const initial = Route.useLoaderData().data;
  const fetcher = useServerFn(getPublicDashboard);
  const { data } = useQuery({
    queryKey: ["public-dashboard", token],
    queryFn: () => fetcher({ data: { token } }),
    initialData: initial,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });

  const [period, setPeriod] = useState<Period>("month");
  const [custom, setCustom] = useState({ from: "", to: "" });
  const [processFilter, setProcessFilter] = useState<string>("all");
  const [indicatorFilter, setIndicatorFilter] = useState<string>("all");
  const [responsibleFilter, setResponsibleFilter] = useState<string>("all");
  const [planSector, setPlanSector] = useState<string>("all");
  const [planResponsible, setPlanResponsible] = useState<string>("all");
  const [openIndicator, setOpenIndicator] = useState<any>(null);
  const [openPlan, setOpenPlan] = useState<any>(null);

  const range = useMemo(() => startOf(period, custom), [period, custom]);

  const d = data!;
  const processMap = useMemo(
    () => new Map<string, string>((d.processes ?? []).map((p: any) => [p.id, p.name])),
    [d.processes],
  );

  // ----- Indicators + collections aggregation -----
  const filteredIndicators = useMemo(() => {
    return d.indicators.filter((i: any) => {
      if (processFilter !== "all" && i.process_id !== processFilter) return false;
      if (indicatorFilter !== "all" && i.id !== indicatorFilter) return false;
      if (responsibleFilter !== "all" && (i.responsible_name || "—") !== responsibleFilter) return false;
      return true;
    });
  }, [d.indicators, processFilter, indicatorFilter, responsibleFilter]);

  const collectionsByIndicator = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const c of d.collections) {
      const arr = map.get(c.indicator_id) ?? [];
      const t = new Date(c.submitted_at);
      if (t >= range.from && t <= range.to) arr.push(c);
      map.set(c.indicator_id, arr);
    }
    return map;
  }, [d.collections, range]);

  const responsibles = useMemo(() => {
    const set = new Set<string>();
    for (const i of d.indicators) if (i.responsible_name) set.add(i.responsible_name);
    return Array.from(set).sort();
  }, [d.indicators]);

  // ----- Plans filters -----
  const planSectors = useMemo(() => {
    const s = new Set<string>();
    for (const p of d.plans) if (p.sector) s.add(p.sector);
    return Array.from(s).sort();
  }, [d.plans]);
  const planResponsibles = useMemo(() => {
    const s = new Set<string>();
    for (const p of d.plans) if (p.responsible) s.add(p.responsible);
    return Array.from(s).sort();
  }, [d.plans]);
  const plans = useMemo(
    () =>
      d.plans.filter(
        (p: any) =>
          (planSector === "all" || p.sector === planSector) &&
          (planResponsible === "all" || p.responsible === planResponsible),
      ),
    [d.plans, planSector, planResponsible],
  );

  // ----- Plans aggregation -----
  const planStats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let concluidos = 0,
      atrasados = 0,
      andamento = 0,
      naoIniciados = 0;
    for (const p of plans) {
      if (p.status === "concluido") concluidos++;
      else if (p.status === "aberto") naoIniciados++;
      else if (p.status === "em_andamento") {
        const due = p.new_due_date || p.due_date;
        if (due && new Date(due) < today) atrasados++;
        else andamento++;
      } else {
        const due = p.new_due_date || p.due_date;
        if (due && new Date(due) < today) atrasados++;
        else andamento++;
      }
    }
    return { concluidos, atrasados, andamento, naoIniciados };
  }, [plans]);

  // ----- Plans by demand type -----
  const demandStats = useMemo(() => {
    const labels: Record<string, string> = {
      processo: "Processo",
      pessoas: "Pessoas",
      negocio: "Negócio",
    };
    const base = ["processo", "pessoas", "negocio", "sem_classificacao"];
    const map = new Map<string, { tipo: string; nao_iniciadas: number; em_andamento: number; concluidas: number }>();
    for (const k of base) {
      map.set(k, {
        tipo: labels[k] ?? "Sem classificação",
        nao_iniciadas: 0,
        em_andamento: 0,
        concluidas: 0,
      });
    }
    for (const p of plans) {
      const key = labels[p.demand_type] ? p.demand_type : "sem_classificacao";
      const row = map.get(key)!;
      if (p.status === "concluido") row.concluidas++;
      else if (p.status === "aberto") row.nao_iniciadas++;
      else row.em_andamento++;
    }
    return Array.from(map.values()).filter(
      (r) => r.nao_iniciadas + r.em_andamento + r.concluidas > 0,
    );
  }, [plans]);

  // ----- Executive summary counters -----
  const summary = useMemo(() => {
    let noAlvo = 0,
      abaixo = 0,
      criticos = 0;
    for (const i of d.indicators) {
      const cols = collectionsByIndicator.get(i.id) ?? [];
      const last = cols[cols.length - 1];
      if (!last) continue;
      if (last.evaluation === "critico") criticos++;
      else if (last.evaluation === "abaixo_meta") abaixo++;
      else noAlvo++;
    }
    return { noAlvo, abaixo, criticos };
  }, [d.indicators, collectionsByIndicator]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/40 to-background">
      {/* ================ Header ================ */}
      <header className="border-b bg-background/80 backdrop-blur sticky top-0 z-30">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            {d.company.company_logo_url && (
              <img
                src={d.company.company_logo_url}
                alt=""
                className="h-12 w-12 rounded-xl object-contain bg-muted p-1"
              />
            )}
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-lg font-bold tracking-tight sm:text-xl">
                {d.company.title}
              </h1>
              <p className="truncate text-xs text-muted-foreground">
                Atualizado{" "}
                {formatDistanceToNow(new Date(d.company.updated_at), {
                  addSuffix: true,
                  locale: ptBR,
                })}
              </p>
            </div>
            {d.company.consultancy_logo_url && (
              <img
                src={d.company.consultancy_logo_url}
                alt=""
                className="h-10 object-contain opacity-80"
              />
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-8 px-4 py-6 sm:px-6 sm:py-8">
        {/* ================ Executive summary ================ */}
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SummaryTile
            icon={CheckCircle2}
            label="Indicadores no alvo"
            value={summary.noAlvo}
            tone="ok"
          />
          <SummaryTile
            icon={TrendingDown}
            label="Abaixo da meta"
            value={summary.abaixo}
            tone="warn"
          />
          <SummaryTile
            icon={AlertTriangle}
            label="Críticos"
            value={summary.criticos}
            tone="critical"
          />
          <SummaryTile
            icon={Clock}
            label="Planos atrasados"
            value={planStats.atrasados}
            tone="critical"
          />
        </section>

        {/* ================ Section 1 — Indicators ================ */}
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold sm:text-xl">Indicadores</h2>
              <p className="text-xs text-muted-foreground">
                {filteredIndicators.length} indicadores no filtro atual
              </p>
            </div>
          </div>

          {/* Filters */}
          <Card className="p-3 sm:p-4">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
                <SelectTrigger><SelectValue placeholder="Período" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">Última semana</SelectItem>
                  <SelectItem value="month">Último mês</SelectItem>
                  <SelectItem value="quarter">Trimestre</SelectItem>
                  <SelectItem value="year">Ano</SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                </SelectContent>
              </Select>
              {period === "custom" && (
                <div className="flex gap-2 sm:col-span-2">
                  <Input type="date" value={custom.from} onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))} />
                  <Input type="date" value={custom.to} onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))} />
                </div>
              )}
              <Select value={processFilter} onValueChange={setProcessFilter}>
                <SelectTrigger><SelectValue placeholder="Processo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos processos</SelectItem>
                  {d.processes.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={indicatorFilter} onValueChange={setIndicatorFilter}>
                <SelectTrigger><SelectValue placeholder="Indicador" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos indicadores</SelectItem>
                  {d.indicators.map((i: any) => (
                    <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={responsibleFilter} onValueChange={setResponsibleFilter}>
                <SelectTrigger><SelectValue placeholder="Responsável" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos responsáveis</SelectItem>
                  {responsibles.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </Card>

          {filteredIndicators.length === 0 ? (
            <Card className="p-8 text-center text-sm text-muted-foreground">
              Nenhum indicador para os filtros selecionados.
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredIndicators.map((i: any) => (
                <IndicatorCard
                  key={i.id}
                  indicator={i}
                  collections={collectionsByIndicator.get(i.id) ?? []}
                  processName={i.process_id ? processMap.get(i.process_id) : undefined}
                  onOpen={() => setOpenIndicator(i)}
                />
              ))}
            </div>
          )}
        </section>

        {/* ================ Section 2 — Plans ================ */}
        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold sm:text-xl">Planos de ação</h2>
              <p className="text-xs text-muted-foreground">
                {plans.length} de {d.plans.length} planos
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Select value={planSector} onValueChange={setPlanSector}>
                <SelectTrigger className="w-44"><SelectValue placeholder="Setor" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os setores</SelectItem>
                  {planSectors.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={planResponsible} onValueChange={setPlanResponsible}>
                <SelectTrigger className="w-44"><SelectValue placeholder="Responsável" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os responsáveis</SelectItem>
                  {planResponsibles.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
            <Card className="p-4">
              <p className="mb-3 text-sm font-semibold">Distribuição</p>
              <div className="h-56">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={[
                        { name: "Concluídos", value: planStats.concluidos, fill: "hsl(142 76% 36%)" },
                        { name: "Em andamento", value: planStats.andamento, fill: "hsl(217 91% 60%)" },
                        { name: "Atrasados", value: planStats.atrasados, fill: "hsl(0 84% 60%)" },
                        { name: "Não iniciados", value: planStats.naoIniciados, fill: "hsl(220 9% 65%)" },
                      ]}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={45}
                      outerRadius={75}
                      label={renderPieLabel}
                      labelLine={false}
                    >
                      {[0, 1, 2, 3].map((k) => <Cell key={k} />)}
                    </Pie>
                    <Legend />
                    <Tooltip formatter={(v: any) => `${v} ação(ões)`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="overflow-hidden">
              <ul className="divide-y max-h-[520px] overflow-y-auto">
                {plans.map((p: any) => (
                  <PlanRow key={p.id} plan={p} onOpen={() => setOpenPlan(p)} />
                ))}
                {plans.length === 0 && (
                  <li className="p-6 text-center text-sm text-muted-foreground">Nenhum plano para os filtros selecionados.</li>
                )}
              </ul>
            </Card>
          </div>

          <Card className="p-4">
            <p className="mb-1 text-sm font-semibold">Ações por tipo de demanda</p>
            <p className="mb-3 text-xs text-muted-foreground">
              Processo, Pessoas e Negócio — por situação da ação
            </p>
            {demandStats.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Nenhuma ação classificada ainda.
              </p>
            ) : (
              <div className="h-64">
                <ResponsiveContainer>
                  <BarChart data={demandStats}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="tipo" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="nao_iniciadas" name="Não iniciadas" fill="hsl(220 9% 65%)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="em_andamento" name="Em andamento" fill="hsl(217 91% 60%)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="concluidas" name="Concluídas" fill="hsl(142 76% 36%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>
        </section>

        <footer className="pt-8 pb-4 text-center text-xs text-muted-foreground">
          Powered by JARVIS · Portal executivo somente leitura
        </footer>
      </main>

      {/* ================ Dialogs ================ */}
      <IndicatorDialog
        indicator={openIndicator}
        collections={openIndicator ? collectionsByIndicator.get(openIndicator.id) ?? [] : []}
        onClose={() => setOpenIndicator(null)}
      />
      <PlanDialog plan={openPlan} token={token} onClose={() => setOpenPlan(null)} />
    </div>
  );
}

/* ================================================================
 * Sub-components
 * ================================================================ */

function SummaryTile({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: any;
  label: string;
  value: number;
  tone: "ok" | "warn" | "critical" | "info";
}) {
  const t: Record<string, string> = {
    ok: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    warn: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    critical: "bg-destructive/10 text-destructive",
    info: "bg-primary/10 text-primary",
  };
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2">
        <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${t[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <p className="text-2xl font-bold tabular-nums">{value}</p>
      </div>
      <p className="mt-2 text-xs font-medium leading-tight text-muted-foreground">{label}</p>
    </Card>
  );
}

function IndicatorCard({
  indicator,
  collections,
  processName,
  onOpen,
}: {
  indicator: any;
  collections: any[];
  processName?: string;
  onOpen: () => void;
}) {
  const last = collections[collections.length - 1];
  const prev = collections[collections.length - 2];
  const trend =
    !last || !prev ? 0 : last.value > prev.value ? 1 : last.value < prev.value ? -1 : 0;

  const currentValue = last?.value;
  const pct =
    indicator.target && currentValue != null && indicator.target !== 0
      ? Math.round(((currentValue as number) / (indicator.target as number)) * 100)
      : null;

  const toneClass =
    last?.evaluation === "critico"
      ? "text-destructive"
      : last?.evaluation === "abaixo_meta"
      ? "text-amber-600 dark:text-amber-400"
      : "text-emerald-600 dark:text-emerald-400";

  const kind = pickChartKind(indicator, collections.length);

  return (
    <button
      onClick={onOpen}
      className="text-left transition-all hover:shadow-md active:scale-[0.99]"
    >
      <Card className="p-4 h-full">
        {processName && (
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {processName}
          </p>
        )}
        <h3 className="line-clamp-2 text-sm font-semibold">{indicator.name}</h3>

        <div className="mt-3 flex items-end gap-2">
          <p className={`text-2xl font-bold tabular-nums ${toneClass}`}>
            {formatValue(currentValue, indicator.unit)}
          </p>
          {trend !== 0 && (
            <span className={`ml-auto pb-1 ${trend > 0 ? "text-emerald-600" : "text-destructive"}`}>
              {trend > 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
            </span>
          )}
          {trend === 0 && last && (
            <span className="ml-auto pb-1 text-muted-foreground"><Minus className="h-4 w-4" /></span>
          )}
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
          {indicator.target != null && (
            <span className="inline-flex items-center gap-1">
              <Target className="h-3 w-3" /> Meta {formatValue(Number(indicator.target), indicator.unit)}
            </span>
          )}
          {pct != null && <span className="tabular-nums">· {pct}% atingido</span>}
          <span className="ml-auto rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium">
            {chartKindLabel(kind)}
          </span>
        </div>

        <div className="mt-3">
          <IndicatorSpark indicator={indicator} collections={collections} height={64} />
        </div>


        <p className="mt-2 text-[10px] text-muted-foreground">
          {last
            ? `Atualizado ${formatDistanceToNow(new Date(last.submitted_at), { addSuffix: true, locale: ptBR })}`
            : "Sem coletas no período"}
        </p>
      </Card>
    </button>
  );
}

function IndicatorDialog({
  indicator,
  collections,
  onClose,
}: {
  indicator: any;
  collections: any[];
  onClose: () => void;
}) {
  if (!indicator) return null;
  const kind = pickChartKind(indicator, collections.length);
  const last = collections[collections.length - 1];
  const pct =
    indicator.target && last?.value != null && Number(indicator.target) !== 0
      ? Math.round((Number(last.value) / Number(indicator.target)) * 100)
      : null;
  return (
    <Dialog open={!!indicator} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            {indicator.name}
            <Badge variant="outline" className="text-[10px] font-normal">
              {chartKindLabel(kind)}
            </Badge>
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MiniStat
              label="Valor atual"
              value={formatValue(last?.value != null ? Number(last.value) : null, indicator.unit)}
            />
            <MiniStat
              label="Meta"
              value={indicator.target != null ? formatValue(Number(indicator.target), indicator.unit) : "—"}
            />
            <MiniStat label="Atingimento" value={pct != null ? `${pct}%` : "—"} />
            <MiniStat label="Coletas" value={String(collections.length)} />
          </div>
          <div className="h-72">
            <IndicatorDetailChart indicator={indicator} collections={collections} />
          </div>

          <div className="max-h-64 overflow-y-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="p-2 text-left">Data</th>
                  <th className="p-2 text-left">Período</th>
                  <th className="p-2 text-right">Valor</th>
                  <th className="p-2 text-left">Avaliação</th>
                </tr>
              </thead>
              <tbody>
                {[...collections].reverse().map((c) => (
                  <tr key={c.id} className="border-t">
                    <td className="p-2">{new Date(c.submitted_at).toLocaleDateString("pt-BR")}</td>
                    <td className="p-2 text-muted-foreground">{c.reference_period || "—"}</td>
                    <td className="p-2 text-right font-medium tabular-nums">{Number(c.value).toLocaleString("pt-BR")}</td>
                    <td className="p-2 text-xs">{c.evaluation || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border p-2">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  );
}

function statusMeta(status: string, due?: string | null, newDue?: string | null) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = newDue || due;
  const overdue = d ? new Date(d) < today && status !== "concluido" : false;
  if (status === "concluido") return { label: "Concluído", color: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400", icon: CheckCircle2 };
  if (overdue) return { label: "Atrasado", color: "bg-destructive/15 text-destructive", icon: AlertTriangle };
  if (status === "em_andamento") return { label: "Em andamento", color: "bg-blue-500/15 text-blue-700 dark:text-blue-400", icon: Clock };
  return { label: "Não iniciado", color: "bg-muted text-muted-foreground", icon: Circle };
}

function gutScore(p: any) {
  return (Number(p?.gravity) || 0) * (Number(p?.urgency) || 0) * (Number(p?.trend) || 0);
}

function gutTier(score: number) {
  if (score >= 75) return { label: "Crítica", color: "bg-destructive/15 text-destructive" };
  if (score >= 40) return { label: "Alta", color: "bg-orange-500/15 text-orange-700 dark:text-orange-400" };
  if (score >= 15) return { label: "Média", color: "bg-amber-500/15 text-amber-700 dark:text-amber-400" };
  return { label: "Baixa", color: "bg-muted text-muted-foreground" };
}

function renderPieLabel(props: any) {
  const { cx, cy, midAngle, innerRadius, outerRadius, percent } = props;
  if (!percent || percent < 0.04) return null;
  const RAD = Math.PI / 180;
  const r = (innerRadius + outerRadius) / 2;
  const x = cx + r * Math.cos(-midAngle * RAD);
  const y = cy + r * Math.sin(-midAngle * RAD);
  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      dominantBaseline="central"
      fill="#fff"
      fontSize={12}
      fontWeight={600}
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

function PlanRow({ plan, onOpen }: { plan: any; onOpen: () => void }) {
  const meta = statusMeta(plan.status, plan.due_date, plan.new_due_date);
  const due = plan.new_due_date || plan.due_date;
  return (
    <li>
      <button onClick={onOpen} className="flex w-full items-center gap-3 p-3 text-left hover:bg-muted/50">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{plan.title}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline" className={meta.color}>
              <meta.icon className="mr-1 h-3 w-3" /> {meta.label}
            </Badge>
            {plan.demand_type && (
              <Badge variant="secondary" className="font-medium">
                {plan.demand_type === "negocio" ? "Negócio" : plan.demand_type === "pessoas" ? "Pessoas" : "Processo"}
              </Badge>
            )}
            <Badge variant="outline" className={gutTier(gutScore(plan)).color}>
              GUT {gutScore(plan) || "—"} · {gutTier(gutScore(plan)).label}
            </Badge>
            {plan.origin && <span>Origem: {plan.origin}</span>}
            {plan.sector && <span>· {plan.sector}</span>}
            {plan.responsible && <span>· {plan.responsible}</span>}
            {due && <span>· prazo {new Date(due).toLocaleDateString("pt-BR")}</span>}
          </div>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>
    </li>
  );
}

function PlanDialog({
  plan,
  token,
  onClose,
}: {
  plan: any;
  token: string;
  onClose: () => void;
}) {
  const fetcher = useServerFn(getPublicPlanDetails);
  const { data } = useQuery({
    queryKey: ["public-plan", token, plan?.id],
    queryFn: () => fetcher({ data: { token, plan_id: plan.id } }),
    enabled: !!plan,
  });
  if (!plan) return null;
  return (
    <Dialog open={!!plan} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{plan.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <div className="grid gap-2 sm:grid-cols-2">
            {plan.problem && <Field label="Problema" value={plan.problem} />}
            {plan.cause && <Field label="Causa" value={plan.cause} />}
            {plan.expected_result && <Field label="Resultado esperado" value={plan.expected_result} />}
            {plan.observations && <Field label="Observações" value={plan.observations} />}
            {plan.responsible && <Field label="Responsável" value={plan.responsible} />}
            {plan.category && <Field label="Categoria" value={plan.category} />}
            {plan.priority && <Field label="Prioridade" value={plan.priority} />}
            <Field label="Status" value={statusMeta(plan.status, plan.due_date, plan.new_due_date).label} />
            {(plan.due_date || plan.new_due_date) && (
              <Field
                label="Prazo"
                value={new Date(plan.new_due_date || plan.due_date).toLocaleDateString("pt-BR")}
              />
            )}
          </div>

          {Array.isArray(plan.evidences) && plan.evidences.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Evidências</p>
              <ul className="space-y-1">
                {plan.evidences.map((e: any, k: number) => (
                  <li key={k} className="text-xs">
                    {typeof e === "string" ? (
                      <a href={e} target="_blank" rel="noreferrer" className="text-primary underline">{e}</a>
                    ) : e?.url ? (
                      <a href={e.url} target="_blank" rel="noreferrer" className="text-primary underline">
                        {e.name || e.url}
                      </a>
                    ) : (
                      JSON.stringify(e)
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Histórico</p>
            {!data ? (
              <p className="text-xs text-muted-foreground">Carregando…</p>
            ) : data.history.length === 0 ? (
              <p className="text-xs text-muted-foreground">Sem atualizações registradas.</p>
            ) : (
              <ol className="space-y-2 border-l pl-4">
                {data.history.map((h: any) => (
                  <li key={h.id} className="relative">
                    <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-primary" />
                    <p className="text-xs text-muted-foreground">
                      {new Date(h.changed_at).toLocaleString("pt-BR")}
                    </p>
                    {h.field === "comentario" || h.comment ? (
                      <p className="text-sm">{h.comment}</p>
                    ) : (
                      <p className="text-sm">
                        <span className="font-medium">{h.field}:</span>{" "}
                        <span className="text-muted-foreground line-through">{h.old_value ?? "—"}</span>{" "}
                        → <span>{h.new_value ?? "—"}</span>
                      </p>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm">{value}</p>
    </div>
  );
}
