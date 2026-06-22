import { createFileRoute, Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { ArrowRight, Mic, FileText, Sparkles, Map, GitBranch, Workflow, Timer, Lightbulb, Target, GitCompare, ClipboardList, BarChart3, ListTodo } from "lucide-react";
import type { LucideIcon } from "lucide-react";

function HubGrid({ items }: { items: { label: string; description: string; to: string; icon: LucideIcon }[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {items.map((i) => (
        <Link key={i.label} to={i.to}>
          <Card className="flex items-start gap-3 p-4 transition-colors hover:bg-secondary/50">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <i.icon className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{i.label}</p>
              <p className="text-sm text-muted-foreground">{i.description}</p>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </Card>
        </Link>
      ))}
    </div>
  );
}

// Diagnóstico
export const RouteDiag = createFileRoute("/_authenticated/projetos/$id/diagnostico")({
  component: () => (
    <HubGrid items={[
      { label: "Entrevistas", description: "Realizar e transcrever entrevistas", to: "/entrevistas", icon: Mic },
      { label: "Análises automáticas", description: "Resumos e insights por IA", to: "/entrevistas", icon: Sparkles },
      { label: "Mapa de dores", description: "Pontos de dor identificados", to: "/mapas/dores", icon: FileText },
      { label: "Fluxo de informação", description: "Como a informação circula", to: "/mapas/informacao", icon: Map },
      { label: "Fluxo de decisão", description: "Quem decide o quê", to: "/mapas/decisao", icon: GitBranch },
    ]} />
  ),
});
