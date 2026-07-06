import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import {
  FileBarChart2, Sparkles, Loader2, Plus, Building2,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

import { useActiveCompany } from "@/lib/active-company";
import { getReportData } from "@/lib/report-data.functions";
import { generateReportNarrative } from "@/lib/report-ai.functions";
import type { ReportBlock, ReportPeriod, ChartKey, BlockType } from "@/lib/report-types";

import { PeriodFilter, computePeriod } from "@/components/report/PeriodFilter";
import { CHART_CATALOG } from "@/components/report/charts";
import { BlockList } from "@/components/report/BlockList";
import { BlockEditor } from "@/components/report/BlockEditor";
import { ReportPreview, narrativeToBlocks } from "@/components/report/ReportPreview";
import { ExportPdfButton } from "@/components/report/ExportPdfButton";

export const Route = createFileRoute("/_authenticated/relatorio-acompanhamento/")({
  component: RelatorioPage,
});

// -------- helpers to compute auto info blocks --------
function autoInfoText(kind: BlockType, d: any): string {
  const today = format(new Date(), "yyyy-MM-dd");
  const proximo = new Date(); proximo.setDate(proximo.getDate() + 7);
  const proximoISO = format(proximo, "yyyy-MM-dd");
  switch (kind) {
    case "actions_info": {
      const p = d.plans ?? [];
      const criados = p.length;
      const concluidos = p.filter((x: any) => x.status === "concluido").length;
      const atrasados = p.filter((x: any) => x.status !== "concluido" && x.due_date && x.due_date < today).length;
      const cancelados = p.filter((x: any) => x.status === "cancelado").length;
      const proxVenc = p.filter((x: any) => x.status !== "concluido" && x.due_date && x.due_date >= today && x.due_date <= proximoISO).length;
      return [
        `**Total de planos:** ${criados}`,
        `**Concluídos:** ${concluidos}`,
        `**Atrasados:** ${atrasados}`,
        `**Cancelados:** ${cancelados}`,
        `**Próximos do vencimento (7 dias):** ${proxVenc}`,
      ].join("\n");
    }
    case "indicators_info": {
      const inds = d.indicators ?? [];
      const coll = d.collections ?? [];
      const withData = new Set(coll.map((c: any) => c.indicator_id));
      const semColeta = inds.filter((i: any) => !withData.has(i.id)).length;
      let abaixo = 0, acima = 0;
      for (const i of inds) {
        const cs = coll.filter((c: any) => c.indicator_id === i.id);
        const last = cs.sort((a: any, b: any) => a.submitted_at.localeCompare(b.submitted_at)).pop();
        if (!last || i.target == null) continue;
        const below = i.direction === "lower_better" ? last.value > i.target : last.value < i.target;
        if (below) abaixo++; else acima++;
      }
      return [
        `**Indicadores acompanhados:** ${inds.length}`,
        `**Abaixo da meta:** ${abaixo}`,
        `**Acima da meta:** ${acima}`,
        `**Sem coleta no período:** ${semColeta}`,
        `**Coletas registradas:** ${coll.length}`,
      ].join("\n");
    }
    case "agenda_info": {
      const c = d.calendar ?? [];
      const realizadas = c.filter((x: any) => x.starts_at < new Date().toISOString()).length;
      const proximas = c.length - realizadas;
      return [
        `**Reuniões no período:** ${c.length}`,
        `**Já realizadas:** ${realizadas}`,
        `**Próximas:** ${proximas}`,
      ].join("\n");
    }
    case "hours_info": {
      const h = d.hours ?? [];
      const total = h.reduce((s: number, x: any) => s + (x.hours ?? 0), 0);
      const porTipo: Record<string, number> = {};
      for (const x of h) porTipo[x.activity_type || "outros"] = (porTipo[x.activity_type || "outros"] ?? 0) + (x.hours ?? 0);
      return [
        `**Total de horas:** ${total.toFixed(1)}h`,
        "",
        "**Distribuição por atividade:**",
        ...Object.entries(porTipo).map(([k, v]) => `• ${k}: ${v.toFixed(1)}h`),
      ].join("\n");
    }
    case "crono_info": {
      const obs = d.cronoObservations ?? [];
      const va = obs.filter((o: any) => o.classification === "va").reduce((s: number, o: any) => s + o.time_minutes, 0);
      const nva = obs.filter((o: any) => o.classification === "nva").reduce((s: number, o: any) => s + o.time_minutes, 0);
      const nnva = obs.filter((o: any) => o.classification === "nnva").reduce((s: number, o: any) => s + o.time_minutes, 0);
      const total = va + nva + nnva;
      const pct = (n: number) => total ? ((n / total) * 100).toFixed(0) + "%" : "0%";
      return [
        `**Sessões de cronoanálise:** ${(d.cronoSessions ?? []).length}`,
        `**Tempo que agrega valor (VA):** ${va.toFixed(0)} min (${pct(va)})`,
        `**Tempo não agrega valor (NVA):** ${nva.toFixed(0)} min (${pct(nva)}) — desperdício`,
        `**Tempo necessário mas não agrega (NNVA):** ${nnva.toFixed(0)} min (${pct(nnva)})`,
      ].join("\n");
    }
    case "improvements_info": {
      const opps = d.opportunities ?? [];
      const impl = opps.filter((o: any) => ["concluido", "implantado"].includes(o.status)).length;
      const pend = opps.length - impl;
      return [
        `**Oportunidades identificadas:** ${opps.length}`,
        `**Implantadas:** ${impl}`,
        `**Pendentes:** ${pend}`,
      ].join("\n");
    }
    case "kpis": {
      return [
        `**Empresa:** ${d.company?.name ?? "—"}`,
        `**Entrevistas realizadas:** ${(d.interviews ?? []).length}`,
        `**Processos mapeados:** ${(d.processes ?? []).length}`,
        `**Cronoanálises:** ${(d.cronoSessions ?? []).length}`,
        `**Reuniões:** ${(d.calendar ?? []).length}`,
        `**Planos de ação:** ${(d.plans ?? []).length}`,
        `**Indicadores:** ${(d.indicators ?? []).length}`,
        `**Horas registradas:** ${(d.hours ?? []).reduce((s: number, x: any) => s + (x.hours ?? 0), 0).toFixed(1)}h`,
      ].join("\n");
    }
    default: return "";
  }
}

function defaultBlocks(): ReportBlock[] {
  const mk = (id: string, type: BlockType, title: string, enabled = true, chartKey?: ChartKey): ReportBlock =>
    ({ id, type, title, enabled, chartKey });
  return [
    mk("summary",           "summary",           "Resumo Executivo"),
    mk("kpis",              "kpis",              "Indicadores da Consultoria no Período"),
    mk("actions_info",      "actions_info",      "Planos de Ação — Panorama"),
    mk("chart-actions-status",   "chart", "Ações por Status", true, "actions_by_status"),
    mk("chart-actions-evol",     "chart", "Evolução das Ações", true, "actions_evolution"),
    mk("indicators_info",   "indicators_info",   "Indicadores — Panorama"),
    mk("chart-ind-target",       "chart", "Meta × Realizado", true, "indicators_target_vs_actual"),
    mk("chart-ind-evol",         "chart", "Evolução dos Indicadores", true, "indicators_evolution"),
    mk("crono_info",        "crono_info",        "Cronoanálise — Resultados"),
    mk("chart-crono",            "chart", "Tempo VA / NVA / NNVA", true, "crono_value_added"),
    mk("hours_info",        "hours_info",        "Horas Trabalhadas"),
    mk("chart-hours-week",       "chart", "Horas por Semana", true, "hours_by_week"),
    mk("agenda_info",       "agenda_info",       "Agenda de Reuniões"),
    mk("improvements_info", "improvements_info", "Melhorias"),
    mk("chart-consulting",       "chart", "Atividade da Consultoria", true, "consulting_activity"),
    mk("recommendations",   "recommendations",   "Recomendações e Próximos Passos"),
  ];
}

function RelatorioPage() {
  const { companyId, company } = useActiveCompany();
  const [period, setPeriod] = useState<ReportPeriod>(() => computePeriod("last30"));
  const [blocks, setBlocks] = useState<ReportBlock[]>(defaultBlocks);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tab, setTab] = useState("setup");
  const generatedAt = useMemo(() => new Date().toISOString(), [tab === "preview"]);

  const fetchData = useServerFn(getReportData);
  const genNarrative = useServerFn(generateReportNarrative);

  const dataQuery = useQuery({
    queryKey: ["report-data", companyId, period.from, period.to],
    queryFn: () => fetchData({ data: { company_id: companyId!, from: period.from, to: period.to } }),
    enabled: !!companyId,
  });

  const aiMut = useMutation({
    mutationFn: () => genNarrative({ data: { company_id: companyId!, from: period.from, to: period.to } }),
    onSuccess: (n) => {
      const patches = narrativeToBlocks(n);
      setBlocks((bs) => bs.map((b) => {
        if (b.type === "summary" && patches.summary) return { ...b, content: patches.summary };
        if (b.type === "recommendations" && patches.recommendations) return { ...b, content: patches.recommendations };
        return b;
      }));
      // populate info blocks with data
      if (dataQuery.data) {
        setBlocks((bs) => bs.map((b) => {
          const t = b.type;
          if (["kpis","actions_info","indicators_info","agenda_info","hours_info","crono_info","improvements_info"].includes(t)) {
            return { ...b, content: autoInfoText(t, dataQuery.data) };
          }
          return b;
        }));
      }
      toast.success(`Relatório gerado com ${n.model}`);
      setTab("preview");
    },
    onError: (e: any) => toast.error(e.message ?? "Falha ao gerar"),
  });

  function addBlock(type: BlockType) {
    const title = type === "text" ? "Observações" : type === "image" ? "Imagem" : "Tabela";
    setBlocks((bs) => [...bs, { id: `${type}-${Date.now()}`, type, title, enabled: true, content: "" }]);
  }

  if (!companyId) {
    return (
      <Card className="p-8 text-center">
        <Building2 className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
        <h1 className="text-lg font-semibold">Selecione uma empresa</h1>
        <p className="mt-1 text-sm text-muted-foreground">O relatório é gerado com base nos dados da empresa ativa.</p>
      </Card>
    );
  }

  const editingBlock = editingId ? blocks.find((b) => b.id === editingId) ?? null : null;

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Fase Execução</p>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <FileBarChart2 className="h-6 w-6 text-primary" /> Relatório de Acompanhamento
          </h1>
          <p className="text-sm text-muted-foreground">{company?.name}</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => aiMut.mutate()}
            disabled={aiMut.isPending || !dataQuery.data}
          >
            {aiMut.isPending
              ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              : <Sparkles className="mr-2 h-4 w-4" />}
            Gerar com IA
          </Button>
          <ExportPdfButton filename={`relatorio-${company?.name?.replace(/\s+/g, "-").toLowerCase() ?? "empresa"}-${period.from}-a-${period.to}.pdf`} />
        </div>
      </header>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="setup">1. Período & Blocos</TabsTrigger>
          <TabsTrigger value="edit">2. Editar</TabsTrigger>
          <TabsTrigger value="preview">3. Pré-visualização</TabsTrigger>
        </TabsList>

        <TabsContent value="setup" className="space-y-4">
          <Card className="p-4">
            <h2 className="mb-2 text-sm font-semibold">Período</h2>
            <PeriodFilter value={period} onChange={setPeriod} />
          </Card>

          <Card className="p-4">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Biblioteca de gráficos</h2>
              <p className="text-xs text-muted-foreground">Marque para incluir no relatório</p>
            </div>
            <Separator className="mb-3" />
            {Object.entries(
              CHART_CATALOG.reduce((acc: Record<string, typeof CHART_CATALOG>, c) => {
                (acc[c.group] ||= []).push(c);
                return acc;
              }, {}),
            ).map(([group, items]) => (
              <div key={group} className="mb-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{group}</p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {items.map((c) => {
                    const existing = blocks.find((b) => b.chartKey === c.key);
                    const checked = !!existing?.enabled;
                    return (
                      <label key={c.key} className="flex cursor-pointer items-center gap-2 rounded-md border p-2 hover:bg-muted/50">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(v) => {
                            const on = !!v;
                            setBlocks((bs) => {
                              if (existing) return bs.map((b) => b.id === existing.id ? { ...b, enabled: on } : b);
                              if (on) return [...bs, { id: `chart-${c.key}-${Date.now()}`, type: "chart", title: c.label, enabled: true, chartKey: c.key }];
                              return bs;
                            });
                          }}
                        />
                        <span className="text-sm">{c.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </Card>

          <Card className="p-4">
            <p className="text-xs text-muted-foreground">
              {dataQuery.isLoading
                ? "Carregando dados do período…"
                : dataQuery.data
                  ? `Dados carregados: ${dataQuery.data.plans.length} planos · ${dataQuery.data.indicators.length} indicadores · ${dataQuery.data.hours.length} apontamentos.`
                  : "Sem dados"}
            </p>
          </Card>
        </TabsContent>

        <TabsContent value="edit" className="space-y-4">
          <Card className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Blocos do relatório</h2>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" onClick={() => addBlock("text")}><Plus className="mr-1 h-3 w-3" />Texto</Button>
                <Button size="sm" variant="outline" onClick={() => addBlock("image")}><Plus className="mr-1 h-3 w-3" />Imagem</Button>
                <Button size="sm" variant="outline" onClick={() => addBlock("table")}><Plus className="mr-1 h-3 w-3" />Tabela</Button>
              </div>
            </div>
            <p className="mb-3 text-xs text-muted-foreground">
              Arraste para reordenar. Clique no título para editar o conteúdo. Use os ícones para ocultar ou remover.
            </p>
            <BlockList blocks={blocks} onChange={setBlocks} onEdit={setEditingId} />
          </Card>
          <BlockEditor
            block={editingBlock}
            open={!!editingBlock}
            onClose={() => setEditingId(null)}
            onSave={(b) => {
              setBlocks((bs) => bs.map((x) => x.id === b.id ? b : x));
              setEditingId(null);
            }}
          />
        </TabsContent>

        <TabsContent value="preview">
          {dataQuery.data ? (
            <ReportPreview
              blocks={blocks}
              data={dataQuery.data}
              meta={{
                company: company ? { name: company.name } : null,
                period,
                generatedAt,
              }}
            />
          ) : (
            <Card className="p-8 text-center text-sm text-muted-foreground">Carregando dados…</Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
