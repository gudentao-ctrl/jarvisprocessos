import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getProjectAlerts } from "@/lib/alerts.functions";
import { useActiveCompany } from "@/lib/active-company";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Building2, AlertTriangle, BarChart3, TrendingDown, ClipboardX,
  CalendarClock, ChevronRight, Info, AlertCircle, Clock, ClipboardList, Workflow, Mic,
} from "lucide-react";
import { PhaseMenu, PhaseGrid } from "@/components/PhaseMenu";

export const Route = createFileRoute("/_authenticated/controle/")({
  component: ControlePage,
});

const SEV: Record<string, { dot: string; bg: string; text: string }> = {
  critical: { dot: "bg-destructive", bg: "bg-destructive/10", text: "text-destructive" },
  warning:  { dot: "bg-amber-500",   bg: "bg-amber-500/10",   text: "text-amber-600" },
  info:     { dot: "bg-sky-500",     bg: "bg-sky-500/10",     text: "text-sky-600" },
};

const CATEGORY_ICONS: any = {
  indicator_critical: AlertCircle,
  indicator_below_target: BarChart3,
  indicator_late: Clock,
  indicator_no_collection: BarChart3,
  plan_overdue: ClipboardList,
  plan_due_soon: ClipboardList,
  process_unvalidated: Workflow,
  interview_pending: Mic,
};

function ControlePage() {
  const { company, companyId, companies } = useActiveCompany();
  const fn = useServerFn(getProjectAlerts);

  const { data, isLoading } = useQuery({
    queryKey: ["company-alerts", companyId],
    queryFn: () => fn({ data: { companyId: companyId! } as any }),
    enabled: !!companyId,
    refetchInterval: 60_000,
  });

  if (!companyId) {
    return (
      <Card className="p-8 text-center">
        <Building2 className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
        <h1 className="text-lg font-semibold">Selecione uma empresa</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          A Torre de Controle mostra a situação consolidada da empresa ativa.
        </p>
        {companies.length === 0 && (
          <Link
            to="/empresas"
            className="mt-4 inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
          >
            Cadastrar empresa
          </Link>
        )}
      </Card>
    );
  }

  const h = data?.highlights ?? { sem_coleta: 0, abaixo_meta: 0, planos_atrasados: 0, reunioes_marcadas: 0 };
  const alerts = data?.alerts ?? [];
  const counts = data?.counts ?? { total: 0, critical: 0, warning: 0, info: 0 };
  const upcoming = data?.upcoming ?? [];

  const tiles = [
    { label: "Sem coleta",       value: h.sem_coleta,       icon: BarChart3,    tone: "info",     to: "/indicadores" },
    { label: "Abaixo da meta",   value: h.abaixo_meta,      icon: TrendingDown, tone: "warning",  to: "/indicadores" },
    { label: "Planos atrasados", value: h.planos_atrasados, icon: ClipboardX,   tone: "critical", to: "/planos-acao" },
    { label: "Reuniões",         value: h.reunioes_marcadas,icon: CalendarClock,tone: "primary",  to: "/calendario" },
  ] as const;

  const toneClasses: Record<string, { bg: string; text: string; ring: string }> = {
    info:     { bg: "bg-sky-500/10",  text: "text-sky-600",      ring: "ring-sky-500/20" },
    warning:  { bg: "bg-amber-500/10",text: "text-amber-600",    ring: "ring-amber-500/20" },
    critical: { bg: "bg-destructive/10", text: "text-destructive", ring: "ring-destructive/20" },
    primary:  { bg: "bg-primary/10",  text: "text-primary",      ring: "ring-primary/20" },
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Torre de Controle</p>
        <h1 className="truncate text-2xl font-bold">{company?.name}</h1>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        {tiles.map((t) => {
          const c = toneClasses[t.tone];
          const highlighted = t.value > 0;
          return (
            <Link key={t.label} to={t.to}>
              <Card className={`p-3 transition-all hover:shadow-md active:scale-[0.98] ${highlighted ? `ring-1 ${c.ring}` : ""}`}>
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

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b bg-muted/30 p-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${counts.critical > 0 ? "bg-destructive/10 text-destructive" : counts.warning > 0 ? "bg-amber-500/10 text-amber-600" : "bg-emerald-500/10 text-emerald-600"}`}>
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold">Alertas consolidados</p>
              <p className="truncate text-xs text-muted-foreground">
                {counts.total === 0 ? "Tudo em dia" : `${counts.total} ${counts.total === 1 ? "item" : "itens"} requerem atenção`}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {counts.critical > 0 && <Badge variant="destructive" className="h-6 px-2 text-xs">{counts.critical}</Badge>}
            {counts.warning > 0 && <Badge className="h-6 border-amber-500/30 bg-amber-500/10 px-2 text-xs text-amber-600 hover:bg-amber-500/20">{counts.warning}</Badge>}
            {counts.info > 0 && <Badge variant="secondary" className="h-6 px-2 text-xs">{counts.info}</Badge>}
          </div>
        </div>
        {alerts.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            <Info className="mx-auto mb-2 h-6 w-6 opacity-50" />
            Nenhum alerta no momento.
          </div>
        ) : (
          <ul className="max-h-[420px] divide-y overflow-y-auto">
            {alerts.map((a) => {
              const s = SEV[a.severity];
              const Icon = CATEGORY_ICONS[a.category] ?? Info;
              return (
                <li key={a.id}>
                  <Link to={a.href} className="flex items-center gap-3 p-3 transition-colors hover:bg-muted/50">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${s.dot}`} />
                    <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${s.bg} ${s.text}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{a.title || "Sem título"}</p>
                      {a.subtitle && <p className="truncate text-xs text-muted-foreground">{a.subtitle}</p>}
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {upcoming.length > 0 && (
        <Card className="overflow-hidden">
          <div className="flex items-center gap-2 border-b bg-muted/30 px-4 py-2.5">
            <CalendarClock className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold">Próximas reuniões</p>
            <span className="ml-auto text-xs tabular-nums text-muted-foreground">{upcoming.length}</span>
          </div>
          <ul className="divide-y">
            {upcoming.slice(0, 5).map((u: any) => (
              <li key={u.id} className="flex items-center gap-3 p-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                  <span className="text-xs font-bold tabular-nums">
                    {new Date(u.interview_date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{u.title}</p>
                  {u.participant && <p className="truncate text-xs text-muted-foreground">{u.participant}</p>}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
