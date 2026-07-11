import type { FlowActivity, FlowConnection, FlowDecision } from "@/components/flow/FlowEditor";
import type { FlowIssue } from "@/components/flow/FlowIssuesPanel";

/* Validador estrutural do Fluxo (usado em UI + antes de exportar PDF).
 * Retorna lista de problemas categorizados em error/warn/info. */

export function validateFlow(
  activities: FlowActivity[],
  connections: FlowConnection[],
  decisions: FlowDecision[],
): FlowIssue[] {
  const issues: FlowIssue[] = [];

  const starts = activities.filter((a) => a.type === "start");
  const ends = activities.filter((a) => a.type === "end");
  if (starts.length === 0) issues.push({ severity: "error", message: "Sem evento inicial (Início).", activityId: null });
  if (starts.length > 1) issues.push({ severity: "warn", message: `${starts.length} eventos iniciais — recomendado apenas um.`, activityId: null });
  if (ends.length === 0) issues.push({ severity: "error", message: "Sem evento final (Fim).", activityId: null });

  const outsOf = new Map<string, FlowConnection[]>();
  const insOf = new Map<string, FlowConnection[]>();
  const actIds = new Set(activities.map((a) => a.id));
  for (const c of connections) {
    if (!actIds.has(c.from_activity_id) || !actIds.has(c.to_activity_id)) {
      issues.push({ severity: "error", message: "Conexão aponta para atividade inexistente.", activityId: c.from_activity_id });
      continue;
    }
    (outsOf.get(c.from_activity_id) ?? outsOf.set(c.from_activity_id, []).get(c.from_activity_id)!).push(c);
    (insOf.get(c.to_activity_id) ?? insOf.set(c.to_activity_id, []).get(c.to_activity_id)!).push(c);
  }

  // Duplicated connections
  const dupSeen = new Set<string>();
  for (const c of connections) {
    const k = `${c.from_activity_id}->${c.to_activity_id}:${c.type}`;
    if (dupSeen.has(k)) {
      issues.push({ severity: "warn", message: "Conexão duplicada.", activityId: c.from_activity_id });
    }
    dupSeen.add(k);
  }

  for (const a of activities) {
    const outs = outsOf.get(a.id) ?? [];
    const ins = insOf.get(a.id) ?? [];

    if (a.type !== "end" && outs.length === 0) {
      issues.push({ severity: "error", message: `"${a.title}" está sem saída.`, activityId: a.id });
    }
    if (a.type !== "start" && ins.length === 0) {
      issues.push({ severity: "warn", message: `"${a.title}" está sem entrada (nó órfão).`, activityId: a.id });
    }
    if (a.type === "decision") {
      if (outs.length < 2) {
        issues.push({ severity: "error", message: `Decisão "${a.title}" precisa de ao menos 2 saídas.`, activityId: a.id });
      }
      const labels = new Set(outs.map((o) => (o.label || "").trim().toLowerCase()));
      if (labels.size < outs.length) {
        issues.push({ severity: "warn", message: `Decisão "${a.title}" tem saídas com labels repetidos ou vazios.`, activityId: a.id });
      }
      const dec = decisions.find((d) => d.activity_id === a.id);
      if (!dec || !dec.question) {
        issues.push({ severity: "warn", message: `Decisão "${a.title}" sem pergunta definida.`, activityId: a.id });
      }
    }
    if (!a.responsible?.trim() && a.type !== "start" && a.type !== "end") {
      issues.push({ severity: "info", message: `"${a.title}" sem responsável — irá para a raia "Não definido".`, activityId: a.id });
    }
  }

  return issues;
}

export function hasBlockingErrors(issues: FlowIssue[]): boolean {
  return issues.some((i) => i.severity === "error");
}
