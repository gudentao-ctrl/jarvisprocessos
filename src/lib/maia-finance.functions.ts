import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function assertManagerOrAdmin(sb: any, userId: string) {
  const [{ data: prof }, { data: mems }] = await Promise.all([
    sb.from("profiles").select("is_superadmin").eq("user_id", userId).maybeSingle(),
    sb.from("company_members").select("member_role").eq("user_id", userId),
  ]);
  const isAllowed =
    prof?.is_superadmin ||
    (mems ?? []).some((m: any) => m.member_role === "gestor");
  if (!isAllowed) {
    throw new Error("Acesso exclusivo a Gestores e Superadmins.");
  }
}

async function assertSuperadmin(sb: any, userId: string) {
  const { data: prof } = await sb
    .from("profiles")
    .select("is_superadmin")
    .eq("user_id", userId)
    .maybeSingle();
  if (!prof?.is_superadmin) {
    throw new Error("Acesso confidencial restrito exclusivamente ao SuperAdmin.");
  }
}

// ─── 1. IMPOSTOS (maia_tax_settings) ──────────────────────────────────────────

export const listMaiaTaxes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb: any = context.supabase;
    await assertManagerOrAdmin(sb, context.userId);

    const { data, error } = await sb
      .from("maia_tax_settings")
      .select("*")
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
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

    if (data.id) {
      const { data: updated, error } = await sb
        .from("maia_tax_settings")
        .update(payload)
        .eq("id", data.id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return updated;
    }

    const { data: inserted, error } = await sb
      .from("maia_tax_settings")
      .insert(payload)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return inserted;
  });

export const deleteMaiaTax = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb: any = context.supabase;
    await assertManagerOrAdmin(sb, context.userId);

    const { error } = await sb
      .from("maia_tax_settings")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ─── 2. CONTRATOS DE CONSULTORES (Sigiloso) ───────────────────────────────────

export const listConsultantContracts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb: any = context.supabase;
    await assertSuperadmin(sb, context.userId);

    const [{ data: profiles, error: pErr }, { data: contracts, error: cErr }] =
      await Promise.all([
        sb
          .from("profiles")
          .select("user_id, full_name, email, is_superadmin")
          .order("full_name", { ascending: true }),
        sb.from("consultant_contracts").select("*"),
      ]);

    if (pErr) throw new Error(pErr.message);
    if (cErr) {
      if (cErr.message.includes("schema cache") || cErr.code === "42P01") {
        throw new Error(
          "A tabela 'consultant_contracts' ainda não foi criada no banco de dados. Execute o script SQL no Supabase.",
        );
      }
      throw new Error(cErr.message);
    }

    const contractMap = new Map<string, any>((contracts ?? []).map((c: any) => [c.user_id, c]));

    return (profiles ?? []).map((p: any) => ({
      userId: p.user_id,
      fullName: p.full_name || p.email,
      email: p.email,
      contract: contractMap.get(p.user_id) || {
        payment_regime: "hora",
        monthly_fixed_amount: 0,
        hourly_rate: 0,
        base_floor_amount: 0,
        min_hours: 0,
        extra_hour_rate: 0,
        active: true,
      },
    }));
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
    await assertSuperadmin(sb, context.userId);

    const { error } = await sb
      .from("consultant_contracts")
      .upsert(
        {
          ...data,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
    if (error) {
      if (error.message.includes("schema cache") || error.code === "42P01") {
        throw new Error(
          "A tabela 'consultant_contracts' ainda não foi criada no banco de dados. Execute o script SQL no Supabase.",
        );
      }
      throw new Error(error.message);
    }
    return { ok: true };
  });

// ─── 3. AUDITORIA DE HORAS ───────────────────────────────────────────────────

