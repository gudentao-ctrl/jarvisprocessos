import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const PAYMENT_METHODS = [
  { value: "pix", label: "PIX" },
  { value: "transferencia", label: "Transferência" },
  { value: "boleto", label: "Boleto" },
  { value: "dinheiro", label: "Dinheiro" },
  { value: "cartao", label: "Cartão" },
  { value: "outros", label: "Outros" },
] as const;

export function methodLabel(v: string) {
  return PAYMENT_METHODS.find((m) => m.value === v)?.label ?? v;
}

const sum = (rows: any[] | null | undefined, key: string) =>
  (rows ?? []).reduce((s: number, r: any) => s + Number(r?.[key] ?? 0), 0);

export const getFinanceOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        company_id: z.string().uuid().optional(),
        project_id: z.string().uuid().optional(),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    const sb: any = context.supabase;

    let hq = sb
      .from("work_hours")
      .select(
        "*, projects(id, name), companies(id, name), work_hour_expenses(*), work_hour_tools(*)",
      )
      .order("work_date", { ascending: false });
    let iq = sb
      .from("invoices")
      .select("*, projects(id, name), companies(id, name)")
      .order("invoiced_at", { ascending: false });
    let pq = sb
      .from("payments")
      .select("*, projects(id, name), companies(id, name)")
      .order("paid_at", { ascending: false });

    if (data.company_id) {
      hq = hq.eq("company_id", data.company_id);
      iq = iq.eq("company_id", data.company_id);
      pq = pq.eq("company_id", data.company_id);
    }
    if (data.project_id) {
      hq = hq.eq("project_id", data.project_id);
      iq = iq.eq("project_id", data.project_id);
      pq = pq.eq("project_id", data.project_id);
    }

    const [{ data: hours, error: he }, { data: invoices, error: ie }, { data: payments, error: pe }] =
      await Promise.all([hq, iq, pq]);
    if (he) throw new Error(he.message);
    if (ie) throw new Error(ie.message);
    if (pe) throw new Error(pe.message);

    const rows = hours ?? [];
    const open = rows.filter((r: any) => r.billing_status !== "faturado");
    const billed = rows.filter((r: any) => r.billing_status === "faturado");

    const invoiced = sum(invoices, "total_amount");
    const paid = sum(payments, "amount");

    return {
      hours: rows,
      invoices: invoices ?? [],
      payments: payments ?? [],
      totals: {
        hoursOpen: sum(open, "hours"),
        hoursBilled: sum(billed, "hours"),
        invoiced,
        paid,
        balance: Math.round((invoiced - paid) * 100) / 100,
      },
    };
  });

