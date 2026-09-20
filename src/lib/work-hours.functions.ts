import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const ACTIVITY_TYPES = [
  { value: "mentoria", label: "Mentoria" },
  { value: "consultoria", label: "Consultoria" },
  { value: "palestra", label: "Palestra" },
  { value: "reuniao", label: "Reunião" },
  { value: "treinamento", label: "Treinamento" },
  { value: "prospeccao", label: "Prospecção" },
  { value: "outros", label: "Outros" },
] as const;

export const EXPENSE_CATEGORIES = [
  { key: "alimentacao", label: "Alimentação" },
  { key: "pedagio", label: "Pedágio" },
  { key: "deslocamento", label: "Deslocamento" },
  { key: "estacionamento", label: "Estacionamento" },
  { key: "hospedagem", label: "Hospedagem" },
] as const;

const TimeStr = z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/);

const ExpenseItem = z.object({
  category: z.string().default("deslocamento"),
  description: z.string().trim().max(300).optional().default(""),
  amount: z.number().min(0),
});

const WorkHoursInput = z.object({
  id: z.string().uuid().optional(),
  project_id: z.string().uuid().nullable().optional(),
  company_id: z.string().uuid(),
  responsible: z.string().min(1),
  activity_type: z.string().min(1),
  is_remunerated: z.boolean().optional().default(true),
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
  expenses: z.array(ExpenseItem).optional().default([]),
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
      activity_type: z.string().optional(),
      from: z.string().optional(),
      to: z.string().optional(),
      mine: z.boolean().optional().default(true),
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
    if (data.activity_type) q = q.eq("activity_type", data.activity_type);
    if (data.from) q = q.gte("work_date", data.from);
    if (data.to) q = q.lte("work_date", data.to);
    if (data.mine !== false) {
      q = q.or(`user_id.eq.${context.userId},created_by.eq.${context.userId}`);
    }
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const saveWorkHours = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => WorkHoursInput.parse(d))
  .handler(async ({ data, context }) => {
    const sb: any = context.supabase;
    const { id, expense, expenses, tool, ...rest } = data;

    // Trava de 48h: apenas gestor (ou SuperAdmin) lança em qualquer data
    const [{ data: prof }, { data: memberships }] = await Promise.all([
      sb.from("profiles").select("is_superadmin").eq("user_id", context.userId).maybeSingle(),
      sb.from("company_members").select("member_role").eq("user_id", context.userId),
    ]);
    const isSuperadmin = !!prof?.is_superadmin;
    const isManager =
      isSuperadmin ||
      (memberships ?? []).some((m: any) => m.member_role === "gestor");
    if (!isManager) {
      const today = new Date();
      const limit = new Date(today.getTime() - 48 * 60 * 60 * 1000);
      const workDate = new Date(`${rest.work_date}T12:00:00`);
      if (workDate.getTime() > today.getTime() + 24 * 60 * 60 * 1000) {
        throw new Error("Não é possível lançar horas em data futura.");
      }
      if (workDate.getTime() < limit.getTime()) {
        throw new Error(
          "Prazo encerrado: lançamentos só podem ser feitos até 48 horas após o atendimento. Solicite ao gestor.",
        );
      }
    }

    const hours =
      rest.start_time && rest.end_time ? hoursBetween(rest.start_time, rest.end_time) : rest.hours;
    const payload = { ...rest, hours };

    let row: any;
    if (id) {
      const { data: current, error: curErr } = await sb
        .from("work_hours").select("billing_status").eq("id", id).maybeSingle();
      if (curErr) throw new Error(curErr.message);
      if (current?.billing_status === "faturado" && !isSuperadmin) {
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

    // Coletar todas as despesas (suporta formato categorizado e formato legado)
    const allExpenses: Array<{ category?: string; description: string; amount: number }> = [];
    if (Array.isArray(expenses) && expenses.length > 0) {
      for (const e of expenses) {
        if (e.amount > 0 || (e.description && e.description.trim())) {
          allExpenses.push(e);
        }
      }
    } else if (expense && expense.amount > 0) {
      allExpenses.push({ category: "deslocamento", description: expense.description, amount: expense.amount });
    }

    if (allExpenses.length > 0) {
      const inserts = allExpenses.map((exp) => ({
        work_hour_id: row.id,
        company_id: row.company_id,
        project_id: row.project_id,
        category: exp.category || "deslocamento",
        description: exp.description || exp.category || "Despesa",
        amount: exp.amount,
        created_by: context.userId,
      }));
      const { error } = await sb.from("work_hour_expenses").insert(inserts);
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
    const [{ data: current }, { data: profile }] = await Promise.all([
      sb
        .from("work_hours")
        .select("billing_status, company_id")
        .eq("id", data.id)
        .maybeSingle(),
      sb.from("profiles").select("is_superadmin").eq("user_id", context.userId).maybeSingle(),
    ]);
    if (current?.billing_status === "faturado" && !profile?.is_superadmin) {
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
      const typeKey = r.activity_type ?? "outros";
      byResp[respKey] = (byResp[respKey] ?? 0) + Number(r.hours ?? 0);
      byType[typeKey] = (byType[typeKey] ?? 0) + Number(r.hours ?? 0);
    }
    return { total, byResp, byType, count: rows?.length ?? 0 };
  });
