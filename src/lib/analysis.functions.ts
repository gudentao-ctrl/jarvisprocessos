import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/* ============================================================
 * OPPORTUNITIES (Matriz de Melhorias)
 * ============================================================ */

const EffortEnum = z.enum(["baixo", "medio", "alto"]);
const ImpactEnum = z.enum(["baixo", "medio", "alto"]);
const StatusEnum = z.enum(["sugerida", "aprovada", "rejeitada", "em_andamento", "implementada"]);
const PrioEnum = z.enum(["baixa", "media", "alta", "critica"]);

function computePriority(effort: string, impact: string, weights?: Record<string, number>) {
  const w = weights ?? { impacto: 3, esforco: 2 };
  const impactMap: Record<string, number> = { baixo: 1, medio: 2, alto: 3 };
  const effortMap: Record<string, number> = { baixo: 3, medio: 2, alto: 1 };
  const score = (impactMap[impact] ?? 2) * (w.impacto ?? 3) + (effortMap[effort] ?? 2) * (w.esforco ?? 2);
  let priority: "baixa" | "media" | "alta" | "critica" = "media";
  if (score >= 14) priority = "critica";
  else if (score >= 11) priority = "alta";
  else if (score >= 7) priority = "media";
  else priority = "baixa";
  return { score, priority };
}

export const listOpportunities = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("improvement_opportunities")
      .select("*, processes!improvement_opportunities_process_id_fkey(name), companies(name), pain_points(description), indicators(name)")
      .order("priority_score", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getOpportunity = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("improvement_opportunities")
      .select("*, processes!improvement_opportunities_process_id_fkey(id,name), companies(id,name), pain_points(id,description), indicators(id,name), root_cause_analyses(id,problem,method), action_plans(id,title,status)")
      .eq("id", data.id).single();
    if (error) throw new Error(error.message);
    return row;
  });

export const createOpportunity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    company_id: z.string().uuid(),
    process_id: z.string().uuid().nullable().optional(),
    pain_point_id: z.string().uuid().nullable().optional(),
    indicator_id: z.string().uuid().nullable().optional(),
    root_cause_id: z.string().uuid().nullable().optional(),
    title: z.string().min(1),
    description: z.string().default(""),
    category: z.string().default("desperdicio"),
    expected_benefit: z.string().default(""),
    effort: EffortEnum.default("medio"),
    impact: ImpactEnum.default("medio"),
    source: z.enum(["ia", "manual"]).default("manual"),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { score, priority } = computePriority(data.effort, data.impact);
    const { data: row, error } = await context.supabase
      .from("improvement_opportunities")
      .insert({ ...data, priority_score: score, priority, created_by: context.userId })
      .select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateOpportunity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid(),
    patch: z.object({
      title: z.string().optional(),
      description: z.string().optional(),
      category: z.string().optional(),
      expected_benefit: z.string().optional(),
      effort: EffortEnum.optional(),
      impact: ImpactEnum.optional(),
      status: StatusEnum.optional(),
      priority: PrioEnum.optional(),
      pain_point_id: z.string().uuid().nullable().optional(),
      indicator_id: z.string().uuid().nullable().optional(),
      process_id: z.string().uuid().nullable().optional(),
      root_cause_id: z.string().uuid().nullable().optional(),
    }),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const patch: Record<string, unknown> = { ...data.patch };
    if (patch.effort && patch.impact) {
      const { score, priority } = computePriority(patch.effort as string, patch.impact as string);
      patch.priority_score = score;
      if (!patch.priority) patch.priority = priority;
    }
    const { error } = await context.supabase.from("improvement_opportunities").update(patch as never).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteOpportunity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("improvement_opportunities").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const approveOpportunityAsPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid(),
    responsible: z.string().default(""),
    due_date: z.string().nullable().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: opp, error: eOpp } = await context.supabase
      .from("improvement_opportunities").select("*").eq("id", data.id).single();
    if (eOpp) throw new Error(eOpp.message);

    const { data: plan, error } = await context.supabase
      .from("action_plans").insert({
        company_id: opp.company_id,
        process_id: opp.process_id,
        pain_point_id: opp.pain_point_id,
        indicator_id: opp.indicator_id,
        opportunity_id: opp.id,
        root_cause_id: opp.root_cause_id,
        title: opp.title,
        description: opp.description,
        expected_benefit: opp.expected_benefit,
        responsible: data.responsible,
        due_date: data.due_date || null,
        priority: opp.priority === "critica" ? "alta" : opp.priority,
        status: "aberto",
        created_by: context.userId,
      }).select().single();
    if (error) throw new Error(error.message);

    await context.supabase.from("improvement_opportunities")
      .update({ status: "aprovada", action_plan_id: plan.id }).eq("id", opp.id);
    return plan;
  });

