import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { listProjects } from "@/lib/projects.functions";
import { Card } from "@/components/ui/card";
import { Briefcase, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  const list = useServerFn(listProjects);
  const { data: projects } = useQuery({ queryKey: ["projects"], queryFn: () => list() });

  const active = projects?.filter((p: any) => p.status === "em_andamento") ?? [];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Visão consolidada do portfólio de projetos</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Projetos ativos</p>
          <p className="text-2xl font-bold tabular-nums">{active.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Total de projetos</p>
          <p className="text-2xl font-bold tabular-nums">{projects?.length ?? 0}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Concluídos</p>
          <p className="text-2xl font-bold tabular-nums">{projects?.filter((p: any) => p.status === "concluido").length ?? 0}</p>
        </Card>
      </div>

      <Card className="p-4">
        <h2 className="mb-3 font-semibold">Projetos em andamento</h2>
        {active.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum projeto em andamento. <Link to="/projetos" className="text-primary underline">Ver todos</Link></p>
        ) : (
          <div className="space-y-2">
            {active.map((p: any) => (
              <Link key={p.id} to="/projetos/$id" params={{ id: p.id }} className="flex items-center justify-between rounded-md border p-3 hover:bg-secondary/50">
                <div className="min-w-0 flex items-center gap-2">
                  <Briefcase className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="truncate font-medium">{p.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{p.companies?.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-sm tabular-nums">{p.progress_pct}%</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
