import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Activity, CheckCircle2, ChevronDown, CircleDot, Gauge, Network, Wrench } from "lucide-react";
import { getImpactNetwork } from "@/lib/impact.functions";
import { useActiveCompany } from "@/lib/active-company";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export const Route = createFileRoute("/_authenticated/impacto/")({
  component: ImpactPage,
  head: () => ({ meta: [
    { title: "Conexão de Impacto — JARVIS" },
    { name: "description", content: "Rede entre indicadores, ações e diagnósticos da consultoria." },
    { property: "og:title", content: "Conexão de Impacto — JARVIS" },
    { property: "og:description", content: "Rede de valor e profundidade da consultoria." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
});

const statusLabel: Record<string, string> = { aberto: "Não iniciada", em_andamento: "Em andamento", concluido: "Concluída" };

function ImpactPage() {
  const { companyId } = useActiveCompany();
  const fetchImpact = useServerFn(getImpactNetwork);
  const { data, isLoading } = useQuery({
    queryKey: ["impact-network", companyId],
    queryFn: () => fetchImpact({ data: { company_id: companyId as string } }),
    enabled: !!companyId,
  });
  const [indicatorId, setIndicatorId] = useState("all");
  const sectors = useMemo(() => {
    if (!data) return [];
    const sectorNames = new Map(data.sectors.map((sector: any) => [sector.id, sector.name]));
    const linked = data.plans.filter((plan: any) => indicatorId === "all" || plan.indicator_id === indicatorId);
    const grouped = new Map<string, any[]>();
    for (const plan of linked) {
      const name = sectorNames.get(plan.sector_id) || plan.sector || "Sem setor definido";
      grouped.set(name, [...(grouped.get(name) ?? []), plan]);
    }
    return [...grouped.entries()].map(([name, plans]) => ({ name, plans }));
  }, [data, indicatorId]);

  if (!companyId) return <Card className="p-8 text-center text-muted-foreground">Selecione uma empresa para visualizar a rede de impacto.</Card>;
  if (isLoading || !data) return <p className="text-sm text-muted-foreground">Carregando conexões…</p>;
  const causes = new Map<string, any>(data.causes.map((row: any) => [row.id, row]));
  const pains = new Map<string, any>(data.pains.map((row: any) => [row.id, row]));
  const interviews = new Map<string, any>(data.interviews.map((row: any) => [row.id, row]));
  const selected = data.indicators.find((row: any) => row.id === indicatorId);
  const selectedCollections = data.collections.filter((row: any) => indicatorId === "all" || row.indicator_id === indicatorId);
  const first = selectedCollections[0];
  const last = selectedCollections[selectedCollections.length - 1];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div><h1 className="flex items-center gap-2 text-xl font-bold sm:text-2xl"><Network className="h-6 w-6 text-primary" />Conexão de Impacto</h1><p className="text-sm text-muted-foreground">Do indicador ao trabalho profundo que sustentou o resultado.</p></div>
        <Select value={indicatorId} onValueChange={setIndicatorId}><SelectTrigger className="w-full sm:w-80"><SelectValue placeholder="Escolha um indicador" /></SelectTrigger><SelectContent><SelectItem value="all">Todos os indicadores</SelectItem>{data.indicators.map((indicator: any) => <SelectItem key={indicator.id} value={indicator.id}>{indicator.code ? `${indicator.code} · ` : ""}{indicator.name}</SelectItem>)}</SelectContent></Select>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric icon={Network} label="Frentes mapeadas" value={data.metrics.fronts} />
        <Metric icon={CheckCircle2} label="Gargalos tratados" value={data.metrics.bottlenecks} />
        <Metric icon={Activity} label="Ações concluídas" value={data.metrics.completed} />
        <Metric icon={Wrench} label="Complexidade resolvida" value={data.metrics.complexity} />
      </div>

      {selected && <Card className="border-primary/30 bg-primary/5"><CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center"><div className="grid h-11 w-11 place-items-center rounded-md bg-primary text-primary-foreground"><Gauge className="h-5 w-5" /></div><div className="flex-1"><p className="font-semibold">{selected.name}</p><p className="text-xs text-muted-foreground">{first && last ? `Evolução no período: ${first.value} → ${last.value} ${selected.unit || ""}` : "Aguardando coletas para demonstrar a evolução."}</p></div>{selected.target != null && <Badge>Meta {selected.target} {selected.unit}</Badge>}</CardContent></Card>}

      <div className="space-y-3">
        {sectors.map((sector) => <Collapsible key={sector.name} defaultOpen><Card><CollapsibleTrigger asChild><Button variant="ghost" className="flex h-auto w-full justify-between rounded-none p-4"><span className="text-left"><span className="block font-semibold">{sector.name}</span><span className="block text-xs text-muted-foreground">{sector.plans.length} microações conectadas</span></span><ChevronDown className="h-4 w-4" /></Button></CollapsibleTrigger><CollapsibleContent><div className="border-t p-4"><div className="space-y-4 border-l-2 border-primary/30 pl-5">{sector.plans.map((plan: any) => { const cause = causes.get(plan.root_cause_id); const pain = pains.get(plan.pain_point_id); const interview = interviews.get(plan.interview_id || pain?.source_interview_id); return <div key={plan.id} className="relative"><CircleDot className="absolute -left-[30px] top-0.5 h-4 w-4 bg-background text-primary" /><div className="flex flex-wrap items-center gap-2"><p className="font-medium">{plan.title}</p><Badge variant="outline">{statusLabel[plan.status] || plan.status}</Badge></div>{plan.expected_benefit && <p className="mt-1 text-sm text-muted-foreground">Resultado esperado: {plan.expected_benefit}</p>}<div className="mt-2 grid gap-2 text-sm sm:grid-cols-3"><Depth label="Problema raiz" value={cause?.problem} /><Depth label="Gargalo diagnosticado" value={pain?.description} /><Depth label="Origem" value={interview?.title} /></div></div>; })}</div></div></CollapsibleContent></Card></Collapsible>)}
        {!sectors.length && <Card className="p-8 text-center"><Network className="mx-auto mb-2 h-8 w-8 text-muted-foreground" /><p className="text-sm text-muted-foreground">Nenhuma ação vinculada a este indicador.</p><Button variant="outline" className="mt-3" asChild><Link to="/planos-acao">Vincular ações</Link></Button></Card>}
      </div>
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof Network; label: string; value: number }) { return <Card><CardContent className="p-4"><Icon className="mb-3 h-5 w-5 text-primary" /><p className="text-2xl font-bold tabular-nums">{value}</p><p className="text-xs text-muted-foreground">{label}</p></CardContent></Card>; }
function Depth({ label, value }: { label: string; value?: string }) { return <div className="rounded-md bg-muted/60 p-2"><p className="text-[10px] font-semibold uppercase text-muted-foreground">{label}</p><p className="mt-1 line-clamp-3">{value || "Sem vínculo registrado"}</p></div>; }