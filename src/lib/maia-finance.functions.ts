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
  bonuses: any[];
} = {
  taxes: [{ id: "def-tax-1", name: "Simples Nacional / ISS", rate_percent: 6.0, is_active: true }],
  contracts: {},
  closings: [],
  auditNotes: {},
  dreEntries: [],
  bonuses: [],
};

export async function getMaiaStore(sb: any) {
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
        bonuses: Array.isArray(parsed.bonuses) ? parsed.bonuses : memoryFallback.bonuses,
      };
    }
  } catch {}
  return memoryFallback;
}

export async function saveMaiaStore(sb: any, store: any) {
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
        consultant_id: z.string().uuid().optional(),
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
      .select("*, projects(id, name), companies(id, name), work_hour_expenses(*)")
      .order("work_date", { ascending: false });

    const consultantId = data.consultant_id || data.user_id;
    if (consultantId) {
      q = q.or(`user_id.eq.${consultantId},created_by.eq.${consultantId}`);
    }
    if (data.company_id) q = q.eq("company_id", data.company_id);
    if (data.activity_type) q = q.eq("activity_type", data.activity_type);
    if (data.month_year) {
      q = q.gte("work_date", `${data.month_year}-01`).lte("work_date", `${data.month_year}-31`);
    }

    const [{ data: rows, error: qErr }, { data: profiles }, store] = await Promise.all([
      q,
      sb.from("profiles").select("user_id, full_name, email"),
      getMaiaStore(sb),
    ]);

    if (qErr) {
      console.error("listAuditWorkHours query error:", qErr);
    }

    const profileMap = new Map<string, any>(
      (profiles ?? []).map((p: any) => [p.user_id, p])
    );

    let list = (rows ?? []).map((r: any) => {
      const uid = r.user_id || r.created_by;
      const prof = profileMap.get(uid);
      const consultantName = prof?.full_name || r.responsible || "Consultor";

      const note = store.auditNotes[r.id];
      const isRemun =
        note?.adjusted_remunerated !== undefined
          ? note.adjusted_remunerated
          : r.is_remunerated !== undefined && r.is_remunerated !== null
          ? r.is_remunerated
          : !r.notes?.includes("[NAO_REMUNERADA]");

      const expenses = (r.work_hour_expenses ?? []).map((e: any) => {
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
        user_id: uid,
        responsible: consultantName,
        profiles: prof || { full_name: consultantName, email: prof?.email || "" },
        hours: note?.adjusted_hours !== undefined ? note.adjusted_hours : r.hours,
        is_remunerated: isRemun,
        audit_status: r.audit_status || note?.audit_status || "pendente",
        adjusted_by_manager: r.adjusted_by_manager ?? note?.adjusted_by_manager ?? false,
        manager_note: r.manager_note || note?.manager_note || "",
        work_hour_expenses: expenses,
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

export const auditWorkHourFromFinance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        hours: z.number().min(0.01, "A quantidade de horas deve ser maior que zero"),
        is_remunerated: z.boolean(),
        company_id: z.string().uuid("Selecione a empresa"),
        expenses: z
          .array(
            z.object({
              category: z.string(),
              amount: z.number().min(0),
              description: z.string().default(""),
            }),
          )
          .default([]),
        manager_note: z.string().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const sb: any = context.supabase;
    await assertManagerOrAdmin(sb, context.userId);

    // 1. Obter registro atual
    const { data: current, error: curErr } = await sb
      .from("work_hours")
      .select("*, companies(name), work_hour_expenses(*)")
      .eq("id", data.id)
      .single();

    if (curErr || !current) {
      throw new Error("Lançamento de horas não encontrado.");
    }

    // 2. Detectar alterações detalhadas
    const changes: string[] = [];

    // Horas
    const oldHours = Number(current.hours || 0);
    const newHours = Number(data.hours);
    if (Math.abs(oldHours - newHours) > 0.001) {
      changes.push(`Horas alteradas de ${oldHours.toFixed(2)}h para ${newHours.toFixed(2)}h`);
    }

    // Remuneração
    const oldRemun = current.is_remunerated !== false;
    const newRemun = data.is_remunerated;
    if (oldRemun !== newRemun) {
      changes.push(
        `Tipo alterado para ${newRemun ? "Hora Remunerada" : "Hora Não Remunerada"}`,
      );
    }

    // Empresa / Cliente
    let newCompanyName = current.companies?.name || "";
    if (current.company_id !== data.company_id) {
      const { data: newComp } = await sb
        .from("companies")
        .select("name")
        .eq("id", data.company_id)
        .maybeSingle();
      if (newComp?.name) newCompanyName = newComp.name;
      const oldName = current.companies?.name || "Empresa anterior";
      const newName = newComp?.name || "Nova empresa";
      changes.push(`Cliente alterado de "${oldName}" para "${newName}"`);
    }

    // Despesas
    const oldExps = current.work_hour_expenses ?? [];
    const oldTotalExps = oldExps.reduce((acc: number, e: any) => acc + Number(e.amount || 0), 0);
    const validNewExpenses = (data.expenses || []).filter(
      (e) => e.amount > 0 || (e.description && e.description.trim()),
    );
    const newTotalExps = validNewExpenses.reduce((acc: number, e: any) => acc + Number(e.amount || 0), 0);

    if (Math.abs(oldTotalExps - newTotalExps) > 0.01 || oldExps.length !== validNewExpenses.length) {
      changes.push(
        `Despesas atualizadas de R$ ${oldTotalExps.toFixed(2)} para R$ ${newTotalExps.toFixed(2)}`,
      );
    }

    const changeDetails =
      changes.length > 0
        ? changes.join(" · ")
        : "Revisado e confirmado pela gestão";

    const fullManagerNote = data.manager_note?.trim()
      ? `${changeDetails} (Obs: ${data.manager_note.trim()})`
      : changeDetails;

    // 3. Atualizar store de auditoria garantindo persistência imediata mesmo com tabelas sem migração
    const store = await getMaiaStore(sb);
    store.auditNotes = store.auditNotes || {};
    store.auditNotes[data.id] = {
      ...(store.auditNotes[data.id] || {}),
      adjusted_by_manager: true,
      manager_note: fullManagerNote,
      adjusted_hours: data.hours,
      adjusted_remunerated: data.is_remunerated,
      adjusted_company_id: data.company_id,
      adjusted_company_name: newCompanyName,
      adjusted_expenses: validNewExpenses,
      updated_at: new Date().toISOString(),
    };
    await saveMaiaStore(sb, store);

    // 4. Tentar executar via RPC com SECURITY DEFINER
    try {
      const { error: rpcErr } = await sb.rpc("audit_work_hour_by_manager", {
        _work_hour_id: data.id,
        _hours: data.hours,
        _is_remunerated: data.is_remunerated,
        _company_id: data.company_id,
        _manager_note: fullManagerNote,
        _expenses: validNewExpenses,
      });
      if (!rpcErr) {
        return { ok: true, id: data.id, manager_note: fullManagerNote };
      }
    } catch {}

    // 5. Fallback direto caso a RPC ainda não esteja instalada no Postgres
    let cleanNotes = (current.notes || "")
      .replace(/\[NAO_REMUNERADA\]/g, "")
      .replace(/\[AJUSTADO_GESTAO:[^\]]+\]/g, "")
      .trim();

    if (!data.is_remunerated) {
      cleanNotes = cleanNotes ? `${cleanNotes} [NAO_REMUNERADA]` : "[NAO_REMUNERADA]";
    }
    cleanNotes = cleanNotes
      ? `${cleanNotes} [AJUSTADO_GESTAO: ${fullManagerNote}]`
      : `[AJUSTADO_GESTAO: ${fullManagerNote}]`;

    const fullPayload: any = {
      hours: data.hours,
      company_id: data.company_id,
      notes: cleanNotes,
      is_remunerated: data.is_remunerated,
      adjusted_by_manager: true,
      manager_note: fullManagerNote,
      updated_at: new Date().toISOString(),
    };

    let { error: updErr } = await sb.from("work_hours").update(fullPayload).eq("id", data.id);
    if (updErr) {
      const fallback1 = {
        hours: data.hours,
        company_id: data.company_id,
        notes: cleanNotes,
        is_remunerated: data.is_remunerated,
        updated_at: new Date().toISOString(),
      };
      let { error: fErr1 } = await sb.from("work_hours").update(fallback1).eq("id", data.id);
      if (fErr1) {
        const fallbackBase = {
          hours: data.hours,
          company_id: data.company_id,
          notes: cleanNotes,
          updated_at: new Date().toISOString(),
        };
        await sb.from("work_hours").update(fallbackBase).eq("id", data.id);
      }
    }

    // Atualizar despesas no banco
    try {
      await sb.from("work_hour_expenses").delete().eq("work_hour_id", data.id);
      if (validNewExpenses.length > 0) {
        const rowsToInsert = validNewExpenses.map((exp) => ({
          work_hour_id: data.id,
          company_id: data.company_id,
          project_id: current.project_id,
          category: exp.category,
          amount: exp.amount,
          description: exp.description ? `[${exp.category}] ${exp.description}` : `[${exp.category}]`,
          created_by: context.userId,
        }));

        let { error: insErr } = await sb.from("work_hour_expenses").insert(rowsToInsert);
        if (insErr) {
          const fallbackRows = rowsToInsert.map(({ category, ...rest }) => rest);
          await sb.from("work_hour_expenses").insert(fallbackRows);
        }
      }
    } catch {}

    return {
      ok: true,
      id: data.id,
      manager_note: fullManagerNote,
    };
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

    let hoursRows: any[] = [];
    try {
      const { data: qData, error: qErr } = await sb
        .from("work_hours")
        .select("id, user_id, created_by, hours, is_remunerated, notes, work_hour_expenses(*)")
        .gte("work_date", start)
        .lte("work_date", end);
      if (!qErr && qData) {
        hoursRows = qData;
      } else {
        const { data: fallbackData } = await sb
          .from("work_hours")
          .select("id, user_id, created_by, hours, notes, work_hour_expenses(*)")
          .gte("work_date", start)
          .lte("work_date", end);
        if (fallbackData) hoursRows = fallbackData;
      }
    } catch {
      const { data: fallbackData } = await sb
        .from("work_hours")
        .select("id, user_id, created_by, hours, notes, work_hour_expenses(*)")
        .gte("work_date", start)
        .lte("work_date", end);
      if (fallbackData) hoursRows = fallbackData;
    }

    const [{ data: profiles }, store] = await Promise.all([
      sb.from("profiles").select("user_id, full_name, email, whatsapp"),
      getMaiaStore(sb),
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
      const uid = h.user_id || h.created_by;
      if (!uid) continue;
      const cur = userHoursMap.get(uid) || { totalHours: 0, remuneratedHours: 0, expensesTotal: 0 };

      const note = store.auditNotes[h.id];
      const hrs = Number(note?.adjusted_hours !== undefined ? note.adjusted_hours : (h.hours || 0));
      cur.totalHours += hrs;

      const isRemun =
        note?.adjusted_remunerated !== undefined
          ? note.adjusted_remunerated
          : h.is_remunerated !== undefined && h.is_remunerated !== null
          ? h.is_remunerated
          : !h.notes?.includes("[NAO_REMUNERADA]");

      if (isRemun) {
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
      { data: clientPayments },
      { data: prevPayments },
      store,
    ] = await Promise.all([
      sb
        .from("invoices")
        .select("total_amount, hours_total, period_start, period_end")
        .gte("period_start", start)
        .lte("period_end", end),
      sb
        .from("payments")
        .select("amount, paid_at, method")
        .gte("paid_at", start)
        .lte("paid_at", end),
      sb
        .from("payments")
        .select("amount, paid_at")
        .lt("paid_at", start),
      getMaiaStore(sb),
    ]);

    let taxes = store.taxes.filter((t: any) => t.is_active);
    try {
      const { data: dbTaxes } = await sb.from("maia_tax_settings").select("*").eq("is_active", true);
      if (dbTaxes && dbTaxes.length > 0) taxes = dbTaxes;
    } catch {}

    let allClosings = store.closings || [];
    try {
      const { data: dbClosings } = await sb.from("consultant_closings").select("*");
      if (dbClosings && dbClosings.length > 0) allClosings = dbClosings;
    } catch {}

    let allDreEntries = store.dreEntries || [];
    try {
      const { data: dbEntries } = await sb.from("maia_dre_entries").select("*");
      if (dbEntries && dbEntries.length > 0) allDreEntries = dbEntries;
    } catch {}

    const allBonuses = store.bonuses || [];

    // 1. Faturamento Bruto de Faturas emitidas (Indicador)
    const grossRevenue = (invoices ?? []).reduce(
      (acc: number, inv: any) => acc + Number(inv.total_amount || 0),
      0,
    );

    // 2. Receita Realizada: Pagamentos Recebidos dos Clientes (Base da DRE)
    const totalPaymentsReceived = (clientPayments ?? []).reduce(
      (acc: number, p: any) => acc + Number(p.amount || 0),
      0,
    );

    // 3. Impostos calculados sobre os Pagamentos Recebidos
    const totalTaxRatePercent = (taxes ?? []).reduce(
      (acc: number, t: any) => acc + Number(t.rate_percent || 0),
      0,
    );
    const taxesDeduction = Math.round(((totalPaymentsReceived * totalTaxRatePercent) / 100) * 100) / 100;

    // 4. Receita Operacional Líquida (Pagamentos Recebidos - Impostos)
    const netRevenue = Math.round((totalPaymentsReceived - taxesDeduction) * 100) / 100;

    // 5. Custos Operacionais de Equipe do Mês (Honorários, Reembolsos e Bonificações)
    const currentMonthClosings = allClosings.filter((c: any) => c.month_year === data.month_year);
    let teamLaborCost = 0;
    let expenseReimbursements = 0;
    for (const c of currentMonthClosings) {
      const exp = Number(c.expense_reimbursement || 0);
      const tot = Number(c.total_payable || 0);
      teamLaborCost += tot - exp;
      expenseReimbursements += exp;
    }

    const bonusesThisMonth = allBonuses.filter((b: any) => b.month_year === data.month_year);
    const consultantBonuses = bonusesThisMonth.reduce(
      (acc: number, b: any) => acc + Number(b.amount || 0),
      0,
    );

    // 6. Custos Fixos e Variáveis do Mês
    const currentMonthEntries = allDreEntries.filter((e: any) => e.month_year === data.month_year);
    const fixedCosts = currentMonthEntries.filter((e: any) => e.entry_type === "custo_fixo");
    const variableCosts = currentMonthEntries.filter((e: any) => e.entry_type === "custo_variavel");

    const totalFixedCosts = fixedCosts.reduce((acc: number, e: any) => acc + Number(e.amount || 0), 0);
    const totalVariableCosts = variableCosts.reduce((acc: number, e: any) => acc + Number(e.amount || 0), 0);

    // 7. Lucro Operacional Líquido do Período Atual
    const totalCurrentTeamCosts = teamLaborCost + expenseReimbursements + consultantBonuses;
    const operatingProfit =
      Math.round(
        (netRevenue -
          totalCurrentTeamCosts -
          totalFixedCosts -
          totalVariableCosts) *
          100,
      ) / 100;

    // 8. Cálculo do Acumulado Líquido do Período Anterior
    const prevPaymentsTotal = (prevPayments ?? []).reduce(
      (acc: number, p: any) => acc + Number(p.amount || 0),
      0,
    );
    const prevTaxesDeduction = Math.round(((prevPaymentsTotal * totalTaxRatePercent) / 100) * 100) / 100;
    const prevNetRevenue = Math.round((prevPaymentsTotal - prevTaxesDeduction) * 100) / 100;

    const prevClosings = allClosings.filter((c: any) => c.month_year < data.month_year);
    let prevTeamLaborCost = 0;
    let prevExpenseReimbursements = 0;
    for (const c of prevClosings) {
      const exp = Number(c.expense_reimbursement || 0);
      const tot = Number(c.total_payable || 0);
      prevTeamLaborCost += tot - exp;
      prevExpenseReimbursements += exp;
    }

    const prevBonuses = allBonuses.filter((b: any) => b.month_year < data.month_year);
    const prevBonusesTotal = prevBonuses.reduce(
      (acc: number, b: any) => acc + Number(b.amount || 0),
      0,
    );

    const prevDreEntries = allDreEntries.filter((e: any) => e.month_year < data.month_year);
    const prevFixedCosts = prevDreEntries
      .filter((e: any) => e.entry_type === "custo_fixo")
      .reduce((acc: number, e: any) => acc + Number(e.amount || 0), 0);
    const prevVariableCosts = prevDreEntries
      .filter((e: any) => e.entry_type === "custo_variavel")
      .reduce((acc: number, e: any) => acc + Number(e.amount || 0), 0);

    const previousAccumulatedProfit = Math.round(
      (prevNetRevenue -
        prevTeamLaborCost -
        prevExpenseReimbursements -
        prevBonusesTotal -
        prevFixedCosts -
        prevVariableCosts) *
        100,
    ) / 100;

    const accumulatedConsolidatedProfit = Math.round(
      (previousAccumulatedProfit + operatingProfit) * 100,
    ) / 100;

    const currentMonthYear = new Date().toISOString().slice(0, 7);
    const isFutureOrOpen = data.month_year >= currentMonthYear;

    return {
      monthYear: data.month_year,
      grossRevenue,
      totalPaymentsReceived,
      taxes: taxes ?? [],
      totalTaxRatePercent,
      taxesDeduction,
      netRevenue,
      teamLaborCost,
      expenseReimbursements,
      consultantBonuses,
      bonusesList: bonusesThisMonth,
      fixedCosts,
      totalFixedCosts,
      variableCosts,
      totalVariableCosts,
      operatingProfit,
      previousAccumulatedProfit,
      accumulatedConsolidatedProfit,
      isFutureOrOpen,
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

// ─── 6. BONIFICAÇÕES DOS CONSULTORES ──────────────────────────────────────────

export const listConsultantBonuses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        month_year: z.string().regex(/^\d{4}-\d{2}$/).optional(),
        consultant_id: z.string().optional(),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    const sb: any = context.supabase;
    await assertManagerOrAdmin(sb, context.userId);

    const store = await getMaiaStore(sb);
    let bonuses = store.bonuses || [];
    if (data.month_year) {
      bonuses = bonuses.filter((b: any) => b.month_year === data.month_year);
    }
    if (data.consultant_id && data.consultant_id !== "__all") {
      bonuses = bonuses.filter((b: any) => b.consultant_id === data.consultant_id);
    }
    return bonuses.sort((a: any, b: any) =>
      (b.bonus_date || "").localeCompare(a.bonus_date || ""),
    );
  });

export const saveConsultantBonus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        consultant_id: z.string().min(1, "Consultor obrigatório"),
        consultant_name: z.string().min(1, "Nome do consultor obrigatório"),
        bonus_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida (AAAA-MM-DD)"),
        service_description: z.string().min(1, "Descrição do serviço obrigatória"),
        amount: z.number().positive("O valor da bonificação deve ser maior que zero"),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const sb: any = context.supabase;
    await assertManagerOrAdmin(sb, context.userId);

    const month_year = data.bonus_date.slice(0, 7);
    const store = await getMaiaStore(sb);
    const bonusId = data.id || crypto.randomUUID();

    const newBonus = {
      id: bonusId,
      consultant_id: data.consultant_id,
      consultant_name: data.consultant_name,
      bonus_date: data.bonus_date,
      month_year,
      service_description: data.service_description,
      amount: data.amount,
      created_by: context.userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (data.id) {
      store.bonuses = (store.bonuses || []).map((b: any) =>
        b.id === data.id ? newBonus : b,
      );
    } else {
      store.bonuses = [...(store.bonuses || []), newBonus];
    }

    await saveMaiaStore(sb, store);
    return newBonus;
  });

export const deleteConsultantBonus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb: any = context.supabase;
    await assertManagerOrAdmin(sb, context.userId);

    const store = await getMaiaStore(sb);
    store.bonuses = (store.bonuses || []).filter((b: any) => b.id !== data.id);
    await saveMaiaStore(sb, store);
    return { ok: true };
  });
