import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/* ============================================================
 * PROCESSES (hierárquicos N0/N1/N2)
 * ============================================================ */

export const listProcesses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ company_id: z.string().uuid().optional() }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("processes")
      .select("id, name, level, parent_id, company_id, status, responsible, companies(name)")
      .order("level")
      .order("name");
    if (data.company_id) q = q.eq("company_id", data.company_id);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getProcess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: process, error } = await context.supabase
      .from("processes")
      .select("*, companies(id, name)")
      .eq("id", data.id)
      .single();
    if (error) throw new Error(error.message);

    const [{ data: activities }, { data: edges }, { data: infoMap }, { data: decisionMap }, { data: indicators }, { data: plans }, { data: cronos }] = await Promise.all([
      context.supabase.from("process_activities").select("*").eq("process_id", data.id).order("ordering"),
      context.supabase.from("process_edges").select("*").eq("process_id", data.id),
      context.supabase.from("process_information_map").select("*").eq("process_id", data.id),
      context.supabase.from("process_decision_map").select("*").eq("process_id", data.id),
      context.supabase.from("indicators").select("*").eq("process_id", data.id),
      context.supabase.from("action_plans").select("*").eq("process_id", data.id).order("created_at", { ascending: false }),
      context.supabase.from("cronoanalysis_sessions").select("*").eq("process_id", data.id).order("observation_date", { ascending: false }),
    ]);

    return {
      process,
      activities: activities ?? [],
      edges: edges ?? [],
      informationMap: infoMap ?? [],
      decisionMap: decisionMap ?? [],
      indicators: indicators ?? [],
      actionPlans: plans ?? [],
      cronoanalysis: cronos ?? [],
    };
  });