export const rejectOpportunity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("improvement_opportunities")
      .update({ status: "rejeitada" }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const recalcPriorities = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ company_id: z.string().uuid(), criteria_id: z.string().uuid().nullable().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    let weights: Record<string, number> | undefined;
    if (data.criteria_id) {
      const { data: c } = await context.supabase.from("prioritization_criteria").select("weights").eq("id", data.criteria_id).maybeSingle();
      weights = (c?.weights as Record<string, number>) ?? undefined;
    }
    const { data: opps } = await context.supabase
      .from("improvement_opportunities").select("id, effort, impact").eq("company_id", data.company_id);
    for (const o of opps ?? []) {
      const { score, priority } = computePriority(o.effort, o.impact, weights);
      await context.supabase.from("improvement_opportunities")
        .update({ priority_score: score, priority }).eq("id", o.id);
    }
    return { ok: true, count: opps?.length ?? 0 };
  });

/* ============================================================
 * PRIORITIZATION CRITERIA
 * ============================================================ */

export const listCriteria = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("prioritization_criteria").select("*, companies(name)").order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const saveCriterion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid().optional(),
    company_id: z.string().uuid(),
    name: z.string().min(1),
    weights: z.record(z.string(), z.number()),
    is_default: z.boolean().default(false),
  }).parse(d))
  .handler(async ({ data, context }) => {
    if (data.id) {
      const { error } = await context.supabase.from("prioritization_criteria")
        .update({ name: data.name, weights: data.weights, is_default: data.is_default }).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: row, error } = await context.supabase.from("prioritization_criteria")
      .insert({ company_id: data.company_id, name: data.name, weights: data.weights, is_default: data.is_default })
      .select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteCriterion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("prioritization_criteria").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ============================================================
 * ROOT CAUSE ANALYSES
 * ============================================================ */

export const listRcas = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("root_cause_analyses")
      .select("*, companies(name), processes!root_cause_analyses_process_id_fkey(name), pain_points(description)")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getRca = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("root_cause_analyses")
      .select("*, companies(id,name), processes!root_cause_analyses_process_id_fkey(id,name), pain_points(id,description)")
      .eq("id", data.id).single();
    if (error) throw new Error(error.message);
    const { data: actions } = await context.supabase
      .from("root_cause_actions").select("*").eq("analysis_id", data.id);
    return { ...row, actions: actions ?? [] };
  });

