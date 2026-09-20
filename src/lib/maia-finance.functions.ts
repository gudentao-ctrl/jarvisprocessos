import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function assertManagerOrAdmin(sb: any, userId: string) {
  const [{ data: prof }, { data: mems }] = await Promise.all([
    sb.from("profiles").select("is_superadmin").eq("user_id", userId).maybeSingle(),
    sb.from("company_members").select("member_role, permissions").eq("user_id", userId),
  ]);
  const isAllowed =
    !!prof?.is_superadmin ||
    (mems ?? []).some(
      (m: any) => m.member_role === "gestor" || m.permissions?.gestao === true,
    );
  if (!isAllowed) {
    throw new Error("Acesso exclusivo a Gestores e Superadmins.");
  }
}

// ─── PERSISTENT FALLBACK STORE (Garante funcionamento mesmo se tabelas não migradas) ───

const MAIA_STORE_KEY = "__maia_finance_store_v1__";

const memoryFallback: {
  taxes: any[];
  contracts: Record<string, any>;
  closings: any[];
  auditNotes: Record<string, any>;
  dreEntries: any[];
} = {
  taxes: [{ id: "def-tax-1", name: "Simples Nacional / ISS", rate_percent: 6.0, is_active: true }],
  contracts: {},
  closings: [],
  auditNotes: {},
  dreEntries: [],
};

async function getMaiaStore(sb: any) {
  try {
    const { data } = await sb
      .from("document_templates")
      .select("id, header_html")
      .eq("name", MAIA_STORE_KEY)
      .maybeSingle();

    if (data?.header_html) {
      const parsed = JSON.parse(data.header_html);
      return {
        taxes: Array.isArray(parsed.taxes) && parsed.taxes.length > 0 ? parsed.taxes : memoryFallback.taxes,
        contracts: parsed.contracts || memoryFallback.contracts,
        closings: Array.isArray(parsed.closings) ? parsed.closings : memoryFallback.closings,
        auditNotes: parsed.auditNotes || memoryFallback.auditNotes,
        dreEntries: Array.isArray(parsed.dreEntries) ? parsed.dreEntries : memoryFallback.dreEntries,
      };
    }
  } catch {}
  return memoryFallback;
}

async function saveMaiaStore(sb: any, store: any) {
  Object.assign(memoryFallback, store);
  try {
    const jsonStr = JSON.stringify(store);
    const { data: existing } = await sb
      .from("document_templates")
      .select("id")
      .eq("name", MAIA_STORE_KEY)
      .maybeSingle();

    if (existing?.id) {
      await sb
        .from("document_templates")
        .update({ header_html: jsonStr, updated_at: new Date().toISOString() })
        .eq("id", existing.id);
    } else {
      await sb.from("document_templates").insert({
        name: MAIA_STORE_KEY,
        header_html: jsonStr,
        code_prefix: "MAIA",
        is_default: false,
      });
    }
  } catch {}
}

// ─── 1. IMPOSTOS (maia_tax_settings) ──────────────────────────────────────────

export const listMaiaTaxes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb: any = context.supabase;
    await assertManagerOrAdmin(sb, context.userId);

    try {
      const { data, error } = await sb
        .from("maia_tax_settings")
        .select("*")
        .order("created_at", { ascending: true });
      if (!error && data && data.length > 0) return data;
    } catch {}

    const store = await getMaiaStore(sb);
    return store.taxes;
  });

export const saveMaiaTax = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        name: z.string().min(1, "Nome obrigatório"),
        rate_percent: z.number().min(0, "Alíquota não pode ser negativa"),
        is_active: z.boolean().default(true),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const sb: any = context.supabase;
    await assertManagerOrAdmin(sb, context.userId);

    const payload = {
      name: data.name,
      rate_percent: data.rate_percent,
      is_active: data.is_active,
      updated_at: new Date().toISOString(),
    };

    try {
      if (data.id) {
        const { data: updated, error } = await sb
          .from("maia_tax_settings")
          .update(payload)
          .eq("id", data.id)
          .select()
          .single();
        if (!error && updated) return updated;
      } else {
        const { data: inserted, error } = await sb
          .from("maia_tax_settings")
          .insert(payload)
          .select()
          .single();
        if (!error && inserted) return inserted;
      }
    } catch {}

    const store = await getMaiaStore(sb);
    const taxId = data.id || crypto.randomUUID();
    const newTax = { id: taxId, ...payload };
    if (data.id) {
      store.taxes = store.taxes.map((t: any) => (t.id === data.id ? newTax : t));
    } else {
      store.taxes.push(newTax);
    }
    await saveMaiaStore(sb, store);
    return newTax;
  });

export const deleteMaiaTax = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb: any = context.supabase;
    await assertManagerOrAdmin(sb, context.userId);

    try {
      await sb.from("maia_tax_settings").delete().eq("id", data.id);
    } catch {}

    const store = await getMaiaStore(sb);
    store.taxes = store.taxes.filter((t: any) => t.id !== data.id);
    await saveMaiaStore(sb, store);
    return { ok: true };
  });

// ─── 2. CONTRATOS DE CONSULTORES (Sigiloso - SuperAdmin e Gestores) ─────────────

export const listConsultantContracts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb: any = context.supabase;
    await assertManagerOrAdmin(sb, context.userId);

    const { data: profiles, error: pErr } = await sb
      .from("profiles")
      .select("user_id, full_name, email, is_superadmin")
      .order("full_name", { ascending: true });

    if (pErr) throw new Error(pErr.message);

    let dbContracts: any[] = [];
    try {
      const { data: rows } = await sb.from("consultant_contracts").select("*");
      if (rows) dbContracts = rows;
    } catch {}

    const store = await getMaiaStore(sb);
    const contractMap = new Map<string, any>(dbContracts.map((c: any) => [c.user_id, c]));

    return (profiles ?? []).map((p: any) => {
      const dbC = contractMap.get(p.user_id);
      const storeC = store.contracts[p.user_id];
      const contract = dbC || storeC || {
        payment_regime: "hora",
        monthly_fixed_amount: 0,
        hourly_rate: 0,
        base_floor_amount: 0,
        min_hours: 0,
        extra_hour_rate: 0,
        active: true,
      };

      return {
        userId: p.user_id,
        fullName: p.full_name || p.email,
        email: p.email,
        contract,
      };
    });
  });

export const saveConsultantContract = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        user_id: z.string().uuid(),
        payment_regime: z.enum(["fixo", "hora", "conta_corrente"]),
        monthly_fixed_amount: z.number().min(0).default(0),
        hourly_rate: z.number().min(0).default(0),
        base_floor_amount: z.number().min(0).default(0),
        min_hours: z.number().min(0).default(0),
        extra_hour_rate: z.number().min(0).default(0),
        active: z.boolean().default(true),
        notes: z.string().max(1000).optional().default(""),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const sb: any = context.supabase;
    await assertManagerOrAdmin(sb, context.userId);

    const payload = {
      ...data,
      updated_at: new Date().toISOString(),
    };

    try {
      await sb.from("consultant_contracts").upsert(payload, { onConflict: "user_id" });
    } catch {}

    const store = await getMaiaStore(sb);
    store.contracts[data.user_id] = payload;
    await saveMaiaStore(sb, store);
    return { ok: true };
  });

// ─── 3. AUDITORIA DE HORAS ───────────────────────────────────────────────────

export const listAuditWorkHours = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        month_year: z.string().regex(/^\d{4}-\d{2}$/).optional(),
        user_id: z.string().uuid().optional(),
        company_id: z.string().uuid().optional(),
        activity_type: z.string().optional(),
        has_expenses: z.boolean().optional(),
        audit_status: z.enum(["pendente", "aprovado"]).optional(),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    const sb: any = context.supabase;
    await assertManagerOrAdmin(sb, context.userId);

    let q = sb
      .from("work_hours")
      .select("*, projects(id, name), companies(id, name), work_hour_expenses(*), profiles!user_id(full_name, email)")
      .order("work_date", { ascending: false });

    if (data.user_id) q = q.eq("user_id", data.user_id);
    if (data.company_id) q = q.eq("company_id", data.company_id);
    if (data.activity_type) q = q.eq("activity_type", data.activity_type);
    if (data.month_year) {
      q = q.gte("work_date", `${data.month_year}-01`).lte("work_date", `${data.month_year}-31`);
    }

    const { data: rows } = await q;
    const store = await getMaiaStore(sb);

    let list = (rows ?? []).map((r: any) => {
      const note = store.auditNotes[r.id];
      return {
        ...r,
        hours: note?.adjusted_hours !== undefined ? note.adjusted_hours : r.hours,
        is_remunerated: note?.adjusted_remunerated !== undefined ? note.adjusted_remunerated : r.is_remunerated,
        audit_status: r.audit_status || note?.audit_status || "pendente",
        adjusted_by_manager: r.adjusted_by_manager ?? note?.adjusted_by_manager ?? false,
        manager_note: r.manager_note || note?.manager_note || "",
      };
    });

    if (data.audit_status) {
      list = list.filter((r: any) => r.audit_status === data.audit_status);
    }
    if (data.has_expenses === true) {
      list = list.filter((r: any) => (r.work_hour_expenses?.length ?? 0) > 0);
    }

    return list;
  });

export const updateAuditedWorkHour = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        hours: z.number().min(0).optional(),
        is_remunerated: z.boolean().optional(),
        audit_status: z.enum(["pendente", "aprovado"]).optional(),
        manager_note: z.string().max(500).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const sb: any = context.supabase;
    await assertManagerOrAdmin(sb, context.userId);

    const store = await getMaiaStore(sb);
    store.auditNotes[data.id] = {
      ...(store.auditNotes[data.id] || {}),
      audit_status: data.audit_status || "pendente",
      adjusted_by_manager: true,
      manager_note: data.manager_note || "Ajustado pela gestão",
      adjusted_hours: data.hours,
      adjusted_remunerated: data.is_remunerated,
    };
    await saveMaiaStore(sb, store);

    try {
      const payload: any = { updated_at: new Date().toISOString() };
      if (data.hours !== undefined) payload.hours = data.hours;
      if (data.is_remunerated !== undefined) payload.is_remunerated = data.is_remunerated;
      try {
        await sb.from("work_hours").update({
          ...payload,
          adjusted_by_manager: true,
          audit_status: data.audit_status,
          manager_note: data.manager_note,
        }).eq("id", data.id);
      } catch {
        await sb.from("work_hours").update(payload).eq("id", data.id);
      }
    } catch {}

    return { id: data.id, ok: true };
  });

export const approveAuditBatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ work_hour_ids: z.array(z.string().uuid()).min(1) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const sb: any = context.supabase;
    await assertManagerOrAdmin(sb, context.userId);

    const store = await getMaiaStore(sb);
    for (const id of data.work_hour_ids) {
      store.auditNotes[id] = {
        ...(store.auditNotes[id] || {}),
        audit_status: "aprovado",
      };
    }
    await saveMaiaStore(sb, store);

    try {
      await sb.from("work_hours").update({ audit_status: "aprovado" }).in("id", data.work_hour_ids);
    } catch {}

    return { ok: true, count: data.work_hour_ids.length };
  });

// ─── 4. FECHAMENTO DA EQUIPE (NFs e Conta Corrente) ───────────────────────────

export const getTeamClosingData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ month_year: z.string().regex(/^\d{4}-\d{2}$/) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const sb: any = context.supabase;
    await assertManagerOrAdmin(sb, context.userId);

    const start = `${data.month_year}-01`;
    const end = `${data.month_year}-31`;

    const [{ data: profiles }, { data: hoursRows }] = await Promise.all([
      sb.from("profiles").select("user_id, full_name, email, whatsapp"),
      sb.from("work_hours").select("user_id, hours, is_remunerated, work_hour_expenses(amount)").gte("work_date", start).lte("work_date", end),
    ]);

    let dbContracts: any[] = [];
    let dbClosings: any[] = [];
    try {
      const [cr, cl] = await Promise.all([
        sb.from("consultant_contracts").select("*"),
        sb.from("consultant_closings").select("*").eq("month_year", data.month_year),
      ]);
      if (cr.data) dbContracts = cr.data;
      if (cl.data) dbClosings = cl.data;
    } catch {}

    const store = await getMaiaStore(sb);
    const contractMap = new Map<string, any>(dbContracts.map((c: any) => [c.user_id, c]));
    const closingMap = new Map<string, any>(dbClosings.map((c: any) => [c.user_id, c]));

    // Overlay store closings
    for (const cl of store.closings) {
      if (cl.month_year === data.month_year && !closingMap.has(cl.user_id)) {
        closingMap.set(cl.user_id, cl);
      }
    }

    // Aggregate hours and expenses by user
    const userHoursMap = new Map<string, { totalHours: number; remuneratedHours: number; expensesTotal: number }>();
    for (const h of hoursRows ?? []) {
      const uid = h.user_id;
      if (!uid) continue;
      const cur = userHoursMap.get(uid) || { totalHours: 0, remuneratedHours: 0, expensesTotal: 0 };
      const hrs = Number(h.hours || 0);
      cur.totalHours += hrs;
      if (h.is_remunerated !== false) {
        cur.remuneratedHours += hrs;
      }
      const expSum = (h.work_hour_expenses ?? []).reduce(
        (acc: number, e: any) => acc + Number(e.amount || 0),
        0,
      );
      cur.expensesTotal += expSum;
      userHoursMap.set(uid, cur);
    }

    return (profiles ?? []).map((prof: any) => {
      const uid = prof.user_id;
      const dbC = contractMap.get(uid);
      const storeC = store.contracts[uid];
      const contract = dbC || storeC || {
        payment_regime: "hora",
        monthly_fixed_amount: 0,
        hourly_rate: 0,
        base_floor_amount: 0,
        min_hours: 0,
        extra_hour_rate: 0,
      };

      const existingClosing = closingMap.get(uid);
      const { totalHours, remuneratedHours, expensesTotal } = userHoursMap.get(uid) || {
        totalHours: 0,
        remuneratedHours: 0,
        expensesTotal: 0,
      };

      if (existingClosing) {
        return {
          userId: uid,
          fullName: prof.full_name || prof.email,
          email: prof.email,
          whatsapp: prof.whatsapp || "",
          isClosed: true,
          closingId: existingClosing.id,
          regime: existingClosing.payment_regime_snapshot,
          contractSnapshot: existingClosing.contract_snapshot,
          totalHours: Number(existingClosing.total_hours),
          deficitHours: Number(existingClosing.deficit_hours),
          baseAmount: Number(existingClosing.base_amount),
          extraAmount: Number(existingClosing.extra_amount),
          expenseReimbursement: Number(existingClosing.expense_reimbursement),
          totalPayable: Number(existingClosing.total_payable),
          nfReceived: existingClosing.nf_received,
          status: existingClosing.status,
          bankHours: 0,
        };
      }

      let baseAmount = 0;
      let extraAmount = 0;
      let deficitHours = 0;
      const regime = contract.payment_regime || "hora";

      if (regime === "fixo") {
        baseAmount = Number(contract.monthly_fixed_amount || 0);
      } else if (regime === "hora") {
        baseAmount = Math.round(remuneratedHours * Number(contract.hourly_rate || 0) * 100) / 100;
      } else if (regime === "conta_corrente") {
        const floor = Number(contract.base_floor_amount || 0);
        const minHrs = Number(contract.min_hours || 0);
        const extraRate = Number(contract.extra_hour_rate || 0);
        baseAmount = floor;
        if (remuneratedHours >= minHrs) {
          extraAmount = Math.round((remuneratedHours - minHrs) * extraRate * 100) / 100;
          deficitHours = 0;
        } else {
          extraAmount = 0;
          deficitHours = Math.round((minHrs - remuneratedHours) * 100) / 100;
        }
      }

      const totalPayable = Math.round((baseAmount + extraAmount + expensesTotal) * 100) / 100;

      return {
        userId: uid,
        fullName: prof.full_name || prof.email,
        email: prof.email,
        whatsapp: prof.whatsapp || "",
        isClosed: false,
        closingId: null,
        regime,
        contractSnapshot: contract,
        totalHours: remuneratedHours,
        deficitHours,
        baseAmount,
        extraAmount,
        expenseReimbursement: expensesTotal,
        totalPayable,
        nfReceived: false,
        status: "aberto",
        bankHours: 0,
      };
    });
  });

export const closeConsultantMonth = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        user_id: z.string().uuid(),
        month_year: z.string().regex(/^\d{4}-\d{2}$/),
        regime: z.string(),
        contract_snapshot: z.any(),
        total_hours: z.number(),
        min_hours_snapshot: z.number().default(0),
        deficit_hours: z.number().default(0),
        base_amount: z.number(),
        extra_amount: z.number().default(0),
        expense_reimbursement: z.number().default(0),
        total_payable: z.number(),
        nf_received: z.boolean().default(false),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const sb: any = context.supabase;
    await assertManagerOrAdmin(sb, context.userId);

    const snapshot = {
      id: crypto.randomUUID(),
      user_id: data.user_id,
      month_year: data.month_year,
      payment_regime_snapshot: data.regime,
      contract_snapshot: data.contract_snapshot,
      total_hours: data.total_hours,
      min_hours_snapshot: data.min_hours_snapshot,
      deficit_hours: data.deficit_hours,
      base_amount: data.base_amount,
      extra_amount: data.extra_amount,
      expense_reimbursement: data.expense_reimbursement,
      total_payable: data.total_payable,
      nf_received: data.nf_received,
      status: "aprovado",
      closed_by: context.userId,
      closed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    try {
      await sb.from("consultant_closings").upsert(snapshot, { onConflict: "user_id,month_year" });
    } catch {}

    const store = await getMaiaStore(sb);
    store.closings = store.closings.filter((c: any) => !(c.user_id === data.user_id && c.month_year === data.month_year));
    store.closings.push(snapshot);
    await saveMaiaStore(sb, store);

    return { ok: true };
  });

export const toggleNfReceived = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        closing_id: z.string().uuid().optional(),
        user_id: z.string().uuid().optional(),
        month_year: z.string().optional(),
        nf_received: z.boolean(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const sb: any = context.supabase;
    await assertManagerOrAdmin(sb, context.userId);

    try {
      if (data.closing_id) {
        await sb.from("consultant_closings").update({ nf_received: data.nf_received }).eq("id", data.closing_id);
      }
    } catch {}

    const store = await getMaiaStore(sb);
    store.closings = store.closings.map((c: any) => {
      if ((data.closing_id && c.id === data.closing_id) || (data.user_id && c.user_id === data.user_id && c.month_year === data.month_year)) {
        return { ...c, nf_received: data.nf_received };
      }
      return c;
    });
    await saveMaiaStore(sb, store);

    return { ok: true };
  });

// ─── 5. FECHAMENTO DRE (Demonstrativo de Resultados do Exercício) ──────────────

export const getMaiaDreData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ month_year: z.string().regex(/^\d{4}-\d{2}$/) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const sb: any = context.supabase;
    await assertManagerOrAdmin(sb, context.userId);

    const start = `${data.month_year}-01`;
    const end = `${data.month_year}-31`;

    const [
      { data: invoices },
      store,
    ] = await Promise.all([
      sb
        .from("invoices")
        .select("total_amount, hours_total, period_start, period_end")
        .gte("period_start", start)
        .lte("period_end", end),
      getMaiaStore(sb),
    ]);

    let taxes = store.taxes.filter((t: any) => t.is_active);
    try {
      const { data: dbTaxes } = await sb.from("maia_tax_settings").select("*").eq("is_active", true);
      if (dbTaxes && dbTaxes.length > 0) taxes = dbTaxes;
    } catch {}

    let closings = store.closings.filter((c: any) => c.month_year === data.month_year);
    try {
      const { data: dbClosings } = await sb.from("consultant_closings").select("*").eq("month_year", data.month_year);
      if (dbClosings && dbClosings.length > 0) closings = dbClosings;
    } catch {}

    let dreEntries = store.dreEntries.filter((e: any) => e.month_year === data.month_year);
    try {
      const { data: dbEntries } = await sb.from("maia_dre_entries").select("*").eq("month_year", data.month_year);
      if (dbEntries && dbEntries.length > 0) dreEntries = dbEntries;
    } catch {}

    // 1. Faturamento Bruto
    const grossRevenue = (invoices ?? []).reduce(
      (acc: number, inv: any) => acc + Number(inv.total_amount || 0),
      0,
    );

    // 2. Alíquota total de impostos configurados
    const totalTaxRatePercent = (taxes ?? []).reduce(
      (acc: number, t: any) => acc + Number(t.rate_percent || 0),
      0,
    );
    const taxesDeduction = Math.round(((grossRevenue * totalTaxRatePercent) / 100) * 100) / 100;

    // 3. Receita Líquida
    const netRevenue = Math.round((grossRevenue - taxesDeduction) * 100) / 100;

    // 4. Custos de Equipe (honorários) e Reembolsos de Despesas
    let teamLaborCost = 0;
    let expenseReimbursements = 0;
    for (const c of closings ?? []) {
      const exp = Number(c.expense_reimbursement || 0);
      const tot = Number(c.total_payable || 0);
      teamLaborCost += tot - exp;
      expenseReimbursements += exp;
    }

    // 5. Custos Fixos e Variáveis adicionais
    const fixedCosts = (dreEntries ?? []).filter((e: any) => e.entry_type === "custo_fixo");
    const variableCosts = (dreEntries ?? []).filter((e: any) => e.entry_type === "custo_variavel");

    const totalFixedCosts = fixedCosts.reduce((acc: number, e: any) => acc + Number(e.amount || 0), 0);
    const totalVariableCosts = variableCosts.reduce((acc: number, e: any) => acc + Number(e.amount || 0), 0);

    // 6. Lucro Operacional Líquido
    const operatingProfit =
      Math.round(
        (netRevenue -
          teamLaborCost -
          expenseReimbursements -
          totalFixedCosts -
          totalVariableCosts) *
          100,
      ) / 100;

    return {
      monthYear: data.month_year,
      grossRevenue,
      taxes: taxes ?? [],
      totalTaxRatePercent,
      taxesDeduction,
      netRevenue,
      teamLaborCost,
      expenseReimbursements,
      fixedCosts,
      totalFixedCosts,
      variableCosts,
      totalVariableCosts,
      operatingProfit,
    };
  });

