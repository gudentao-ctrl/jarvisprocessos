import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getProjectStats } from "@/lib/projects.functions";
import { Card } from "@/components/ui/card";
import { Mic, Workflow, Lightbulb, ClipboardList, AlertTriangle, BarChart3 } from "lucide-react";
import { AlertsPanel } from "@/components/AlertsPanel";
import { DashboardHighlights } from "@/components/DashboardHighlights";

export const Route = createFileRoute("/_authenticated/projetos/$id/")({
  component: ProjectHome,
});

function ProjectHome() {
  const { id } = Route.useParams();
  const stats = useServerFn(getProjectStats);
  const { data } = useQuery({ queryKey: ["project-stats", id], queryFn: () => stats({ data: { id } }) });

  const cards = [
    { label: "Entrevistas", value: data?.interviews ?? 0, icon: Mic, to: "/projetos/$id/diagnostico" },
    { label: "Processos mapeados", value: data?.processes ?? 0, icon: Workflow, to: "/projetos/$id/mapeamento" },
    { label: "Oportunidades", value: data?.opportunities ?? 0, icon: Lightbulb, to: "/projetos/$id/melhorias" },
    { label: "Planos abertos", value: data?.openPlans ?? 0, icon: ClipboardList, to: "/projetos/$id/execucao" },
    { label: "Ações vencidas", value: data?.overduePlans ?? 0, icon: AlertTriangle, to: "/projetos/$id/execucao", danger: (data?.overduePlans ?? 0) > 0 },
    { label: "Indicadores", value: data?.indicators ?? 0, icon: BarChart3, to: "/projetos/$id/execucao" },
  ] as const;

  return (
    <div className="space-y-4">
      <DashboardHighlights projectId={id} />
      <AlertsPanel projectId={id} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <Link key={c.label} to={c.to} params={{ id }}>
            <Card className="p-4 transition-colors hover:bg-secondary/50">
              <div className="flex items-center gap-3">
                <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${("danger" in c && c.danger) ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>
                  <c.icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs text-muted-foreground">{c.label}</p>
                  <p className="text-2xl font-bold tabular-nums">{c.value}</p>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
