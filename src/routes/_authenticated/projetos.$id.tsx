import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getProject } from "@/lib/projects.functions";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, Search, Workflow, Lightbulb, ClipboardList, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/projetos/$id")({
  component: ProjectLayout,
});

const STAGES = [
  { id: "", label: "Visão geral", to: "/projetos/$id" as const },
  { id: "diagnostico", label: "Diagnóstico", to: "/projetos/$id/diagnostico" as const, icon: Search },
  { id: "mapeamento", label: "Mapeamento", to: "/projetos/$id/mapeamento" as const, icon: Workflow },
  { id: "melhorias", label: "Melhorias", to: "/projetos/$id/melhorias" as const, icon: Lightbulb },
  { id: "execucao", label: "Execução", to: "/projetos/$id/execucao" as const, icon: ClipboardList },
  { id: "gestao", label: "Gestão", to: "/projetos/$id/gestao" as const, icon: BarChart3 },
];

function ProjectLayout() {
  const { id } = Route.useParams();
  const get = useServerFn(getProject);
  const { data: project } = useQuery({ queryKey: ["project", id], queryFn: () => get({ data: { id } }) });
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="space-y-5">
      <Link to="/projetos" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> Projetos
      </Link>

      <Card className="p-4">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold tracking-tight sm:text-2xl">{project?.name ?? "…"}</h1>
            <p className="truncate text-sm text-muted-foreground">{project?.companies?.name}</p>
          </div>
          {project && <Badge variant="secondary" className="shrink-0">{project.status}</Badge>}
        </div>
      </Card>

      <div className="-mx-1 overflow-x-auto">
        <nav className="flex gap-1 px-1 pb-2">
          {STAGES.map((s) => {
            const target = s.to.replace("$id", id);
            const active = pathname === target || (s.id === "" && pathname === `/projetos/${id}`);
            return (
              <Link key={s.label} to={s.to} params={{ id }} className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:bg-secondary"
              )}>
                {s.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <Outlet />
    </div>
  );
}