export const saveRca = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid().optional(),
    company_id: z.string().uuid(),
    process_id: z.string().uuid().nullable().optional(),
    pain_point_id: z.string().uuid().nullable().optional(),
    opportunity_id: z.string().uuid().nullable().optional(),
    problem: z.string().min(1),
    method: z.enum(["cinco_porques", "ishikawa", "categoria"]),
    data: z.record(z.string(), z.any()).default({}),
    conclusion: z.string().default(""),
  }).parse(d))
  .handler(async ({ data, context }) => {
    if (data.id) {
      const { error } = await context.supabase.from("root_cause_analyses")
        .update({
          problem: data.problem, method: data.method, data: data.data, conclusion: data.conclusion,
          process_id: data.process_id ?? null, pain_point_id: data.pain_point_id ?? null,
        }).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: row, error } = await context.supabase.from("root_cause_analyses")
      .insert({ ...data, created_by: context.userId }).select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteRca = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("root_cause_analyses").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const addRcaAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    analysis_id: z.string().uuid(),
    kind: z.enum(["corretiva", "preventiva"]),
    description: z.string().min(1),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase.from("root_cause_actions")
      .insert(data).select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteRcaAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("root_cause_actions").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ============================================================
 * ROADMAP
 * ============================================================ */

export const listRoadmap = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("roadmap_items").select("*, companies(name), improvement_opportunities(id,title)")
      .order("horizon").order("priority", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const saveRoadmapItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid().optional(),
    company_id: z.string().uuid(),
    opportunity_id: z.string().uuid().nullable().optional(),
    title: z.string().min(1),
    description: z.string().default(""),
    horizon: z.enum(["curto", "medio", "longo"]),
    theme: z.string().default(""),
    area: z.string().default(""),
    responsible: z.string().default(""),
    deadline: z.string().nullable().optional(),
    priority: PrioEnum.default("media"),
    effort: EffortEnum.default("medio"),
    expected_impact: z.string().default(""),
    status: z.enum(["planejado", "em_andamento", "concluido", "cancelado"]).default("planejado"),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const payload = { ...data, deadline: data.deadline || null };
    if (data.id) {
      const { error } = await context.supabase.from("roadmap_items").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: row, error } = await context.supabase.from("roadmap_items").insert(payload).select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteRoadmapItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("roadmap_items").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ============================================================
 * VERSIONS / TO BE
 * ============================================================ */

export const snapshotProcess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    process_id: z.string().uuid(),
    label: z.string().default(""),
    notes: z.string().default(""),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: proc } = await context.supabase.from("processes").select("*").eq("id", data.process_id).single();
    const [acts, edges, info, dec] = await Promise.all([
      context.supabase.from("process_activities").select("*").eq("process_id", data.process_id),
      context.supabase.from("process_edges").select("*").eq("process_id", data.process_id),
      context.supabase.from("process_information_map").select("*").eq("process_id", data.process_id),
      context.supabase.from("process_decision_map").select("*").eq("process_id", data.process_id),
    ]);
    const { count } = await context.supabase
      .from("process_versions").select("*", { count: "exact", head: true }).eq("process_id", data.process_id);
    const version_no = (count ?? 0) + 1;
    const { data: row, error } = await context.supabase.from("process_versions").insert({
      process_id: data.process_id,
      version_no,
      kind: proc?.kind ?? "as_is",
      label: data.label,
      notes: data.notes,
      snapshot: { process: proc, activities: acts.data ?? [], edges: edges.data ?? [], information_map: info.data ?? [], decision_map: dec.data ?? [] },
      created_by: context.userId,
    }).select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const listVersions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ process_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("process_versions").select("id, version_no, label, notes, kind, created_at")
      .eq("process_id", data.process_id).order("version_no", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const cloneAsIsToTobe = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    process_id: z.string().uuid(),
    name: z.string().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: src, error: e1 } = await context.supabase.from("processes").select("*").eq("id", data.process_id).single();
    if (e1) throw new Error(e1.message);
    const { data: newProc, error: e2 } = await context.supabase.from("processes").insert({
      company_id: src.company_id,
      parent_id: src.parent_id,
      level: src.level,
      name: data.name || `${src.name} (TO BE)`,
      description: src.description,
      objective: src.objective,
      responsible: src.responsible,
      inputs: src.inputs,
      outputs: src.outputs,
      systems: src.systems,
      source_interview_id: src.source_interview_id,
      kind: "to_be",
      status: "draft",
      source_process_id: src.id,
      created_by: context.userId,
    }).select().single();
    if (e2) throw new Error(e2.message);

    const { data: acts } = await context.supabase.from("process_activities").select("*").eq("process_id", src.id).order("ordering");
    const idMap = new Map<string, string>();
    if (acts && acts.length) {
      const rows = acts.map((a) => ({
        process_id: newProc.id, ordering: a.ordering, type: a.type, title: a.title,
        description: a.description, responsible: a.responsible, area: a.area, systems: a.systems,
        time_minutes: a.time_minutes, notes: a.notes, x: a.x, y: a.y,
      }));
      const { data: inserted } = await context.supabase.from("process_activities").insert(rows).select("id");
      (inserted ?? []).forEach((n, i) => idMap.set(acts[i].id, n.id));
    }
    const { data: edges } = await context.supabase.from("process_edges").select("*").eq("process_id", src.id);
    if (edges && edges.length) {
      const rows = edges
        .map((e) => ({ process_id: newProc.id, source_id: idMap.get(e.source_id)!, target_id: idMap.get(e.target_id)!, label: e.label }))
        .filter((r) => r.source_id && r.target_id);
      if (rows.length) await context.supabase.from("process_edges").insert(rows);
    }
    return newProc;
  });

