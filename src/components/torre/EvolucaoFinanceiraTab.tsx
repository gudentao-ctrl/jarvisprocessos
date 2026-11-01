import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, DollarSign, PieChart, TrendingDown, TrendingUp } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Area,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { computeDre, type DreTotals } from "@/lib/dre-model";
import { fetchDreRecords } from "@/lib/torre-storage";
import { monthLabel } from "./DreTab";

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const ROWS: { key: keyof DreTotals; label: string; strong?: boolean; negative?: boolean }[] = [
  { key: "receitaBruta", label: "(+) Receita Bruta", strong: true },
  { key: "deducoes", label: "(–) Deduções", negative: true },
  { key: "receitaLiquida", label: "(=) Receita Líquida", strong: true },
  { key: "custosVariaveis", label: "(–) Custos Variáveis", negative: true },
  { key: "margemContribuicao", label: "(=) Margem de Contribuição", strong: true },
  { key: "custosFixos", label: "(–) Custos Fixos", negative: true },
  { key: "outrasReceitas", label: "(+) Outras Receitas" },
  { key: "outrasDespesas", label: "(–) Outras Despesas", negative: true },
  { key: "resultado", label: "(=) Resultado Final", strong: true },
];

export function EvolucaoFinanceiraTab({ companyId }: { companyId: string }) {
  const recordsQ = useQuery({
    queryKey: ["torre-dre-records", companyId],
    queryFn: () => fetchDreRecords(companyId),
  });

  const months = useMemo(() => {
    const list = recordsQ.data ?? [];
    const realizados = list.filter((r) => r.mode === "realizado");
    return realizados.map((r) => {
      const orc = list.find((o) => o.mode === "orcado" && o.month_year === r.month_year);
      return {
        month: r.month_year,
        totals: computeDre(r.blocks).totals,
        orcado: orc ? computeDre(orc.blocks).totals : null,
      };
    });
  }, [recordsQ.data]);

  if (recordsQ.isError) {
    return <Card className="p-6 text-center text-sm text-destructive">Não foi possível carregar a evolução financeira.</Card>;
  }
  if (recordsQ.isPending) {
    return <Card className="p-6 text-center text-sm text-muted-foreground">Carregando…</Card>;
  }
  if (months.length === 0) {
    return (
      <Card className="p-8 text-center">
        <TrendingUp className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
        <p className="text-sm font-semibold">Nenhum DRE realizado lançado ainda</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Lance os meses na aba DRE Gerencial para acompanhar a evolução do cliente aqui.
        </p>
      </Card>
    );
  }

  const totalFat = months.reduce((a, m) => a + m.totals.receitaBruta, 0);
  const totalRes = months.reduce((a, m) => a + m.totals.resultado, 0);
  const avgMc = months.reduce((a, m) => a + m.totals.margemContribuicaoPct, 0) / months.length;
  const avgCustos = months.reduce((a, m) => a + m.totals.custosVariaveis + m.totals.custosFixos, 0) / months.length;

  const chartData = months.map((m) => ({
    mes: monthLabel(m.month),
    receita_bruta: m.totals.receitaBruta,
    custos_totais: m.totals.custosVariaveis + m.totals.custosFixos,
    resultado: m.totals.resultado,
    mc_pct: m.totals.margemContribuicaoPct,
    resultado_pct: m.totals.resultadoPct,
    receita_orcada: m.orcado?.receitaBruta,
  }));

  const cards = [
    { label: "Faturamento acumulado", value: brl(totalFat), note: `${months.length} ${months.length === 1 ? "mês" : "meses"}`, icon: TrendingUp, tone: "text-acc-emerald" },
    { label: "Margem de contribuição média", value: `${avgMc.toFixed(1)}%`, note: "Sobre a receita líquida", icon: PieChart, tone: "text-acc-violet" },
    { label: "Custos mensais médios", value: brl(avgCustos), note: "Fixos + variáveis", icon: TrendingDown, tone: "text-acc-amber" },
    { label: "Resultado acumulado", value: brl(totalRes), note: totalRes >= 0 ? "Superávit no período" : "Déficit no período", icon: DollarSign, tone: totalRes >= 0 ? "text-primary" : "text-destructive" },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label} className="min-w-0 p-3">
            <div className="flex items-start justify-between gap-2">
              <p className="min-w-0 text-[10px] font-semibold uppercase leading-tight tracking-wide text-muted-foreground">{c.label}</p>
              <c.icon className={`h-4 w-4 shrink-0 ${c.tone}`} />
            </div>
            <p className={`mt-1.5 truncate text-base font-bold tabular-nums sm:text-xl ${c.tone}`}>{c.value}</p>
            <p className="truncate text-[11px] text-muted-foreground">{c.note}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="space-y-3 p-3 sm:p-5">
          <p className="text-sm font-semibold">Faturamento, custos e resultado</p>
          <div className="h-[240px] w-full sm:h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ left: -12, right: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <RechartsTooltip formatter={(val: unknown) => brl(Number(val))} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="receita_bruta" name="Faturamento" fill="var(--acc-emerald)" fillOpacity={0.15} stroke="var(--acc-emerald)" strokeWidth={2} />
                <Area type="monotone" dataKey="custos_totais" name="Custos" fill="var(--acc-red)" fillOpacity={0.1} stroke="var(--acc-red)" strokeWidth={2} />
                <Line type="monotone" dataKey="resultado" name="Resultado" stroke="var(--acc-blue)" strokeWidth={3} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="receita_orcada" name="Faturamento orçado" stroke="var(--acc-slate)" strokeDasharray="4 4" dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="space-y-3 p-3 sm:p-5">
          <p className="text-sm font-semibold">Margens (%)</p>
          <div className="h-[240px] w-full sm:h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ left: -16, right: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${v}%`} />
                <RechartsTooltip formatter={(val: unknown) => `${Number(val).toFixed(1)}%`} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="mc_pct" name="Margem contribuição" fill="var(--acc-violet)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="resultado_pct" name="Margem resultado" fill="var(--acc-blue)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between gap-2 border-b bg-muted/30 px-3 py-3 sm:px-4">
          <div className="flex min-w-0 items-center gap-2">
            <Calendar className="h-4 w-4 shrink-0 text-primary" />
            <p className="truncate text-sm font-semibold">Histórico mês a mês</p>
          </div>
          <Badge variant="secondary" className="shrink-0 text-[10px]">{months.length} meses</Badge>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-max text-xs">
            <thead>
              <tr className="border-b bg-muted/40 text-muted-foreground">
                <th className="sticky left-0 z-[1] bg-muted p-2.5 text-left font-semibold">Linha</th>
                {months.map((m) => (
                  <th key={m.month} className="p-2.5 text-right font-semibold">{monthLabel(m.month)}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {ROWS.filter((row) => row.strong || months.some((m) => m.totals[row.key] !== 0)).map((row) => (
                <tr key={row.key} className={row.strong ? "bg-muted/20 font-semibold" : ""}>
                  <td className={`sticky left-0 z-[1] whitespace-nowrap bg-card p-2.5 ${row.strong ? "" : "text-muted-foreground"}`}>{row.label}</td>
                  {months.map((m) => {
                    const v = m.totals[row.key] as number;
                    return (
                      <td key={m.month} className={`whitespace-nowrap p-2.5 text-right tabular-nums ${row.key === "resultado" && v < 0 ? "text-destructive" : ""}`}>
                        {row.negative ? `(${brl(v)})` : brl(v)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
