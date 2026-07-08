import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/* ============================================================
 * FLOW (Fluxo Mestre) — fonte da verdade do processo
 * BPMN é derivado; toda edição acontece aqui.
 * ============================================================ */

const ACTIVITY_TYPES = ["start", "task", "decision", "wait", "approval", "end", "info_in", "info_out"] as const;
const CONNECTION_TYPES = ["sequential", "decision", "parallel", "return", "subprocess"] as const;

export const getFlow = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ process_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    const [
      { data: process, error: pErr },
      { data: activities },
      { data: connections },
      { data: decisions },
      { data: links },
    ] = await Promise.all([
      sb.from("processes").select("*, companies(id, name)").eq("id", data.process_id).single(),
      sb.from("process_activities").select("*").eq("process_id", data.process_id).order("ordering"),
      sb.from("activity_connections").select("*").eq("process_id", data.process_id).order("order_index"),
      sb.from("process_decisions").select("*"),
      sb.from("activity_links").select("*"),
    ]);
    if (pErr) throw new Error(pErr.message);
    const activityIds = new Set((activities ?? []).map((a) => a.id));
    return {
      process,
      activities: activities ?? [],
      connections: connections ?? [],
      decisions: (decisions ?? []).filter((d) => activityIds.has(d.activity_id)),
      links: (links ?? []).filter((l) => activityIds.has(l.activity_id)),
    };
  });

/* ---------- Activities ---------- */

const ActivityUpsert = z.object({
  id: z.string().uuid().optional(),
  process_id: z.string().uuid(),
  ordering: z.number().int().optional(),
  type: z.enum(ACTIVITY_TYPES).default("task"),
  title: z.string().min(1),
  description: z.string().optional(),
  responsible: z.string().optional(),
  area: z.string().optional(),
  systems: z.array(z.string()).optional(),
  documents: z.array(z.string()).optional(),
  time_minutes: z.number().optional(),
  inputs: z.string().optional(),
  outputs: z.string().optional(),
  problems: z.string().optional(),
  improvements: z.string().optional(),
  notes: z.string().optional(),
  interview_snippet: z.string().optional(),
  attachments: z.any().optional(),
});

export const saveFlowActivity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ActivityUpsert.parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    if (data.id) {
      const { id, ...rest } = data;
      const { data: row, error } = await sb.from("process_activities").update(rest).eq("id", id).select().single();
      if (error) throw new Error(error.message);
      return row;
    }
    // determine next ordering
    const { data: maxRow } = await sb
      .from("process_activities")
      .select("ordering")
      .eq("process_id", data.process_id)
      .order("ordering", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextOrder = (maxRow?.ordering ?? -1) + 1;
    const { data: row, error } = await sb
      .from("process_activities")
      .insert({ ...data, ordering: data.ordering ?? nextOrder })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteFlowActivity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("process_activities").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const reorderFlowActivities = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      items: z.array(z.object({ id: z.string().uuid(), ordering: z.number().int() })),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await Promise.all(
      data.items.map((it) =>
        context.supabase.from("process_activities").update({ ordering: it.ordering }).eq("id", it.id),
      ),
    );
    return { ok: true };
  });

/* ---------- Connections ---------- */

const ConnectionUpsert = z.object({
  id: z.string().uuid().optional(),
  process_id: z.string().uuid(),
  from_activity_id: z.string().uuid(),
  to_activity_id: z.string().uuid(),
  type: z.enum(CONNECTION_TYPES).default("sequential"),
  label: z.string().optional(),
  order_index: z.number().int().optional(),
});

export const saveConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ConnectionUpsert.parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    if (data.id) {
      const { id, ...rest } = data;
      const { data: row, error } = await sb.from("activity_connections").update(rest).eq("id", id).select().single();
      if (error) throw new Error(error.message);
      return row;
    }
    const { data: row, error } = await sb.from("activity_connections").insert(data).select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("activity_connections").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ---------- Decisions ---------- */