export const compareAsIsTobe = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ tobe_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: tobe } = await context.supabase.from("processes").select("*").eq("id", data.tobe_id).single();
    if (!tobe?.source_process_id) return { added: [], removed: [], modified: [], timeAsIs: 0, timeToBe: 0 };
    const [asisAct, tobeAct] = await Promise.all([
      context.supabase.from("process_activities").select("title, time_minutes").eq("process_id", tobe.source_process_id),
      context.supabase.from("process_activities").select("title, time_minutes").eq("process_id", data.tobe_id),
    ]);
    const a = asisAct.data ?? [], b = tobeAct.data ?? [];
    const aTitles = new Set(a.map((x) => x.title.toLowerCase().trim()));
    const bTitles = new Set(b.map((x) => x.title.toLowerCase().trim()));
    const added = b.filter((x) => !aTitles.has(x.title.toLowerCase().trim()));
    const removed = a.filter((x) => !bTitles.has(x.title.toLowerCase().trim()));
    const modified = b.filter((x) => {
      const same = a.find((y) => y.title.toLowerCase().trim() === x.title.toLowerCase().trim());
      return same && Number(same.time_minutes) !== Number(x.time_minutes);
    });
    const timeAsIs = a.reduce((s, x) => s + Number(x.time_minutes ?? 0), 0);
    const timeToBe = b.reduce((s, x) => s + Number(x.time_minutes ?? 0), 0);
    return { added, removed, modified, timeAsIs, timeToBe };
  });

export const listTobeChanges = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ tobe_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase.from("tobe_change_log")
      .select("*, improvement_opportunities(id,title), indicators(id,name)")
      .eq("tobe_process_id", data.tobe_id).order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const addTobeChange = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    tobe_process_id: z.string().uuid(),
    change_type: z.enum(["added", "removed", "modified", "simplified"]),
    target_ref: z.string().default(""),
    problem_addressed: z.string().default(""),
    expected_benefit: z.string().default(""),
    opportunity_id: z.string().uuid().nullable().optional(),
    indicator_id: z.string().uuid().nullable().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase.from("tobe_change_log").insert(data).select().single();
    if (error) throw new Error(error.message);
    return row;
  });

/* ============================================================
 * METRICS
 * ============================================================ */

export const getImplementationMetrics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ company_id: z.string().uuid().nullable().optional() }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    let q = context.supabase.from("improvement_opportunities").select("status");
    if (data?.company_id) q = q.eq("company_id", data.company_id);
    const { data: rows } = await q;
    const counts: Record<string, number> = {
      sugerida: 0, aprovada: 0, rejeitada: 0, em_andamento: 0, implementada: 0, total: 0,
    };
    (rows ?? []).forEach((r) => { counts[r.status] = (counts[r.status] ?? 0) + 1; counts.total++; });
    return counts;
  });

/* ============================================================
 * DIAGNOSTICS
 * ============================================================ */

export const listDiagnostics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("executive_diagnostics").select("*, companies(name)").order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getDiagnostic = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase.from("executive_diagnostics")
      .select("*, companies(id,name)").eq("id", data.id).single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateDiagnostic = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid(),
    title: z.string().optional(),
    content: z.record(z.string(), z.any()),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("executive_diagnostics")
      .update({ title: data.title, content: data.content, edited_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteDiagnostic = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("executive_diagnostics").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ============================================================
 * TO BE LIST
 * ============================================================ */

export const listTobeProcesses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("processes").select("id, name, status, created_at, updated_at, source_process_id, companies(name)")
      .eq("kind", "to_be").order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });
