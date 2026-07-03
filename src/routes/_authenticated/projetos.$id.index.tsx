import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getProjectStats } from "@/lib/projects.functions";
import { getProjectAlerts } from "@/lib/alerts.functions";
import { Card } from "@/components/ui/card";
import {
  Mic,
  Workflow,
  Lightbulb,
  ClipboardList,
  AlertTriangle,
  BarChart3,
  CalendarClock,
  ChevronRight,
} from "lucide-react";
import { AlertsPanel } from "@/components/AlertsPanel";

export const Route = createFileRoute("/_authenticated/projetos/$id/")({
  component: ProjectHome,
});

function ProjectHome() {
  const { id } = Route.useParams();
  const stats = useServerFn(getProjectStats);
  const alertsFn = useServerFn(getProjectAlerts);

  const { data } = useQuery({
    queryKey: ["project-stats", id],
    queryFn: () => stats({ data: { id } }),
  });

  const { data: alertsData } = useQuery({
    queryKey: ["project-alerts", id],
    queryFn: () => alertsFn({ data: { projectId: id } }),
    refetchInterval: 60_000,
  });

  const upcoming = alertsData?.upcoming ?? [];

  const cards = [
    { label: "Entrevistas", value: data?.interviews ?? 0, icon: Mic, to: "/projetos/$id/diagnostico" },
    { label: "Processos mapeados", value: data?.processes ?? 0, icon: Workflow, to: "/projetos/$id/mapeamento" },
    { label: "Oportunidades", value: data?.opportunities ?? 0, icon: Lightbulb, to: "/projetos/$id/melhorias" },
    { label: "Planos abertos", value: data?.openPlans ?? 0, icon: ClipboardList, to: "/projetos/$id/execucao" },
    {
      label: "Ações vencidas",
      value: data?.overduePlans ?? 0,
      icon: AlertTriangle,
      to: "/projetos/$id/execucao",
      danger: (data?.overduePlans ?? 0) > 0,
    },
    { label: "Indicadores", value: data?.indicators ?? 0, icon: BarChart3, to: "/projetos/$id/execucao" },
  ] as const;

  return (
    <div className="space-y-4">
      {/* Central de Alertas — única fonte do que precisa de ação */}
      <AlertsPanel projectId={id} />

      {/* Próximas reuniões — não são "alertas", ficam separadas */}
      {upcoming.length > 0 && (
        <Card className="overflow-hidden">
          <div className="flex items-center gap-2 border-b bg-muted/30 px-4 py-2.5">
            <CalendarClock className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold">Próximas reuniões</p>
            <span className="ml-auto text-xs tabular-nums text-muted-foreground">{upcoming.length}</span>
          </div>
          <ul className="divide-y">
            {upcoming.slice(0, 5).map((u: any) => (
              <li key={u.id}>
                <Link
                  to="/entrevistas/$id"
                  params={{ id: u.id }}
                  className="flex min-h-[64px] items-center gap-3 p-3 transition-colors hover:bg-muted/50 active:bg-muted"
                >
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                    <span className="text-xs font-bold tabular-nums leading-none">
                      {new Date(u.interview_date).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                      })}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{u.title}</p>
                    {u.participant && (
                      <p className="truncate text-xs text-muted-foreground">{u.participant}</p>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Painel do projeto — totais, sem repetir alertas */}
      <div>
        <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Painel do projeto
        </p>
        <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-3">
          {cards.map((c) => (
            <Link key={c.label} to={c.to} params={{ id }}>
              <Card className="p-4 transition-colors hover:bg-secondary/50 active:bg-secondary">
                <div className="flex items-center gap-3">
                  <div
                    className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${("danger" in c && c.danger) ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}
                  >
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
    </div>
  );
}
