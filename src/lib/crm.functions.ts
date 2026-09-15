import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const CRM_STAGES = [
  { value: "nao_iniciado", label: "Não iniciado" },
  { value: "prospectado", label: "Prospectado" },
  { value: "primeira_reuniao", label: "1ª reunião" },
  { value: "apresentacao", label: "Apresentação" },
  { value: "fechamento", label: "Fechamento" },
] as const;

export const CONTRACT_TYPES = [
  { value: "conta_corrente", label: "Conta corrente" },
  { value: "fixo", label: "Fixo" },
  { value: "por_projeto", label: "Por projeto" },
] as const;

export function stageLabel(v?: string | null) {
  return CRM_STAGES.find((s) => s.value === v)?.label ?? v ?? "—";
}
export function contractLabel(v?: string | null) {
  return CONTRACT_TYPES.find((s) => s.value === v)?.label ?? v ?? "—";
}

export type CrmAlert = {
  key: string;
  severity: "critical" | "warning" | "info";
  title: string;
  subtitle: string;
  leadId?: string;
  companyId?: string;
};

const leadSchema = z.object({
  id: z.string().uuid().optional(),
  company_name: z.string().min(1),
  contact_name: z.string().default(""),
  contact_role: z.string().default(""),
  phone: z.string().default(""),
  email: z.string().default(""),
  source: z.string().default(""),
  notes: z.string().default(""),
  first_contact_date: z.string().nullable().optional(),
  responsible: z.string().default(""),
  stage: z.enum(["nao_iniciado", "prospectado", "primeira_reuniao", "apresentacao", "fechamento"]),
  is_hot: z.boolean().default(false),
  last_contact_at: z.string().nullable().optional(),
  next_action_date: z.string().nullable().optional(),
  converted_company_id: z.string().uuid().nullable().optional(),
  contract_type: z.enum(["conta_corrente", "fixo", "por_projeto"]).nullable().optional(),
  payment_day: z.number().int().min(1).max(31).nullable().optional(),
  payment_due_date: z.string().nullable().optional(),
  hourly_rate: z.number().nullable().optional(),
  contract_total: z.number().nullable().optional(),
  start_date: z.string().nullable().optional(),
  end_date: z.string().nullable().optional(),
});

export const listLeads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb: any = context.supabase;
    const [{ data: leads, error }, { data: acts }, { data: profile }, { data: memberships }, { data: companies }] = await Promise.all([
      sb
        .from("crm_leads")
        .select("*, companies:converted_company_id(id, name)")
        .order("updated_at", { ascending: false }),
      sb.from("crm_activities").select("*").order("occurred_at", { ascending: false }),
      sb.from("profiles").select("is_superadmin").eq("user_id", context.userId).maybeSingle(),
      sb.from("company_members").select("permissions").eq("user_id", context.userId),
      sb.from("companies").select("id, name, is_active, created_at").order("name"),
    ]);
    if (error) throw new Error(error.message);
    const canViewFinance = !!profile?.is_superadmin || (memberships ?? []).some(
      (m: any) => m.permissions?.financeiro === true,
    );
    const safeLeads = (leads ?? []).map((lead: any) => canViewFinance ? lead : {
      ...lead,
      hourly_rate: null,
      contract_total: null,
      payment_day: null,
      payment_due_date: null,
    });
    return { leads: safeLeads, activities: acts ?? [], companies: companies ?? [], canViewFinance };
  });

export const convertLeadToCompany = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ lead_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb: any = context.supabase;
    const { data: lead, error: leadError } = await sb
      .from("crm_leads")
      .select("id, company_name, stage, converted_company_id")
      .eq("id", data.lead_id)
      .single();
    if (leadError) throw new Error(leadError.message);
    if (lead.stage !== "fechamento") throw new Error("O lead precisa estar em Fechamento.");
    if (lead.converted_company_id) return { company_id: lead.converted_company_id, alreadyConverted: true };

    const { data: existing } = await sb
      .from("companies")
      .select("id")
      .ilike("name", lead.company_name.trim())
      .maybeSingle();
    let companyId = existing?.id as string | undefined;
    if (!companyId) {
      const { data: company, error: companyError } = await sb
        .from("companies")
        .insert({ name: lead.company_name.trim(), created_by: context.userId, is_active: true })
        .select("id")
        .single();
      if (companyError) throw new Error(companyError.message);
      companyId = company.id;
    }
    const { error: updateError } = await sb
      .from("crm_leads")
      .update({ converted_company_id: companyId, converted_at: new Date().toISOString() })
      .eq("id", lead.id)
      .is("converted_company_id", null);
    if (updateError) throw new Error(updateError.message);
    return { company_id: companyId, alreadyConverted: false };
  });

