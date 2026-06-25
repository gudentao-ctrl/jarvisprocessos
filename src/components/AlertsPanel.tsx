import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { getProjectAlerts, type AlertSeverity } from "@/lib/alerts.functions";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  AlertCircle,
  Info,
  Clock,
  ClipboardList,
  Workflow,
  Mic,
  BarChart3,
  ChevronRight,
} from "lucide-react";

const SEVERITY_STYLES: Record<AlertSeverity, { dot: string; bg: string; text: string; label: string }> = {
  critical: { dot: "bg-destructive", bg: "bg-destructive/10", text: "text-destructive", label: "Crítico" },
  warning: { dot: "bg-amber-500", bg: "bg-amber-500/10", text: "text-amber-600 dark:text-amber-500", label: "Atenção" },
  info: { dot: "bg-sky-500", bg: "bg-sky-500/10", text: "text-sky-600 dark:text-sky-400", label: "Info" },
};

const CATEGORY_ICONS = {
  indicator_critical: AlertCircle,
  indicator_below_target: BarChart3,
  indicator_late: Clock,
  indicator_no_collection: BarChart3,
  plan_overdue: ClipboardList,
  plan_due_soon: ClipboardList,
  process_unvalidated: Workflow,
  interview_pending: Mic,
} as const;

export function AlertsPanel({ projectId }: { projectId: string }) {
  const fn = useServerFn(getProjectAlerts);
  const { data, isLoading } = useQuery({
    queryKey: ["project-alerts", projectId],
    queryFn: () => fn({ data: { projectId } }),
    refetchInterval: 60_000,
  });

  if (isLoading) {
    return (
      <Card className="p-4">
        <div className="h-5 w-32 animate-pulse rounded bg-muted" />
        <div className="mt-3 space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded bg-muted/50" />
          ))}
        </div>
      </Card>
    );
  }

  const alerts = data?.alerts ?? [];
  const counts = data?.counts ?? { total: 0, critical: 0, warning: 0, info: 0 };

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b bg-muted/30 p-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${counts.critical > 0 ? "bg-destructive/10 text-destructive" : counts.warning > 0 ? "bg-amber-500/10 text-amber-600" : "bg-emerald-500/10 text-emerald-600"}`}>
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold">Central de Alertas</p>
            <p className="truncate text-xs text-muted-foreground">
              {counts.total === 0 ? "Tudo em dia" : `${counts.total} ${counts.total === 1 ? "item" : "itens"} requerem atenção`}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {counts.critical > 0 && (
            <Badge variant="destructive" className="h-6 px-2 text-xs tabular-nums">
              {counts.critical}
            </Badge>
          )}
          {counts.warning > 0 && (
            <Badge className="h-6 border-amber-500/30 bg-amber-500/10 px-2 text-xs tabular-nums text-amber-600 hover:bg-amber-500/20">
              {counts.warning}
            </Badge>
          )}
          {counts.info > 0 && (
            <Badge variant="secondary" className="h-6 px-2 text-xs tabular-nums">
              {counts.info}
            </Badge>
          )}
        </div>
      </div>

      {alerts.length === 0 ? (
        <div className="p-8 text-center text-sm text-muted-foreground">
          <Info className="mx-auto mb-2 h-6 w-6 opacity-50" />
          Nenhum alerta no momento. Bom trabalho!
        </div>
      ) : (
        <ul className="max-h-[420px] divide-y overflow-y-auto">
          {alerts.map((a) => {
            const s = SEVERITY_STYLES[a.severity];
            const Icon = CATEGORY_ICONS[a.category];
            return (
              <li key={a.id}>
                <Link
                  to={a.href}
                  className="flex items-center gap-3 p-3 transition-colors hover:bg-muted/50 active:bg-muted"
                >
                  <span className={`h-2 w-2 shrink-0 rounded-full ${s.dot}`} aria-hidden />
                  <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${s.bg} ${s.text}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{a.title || "Sem título"}</p>
                    {a.subtitle && (
                      <p className="truncate text-xs text-muted-foreground">{a.subtitle}</p>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
