import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { getProjectAlerts } from "@/lib/alerts.functions";
import { Card } from "@/components/ui/card";
import { BarChart3, TrendingDown, ClipboardX, CalendarClock, ChevronRight } from "lucide-react";

export function DashboardHighlights({ projectId }: { projectId: string }) {
  const fn = useServerFn(getProjectAlerts);
  const { data, isLoading } = useQuery({
    queryKey: ["project-alerts", projectId],
    queryFn: () => fn({ data: { projectId } }),
    refetchInterval: 60_000,
  });

  const h = data?.highlights ?? { sem_coleta: 0, abaixo_meta: 0, planos_atrasados: 0, reunioes_marcadas: 0 };
  const upcoming = data?.upcoming ?? [];

  const tiles = [
    {
      label: "Indicadores sem coleta",
      value: h.sem_coleta,
      icon: BarChart3,
      tone: "info",
      to: "/indicadores",
    },
    {
      label: "Abaixo da meta",
      value: h.abaixo_meta,
      icon: TrendingDown,
      tone: "warning",
      to: "/indicadores",
    },
    {
      label: "Planos atrasados",
      value: h.planos_atrasados,
      icon: ClipboardX,
      tone: "critical",
      to: "/planos-acao",
    },
    {
      label: "Reuniões marcadas",
      value: h.reunioes_marcadas,
      icon: CalendarClock,
      tone: "primary",
      to: "/entrevistas",
    },
  ] as const;

  const toneClasses: Record<string, { bg: string; text: string; ring: string }> = {
    info: { bg: "bg-sky-500/10", text: "text-sky-600 dark:text-sky-400", ring: "ring-sky-500/20" },
    warning: { bg: "bg-amber-500/10", text: "text-amber-600 dark:text-amber-500", ring: "ring-amber-500/20" },
    critical: { bg: "bg-destructive/10", text: "text-destructive", ring: "ring-destructive/20" },
    primary: { bg: "bg-primary/10", text: "text-primary", ring: "ring-primary/20" },
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        {tiles.map((t) => {
          const c = toneClasses[t.tone];
          const highlighted = t.value > 0;
          return (
            <Link key={t.label} to={t.to}>
              <Card
                className={`p-3 transition-all hover:shadow-md active:scale-[0.98] ${highlighted ? `ring-1 ${c.ring}` : ""}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${c.bg} ${c.text}`}>
                    <t.icon className="h-4 w-4" />
                  </div>
                  <p className={`text-2xl font-bold tabular-nums ${highlighted ? c.text : "text-muted-foreground"}`}>
                    {isLoading ? "–" : t.value}
                  </p>
                </div>
                <p className="mt-2 text-xs font-medium leading-tight text-muted-foreground">{t.label}</p>
              </Card>
            </Link>
          );
        })}
      </div>

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
                  className="flex items-center gap-3 p-3 transition-colors hover:bg-muted/50"
                >
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                    <span className="text-xs font-bold tabular-nums">
                      {new Date(u.interview_date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
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
    </div>
  );
}
