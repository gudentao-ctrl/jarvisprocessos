import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const WorkHoursInput = z.object({
  id: z.string().uuid().optional(),
  project_id: z.string().uuid().nullable().optional(),
  company_id: z.string().uuid().nullable().optional(),
  responsible: z.string().min(1),
  activity_type: z.enum(["consultoria", "execucao", "reuniao", "outro"]).default("consultoria"),
  work_date: z.string(),
  hours: z.number().positive(),
  notes: z.string().optional().default(""),
});

export const listWorkHours = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      project_id: z.string().uuid().optional(),
      company_id: z.string().uuid().optional(),
    }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("work_hours")
      .select("*, projects(id, name), companies(id, name)")
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
    if (data.id) {
      const { id, ...rest } = data;
      const { data: row, error } = await context.supabase
        .from("work_hours").update(rest).eq("id", id).select().single();
      if (error) throw new Error(error.message);
      return row;
    }
    const { data: row, error } = await context.supabase
      .from("work_hours").insert({ ...data, created_by: context.userId }).select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteWorkHours = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("work_hours").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getProjectHoursTotal = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ project_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("work_hours").select("hours, responsible, activity_type").eq("project_id", data.project_id);
    if (error) throw new Error(error.message);
    const total = (rows ?? []).reduce((s, r) => s + Number(r.hours ?? 0), 0);
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