export const saveDecisionQuestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      activity_id: z.string().uuid(),
      question: z.string(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    const { data: existing } = await sb.from("process_decisions").select("id").eq("activity_id", data.activity_id).maybeSingle();
    if (existing) {
      const { data: row, error } = await sb
        .from("process_decisions").update({ question: data.question }).eq("id", existing.id).select().single();
      if (error) throw new Error(error.message);
      return row;
    }
    const { data: row, error } = await sb.from("process_decisions").insert(data).select().single();
    if (error) throw new Error(error.message);
    return row;
  });

/* ---------- Activity Links ---------- */

export const saveActivityLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      activity_id: z.string().uuid(),
      link_type: z.enum(["indicator", "cronoanalysis", "action_plan"]),
      target_id: z.string().uuid(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase.from("activity_links").insert(data).select().single();
    if (error && !error.message.includes("duplicate")) throw new Error(error.message);
    return row;
  });

export const deleteActivityLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("activity_links").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ---------- High-level composite helpers ---------- */

export const addActivityRelative = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      process_id: z.string().uuid(),
      relative_to: z.string().uuid(),
      mode: z.enum(["before", "after", "parallel"]),
      title: z.string().min(1).default("Nova atividade"),
      type: z.enum(ACTIVITY_TYPES).default("task"),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    const { data: ref } = await sb.from("process_activities").select("*").eq("id", data.relative_to).single();
    if (!ref) throw new Error("Atividade de referência não encontrada");

    // Insert new activity
    const insertOrdering = data.mode === "before" ? ref.ordering : ref.ordering + 1;
    // shift others when inserting before/after
    if (data.mode !== "parallel") {
      const { data: toShift } = await sb
        .from("process_activities")
        .select("id, ordering")
        .eq("process_id", data.process_id)
        .gte("ordering", insertOrdering);
      await Promise.all(
        (toShift ?? []).map((r) =>
          sb.from("process_activities").update({ ordering: r.ordering + 1 }).eq("id", r.id),
        ),
      );
    }
    const { data: newAct, error } = await sb
      .from("process_activities")
      .insert({
        process_id: data.process_id,
        title: data.title,
        type: data.type,
        ordering: data.mode === "parallel" ? ref.ordering : insertOrdering,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);

    // Wire connections
    if (data.mode === "after") {
      // ref -> new; move ref's outgoing to new
      const { data: outs } = await sb.from("activity_connections").select("*").eq("from_activity_id", ref.id);
      await Promise.all(
        (outs ?? []).map((o) =>
          sb.from("activity_connections").update({ from_activity_id: newAct.id }).eq("id", o.id),
        ),
      );
      await sb.from("activity_connections").insert({
        process_id: data.process_id,
        from_activity_id: ref.id,
        to_activity_id: newAct.id,
        type: "sequential",
      });
    } else if (data.mode === "before") {
      // new -> ref; move ref's incoming to new
      const { data: ins } = await sb.from("activity_connections").select("*").eq("to_activity_id", ref.id);
      await Promise.all(
        (ins ?? []).map((i) =>
          sb.from("activity_connections").update({ to_activity_id: newAct.id }).eq("id", i.id),
        ),
      );
      await sb.from("activity_connections").insert({
        process_id: data.process_id,
        from_activity_id: newAct.id,
        to_activity_id: ref.id,
        type: "sequential",
      });
    } else if (data.mode === "parallel") {
      // Duplicate ref's incoming to new; ref -> new as parallel
      const { data: ins } = await sb.from("activity_connections").select("*").eq("to_activity_id", ref.id);
      await Promise.all(
        (ins ?? []).map((i) =>
          sb.from("activity_connections").insert({
            process_id: data.process_id,
            from_activity_id: i.from_activity_id,
            to_activity_id: newAct.id,
            type: "parallel",
          }),
        ),
      );
    }
    return newAct;
  });

export const duplicateActivity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    const { data: ref } = await sb.from("process_activities").select("*").eq("id", data.id).single();
    if (!ref) throw new Error("Atividade não encontrada");
    const { id, created_at, updated_at, ...rest } = ref as any;
    const { data: row, error } = await sb
      .from("process_activities")
      .insert({ ...rest, title: `${rest.title} (cópia)`, ordering: rest.ordering + 1 })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });
