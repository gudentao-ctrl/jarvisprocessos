import { createFileRoute, Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { FileText, Network, Workflow, CalendarRange, Target, ClipboardList, Timer, GitBranch } from "lucide-react";

export const Route = createFileRoute("/_authenticated/relatorios/")({
  component: RelatoriosHub,
});

const REPORTS = [
  { label: "Executivo", description: "Consolidação de diagnóstico e recomendações", icon: FileText, to: "/diagnostico" as const },
  { label: "Conexão de Impacto", description: "Indicadores, ações e diagnósticos conectados", icon: Network, to: "/impacto" as const },
  { label: "Por Processo", description: "SIPOC, BPM, cronoanálise e dores", icon: Workflow, to: "/processos" as const },
  { label: "Executivo Mensal", description: "Entregas e evolução mensal em PDF", icon: CalendarRange, to: "/relatorio-executivo-mensal" as const },
  { label: "Indicadores", description: "Meta × real, coletas e alertas", icon: Target, to: "/indicadores" as const },
  { label: "Planos de Ação", description: "Andamento, atrasados, concluídos", icon: ClipboardList, to: "/planos-acao" as const },
  { label: "Cronoanálise", description: "Sessões e capacidade produtiva", icon: Timer, to: "/cronoanalise" as const },
  { label: "Mapeamento", description: "Processos AS IS e TO BE", icon: GitBranch, to: "/tobe" as const },
] as const;

function RelatoriosHub() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold sm:text-2xl">Relatórios</h1>
        <p className="text-sm text-muted-foreground">Exportações e visões consolidadas. Abra um item para gerar ou visualizar.</p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {REPORTS.map((r) => (
          <Link key={r.label} to={r.to}>
            <Card className="flex min-h-[88px] items-start gap-3 p-4 transition-colors hover:bg-secondary/50 active:bg-secondary">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <r.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold">{r.label}</p>
                <p className="text-sm text-muted-foreground">{r.description}</p>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
