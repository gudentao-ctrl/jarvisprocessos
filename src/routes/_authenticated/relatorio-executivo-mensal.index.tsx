import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Building2, CalendarRange, Clock, FileText, Loader2, Sparkles, Target } from "lucide-react";
import { listCompanies } from "@/lib/interviews.functions";
import { generateMonthlyExecutiveSummary, getMonthlyExecutiveData } from "@/lib/impact.functions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ExportPdfButton } from "@/components/report/ExportPdfButton";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/relatorio-executivo-mensal/")({
  component: MonthlyReportPage,
  head: () => ({ meta: [
    { title: "Relatório Executivo Mensal — JARVIS" }, { name: "description", content: "Relatório mensal de entregas, diagnósticos, indicadores e horas." },
    { property: "og:title", content: "Relatório Executivo Mensal — JARVIS" }, { property: "og:description", content: "Compilação executiva mensal da consultoria." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
});

function currentMonth() { return new Date().toISOString().slice(0, 7); }

function MonthlyReportPage() {
  const companiesFn = useServerFn(listCompanies);
  const dataFn = useServerFn(getMonthlyExecutiveData);
  const summaryFn = useServerFn(generateMonthlyExecutiveSummary);
  const { data: companies = [] } = useQuery({ queryKey: ["companies"], queryFn: () => companiesFn() });
  const [companyId, setCompanyId] = useState("");
  const [month, setMonth] = useState(currentMonth);
  const [summary, setSummary] = useState("");
  const { data, isFetching, error } = useQuery({ queryKey: ["monthly-executive", companyId, month], queryFn: () => dataFn({ data: { company_id: companyId, month } }), enabled: !!companyId && !!month });
  const computed = useMemo(() => compute(data), [data]);
  const ai = useMutation({ mutationFn: () => summaryFn({ data: { company_id: companyId, month, facts: JSON.stringify({ planos: data?.plans, causas: data?.causes, dores: data?.pains, oportunidades: data?.opportunities, indicadores: computed.indicators, horas: computed.hours }) } }), onSuccess: (result) => setSummary(result.summary), onError: (failure: Error) => toast.error(failure.message) });
  const monthLabel = month ? new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${month}-01T12:00:00Z`)) : "";
  return <div className="space-y-5"><div><h1 className="flex items-center gap-2 text-xl font-bold sm:text-2xl"><CalendarRange className="h-6 w-6 text-primary" />Relatório Executivo Mensal</h1><p className="text-sm text-muted-foreground">Compilação automática das entregas e evoluções do período.</p></div>
    <Card><CardContent className="grid gap-3 p-4 sm:grid-cols-[1fr_220px_auto] sm:items-end"><div><Label>Empresa</Label><Select value={companyId} onValueChange={(value) => { setCompanyId(value); setSummary(""); }}><SelectTrigger><SelectValue placeholder="Selecione uma empresa ativa" /></SelectTrigger><SelectContent>{companies.filter((company) => company.is_active !== false).map((company) => <SelectItem key={company.id} value={company.id}>{company.name}</SelectItem>)}</SelectContent></Select></div><div><Label>Mês de referência</Label><Input type="month" value={month} onChange={(event) => { setMonth(event.target.value); setSummary(""); }} /></div><Button onClick={() => ai.mutate()} disabled={!data || ai.isPending}>{ai.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}Gerar sumário</Button></CardContent></Card>
    {isFetching && <p className="text-sm text-muted-foreground">Compilando dados…</p>}{error && <Card className="p-6 text-sm text-destructive">{(error as Error).message}</Card>}
    {!companyId && <Card className="p-10 text-center"><Building2 className="mx-auto mb-3 h-9 w-9 text-muted-foreground" /><p className="font-medium">Selecione uma empresa e o mês.</p></Card>}
    {data && <><div className="flex justify-end"><ExportPdfButton filename={`relatorio-executivo-${data.company?.name || "empresa"}-${month}.pdf`} /></div><div id="report-print-root" className="space-y-4 bg-muted p-2 sm:p-4"><ReportPage data={data} summary={summary} computed={computed} monthLabel={monthLabel} /></div></>}
  </div>;
}

function compute(data: any) {
  if (!data) return { sectors: [], indicators: [], hours: { total: 0, byType: [], byConsultant: [] } };
  const sectorMap = new Map<string, { sector: string; total: number; progress: number; done: number }>();
  for (const plan of data.plans) { const name = plan.sector || "Sem setor"; const row = sectorMap.get(name) ?? { sector: name, total: 0, progress: 0, done: 0 }; row.total++; if (plan.status === "em_andamento") row.progress++; if (plan.status === "concluido") row.done++; sectorMap.set(name, row); }
  const collections = new Map<string, any[]>(); for (const item of data.collections) collections.set(item.indicator_id, [...(collections.get(item.indicator_id) ?? []), item]);
  const indicators = data.indicators.map((indicator: any) => { const values = collections.get(indicator.id) ?? []; const first = values[0]?.value; const last = values[values.length - 1]?.value; return { ...indicator, first, last, variation: first != null && last != null ? Number(last) - Number(first) : null, status: values[values.length - 1]?.evaluation || "Sem coleta" }; });
  const byType = new Map<string, number>(); const byConsultant = new Map<string, number>(); let total = 0; for (const entry of data.hours) { const hours = Number(entry.hours || 0); total += hours; byType.set(entry.activity_type || "Outros", (byType.get(entry.activity_type || "Outros") ?? 0) + hours); byConsultant.set(entry.responsible || "Não informado", (byConsultant.get(entry.responsible || "Não informado") ?? 0) + hours); }
  return { sectors: [...sectorMap.values()], indicators, hours: { total, byType: [...byType.entries()], byConsultant: [...byConsultant.entries()] } };
}

function ReportPage({ data, summary, computed, monthLabel }: any) { const hasData = data.plans.length + data.causes.length + data.pains.length + data.opportunities.length + data.collections.length + data.hours.length > 0; return <section className="report-page relative mx-auto min-h-[297mm] w-[210mm] bg-card p-[16mm] text-foreground shadow-sm"><header className="flex items-center justify-between border-b-2 border-primary pb-4"><div className="flex items-center gap-3">{data.company?.company_logo && <img src={data.company.company_logo} alt="" className="h-12 w-20 object-contain" />}<div><p className="text-xs font-bold uppercase text-primary">Relatório Executivo Mensal</p><h2 className="text-xl font-bold">{data.company?.title}</h2><p className="capitalize text-sm text-muted-foreground">{monthLabel}</p></div></div>{data.company?.consultancy_logo && <img src={data.company.consultancy_logo} alt="" className="h-12 w-24 object-contain" />}</header>{!hasData ? <div className="grid min-h-[200mm] place-items-center text-center"><div><FileText className="mx-auto mb-3 h-10 w-10 text-muted-foreground" /><p className="font-semibold">Sem movimentações registradas no período.</p><p className="text-sm text-muted-foreground">O relatório permanece disponível para meses com dados.</p></div></div> : <div className="space-y-7 py-6"><Section title="Sumário Executivo">{summary || "Gere o sumário inteligente para sintetizar o valor entregue neste mês."}</Section><div className="grid grid-cols-4 gap-3"><Kpi icon={FileText} label="Ações" value={data.plans.length} /><Kpi icon={Target} label="Indicadores" value={data.indicators.length} /><Kpi icon={Clock} label="Horas" value={`${computed.hours.total.toFixed(1)}h`} /><Kpi icon={Sparkles} label="Achados" value={data.causes.length + data.pains.length} /></div><Section title="Planos por frente"><SimpleTable headers={["Setor", "Não iniciadas", "Em andamento", "Concluídas"]} rows={computed.sectors.map((row: any) => [row.sector, String(row.total - row.progress - row.done), String(row.progress), String(row.done)])} /></Section><Section title="Achados de profundidade"><ul className="space-y-2 text-sm">{data.causes.map((item: any) => <li key={item.id}>• {item.problem}{item.conclusion ? ` — ${item.conclusion}` : ""}</li>)}{data.pains.map((item: any) => <li key={item.id}>• {item.description}</li>)}</ul></Section><Section title="Indicadores"><SimpleTable headers={["Indicador", "Inicial", "Final", "Variação", "Meta", "Situação"]} rows={computed.indicators.map((item: any) => [item.name, item.first ?? "—", item.last ?? "—", item.variation == null ? "—" : `${item.variation > 0 ? "+" : ""}${item.variation}`, item.target ?? "—", item.status])} /></Section><Section title="Horas da consultoria"><p className="mb-3 text-sm font-semibold">Total: {computed.hours.total.toFixed(1)} horas</p><div className="grid grid-cols-2 gap-4"><SimpleList title="Por atividade" rows={computed.hours.byType} /><SimpleList title="Por consultor" rows={computed.hours.byConsultant} /></div></Section></div>}<footer className="absolute inset-x-[16mm] bottom-[10mm] flex justify-between border-t pt-2 text-[10px] text-muted-foreground"><span>JARVIS Processos</span><span>{data.period.from} a {data.period.to}</span></footer></section>; }
function Section({ title, children }: { title: string; children: React.ReactNode }) { return <section><h3 className="mb-3 border-l-4 border-primary pl-3 text-lg font-bold">{title}</h3><div className="whitespace-pre-wrap text-sm leading-relaxed">{children}</div></section>; }
function Kpi({ icon: Icon, label, value }: any) { return <div className="rounded-md border p-3"><Icon className="mb-2 h-4 w-4 text-primary" /><p className="text-xl font-bold">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div>; }
function SimpleTable({ headers, rows }: { headers: string[]; rows: any[][] }) { return rows.length ? <table className="w-full border-collapse text-xs"><thead><tr>{headers.map((header) => <th key={header} className="border bg-muted p-2 text-left">{header}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex} className="border p-2">{String(cell)}</td>)}</tr>)}</tbody></table> : <p className="text-muted-foreground">Sem dados no período.</p>; }
function SimpleList({ title, rows }: { title: string; rows: [string, number][] }) { return <div><p className="mb-1 font-semibold">{title}</p>{rows.length ? rows.map(([label, value]) => <div key={label} className="flex justify-between border-b py-1"><span>{label}</span><span>{value.toFixed(1)}h</span></div>) : <p className="text-muted-foreground">Sem dados.</p>}</div>; }