export const createProcess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      company_id: z.string().uuid(),
      parent_id: z.string().uuid().nullable().optional(),
      level: z.enum(["0", "1", "2"]),
      name: z.string().min(1).max(200),
      description: z.string().optional().default(""),
      objective: z.string().optional().default(""),
      responsible: z.string().optional().default(""),
      source_interview_id: z.string().uuid().nullable().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("processes")
      .insert({
        company_id: data.company_id,
        parent_id: data.parent_id ?? null,
        level: data.level,
        name: data.name,
        description: data.description,
        objective: data.objective,
        responsible: data.responsible,
        source_interview_id: data.source_interview_id ?? null,
        created_by: context.userId,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateProcess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid(),
      name: z.string().optional(),
      description: z.string().optional(),
      objective: z.string().optional(),
      responsible: z.string().optional(),
      inputs: z.string().optional(),
      outputs: z.string().optional(),
      systems: z.array(z.string()).optional(),
      parent_id: z.string().uuid().nullable().optional(),
      level: z.enum(["0", "1", "2"]).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { id, ...rest } = data;
    const { error } = await context.supabase.from("processes").update(rest).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteProcess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("processes").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* Activities + Edges (BPM) */

const ActivityInput = z.object({
  id: z.string().uuid().optional(),
  process_id: z.string().uuid(),
  ordering: z.number().int().default(0),
  type: z.enum(["start", "task", "decision", "wait", "approval", "end", "info_in", "info_out"]).default("task"),
  title: z.string().min(1),
  description: z.string().optional().default(""),
  responsible: z.string().optional().default(""),
  area: z.string().optional().default(""),
  systems: z.array(z.string()).optional().default([]),
  time_minutes: z.number().optional().default(0),
  notes: z.string().optional().default(""),
  x: z.number().optional().default(0),
  y: z.number().optional().default(0),
});

export const saveActivity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ActivityInput.parse(d))
  .handler(async ({ data, context }) => {
    if (data.id) {
      const { id, ...rest } = data;
      const { data: row, error } = await context.supabase
        .from("process_activities")
        .update(rest)
        .eq("id", id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return row;
    }
    const { data: row, error } = await context.supabase
      .from("process_activities")
      .insert(data)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteActivity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("process_activities").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const saveEdge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      process_id: z.string().uuid(),
      source_id: z.string().uuid(),
      target_id: z.string().uuid(),
      label: z.string().optional().default(""),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("process_edges")
      .insert(data)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteEdge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("process_edges").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const saveCanvasLayout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      positions: z.array(z.object({ id: z.string().uuid(), x: z.number(), y: z.number() })),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await Promise.all(
      data.positions.map((p) =>
        context.supabase.from("process_activities").update({ x: p.x, y: p.y }).eq("id", p.id),
      ),
    );
    return { ok: true };
  });

/* ============================================================
 * INFORMATION MAP / DECISION MAP
 * ============================================================ */

export const saveInformationItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid().optional(),
      process_id: z.string().uuid(),
      activity_id: z.string().uuid().nullable().optional(),
      origin: z.string().optional().default(""),
      destination: z.string().optional().default(""),
      medium: z.string().optional().default(""),
      responsible: z.string().optional().default(""),
      document: z.string().optional().default(""),
      loss_risk: z.boolean().optional().default(false),
      notes: z.string().optional().default(""),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    if (data.id) {
      const { id, ...rest } = data;
      const { data: row, error } = await context.supabase
        .from("process_information_map").update(rest).eq("id", id).select().single();
      if (error) throw new Error(error.message);
      return row;
    }
    const { data: row, error } = await context.supabase
      .from("process_information_map").insert(data).select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteInformationItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("process_information_map").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const saveDecisionItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid().optional(),
      process_id: z.string().uuid(),
      activity_id: z.string().uuid().nullable().optional(),
      decider: z.string().optional().default(""),
      decision: z.string().optional().default(""),
      approval_required: z.boolean().optional().default(false),
      reported_delay: z.string().optional().default(""),
      notes: z.string().optional().default(""),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    if (data.id) {
      const { id, ...rest } = data;
      const { data: row, error } = await context.supabase
        .from("process_decision_map").update(rest).eq("id", id).select().single();
      if (error) throw new Error(error.message);
      return row;
    }
    const { data: row, error } = await context.supabase
      .from("process_decision_map").insert(data).select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteDecisionItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("process_decision_map").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ============================================================
 * MAPS (consolidados por empresa)
 * ============================================================ */

export const getCompanyMaps = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ company_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: procs } = await context.supabase
      .from("processes").select("id, name").eq("company_id", data.company_id);
    const ids = (procs ?? []).map((p) => p.id);
    if (ids.length === 0) return { information: [], decision: [], pains: [] };

    const [{ data: information }, { data: decision }, { data: pains }] = await Promise.all([
      context.supabase.from("process_information_map").select("*").in("process_id", ids),
      context.supabase.from("process_decision_map").select("*").in("process_id", ids),
      context.supabase.from("pain_points").select("*").eq("company_id", data.company_id).order("category"),
    ]);

    return { information: information ?? [], decision: decision ?? [], pains: pains ?? [] };
  });

/* ============================================================
 * PAIN POINTS
 * ============================================================ */

export const listPains = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("pain_points")
      .select("*, companies(name)")
      .order("category");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const savePain = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid().optional(),
      company_id: z.string().uuid().nullable().optional(),
      source: z.enum(["interview", "process", "cronoanalysis", "manual"]).default("manual"),
      source_id: z.string().uuid().nullable().optional(),
      category: z.enum(["processo", "informacao", "governanca", "pessoas", "tecnologia", "planejamento", "qualidade", "producao", "compras", "logistica"]),
      description: z.string().min(1),
      severity: z.number().int().min(1).max(5).default(3),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    if (data.id) {
      const { id, ...rest } = data;
      const { data: row, error } = await context.supabase
        .from("pain_points").update(rest).eq("id", id).select().single();
      if (error) throw new Error(error.message);
      return row;
    }
    const { data: row, error } = await context.supabase
      .from("pain_points").insert(data).select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deletePain = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("pain_points").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ============================================================
 * INDICATORS
 * ============================================================ */

export const listIndicators = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("indicators").select("*, companies(name), processes(name)").order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const saveIndicator = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid().optional(),
      company_id: z.string().uuid().nullable().optional(),
      process_id: z.string().uuid().nullable().optional(),
      name: z.string().min(1),
      description: z.string().optional().default(""),
      unit: z.string().optional().default(""),
      target: z.number().nullable().optional(),
      frequency: z.string().optional().default(""),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    if (data.id) {
      const { id, ...rest } = data;
      const { data: row, error } = await context.supabase
        .from("indicators").update(rest).eq("id", id).select().single();
      if (error) throw new Error(error.message);
      return row;
    }
    const { data: row, error } = await context.supabase
      .from("indicators").insert(data).select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteIndicator = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("indicators").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ============================================================
 * ACTION PLANS
 * ============================================================ */

