import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { getProject } from "@/lib/projects.functions";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { AskAiFab } from "@/components/AskAiFab";
import {
  ChevronLeft,
  Search,
  Workflow,
  Lightbulb,
  ClipboardList,
  BarChart3,
  LayoutGrid,
  ChevronDown,
  Flag,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/projetos/$id")({
  component: ProjectLayout,
});

const STAGES = [
  { id: "", label: "Visão geral", to: "/projetos/$id" as const, icon: LayoutGrid },
  { id: "diagnostico", label: "Diagnóstico", to: "/projetos/$id/diagnostico" as const, icon: Search },
  { id: "mapeamento", label: "Mapeamento", to: "/projetos/$id/mapeamento" as const, icon: Workflow },
  { id: "melhorias", label: "Melhorias", to: "/projetos/$id/melhorias" as const, icon: Lightbulb },
  { id: "execucao", label: "Execução", to: "/projetos/$id/execucao" as const, icon: ClipboardList },
  { id: "gestao", label: "Gestão", to: "/projetos/$id/gestao" as const, icon: BarChart3 },
  { id: "encerramento", label: "Encerramento", to: "/projetos/$id/encerramento" as const, icon: Flag },
];

function ProjectLayout() {
  const { id } = Route.useParams();
  const get = useServerFn(getProject);
  const { data: project } = useQuery({ queryKey: ["project", id], queryFn: () => get({ data: { id } }) });
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [sheetOpen, setSheetOpen] = useState(false);

  const currentStage =
    STAGES.find((s) => {
      const target = s.to.replace("$id", id);
      return pathname === target;
    }) ?? STAGES[0];

  return (
    <div className="space-y-4">
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

      {/* Mobile: bottom-sheet stage picker */}
      <div className="sm:hidden">
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <button className="flex min-h-[52px] w-full items-center justify-between rounded-xl border bg-background px-4 py-3 text-left shadow-sm active:bg-secondary">
              <div className="flex min-w-0 items-center gap-3">
                <currentStage.icon className="h-5 w-5 shrink-0 text-primary" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Etapa</p>
                  <p className="truncate text-sm font-semibold">{currentStage.label}</p>
                </div>
              </div>
              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-2xl pb-8">
            <SheetHeader className="text-left">
              <SheetTitle>Etapas do projeto</SheetTitle>
            </SheetHeader>
            <div className="mt-4 grid gap-2">
              {STAGES.map((s) => {
                const target = s.to.replace("$id", id);
                const active = pathname === target;
                return (
                  <Link
                    key={s.label}
                    to={s.to}
                    params={{ id }}
                    onClick={() => setSheetOpen(false)}
                    className={cn(
                      "flex min-h-[56px] items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium transition-colors",
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background hover:bg-secondary",
                    )}
                  >
                    <s.icon className="h-5 w-5 shrink-0" />
                    <span>{s.label}</span>
                  </Link>
                );
              })}
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Tablet/desktop: chip nav */}
      <div className="-mx-1 hidden overflow-x-auto sm:block">
        <nav className="flex gap-1 px-1 pb-2">
          {STAGES.map((s) => {
            const target = s.to.replace("$id", id);
            const active = pathname === target;
            return (
              <Link
                key={s.label}
                to={s.to}
                params={{ id }}
                className={cn(
                  "shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background hover:bg-secondary",
                )}
              >
                {s.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <Outlet />
      <AskAiFab scope="project" scopeId={id} />
    </div>
  );
}
