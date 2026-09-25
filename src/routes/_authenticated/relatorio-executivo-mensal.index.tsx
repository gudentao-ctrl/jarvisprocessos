import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Building2, CalendarRange, FileText, Loader2, Plus, Sparkles } from "lucide-react";
import { listCompanies } from "@/lib/interviews.functions";
import { generateMonthlyExecutiveSummary, getMonthlyExecutiveData } from "@/lib/impact.functions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BlockEditor } from "@/components/report/BlockEditor";
import { BlockList } from "@/components/report/BlockList";
import { ExportPdfButton } from "@/components/report/ExportPdfButton";
import type { ReportBlock } from "@/lib/report-types";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/relatorio-executivo-mensal/")({
  component: MonthlyReportPage,
  head: () => ({ meta: [
    { title: "Relatório Executivo Mensal — JARVIS" },
    { name: "description", content: "Relatório mensal editável de entregas, diagnósticos, indicadores e horas." },
    { property: "og:title", content: "Relatório Executivo Mensal — JARVIS" },
    { property: "og:description", content: "Compilação executiva mensal editável da consultoria." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
});

function currentMonth() { return new Date().toISOString().slice(0, 7); }

function compute(data: any) {
  if (!data) return { sectors: [], indicators: [], hours: { total: 0, byType: [], byConsultant: [] } };
  const sectorMap = new Map<string, { sector: string; total: number; progress: number; done: number }>();
  for (const plan of data.plans) {
    const name = plan.sector || "Sem setor";
    const row = sectorMap.get(name) ?? { sector: name, total: 0, progress: 0, done: 0 };
    row.total++;
    if (plan.status === "em_andamento") row.progress++;
    if (plan.status === "concluido") row.done++;
    sectorMap.set(name, row);
  }
  const collections = new Map<string, any[]>();
  for (const item of data.collections) collections.set(item.indicator_id, [...(collections.get(item.indicator_id) ?? []), item]);
  const indicators = data.indicators.map((indicator: any) => {
    const values = collections.get(indicator.id) ?? [];
    const first = values[0]?.value;
    const last = values[values.length - 1]?.value;
    return { ...indicator, first, last, variation: first != null && last != null ? Number(last) - Number(first) : null, status: values[values.length - 1]?.evaluation || "Sem coleta" };
  });
  const byType = new Map<string, number>();
  const byConsultant = new Map<string, number>();
  let total = 0;
  for (const entry of data.hours) {
    const hours = Number(entry.hours || 0);
    total += hours;
    byType.set(entry.activity_type || "Outros", (byType.get(entry.activity_type || "Outros") ?? 0) + hours);
    byConsultant.set(entry.responsible || "Não informado", (byConsultant.get(entry.responsible || "Não informado") ?? 0) + hours);
  }
  return { sectors: [...sectorMap.values()], indicators, hours: { total, byType: [...byType.entries()], byConsultant: [...byConsultant.entries()] } };
}

function buildBlocks(data: any, computed: ReturnType<typeof compute>): ReportBlock[] {
  const findings = [
    ...data.causes.map((item: any) => `${item.problem}${item.conclusion ? ` — ${item.conclusion}` : ""}`),
    ...data.pains.map((item: any) => item.description),
    ...data.opportunities.map((item: any) => `${item.title}${item.expected_benefit ? ` — ${item.expected_benefit}` : ""}`),
  ];
  return [
    { id: "summary", type: "summary", title: "Sumário Executivo", enabled: true, content: "Gere o sumário inteligente ou edite este texto antes de exportar." },
    { id: "overview", type: "kpis", title: "Visão Geral do Período", enabled: true, content: [`Ações: ${data.plans.length}`, `Indicadores acompanhados: ${data.indicators.length}`, `Horas da consultoria: ${computed.hours.total.toFixed(1)}h`, `Achados: ${data.causes.length + data.pains.length}`].join("\n") },
    { id: "plans", type: "table", title: "Planos por Frente", enabled: true, tableRows: [["Setor", "Não iniciadas", "Em andamento", "Concluídas"], ...computed.sectors.map((row) => [row.sector, String(row.total - row.progress - row.done), String(row.progress), String(row.done)])] },
    { id: "findings", type: "text", title: "Diagnósticos e Oportunidades do Mês", enabled: true, content: findings.length ? findings.map((item) => `• ${item}`).join("\n") : "Sem novos diagnósticos ou oportunidades no período." },
    { id: "indicators", type: "table", title: "Indicadores", enabled: true, tableRows: [["Indicador", "Inicial", "Final", "Variação", "Meta", "Situação"], ...computed.indicators.map((item: any) => [item.name, String(item.first ?? "—"), String(item.last ?? "—"), item.variation == null ? "—" : `${item.variation > 0 ? "+" : ""}${item.variation}`, String(item.target ?? "—"), item.status])] },
    { id: "hours", type: "table", title: "Horas da Consultoria", enabled: true, tableRows: [["Distribuição", "Horas"], ["Total", computed.hours.total.toFixed(1)], ...computed.hours.byType.map(([label, value]) => [`Atividade — ${label}`, value.toFixed(1)]), ...computed.hours.byConsultant.map(([label, value]) => [`Consultor — ${label}`, value.toFixed(1)])] },
  ];
}

function MonthlyReportPage() {
  const companiesFn = useServerFn(listCompanies);
  const dataFn = useServerFn(getMonthlyExecutiveData);
  const summaryFn = useServerFn(generateMonthlyExecutiveSummary);
  const { data: companies = [] } = useQuery({ queryKey: ["companies"], queryFn: () => companiesFn() });
  const [companyId, setCompanyId] = useState("");
  const [month, setMonth] = useState(currentMonth);
  const [blocks, setBlocks] = useState<ReportBlock[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tab, setTab] = useState("compose");
  const { data, isFetching, error } = useQuery({ queryKey: ["monthly-executive", companyId, month], queryFn: () => dataFn({ data: { company_id: companyId, month } }), enabled: !!companyId && !!month });
  const computed = useMemo(() => compute(data), [data]);
  useEffect(() => { if (data) setBlocks(buildBlocks(data, computed)); }, [data, computed]);
  const ai = useMutation({
    mutationFn: () => summaryFn({ data: { company_id: companyId, month, facts: JSON.stringify({ planos: data?.plans, causas: data?.causes, dores: data?.pains, oportunidades: data?.opportunities, indicadores: computed.indicators, horas: computed.hours }) } }),
    onSuccess: (result) => {
      setBlocks((current) => current.map((block) => block.id === "summary" ? { ...block, content: result.summary } : block));
      setTab("preview");
      toast.success("Sumário gerado e pronto para edição.");
    },
    onError: (failure: Error) => toast.error(failure.message),
  });
  const monthLabel = month ? new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${month}-01T12:00:00Z`)) : "";
  const editingBlock = editingId ? blocks.find((block) => block.id === editingId) ?? null : null;
  const resetReport = () => { if (data) setBlocks(buildBlocks(data, computed)); };

  return <div className="space-y-5">
    <div><h1 className="flex items-center gap-2 text-xl font-bold sm:text-2xl"><CalendarRange className="h-6 w-6 text-primary" />Relatório Executivo Mensal</h1><p className="text-sm text-muted-foreground">Selecione, edite e ordene o conteúdo antes de gerar o PDF.</p></div>
    <Card><CardContent className="grid gap-3 p-4 sm:grid-cols-[1fr_220px_auto] sm:items-end"><div><Label>Empresa</Label><Select value={companyId} onValueChange={(value) => { setCompanyId(value); setBlocks([]); }}><SelectTrigger><SelectValue placeholder="Selecione uma empresa ativa" /></SelectTrigger><SelectContent>{companies.filter((company) => company.is_active !== false).map((company) => <SelectItem key={company.id} value={company.id}>{company.name}</SelectItem>)}</SelectContent></Select></div><div><Label>Mês de referência</Label><Input type="month" value={month} onChange={(event) => { setMonth(event.target.value); setBlocks([]); }} /></div><Button onClick={() => ai.mutate()} disabled={!data || ai.isPending}>{ai.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}Gerar sumário</Button></CardContent></Card>
    {isFetching && <p className="text-sm text-muted-foreground">Compilando dados…</p>}
    {error && <Card className="p-6 text-sm text-destructive">{(error as Error).message}</Card>}
    {!companyId && <Card className="p-10 text-center"><Building2 className="mx-auto mb-3 h-9 w-9 text-muted-foreground" /><p className="font-medium">Selecione uma empresa e o mês.</p></Card>}
    {data && <Tabs value={tab} onValueChange={setTab}>
      <div className="flex flex-wrap items-center justify-between gap-3"><TabsList><TabsTrigger value="compose">1. Composição</TabsTrigger><TabsTrigger value="preview">2. Pré-visualização</TabsTrigger></TabsList><div className="flex gap-2"><Button variant="outline" onClick={resetReport}>Restaurar conteúdo</Button><ExportPdfButton filename={`relatorio-executivo-${data.company?.name || "empresa"}-${month}.pdf`} /></div></div>
      <TabsContent value="compose"><Card className="p-4"><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div><h2 className="font-semibold">Seções do PDF</h2><p className="text-xs text-muted-foreground">Arraste para ordenar, use o olho para incluir ou retirar e clique no título para editar.</p></div><Button size="sm" variant="outline" onClick={() => setBlocks((current) => [...current, { id: `text-${Date.now()}`, type: "text", title: "Nova seção", enabled: true, content: "" }])}><Plus className="mr-1 h-4 w-4" />Texto</Button></div><BlockList blocks={blocks} onChange={setBlocks} onEdit={setEditingId} /></Card></TabsContent>
      <TabsContent value="preview"><div id="report-print-root" className="space-y-4 bg-muted p-2 sm:p-4">{blocks.filter((block) => block.enabled).map((block, index, visible) => <ReportPage key={block.id} data={data} block={block} monthLabel={monthLabel} page={index + 1} total={visible.length} />)}{!blocks.some((block) => block.enabled) && <Card className="p-10 text-center text-sm text-muted-foreground">Ative ao menos uma seção para gerar o relatório.</Card>}</div></TabsContent>
    </Tabs>}
    <BlockEditor block={editingBlock} open={!!editingBlock} onClose={() => setEditingId(null)} onSave={(block) => { setBlocks((current) => current.map((item) => item.id === block.id ? block : item)); setEditingId(null); }} />
  </div>;
}

function ReportPage({ data, block, monthLabel, page, total }: { data: any; block: ReportBlock; monthLabel: string; page: number; total: number }) {
  return <section className="report-page relative mx-auto min-h-[297mm] w-[210mm] bg-card p-[16mm] pb-[24mm] text-foreground shadow-sm"><header className="flex items-center justify-between border-b-2 border-primary pb-4"><div className="flex items-center gap-3">{data.company?.company_logo && <img src={data.company.company_logo} alt="Logo da empresa" className="h-12 w-20 object-contain" />}<div><p className="text-xs font-bold uppercase text-primary">Relatório Executivo Mensal</p><h2 className="text-xl font-bold">{data.company?.title}</h2><p className="capitalize text-sm text-muted-foreground">{monthLabel}</p></div></div>{data.company?.consultancy_logo && <img src={data.company.consultancy_logo} alt="Logo da consultoria" className="h-12 w-24 object-contain" />}</header><main className="py-6"><h3 className="mb-4 border-l-4 border-primary pl-3 text-lg font-bold">{block.title}</h3><BlockContent block={block} /></main><footer className="absolute inset-x-[16mm] bottom-[10mm] flex justify-between border-t pt-2 text-[10px] text-muted-foreground"><span>{data.period.from} a {data.period.to}</span><span>Página {page} de {total}</span></footer></section>;
}

function BlockContent({ block }: { block: ReportBlock }) {
  if (block.type === "table") return block.tableRows?.length ? <table className="w-full border-collapse text-xs"><thead><tr>{block.tableRows[0].map((header, index) => <th key={index} className="border bg-muted p-2 text-left">{header}</th>)}</tr></thead><tbody>{block.tableRows.slice(1).map((row, index) => <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex} className="border p-2 align-top">{cell}</td>)}</tr>)}</tbody></table> : <p className="text-sm text-muted-foreground">Sem dados no período.</p>;
  if (block.type === "image") return block.imageDataUrl ? <figure><img src={block.imageDataUrl} alt={block.imageCaption || "Imagem do relatório"} className="max-h-[220mm] w-full object-contain" />{block.imageCaption && <figcaption className="mt-2 text-center text-xs text-muted-foreground">{block.imageCaption}</figcaption>}</figure> : <p className="text-sm text-muted-foreground">Sem imagem.</p>;
  return <div className="whitespace-pre-wrap text-sm leading-relaxed">{block.content || "—"}</div>;
}