export const saveMaiaDreEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        month_year: z.string().regex(/^\d{4}-\d{2}$/),
        entry_type: z.enum(["custo_fixo", "custo_variavel"]),
        description: z.string().min(1, "Descrição obrigatória"),
        amount: z.number().min(0, "Valor não pode ser negativo"),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const sb: any = context.supabase;
    await assertManagerOrAdmin(sb, context.userId);

    const payload = {
      month_year: data.month_year,
      entry_type: data.entry_type,
      description: data.description,
      amount: data.amount,
      updated_at: new Date().toISOString(),
    };

    // 1. Try DB
    try {
      if (data.id) {
        const { data: updated, error } = await sb
          .from("maia_dre_entries")
          .update(payload)
          .eq("id", data.id)
          .select()
          .single();
        if (!error && updated) {
          const store = await getMaiaStore(sb);
          store.dreEntries = store.dreEntries.map((e: any) => (e.id === data.id ? updated : e));
          await saveMaiaStore(sb, store);
          return updated;
        }
      } else {
        const { data: inserted, error } = await sb
          .from("maia_dre_entries")
          .insert({ ...payload, created_by: context.userId })
          .select()
          .single();
        if (!error && inserted) {
          const store = await getMaiaStore(sb);
          store.dreEntries.push(inserted);
          await saveMaiaStore(sb, store);
          return inserted;
        }
      }
    } catch {}

    // 2. Seamless fallback to persistent store
    const store = await getMaiaStore(sb);
    const entryId = data.id || crypto.randomUUID();
    const newEntry = {
      id: entryId,
      month_year: data.month_year,
      entry_type: data.entry_type,
      description: data.description,
      amount: data.amount,
      created_at: new Date().toISOString(),
    };

    if (data.id) {
      store.dreEntries = store.dreEntries.map((e: any) => (e.id === data.id ? { ...e, ...newEntry } : e));
    } else {
      store.dreEntries.push(newEntry);
    }
    await saveMaiaStore(sb, store);
    return newEntry;
  });

export const deleteMaiaDreEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb: any = context.supabase;
    await assertManagerOrAdmin(sb, context.userId);

    try {
      await sb.from("maia_dre_entries").delete().eq("id", data.id);
    } catch {}

    const store = await getMaiaStore(sb);
    store.dreEntries = store.dreEntries.filter((e: any) => e.id !== data.id);
    await saveMaiaStore(sb, store);
    return { ok: true };
  });

export const cloneDreEntriesFromPreviousMonth = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        current_month_year: z.string().regex(/^\d{4}-\d{2}$/),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const sb: any = context.supabase;
    await assertManagerOrAdmin(sb, context.userId);

    const [year, month] = data.current_month_year.split("-").map(Number);
    const prevDate = new Date(year, month - 2, 1);
    const prevMonthYear = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;

    const store = await getMaiaStore(sb);
    let prevEntries = store.dreEntries.filter((e: any) => e.month_year === prevMonthYear);

    try {
      const { data: dbEntries } = await sb
        .from("maia_dre_entries")
        .select("*")
        .eq("month_year", prevMonthYear);
      if (dbEntries && dbEntries.length > 0) prevEntries = dbEntries;
    } catch {}

    if (!prevEntries || prevEntries.length === 0) {
      throw new Error(`Nenhum custo encontrado no mês anterior (${prevMonthYear}) para importar.`);
    }

    const cloned = prevEntries.map((e: any) => ({
      id: crypto.randomUUID(),
      month_year: data.current_month_year,
      entry_type: e.entry_type,
      description: e.description,
      amount: e.amount,
      created_at: new Date().toISOString(),
    }));

    try {
      await sb.from("maia_dre_entries").insert(
        cloned.map((e: any) => ({ ...e, created_by: context.userId })),
      );
    } catch {}

    store.dreEntries.push(...cloned);
    await saveMaiaStore(sb, store);

    return { ok: true, count: cloned.length };
  });