export const saveLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => leadSchema.parse(d))
  .handler(async ({ data, context }) => {
    const sb: any = context.supabase;
    const { id, ...rest } = data;
    const payload: any = { ...rest };
    if (data.stage === "fechamento") payload.converted_at = new Date().toISOString();

    if (id) {
      const { error } = await sb.from("crm_leads").update(payload).eq("id", id);
      if (error) throw new Error(error.message);
      return { id };
    }
    payload.created_by = context.userId;
    const { data: row, error } = await sb.from("crm_leads").insert(payload).select("id").single();
    if (error) throw new Error(error.message);
    return { id: row.id as string };
  });

export const deleteLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as any).from("crm_leads").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const addLeadActivity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        lead_id: z.string().uuid(),
        kind: z.string().default("contato"),
        description: z.string().default(""),
        occurred_at: z.string(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const sb: any = context.supabase;
    const { error } = await sb.from("crm_activities").insert({ ...data, created_by: context.userId });
    if (error) throw new Error(error.message);
    await sb.from("crm_leads").update({ last_contact_at: data.occurred_at }).eq("id", data.lead_id);
    return { ok: true };
  });

const daysBetween = (a: string, b: string) =>
  Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);

export const getCrmAlerts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb: any = context.supabase;
    const today = new Date().toISOString().slice(0, 10);
    const monthStart = today.slice(0, 8) + "01";

    const [{ data: profile }, { data: memberships }] = await Promise.all([
      sb.from("profiles").select("is_superadmin").eq("user_id", context.userId).maybeSingle(),
      sb.from("company_members").select("permissions").eq("user_id", context.userId),
    ]);
    const canViewFinance = !!profile?.is_superadmin || (memberships ?? []).some(
      (m: any) => m.permissions?.financeiro === true,
    );
    const [{ data: leads }, { data: dismissed }, { data: hours }, { data: invoices }, { data: payments }] =
      await Promise.all([
        sb.from("crm_leads").select("*"),
        sb.from("alert_dismissals").select("alert_key").eq("dismissed_on", today),
        sb
          .from("work_hours")
          .select("company_id, hours, work_date, billing_status, companies(name)")
          .neq("billing_status", "faturado"),
        canViewFinance ? sb.from("invoices").select("company_id, total_amount, companies(name)") : Promise.resolve({ data: [] }),
        canViewFinance ? sb.from("payments").select("company_id, amount") : Promise.resolve({ data: [] }),
      ]);

    const alerts: CrmAlert[] = [];

    for (const l of leads ?? []) {
      const ref = l.last_contact_at || l.first_contact_date || l.created_at?.slice(0, 10);
      const idle = ref ? daysBetween(ref, today) : null;

      if (l.stage === "nao_iniciado") {
        alerts.push({
          key: `crm:prospect:${l.id}`,
          severity: "warning",
          title: "Prospecção pendente",
          subtitle: `${l.company_name} ainda não foi prospectado`,
          leadId: l.id,
        });
      }
      if (l.stage === "prospectado" && idle !== null && idle >= 7) {
        alerts.push({
          key: `crm:reuniao:${l.id}`,
          severity: "warning",
          title: "Reunião pendente",
          subtitle: `${l.company_name} — ${idle} dias sem avanço para a 1ª reunião`,
          leadId: l.id,
        });
      }
      if (l.stage === "primeira_reuniao" && idle !== null && idle >= 7) {
        alerts.push({
          key: `crm:apresentacao:${l.id}`,
          severity: "warning",
          title: "Apresentação pendente",
          subtitle: `${l.company_name} — ${idle} dias após a 1ª reunião`,
          leadId: l.id,
        });
      }
      if (l.stage === "apresentacao" && idle !== null && idle >= 7) {
        alerts.push({
          key: `crm:fechamento:${l.id}`,
          severity: "critical",
          title: "Fechamento pendente",
          subtitle: `${l.company_name} — ${idle} dias após a apresentação`,
          leadId: l.id,
        });
      }
      if (l.next_action_date && l.next_action_date <= today && l.stage !== "fechamento") {
        alerts.push({
          key: `crm:retorno:${l.id}:${l.next_action_date}`,
          severity: "critical",
          title: "Retorno pendente",
          subtitle: `${l.company_name} — retorno previsto para ${l.next_action_date.split("-").reverse().join("/")}`,
          leadId: l.id,
        });
      }
      if (l.is_hot && l.stage !== "fechamento" && idle !== null && idle >= 10) {
        alerts.push({
          key: `crm:quente:${l.id}`,
          severity: "critical",
          title: "Lead quente sem contato",
          subtitle: `${l.company_name} — ${idle} dias sem contato`,
          leadId: l.id,
        });
      } else if (l.is_hot && l.stage !== "fechamento" && idle !== null && idle >= 5) {
        alerts.push({
          key: `crm:esfriando:${l.id}`,
          severity: "warning",
          title: "Lead próximo de esfriar",
          subtitle: `${l.company_name} — ${idle} dias sem contato`,
          leadId: l.id,
        });
      }
    }

    // Faturamento pronto (horas em aberto por cliente)
    const byCompany = new Map<string, { name: string; hours: number }>();
    for (const h of hours ?? []) {
      if (!h.company_id) continue;
      const cur = byCompany.get(h.company_id) ?? { name: h.companies?.name ?? "Cliente", hours: 0 };
      cur.hours += Number(h.hours ?? 0);
      byCompany.set(h.company_id, cur);
    }
    for (const [companyId, v] of canViewFinance ? byCompany : []) {
      if (v.hours <= 0) continue;
      alerts.push({
        key: `fin:faturar:${companyId}:${monthStart}`,
        severity: "info",
        title: "Horas prontas para faturamento",
        subtitle: `${v.name} — ${v.hours.toFixed(2).replace(".", ",")} h em aberto`,
        companyId,
      });
    }

    // Saldo devedor / recobrança
    const invByCompany = new Map<string, { name: string; total: number }>();
    for (const i of invoices ?? []) {
      const cur = invByCompany.get(i.company_id) ?? { name: i.companies?.name ?? "Cliente", total: 0 };
      cur.total += Number(i.total_amount ?? 0);
      invByCompany.set(i.company_id, cur);
    }
    const payByCompany = new Map<string, number>();
    for (const p of payments ?? []) {
      payByCompany.set(p.company_id, (payByCompany.get(p.company_id) ?? 0) + Number(p.amount ?? 0));
    }
    // Data de pagamento contratada por empresa (vinda do CRM)
    const dueByCompany = new Map<string, string>();
    for (const l of leads ?? []) {
      if (l.converted_company_id && l.payment_due_date) {
        const cur = dueByCompany.get(l.converted_company_id);
        if (!cur || l.payment_due_date < cur) dueByCompany.set(l.converted_company_id, l.payment_due_date);
      }
    }

    for (const [companyId, v] of invByCompany) {
      const balance = v.total - (payByCompany.get(companyId) ?? 0);
      if (balance <= 0.01) continue;
      const due = dueByCompany.get(companyId);
      const money = balance.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

      if (due) {
        if (due > today) continue; // ainda dentro do prazo contratado
        const late = daysBetween(due, today);
        alerts.push({
          key: `fin:recobranca:${companyId}:${due}:${today}`,
          severity: "critical",
          title: "Pagamento em atraso",
          subtitle: `${v.name} — ${money} em aberto · ${late} dia(s) após a data contratada (${due.split("-").reverse().join("/")})`,
          companyId,
        });
      } else {
        alerts.push({
          key: `fin:recobranca:${companyId}:${today}`,
          severity: "warning",
          title: "Pagamento não registrado",
          subtitle: `${v.name} — saldo devedor de ${money} (sem data de pagamento contratada)`,
          companyId,
        });
      }
    }

    const hidden = new Set((dismissed ?? []).map((d: any) => d.alert_key));
    return alerts.filter((a) => !hidden.has(a.key));
  });

export const dismissAlertToday = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ key: z.string().min(1) }).parse(d))
  .handler(async ({ data, context }) => {
    const sb: any = context.supabase;
    const { error } = await sb
      .from("alert_dismissals")
      .insert({ user_id: context.userId, alert_key: data.key })
      .select("id");
    if (error && !error.message.includes("duplicate")) throw new Error(error.message);
    return { ok: true };
  });
