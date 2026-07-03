import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AlertSeverity = "critical" | "warning" | "info";
export type AlertCategory =
  | "indicator_critical"
  | "indicator_below_target"
  | "indicator_late"
  | "indicator_no_collection"
  | "plan_overdue"
  | "plan_due_soon"
  | "process_unvalidated"
  | "interview_pending";

export type AlertItem = {
  id: string;
  category: AlertCategory;
  severity: AlertSeverity;
  title: string;
  subtitle?: string | null;
  href: string;
};

export const getProjectAlerts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { projectId?: string; companyId?: string }) => d)
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    const projectId = data.projectId;
    const companyId = data.companyId;
    const today = new Date();
    const todayISO = today.toISOString().slice(0, 10);
    const in7 = new Date(today.getTime() + 7 * 86400000).toISOString().slice(0, 10);

    const scope = (q: any, col = "project_id"): any => {
      if (projectId) return q.eq(col, projectId);
      if (companyId) return q.eq("company_id", companyId);
      return q;
    };

    const [indStatus, plans, procs, intvs, upcoming] = await Promise.all([
      scope(
        sb.from("v_indicator_status").select("id, name, code, status, last_value, target, unit, company_id, project_id"),
      ) as any,
      scope(
        sb.from("action_plans")
          .select("id, title, due_date, status, responsible, company_id, project_id")
          .neq("status", "concluido")
          .not("due_date", "is", null),
      ) as any,
      scope(
        sb.from("processes").select("id, name, status, company_id, project_id").eq("status", "draft"),
      ) as any,
      scope(
        sb.from("interviews")
          .select("id, title, generation_status, status, interview_date, company_id, project_id")
          .in("generation_status", ["pending", "processing", "failed"]),
      ) as any,
      scope(
        sb.from("interviews")
          .select("id, title, interview_date, participant, status, company_id, project_id")
          .gte("interview_date", todayISO)
          .order("interview_date", { ascending: true })
          .limit(20),
      ) as any,
    ]);

    const alerts: AlertItem[] = [];

    for (const i of indStatus.data ?? []) {
      if (!i.id) continue;
      const base = { id: `ind-${i.id}`, href: `/indicadores` };
      if (i.status === "critico") {
        alerts.push({
          ...base,
          category: "indicator_critical",
          severity: "critical",
          title: `${i.code ?? ""} ${i.name ?? ""}`.trim(),
          subtitle: `Crítico — último valor ${i.last_value ?? "?"}${i.unit ? " " + i.unit : ""}`,
        });
      } else if (i.status === "abaixo_meta") {
        alerts.push({
          ...base,
          category: "indicator_below_target",
          severity: "warning",
          title: `${i.code ?? ""} ${i.name ?? ""}`.trim(),
          subtitle: `Abaixo da meta (${i.target ?? "?"}${i.unit ? " " + i.unit : ""})`,
        });
      } else if (i.status === "atrasado") {
        alerts.push({
          ...base,
          category: "indicator_late",
          severity: "warning",
          title: `${i.code ?? ""} ${i.name ?? ""}`.trim(),
          subtitle: "Coleta atrasada",
        });
      } else if (i.status === "sem_coleta") {
        alerts.push({
          ...base,
          category: "indicator_no_collection",
          severity: "info",
          title: `${i.code ?? ""} ${i.name ?? ""}`.trim(),
          subtitle: "Sem nenhuma coleta registrada",
        });
      }
    }

    for (const p of plans.data ?? []) {
      if (!p.due_date) continue;
      if (p.due_date < todayISO) {
        alerts.push({
          id: `plan-${p.id}`,
          category: "plan_overdue",
          severity: "critical",
          title: p.title,
          subtitle: `Venceu em ${p.due_date}${p.responsible ? " · " + p.responsible : ""}`,
          href: `/planos-acao`,
        });
      } else if (p.due_date <= in7) {
        alerts.push({
          id: `plan-${p.id}`,
          category: "plan_due_soon",
          severity: "warning",
          title: p.title,
          subtitle: `Vence em ${p.due_date}${p.responsible ? " · " + p.responsible : ""}`,
          href: `/planos-acao`,
        });
      }
    }

    for (const pr of procs.data ?? []) {
      alerts.push({
        id: `proc-${pr.id}`,
        category: "process_unvalidated",
        severity: "info",
        title: pr.name,
        subtitle: "Processo em rascunho — aguarda validação",
        href: `/processos/${pr.id}`,
      });
    }

    for (const iv of intvs.data ?? []) {
      alerts.push({
        id: `intv-${iv.id}`,
        category: "interview_pending",
        severity: iv.generation_status === "failed" ? "critical" : "warning",
        title: iv.title,
        subtitle:
          iv.generation_status === "failed"
            ? "Falha na geração da ata"
            : iv.generation_status === "processing"
              ? "Processando ata…"
              : "Aguardando processamento",
        href: `/entrevistas/${iv.id}`,
      });
    }

    const order: Record<AlertSeverity, number> = { critical: 0, warning: 1, info: 2 };
    alerts.sort((a, b) => order[a.severity] - order[b.severity]);

    const counts = {
      total: alerts.length,
      critical: alerts.filter((a) => a.severity === "critical").length,
      warning: alerts.filter((a) => a.severity === "warning").length,
      info: alerts.filter((a) => a.severity === "info").length,
    };

    const indicatorRows = indStatus.data ?? [];
    const planRows = plans.data ?? [];
    const upcomingRows = (upcoming.data ?? []).map((u) => ({
      id: u.id as string,
      title: (u.title as string) ?? "Reunião",
      interview_date: u.interview_date as string,
      participant: (u.participant as string | null) ?? null,
    }));

    const highlights = {
      sem_coleta: indicatorRows.filter((i) => i.status === "sem_coleta").length,
      abaixo_meta: indicatorRows.filter((i) => i.status === "abaixo_meta" || i.status === "critico").length,
      planos_atrasados: planRows.filter((p) => p.due_date && p.due_date < todayISO).length,
      reunioes_marcadas: upcomingRows.length,
    };

    return { alerts, counts, highlights, upcoming: upcomingRows };
  });