export const createInvoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        company_id: z.string().uuid(),
        project_id: z.string().uuid().nullable().optional(),
        work_hour_ids: z.array(z.string().uuid()).min(1, "Selecione ao menos um lançamento"),
        hourly_rate: z.number().min(0),
        notes: z.string().max(1000).default(""),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const sb: any = context.supabase;

    const { data: rows, error } = await sb
      .from("work_hours")
      .select("*, work_hour_expenses(amount), work_hour_tools(amount)")
      .in("id", data.work_hour_ids);
    if (error) throw new Error(error.message);
    const selected = (rows ?? []).filter((r: any) => r.company_id === data.company_id);
    if (!selected.length) throw new Error("Nenhum lançamento válido selecionado.");
    if (selected.some((r: any) => r.billing_status === "faturado")) {
      throw new Error("Há lançamentos já faturados na seleção.");
    }

    const hoursTotal = sum(selected, "hours");
    const expensesAmount = selected.reduce(
      (s: number, r: any) => s + sum(r.work_hour_expenses, "amount"),
      0,
    );
    const toolsAmount = selected.reduce(
      (s: number, r: any) => s + sum(r.work_hour_tools, "amount"),
      0,
    );
    const hoursAmount = Math.round(hoursTotal * data.hourly_rate * 100) / 100;
    const total = Math.round((hoursAmount + expensesAmount + toolsAmount) * 100) / 100;

    const dates = selected.map((r: any) => r.work_date).sort();

    const { data: invoice, error: invErr } = await sb
      .from("invoices")
      .insert({
        company_id: data.company_id,
        project_id: data.project_id ?? selected[0].project_id ?? null,
        period_start: dates[0] ?? null,
        period_end: dates[dates.length - 1] ?? null,
        hourly_rate: data.hourly_rate,
        hours_total: hoursTotal,
        hours_amount: hoursAmount,
        expenses_amount: expensesAmount,
        tools_amount: toolsAmount,
        total_amount: total,
        notes: data.notes,
        invoiced_by: context.userId,
      })
      .select()
      .single();
    if (invErr) throw new Error(invErr.message);

    const items = selected.map((r: any) => ({
      invoice_id: invoice.id,
      company_id: data.company_id,
      work_hour_id: r.id,
      description: `${r.work_date} · ${r.responsible ?? ""} · ${r.description ?? ""}`.trim(),
      hours: Number(r.hours ?? 0),
      hours_amount: Math.round(Number(r.hours ?? 0) * data.hourly_rate * 100) / 100,
      expenses_amount: sum(r.work_hour_expenses, "amount"),
      tools_amount: sum(r.work_hour_tools, "amount"),
    }));
    const { error: itemErr } = await sb.from("invoice_items").insert(items);
    if (itemErr) throw new Error(itemErr.message);

    const { error: upErr } = await sb
      .from("work_hours")
      .update({
        billing_status: "faturado",
        invoice_id: invoice.id,
        invoiced_at: new Date().toISOString(),
        invoiced_by: context.userId,
      })
      .in(
        "id",
        selected.map((r: any) => r.id),
      );
    if (upErr) throw new Error(upErr.message);

    await sb.from("audit_log").insert({
      actor_id: context.userId,
      action: "invoice_create",
      entity: "invoices",
      entity_id: invoice.id,
      company_id: data.company_id,
      details: { total, hours: hoursTotal, count: selected.length },
    });

    return invoice;
  });

export const getInvoiceDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb: any = context.supabase;
    const { data: invoice, error } = await sb
      .from("invoices")
      .select("*, projects(id, name), companies(id, name)")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    const { data: items } = await sb
      .from("invoice_items")
      .select("*")
      .eq("invoice_id", data.id)
      .order("created_at");
    return { invoice, items: items ?? [] };
  });

export const savePayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        company_id: z.string().uuid(),
        project_id: z.string().uuid().nullable().optional(),
        invoice_id: z.string().uuid().nullable().optional(),
        paid_at: z.string(),
        amount: z.number().positive("Informe o valor"),
        method: z.string().min(1),
        reference: z.string().max(200).default(""),
        notes: z.string().max(1000).default(""),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const sb: any = context.supabase;
    const { id, ...rest } = data;
    const payload = {
      ...rest,
      project_id: rest.project_id ?? null,
      invoice_id: rest.invoice_id ?? null,
    };
    const q = id
      ? sb.from("payments").update(payload).eq("id", id).select().single()
      : sb
          .from("payments")
          .insert({ ...payload, created_by: context.userId })
          .select()
          .single();
    const { data: row, error } = await q;
    if (error) throw new Error(error.message);

    await sb.from("audit_log").insert({
      actor_id: context.userId,
      action: id ? "payment_update" : "payment_create",
      entity: "payments",
      entity_id: row.id,
      company_id: data.company_id,
      details: { amount: data.amount, method: data.method },
    });
    return row;
  });

export const deletePayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb: any = context.supabase;
    const { data: current } = await sb
      .from("payments")
      .select("company_id")
      .eq("id", data.id)
      .maybeSingle();
    const { error } = await sb.from("payments").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await sb.from("audit_log").insert({
      actor_id: context.userId,
      action: "payment_delete",
      entity: "payments",
      entity_id: data.id,
      company_id: current?.company_id ?? null,
      details: {},
    });
    return { ok: true };
  });
