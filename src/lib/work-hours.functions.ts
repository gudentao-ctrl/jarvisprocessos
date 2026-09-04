import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const ACTIVITY_TYPES = [
  { value: "consultoria", label: "Consultoria" },
  { value: "reuniao", label: "Reunião" },
  { value: "mapeamento", label: "Mapeamento" },
  { value: "treinamento", label: "Treinamento" },
  { value: "deslocamento", label: "Deslocamento" },
  { value: "ferramenta", label: "Ferramenta" },
  { value: "execucao", label: "Execução" },
  { value: "outro", label: "Outros" },
] as const;

const TimeStr = z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/);

const WorkHoursInput = z.object({
  id: z.string().uuid().optional(),
  project_id: z.string().uuid(),
  company_id: z.string().uuid(),
  responsible: z.string().min(1),
  activity_type: z.string().min(1),
  work_date: z.string(),
  start_time: TimeStr.nullable().optional(),
  end_time: TimeStr.nullable().optional(),
  hours: z.number().positive(),
  description: z.string().trim().min(1, "Descreva o atendimento").max(1000),
  notes: z.string().max(1000).optional().default(""),
  expense: z
    .object({ description: z.string().trim().max(300), amount: z.number().min(0) })
    .nullable()
    .optional(),
  tool: z
    .object({
      description: z.string().trim().max(300),
      quantity: z.number().min(0),
      amount: z.number().min(0),
    })
    .nullable()
    .optional(),
});

export function hoursBetween(start: string, end: string): number {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  let mins = eh * 60 + em - (sh * 60 + sm);
  if (mins < 0) mins += 24 * 60; // atravessa a meia-noite
  return Math.round((mins / 60) * 100) / 100;
}

export const listWorkHours = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      project_id: z.string().uuid().optional(),
      company_id: z.string().uuid().optional(),
    }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    let q = (context.supabase as any)
      .from("work_hours")
      .select(
        "*, projects(id, name), companies(id, name), work_hour_expenses(*), work_hour_tools(*)",
      )
      .order("work_date", { ascending: false });
    if (data.project_id) q = q.eq("project_id", data.project_id);
    if (data.company_id) q = q.eq("company_id", data.company_id);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const saveWorkHours = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => WorkHoursInput.parse(d))
  .handler(async ({ data, context }) => {
    const sb: any = context.supabase;
    const { id, expense, tool, ...rest } = data;
    const hours =
      rest.start_time && rest.end_time ? hoursBetween(rest.start_time, rest.end_time) : rest.hours;
    const payload = { ...rest, hours };

    let row: any;
    if (id) {
      const { data: current, error: curErr } = await sb
        .from("work_hours").select("billing_status").eq("id", id).maybeSingle();
      if (curErr) throw new Error(curErr.message);
      if (current?.billing_status === "faturado") {
        throw new Error("Lançamento já faturado não pode ser alterado.");
      }
      const { data: updated, error } = await sb
        .from("work_hours").update(payload).eq("id", id).select().single();
      if (error) throw new Error(error.message);
      row = updated;
      await sb.from("work_hour_expenses").delete().eq("work_hour_id", id);
      await sb.from("work_hour_tools").delete().eq("work_hour_id", id);
    } else {
      const { data: inserted, error } = await sb
        .from("work_hours")
        .insert({ ...payload, created_by: context.userId, user_id: context.userId })
        .select()
        .single();
      if (error) throw new Error(error.message);
      row = inserted;
    }

    if (expense && expense.amount > 0) {
      const { error } = await sb.from("work_hour_expenses").insert({
        work_hour_id: row.id,
        company_id: row.company_id,
        project_id: row.project_id,
        description: expense.description,
        amount: expense.amount,
        created_by: context.userId,
      });
      if (error) throw new Error(error.message);
    }
    if (tool && (tool.amount > 0 || tool.description)) {
      const { error } = await sb.from("work_hour_tools").insert({
        work_hour_id: row.id,
        company_id: row.company_id,
        project_id: row.project_id,
        description: tool.description,
        quantity: tool.quantity,
        amount: tool.amount,
        created_by: context.userId,
      });
      if (error) throw new Error(error.message);
    }

    await sb.from("audit_log").insert({
      actor_id: context.userId,
      action: id ? "work_hours_update" : "work_hours_create",
      entity: "work_hours",
      entity_id: row.id,
      company_id: row.company_id,
      details: { hours, work_date: row.work_date },
    });

    return row;
  });

export const deleteWorkHours = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb: any = context.supabase;
    const { data: current } = await sb
      .from("work_hours").select("billing_status, company_id").eq("id", data.id).maybeSingle();
    if (current?.billing_status === "faturado") {
      throw new Error("Lançamento já faturado não pode ser excluído.");
    }
    const { error } = await sb.from("work_hours").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await sb.from("audit_log").insert({
      actor_id: context.userId,
      action: "work_hours_delete",
      entity: "work_hours",
      entity_id: data.id,
      company_id: current?.company_id ?? null,
      details: {},
    });
    return { ok: true };
  });

export const getProjectHoursTotal = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ project_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await (context.supabase as any)
      .from("work_hours")
      .select("hours, responsible, activity_type")
      .eq("project_id", data.project_id);
    if (error) throw new Error(error.message);
    const total = (rows ?? []).reduce((s: number, r: any) => s + Number(r.hours ?? 0), 0);
    const byResp: Record<string, number> = {};
    const byType: Record<string, number> = {};
    for (const r of rows ?? []) {
      const respKey = r.responsible ?? "—";
      const typeKey = r.activity_type ?? "outro";
      byResp[respKey] = (byResp[respKey] ?? 0) + Number(r.hours ?? 0);
      byType[typeKey] = (byType[typeKey] ?? 0) + Number(r.hours ?? 0);
    }
    return { total, byResp, byType, count: rows?.length ?? 0 };
  });
