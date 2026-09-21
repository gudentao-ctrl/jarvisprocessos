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

    const rawRows = hours ?? [];
    const rows = rawRows.map((r: any) => {
      const isRemun =
        r.is_remunerated !== undefined && r.is_remunerated !== null
          ? r.is_remunerated
          : !r.notes?.includes("[NAO_REMUNERADA]");

      let isAdjusted = !!r.adjusted_by_manager;
      let managerNote = r.manager_note || "";
      if (!isAdjusted && r.notes?.includes("[AJUSTADO_GESTAO:")) {
        const match = r.notes.match(/\[AJUSTADO_GESTAO:\s*([^\]]+)\]/);
        if (match) {
          isAdjusted = true;
          managerNote = match[1];
        }
      }

      const exps = (r.work_hour_expenses ?? []).map((e: any) => {
        let cat = e.category;
        let desc = e.description || "";
        if (!cat) {
          const match = desc.match(/^\[([a-z_]+)\]\s*(.*)$/i);
          if (match) {
            cat = match[1].toLowerCase();
            desc = match[2];
          } else {
            cat = "deslocamento";
          }
        } else {
          desc = desc.replace(/^\[[a-z_]+\]\s*/i, "");
        }
        return { ...e, category: cat, description: desc };
      });

      return {
        ...r,
        is_remunerated: isRemun,
        adjusted_by_manager: isAdjusted,
        manager_note: managerNote,
        work_hour_expenses: exps,
      };
    });

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

export const deleteInvoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb: any = context.supabase;
    const { data: profile, error: profileError } = await sb
      .from("profiles")
      .select("is_superadmin")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (profileError) throw new Error(profileError.message);
    if (!profile?.is_superadmin) throw new Error("Acesso restrito ao SuperAdmin");

    const { error } = await sb.rpc("superadmin_delete_invoice", { _invoice_id: data.id });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ============================================================
 * RELATÓRIO DE FATURAMENTO POR CLIENTE
 * ============================================================ */

export const getBilledReport = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        company_id: z.string().uuid(),
        from: z.string().optional(),
        to: z.string().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const sb: any = context.supabase;

    const { data: company } = await sb
      .from("companies")
      .select(
        "id, name, public_title, public_company_logo_url, public_consultancy_logo_url",
      )
      .eq("id", data.company_id)
      .maybeSingle();

    async function logoDataUrl(value: string | null | undefined): Promise<string | null> {
      if (!value) return null;
      try {
        let url = value;
        if (!/^https?:\/\//i.test(value)) {
          const { data: signed } = await sb.storage
            .from("portal-logos")
            .createSignedUrl(value, 60 * 10);
          if (!signed?.signedUrl) return null;
          url = signed.signedUrl;
        }
        const res = await fetch(url);
        if (!res.ok) return null;
        const buf = new Uint8Array(await res.arrayBuffer());
        let bin = "";
        for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
        const type = res.headers.get("content-type") || "image/png";
        return `data:${type};base64,${btoa(bin)}`;
      } catch {
        return null;
      }
    }

    const [companyLogo, consultancyLogo] = await Promise.all([
      logoDataUrl(company?.public_company_logo_url),
      logoDataUrl(company?.public_consultancy_logo_url),
    ]);

    let q = sb
      .from("work_hours")
      .select(
        "id, work_date, responsible, activity_type, description, hours, invoice_id, invoices(hourly_rate), work_hour_expenses(category, description, amount), work_hour_tools(description, quantity, amount)",
      )
      .eq("company_id", data.company_id)
      .eq("billing_status", "faturado")
      .order("work_date", { ascending: true });
    if (data.from) q = q.gte("work_date", data.from);
    if (data.to) q = q.lte("work_date", data.to);

    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    let iq = sb
      .from("invoices")
      .select("*")
      .eq("company_id", data.company_id)
      .order("invoiced_at", { ascending: true });
    if (data.from) iq = iq.gte("period_start", data.from);
    if (data.to) iq = iq.lte("period_end", data.to);
    const { data: invoices } = await iq;

    // Pagamentos do cliente no período
    let pq = sb
      .from("payments")
      .select("id, paid_at, amount, method, reference, notes")
      .eq("company_id", data.company_id)
      .order("paid_at", { ascending: true });
    if (data.from) pq = pq.gte("paid_at", data.from);
    if (data.to) pq = pq.lte("paid_at", data.to);
    const { data: payments } = await pq;

    // Histórico de saldo anterior (antes de data.from)
    let previousInvoiced = 0;
    let previousPaid = 0;
    let previousHours = 0;
    if (data.from) {
      const [{ data: prevInv }, { data: prevPay }] = await Promise.all([
        sb
          .from("invoices")
          .select("total_amount, hours_total")
          .eq("company_id", data.company_id)
          .lt("period_end", data.from),
        sb
          .from("payments")
          .select("amount")
          .eq("company_id", data.company_id)
          .lt("paid_at", data.from),
      ]);
      previousInvoiced = (prevInv ?? []).reduce(
        (acc: number, cur: any) => acc + Number(cur.total_amount ?? 0),
        0,
      );
      previousHours = (prevInv ?? []).reduce(
        (acc: number, cur: any) => acc + Number(cur.hours_total ?? 0),
        0,
      );
      previousPaid = (prevPay ?? []).reduce(
        (acc: number, cur: any) => acc + Number(cur.amount ?? 0),
        0,
      );
    }
    const previousBalance = Math.round((previousInvoiced - previousPaid) * 100) / 100;

    return {
      company: company
        ? {
            id: company.id,
            name: company.name,
            title: company.public_title || company.name,
            company_logo: companyLogo,
            consultancy_logo: consultancyLogo,
          }
        : null,
      period: { from: data.from ?? null, to: data.to ?? null },
      rows: rows ?? [],
      invoices: invoices ?? [],
      payments: payments ?? [],
      previousBalance,
      previousInvoiced,
      previousPaid,
      previousHours,
    };
  });