export const listActionPlans = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ company_id: z.string().uuid().optional() }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("action_plans")
      .select("*, companies(name), processes(name)")
      .order("created_at", { ascending: false });
    if (data.company_id) q = q.eq("company_id", data.company_id);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const saveActionPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid().optional(),
      company_id: z.string().uuid().nullable().optional(),
      process_id: z.string().uuid().nullable().optional(),
      interview_id: z.string().uuid().nullable().optional(),
      cronoanalysis_id: z.string().uuid().nullable().optional(),
      pain_point_id: z.string().uuid().nullable().optional(),
      indicator_id: z.string().uuid().nullable().optional(),
      title: z.string().min(1),
      description: z.string().optional().default(""),
      responsible: z.string().optional().default(""),
      due_date: z.string().nullable().optional(),
      status: z.enum(["aberto", "em_andamento", "concluido"]).default("aberto"),
      priority: z.enum(["baixa", "media", "alta", "critica"]).default("media"),
      // Extended fields (GUT + details)
      problem: z.string().nullable().optional(),
      cause: z.string().nullable().optional(),
      category: z.string().nullable().optional(),
      gravity: z.number().int().min(1).max(5).nullable().optional(),
      urgency: z.number().int().min(1).max(5).nullable().optional(),
      trend: z.number().int().min(1).max(5).nullable().optional(),
      new_due_date: z.string().nullable().optional(),
      expected_result: z.string().nullable().optional(),
      observations: z.string().nullable().optional(),
      origin: z.string().nullable().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    if (data.id) {
      const { id, ...rest } = data;
      const { data: row, error } = await context.supabase
        .from("action_plans").update(rest).eq("id", id).select().single();
      if (error) throw new Error(error.message);
      return row;
    }
    const { data: row, error } = await context.supabase
      .from("action_plans").insert({ ...data, created_by: context.userId }).select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteActionPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("action_plans").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ============================================================
 * CRONOANÁLISE
 * ============================================================ */

export const listCronoSessions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ company_id: z.string().uuid().optional() }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("cronoanalysis_sessions")
      .select("*, companies(name), processes(name)")
      .order("observation_date", { ascending: false });
    if (data.company_id) q = q.eq("company_id", data.company_id);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getCronoSession = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: session, error } = await context.supabase
      .from("cronoanalysis_sessions").select("*, companies(name), processes(id, name)").eq("id", data.id).single();
    if (error) throw new Error(error.message);
    const { data: observations } = await context.supabase
      .from("cronoanalysis_observations").select("*").eq("session_id", data.id).order("ordering");
    return { session, observations: observations ?? [] };
  });

export const createCronoSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      company_id: z.string().uuid().nullable().optional(),
      process_id: z.string().uuid().nullable().optional(),
      production_line: z.string().optional().default(""),
      machine: z.string().optional().default(""),
      product: z.string().optional().default(""),
      observer: z.string().optional().default(""),
      observation_date: z.string().min(1),
      takt_time: z.number().nullable().optional(),
      notes: z.string().optional().default(""),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("cronoanalysis_sessions")
      .insert({ ...data, created_by: context.userId })
      .select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteCronoSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("cronoanalysis_sessions").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const saveCronoObservation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid().optional(),
      session_id: z.string().uuid(),
      ordering: z.number().int().default(0),
      activity: z.string().min(1),
      time_minutes: z.number().min(0),
      classification: z.enum(["VA", "NVA", "NNVA"]),
      notes: z.string().optional().default(""),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    if (data.id) {
      const { id, ...rest } = data;
      const { data: row, error } = await context.supabase
        .from("cronoanalysis_observations").update(rest).eq("id", id).select().single();
      if (error) throw new Error(error.message);
      return row;
    }
    const { data: row, error } = await context.supabase
      .from("cronoanalysis_observations").insert(data).select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteCronoObservation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("cronoanalysis_observations").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ============================================================
 * IA — Sugerir processo a partir de entrevista
 * ============================================================ */

const ProcessSuggestionSchema = z.object({
  process_name: z.string(),
  process_objective: z.string(),
  activities: z.array(z.object({
    title: z.string(),
    type: z.enum(["start", "task", "decision", "wait", "approval", "end", "info_in", "info_out"]),
    responsible: z.string().default(""),
    area: z.string().default(""),
    systems: z.array(z.string()).default([]),
    time_minutes: z.number().default(0),
    notes: z.string().default(""),
  })),
  information_map: z.array(z.object({
    origin: z.string().default(""),
    destination: z.string().default(""),
    medium: z.string().default(""),
    responsible: z.string().default(""),
    document: z.string().default(""),
    loss_risk: z.boolean().default(false),
  })),
  decision_map: z.array(z.object({
    decider: z.string().default(""),
    decision: z.string().default(""),
    approval_required: z.boolean().default(false),
    reported_delay: z.string().default(""),
  })),
  pains: z.array(z.object({
    description: z.string(),
    category: z.enum(["processo", "informacao", "governanca", "pessoas", "tecnologia", "planejamento", "qualidade", "producao", "compras", "logistica"]),
  })),
});

export type ProcessSuggestion = z.infer<typeof ProcessSuggestionSchema>;

const MODEL_FALLBACKS = [
  "google/gemini-2.5-flash",
  "google/gemini-3-flash-preview",
  "google/gemini-2.5-pro",
  "openai/gpt-5-mini",
] as const;

function stripCodeFences(s: string): string {
  const t = s.trim();
  if (t.startsWith("```")) {
    return t.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  }
  return t;
}

/* Reduz textos muito longos mantendo início e fim (mais contexto útil). */
function condenseText(text: string, max: number): string {
  const s = String(text ?? "").trim();
  if (s.length <= max) return s;
  const head = Math.floor(max * 0.7);
  return `${s.slice(0, head)}\n[…trecho omitido…]\n${s.slice(-(max - head))}`;
}

function looseJson(raw: string): any {
  const s = stripCodeFences(raw);
  try {
    return JSON.parse(s);
  } catch {
    const i = s.indexOf("{");
    const j = s.lastIndexOf("}");
    if (i >= 0 && j > i) return JSON.parse(s.slice(i, j + 1));
    throw new Error("resposta sem JSON");
  }
}


export const suggestProcessFromInterview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ interview_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY ausente");

    const { data: t } = await context.supabase
      .from("transcripts").select("content").eq("interview_id", data.interview_id).maybeSingle();
    const content = (t?.content ?? "").trim();
    if (!content) throw new Error("Sem transcrição. Transcreva a entrevista primeiro.");

    const systemPrompt = `Você é um analista de processos BPM. A partir da transcrição abaixo, ESTRUTURE um processo operacional.

REGRAS:
- Use APENAS o que está explícito na transcrição. NÃO invente.
- Se um campo não tiver evidência, deixe vazio "" ou array vazio [].
- Categorias de dor: processo, informacao, governanca, pessoas, tecnologia, planejamento, qualidade, producao, compras, logistica.
- Tipos de atividade: start, task, decision, wait, approval, end, info_in, info_out.
- Tempos em minutos (decimal). Se não souber, use 0.

Responda APENAS um objeto JSON válido com as chaves: process_name, process_objective, activities, information_map, decision_map, pains. Sem cercas de código, sem texto antes ou depois.`;

    let lastErr = "";
    for (const model of MODEL_FALLBACKS) {
      try {
        const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: `Transcrição:\n\n${content}` },
            ],
            response_format: { type: "json_object" },
          }),
        });
        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          lastErr = `[${model}] ${res.status}: ${txt.slice(0, 200)}`;
          if (res.status === 429) throw new Error("Limite de IA atingido. Tente novamente em alguns minutos.");
          if (res.status === 402) throw new Error("Créditos de IA esgotados. Adicione créditos na área de billing.");
          continue;
        }
        const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
        const raw = stripCodeFences(json.choices?.[0]?.message?.content ?? "{}");
        try {
          return ProcessSuggestionSchema.parse(JSON.parse(raw));
        } catch (e: any) {
          lastErr = `[${model}] resposta inválida: ${e?.message ?? "parse error"}`;
          continue;
        }
      } catch (e: any) {
        if (e?.message?.startsWith("Limite de IA") || e?.message?.startsWith("Créditos")) throw e;
        lastErr = `[${model}] ${e?.message ?? "erro"}`;
      }
    }
    throw new Error(`Nenhum modelo respondeu válido. ${lastErr}`);
  });

