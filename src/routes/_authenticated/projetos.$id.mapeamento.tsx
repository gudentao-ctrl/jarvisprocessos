import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, Workflow, Timer, Share2, GitBranch, HeartCrack, Map } from "lucide-react";
import { listProcesses, listCronoSessions, listPains } from "@/lib/processes.functions";
import { PageHeader, StatPill, accentBar, accentBg, accentText, type MapAccent } from "@/components/mapping/PageHeader";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/projetos/$id/mapeamento")({
  component: MapeamentoHub,
});

function MapeamentoHub() {
  const procFn = useServerFn(listProcesses);
  const cronoFn = useServerFn(listCronoSessions);
  const painsFn = useServerFn(listPains);

  const { data: processes = [] } = useQuery({ queryKey: ["processes"], queryFn: () => procFn() });
  const { data: cronos = [] } = useQuery({ queryKey: ["crono-sessions"], queryFn: () => cronoFn({ data: {} }) });
  const { data: pains = [] } = useQuery({ queryKey: ["pains"], queryFn: () => painsFn() });

  const items: {
    label: string;
    description: string;
    to: string;
    icon: typeof Workflow;
    accent: MapAccent;
    meta: string;
  }[] = [
    {
      label: "Processos & BPM",
      description: "Modelo mestre, fluxo e diagrama BPMN 2.0",
      to: "/processos",
      icon: Workflow,
      accent: "process",
      meta: `${processes.length} processo${processes.length === 1 ? "" : "s"} mapeado${processes.length === 1 ? "" : "s"}`,
    },
    {
      label: "Cronoanálises",
      description: "Medições de tempo em campo (VA / NVA / NNVA)",
      to: "/cronoanalise",
      icon: Timer,
      accent: "time",
      meta: `${cronos.length} sessã${cronos.length === 1 ? "o" : "es"}`,
    },
    {
      label: "Mapa de Informação",
      description: "Origem, destino e meio de cada fluxo de informação",
      to: "/mapas/informacao",
      icon: Share2,
      accent: "info",
      meta: "Fluxos e riscos de perda",
    },
    {
      label: "Mapa de Decisão",
      description: "Quem decide, o que aprova e onde trava",
      to: "/mapas/decisao",
      icon: GitBranch,
      accent: "decision",
      meta: "Decisores e aprovações",
    },
    {
      label: "Mapa de Dores",
      description: "Consolidado de problemas por categoria",
      to: "/mapas/dores",
      icon: HeartCrack,
      accent: "pain",
      meta: `${pains.length} dor${pains.length === 1 ? "" : "es"} registrada${pains.length === 1 ? "" : "s"}`,
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Mapeamento"
        subtitle="Entenda o estado atual da operação antes de propor melhorias"
        icon={Map}
        accent="process"
        stats={
          <>
            <StatPill label="Processos" value={processes.length} accent="process" />
            <StatPill label="Cronoanálises" value={cronos.length} accent="time" />
            <StatPill label="Dores" value={pains.length} accent="pain" />
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((i) => (
          <Link key={i.label} to={i.to} className="group block">
            <div
              className={cn(
                "relative flex h-full items-start gap-3 overflow-hidden rounded-2xl border border-border/70 bg-card p-4",
                "transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
              )}
            >
              <span className={cn("absolute inset-y-0 left-0 w-1", accentBar[i.accent])} />
              <div
                className={cn(
                  "ml-1 grid h-11 w-11 shrink-0 place-items-center rounded-xl",
                  accentBg[i.accent],
                  accentText[i.accent],
                )}
              >
                <i.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">{i.label}</p>
                <p className="text-sm text-muted-foreground">{i.description}</p>
                <p className={cn("mt-2 text-[11px] font-semibold uppercase tracking-wide", accentText[i.accent])}>
                  {i.meta}
                </p>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-1" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