export const listAuditWorkHours = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        month_year: z.string().optional(), // 'YYYY-MM'
        consultant_id: z.string().uuid().optional(),
        company_id: z.string().uuid().optional(),
        activity_type: z.string().optional(),
        audit_status: z.string().optional(),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    const sb: any = context.supabase;
    await assertManagerOrAdmin(sb, context.userId);

    let q = sb
      .from("work_hours")
      .select(
        "*, companies(id, name), projects(id, name), work_hour_expenses(*), work_hour_tools(*)",
      )
      .order("work_date", { ascending: false });

    if (data.month_year) {
      const start = `${data.month_year}-01`;
      const end = `${data.month_year}-31`;
      q = q.gte("work_date", start).lte("work_date", end);
    }
    if (data.consultant_id) q = q.eq("user_id", data.consultant_id);
    if (data.company_id) q = q.eq("company_id", data.company_id);
    if (data.activity_type && data.activity_type !== "__all")
      q = q.eq("activity_type", data.activity_type);
    if (data.audit_status && data.audit_status !== "__all")
      q = q.eq("audit_status", data.audit_status);

    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
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

    const payload: any = {
      adjusted_by_manager: true,
      updated_at: new Date().toISOString(),
    };
    if (data.hours !== undefined) payload.hours = data.hours;
    if (data.is_remunerated !== undefined) payload.is_remunerated = data.is_remunerated;
    if (data.audit_status) payload.audit_status = data.audit_status;
    if (data.manager_note !== undefined) payload.manager_note = data.manager_note;

    const { data: updated, error } = await sb
      .from("work_hours")
      .update(payload)
      .eq("id", data.id)
      .select()
      .single();
    if (error) {
      if (error.message.includes("schema cache") || error.code === "42703") {
        throw new Error(
          "As colunas de auditoria ('audit_status', 'adjusted_by_manager', 'manager_note') ainda não foram criadas no banco de dados. Execute o script SQL no Supabase.",
        );
      }
      throw new Error(error.message);
    }
    return updated;
  });

export const approveAuditBatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ work_hour_ids: z.array(z.string().uuid()).min(1) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const sb: any = context.supabase;
    await assertManagerOrAdmin(sb, context.userId);

    const { error } = await sb
      .from("work_hours")
      .update({ audit_status: "aprovado", updated_at: new Date().toISOString() })
      .in("id", data.work_hour_ids);
    if (error) {
      if (error.message.includes("schema cache") || error.code === "42703") {
        throw new Error(
          "A coluna 'audit_status' ainda não foi criada no banco de dados. Execute o script SQL no Supabase.",
        );
      }
      throw new Error(error.message);
    }
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

    const [
      { data: profiles, error: pErr },
      { data: contracts, error: cErr },
      { data: closings, error: clErr },
      { data: hoursRows, error: hErr },
      { data: bankAccounts, error: bErr },
    ] = await Promise.all([
      sb.from("profiles").select("user_id, full_name, email, whatsapp"),
      sb.from("consultant_contracts").select("*"),
      sb.from("consultant_closings").select("*").eq("month_year", data.month_year),
      sb
        .from("work_hours")
        .select("user_id, hours, is_remunerated, audit_status, work_hour_expenses(amount)")
        .gte("work_date", start)
        .lte("work_date", end),
      sb.from("consultant_current_accounts").select("*"),
    ]);

    if (pErr) throw new Error(pErr.message);
    if (clErr && (clErr.message.includes("schema cache") || clErr.code === "42P01")) {
      throw new Error(
        "A tabela 'consultant_closings' ainda não foi criada no banco de dados. Execute o script SQL no Supabase.",
      );
    }
    if (cErr && (cErr.message.includes("schema cache") || cErr.code === "42P01")) {
      throw new Error(
        "A tabela 'consultant_contracts' ainda não foi criada no banco de dados. Execute o script SQL no Supabase.",
      );
    }

    const contractMap = new Map<string, any>((contracts ?? []).map((c: any) => [c.user_id, c]));
    const closingMap = new Map<string, any>((closings ?? []).map((c: any) => [c.user_id, c]));
    const bankMap = new Map<string, any>((bankAccounts ?? []).map((b: any) => [b.user_id, b]));

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
      const contract = contractMap.get(uid) || {
        payment_regime: "hora",
        monthly_fixed_amount: 0,
        hourly_rate: 0,
        base_floor_amount: 0,
        min_hours: 0,
        extra_hour_rate: 0,
      };
      const existingClosing = closingMap.get(uid);
      const bank = bankMap.get(uid) || { balance_hours: 0 };

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
          bankHours: Number(bank.balance_hours || 0),
        };
      }

      // Calculate in real time based on active contract
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
        bankHours: Number(bank.balance_hours || 0),
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

    const { error } = await sb.from("consultant_closings").upsert(
      {
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
      },
      { onConflict: "user_id,month_year" },
    );
    if (error) {
      if (error.message.includes("schema cache") || error.code === "42P01") {
        throw new Error(
          "A tabela 'consultant_closings' ainda não foi criada no banco de dados. Execute o script SQL no Supabase.",
        );
      }
      throw new Error(error.message);
    }

    // If there was deficit in conta_corrente, accumulate in bank
    if (data.deficit_hours > 0 && data.regime === "conta_corrente") {
      const { data: bank } = await sb
        .from("consultant_current_accounts")
        .select("balance_hours")
        .eq("user_id", data.user_id)
        .maybeSingle();

      const newBalance = (Number(bank?.balance_hours) || 0) - data.deficit_hours;
      await sb.from("consultant_current_accounts").upsert(
        {
          user_id: data.user_id,
          balance_hours: newBalance,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
    }

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

    if (data.closing_id) {
      const { error } = await sb
        .from("consultant_closings")
        .update({ nf_received: data.nf_received, updated_at: new Date().toISOString() })
        .eq("id", data.closing_id);
      if (error) {
        if (error.message.includes("schema cache") || error.code === "42P01") {
          throw new Error(
            "A tabela 'consultant_closings' ainda não foi criada no banco de dados. Execute o script SQL no Supabase.",
          );
        }
        throw new Error(error.message);
      }
    }
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
      { data: taxes },
      { data: invoices },
      { data: closings },
      { data: dreEntries },
    ] = await Promise.all([
      sb.from("maia_tax_settings").select("*").eq("is_active", true),
      sb
        .from("invoices")
        .select("total_amount, hours_total, period_start, period_end")
        .gte("period_start", start)
        .lte("period_end", end),
      sb.from("consultant_closings").select("*").eq("month_year", data.month_year),
      sb.from("maia_dre_entries").select("*").eq("month_year", data.month_year),
    ]);

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

    if (data.id) {
      const { data: updated, error } = await sb
        .from("maia_dre_entries")
        .update(payload)
        .eq("id", data.id)
        .select()
        .single();
      if (error) {
        if (error.message.includes("schema cache") || error.code === "42P01") {
          throw new Error(
            "A tabela 'maia_dre_entries' ainda não foi criada no banco de dados. Execute o script SQL no Supabase.",
          );
        }
        throw new Error(error.message);
      }
      return updated;
    }

    const { data: inserted, error } = await sb
      .from("maia_dre_entries")
      .insert({ ...payload, created_by: context.userId })
      .select()
      .single();
    if (error) {
      if (error.message.includes("schema cache") || error.code === "42P01") {
        throw new Error(
          "A tabela 'maia_dre_entries' ainda não foi criada no banco de dados. Execute o script SQL no Supabase.",
        );
      }
      throw new Error(error.message);
    }
    return inserted;
  });

export const deleteMaiaDreEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb: any = context.supabase;
    await assertManagerOrAdmin(sb, context.userId);

    const { error } = await sb.from("maia_dre_entries").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
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

    const { data: prevEntries, error: getErr } = await sb
      .from("maia_dre_entries")
      .select("*")
      .eq("month_year", prevMonthYear);
    if (getErr) throw new Error(getErr.message);

    if (!prevEntries || prevEntries.length === 0) {
      throw new Error(`Nenhum custo encontrado no mês anterior (${prevMonthYear}) para importar.`);
    }

    const inserts = prevEntries.map((e: any) => ({
      month_year: data.current_month_year,
      entry_type: e.entry_type,
      description: e.description,
      amount: e.amount,
      created_by: context.userId,
    }));

    const { error: insErr } = await sb.from("maia_dre_entries").insert(inserts);
    if (insErr) throw new Error(insErr.message);

    return { ok: true, count: inserts.length };
  });