export const applyProcessSuggestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      interview_id: z.string().uuid(),
      company_id: z.string().uuid(),
      level: z.enum(["0", "1", "2"]).default("1"),
      parent_id: z.string().uuid().nullable().optional(),
      suggestion: ProcessSuggestionSchema,
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: process, error } = await context.supabase
      .from("processes")
      .insert({
        company_id: data.company_id,
        parent_id: data.parent_id ?? null,
        level: data.level,
        name: data.suggestion.process_name || "Novo processo",
        objective: data.suggestion.process_objective ?? "",
        source_interview_id: data.interview_id,
        created_by: context.userId,
      })
      .select().single();
    if (error) throw new Error(error.message);

    // Activities — layout vertical simples
    const activitiesRows = data.suggestion.activities.map((a, i) => ({
      process_id: process.id,
      ordering: i,
      type: a.type,
      title: a.title,
      responsible: a.responsible,
      area: a.area,
      systems: a.systems,
      time_minutes: a.time_minutes,
      notes: a.notes,
      x: 250,
      y: i * 120,
    }));
    let created: { id: string }[] = [];
    if (activitiesRows.length) {
      const { data: insAct, error: aErr } = await context.supabase
        .from("process_activities").insert(activitiesRows).select("id");
      if (aErr) throw new Error(aErr.message);
      created = insAct ?? [];
      // Sequential edges
      const edges = [];
      for (let i = 0; i < created.length - 1; i++) {
        edges.push({ process_id: process.id, source_id: created[i].id, target_id: created[i + 1].id, label: "" });
      }
      if (edges.length) await context.supabase.from("process_edges").insert(edges);
    }

    if (data.suggestion.information_map.length) {
      await context.supabase.from("process_information_map").insert(
        data.suggestion.information_map.map((i) => ({ ...i, process_id: process.id })),
      );
    }
    if (data.suggestion.decision_map.length) {
      await context.supabase.from("process_decision_map").insert(
        data.suggestion.decision_map.map((i) => ({ ...i, process_id: process.id })),
      );
    }
    if (data.suggestion.pains.length) {
      await context.supabase.from("pain_points").insert(
        data.suggestion.pains.map((p) => ({
          ...p,
          company_id: data.company_id,
          source: "interview" as const,
          source_id: data.interview_id,
          severity: 3,
        })),
      );
    }

    return { process_id: process.id };
  });

/* ============================================================
 * Métricas de cronoanálise
 * ============================================================ */

export function computeCronoMetrics(observations: Array<{ time_minutes: number; classification: "VA" | "NVA" | "NNVA"; activity: string }>, taktTime?: number | null) {
  const total = observations.reduce((s, o) => s + Number(o.time_minutes ?? 0), 0);
  const va = observations.filter((o) => o.classification === "VA").reduce((s, o) => s + Number(o.time_minutes), 0);
  const nva = observations.filter((o) => o.classification === "NVA").reduce((s, o) => s + Number(o.time_minutes), 0);
  const nnva = observations.filter((o) => o.classification === "NNVA").reduce((s, o) => s + Number(o.time_minutes), 0);
  const pct = (n: number) => (total > 0 ? (n / total) * 100 : 0);
  const top = [...observations].sort((a, b) => Number(b.time_minutes) - Number(a.time_minutes)).slice(0, 5);
  const capacity = total > 0 ? 60 / total : 0; // peças/hora estimadas
  const taktGap = taktTime && taktTime > 0 ? total - taktTime : null;
  return {
    total,
    va,
    nva,
    nnva,
    pctVA: pct(va),
    pctNVA: pct(nva),
    pctNNVA: pct(nnva),
    capacityPerHour: capacity,
    taktGap,
    topBottlenecks: top,
  };
}
