import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function requireCompanyPermission(sb: any, userId: string, companyId: string, permission: "gestao" | "portal") {
  const { data: profile } = await sb.from("profiles").select("status, is_superadmin").eq("user_id", userId).maybeSingle();
  if (!profile || (profile.status !== "active" && !profile.is_superadmin)) throw new Error("Cadastro sem acesso ativo.");
  if (profile.is_superadmin) return;
  const { data: member } = await sb.from("company_members").select("permissions").eq("user_id", userId).eq("company_id", companyId).maybeSingle();
  if (member?.permissions?.[permission] !== true) throw new Error("Seu acesso a esta empresa não foi liberado.");
}

async function logoDataUrl(sb: any, value: string | null | undefined) {
  if (!value) return null;
  try {
    let url = value;
    if (!/^https?:\/\//i.test(value)) {
      const { data } = await sb.storage.from("portal-logos").createSignedUrl(value, 600);
      if (!data?.signedUrl) return null;
      url = data.signedUrl;
    }
    const response = await fetch(url);
    if (!response.ok) return null;
    const bytes = new Uint8Array(await response.arrayBuffer());
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return `data:${response.headers.get("content-type") || "image/png"};base64,${btoa(binary)}`;
  } catch { return null; }
}

export const getImpactNetwork = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ company_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const sb: any = context.supabase;
    await requireCompanyPermission(sb, context.userId, data.company_id, "gestao");
    const [company, indicators, plans, causes, pains, interviews, sectors] = await Promise.all([
      sb.from("companies").select("id, name").eq("id", data.company_id).maybeSingle(),
      sb.from("indicators").select("id, name, code, unit, target, direction").eq("company_id", data.company_id).order("name"),
      sb.from("action_plans").select("id, title, status, sector, sector_id, indicator_id, root_cause_id, pain_point_id, interview_id, expected_benefit, created_at").eq("company_id", data.company_id).order("created_at", { ascending: false }),
      sb.from("root_cause_analyses").select("id, problem, conclusion, pain_point_id, created_at").eq("company_id", data.company_id),
      sb.from("pain_points").select("id, description, severity, source_interview_id, created_at").eq("company_id", data.company_id),
      sb.from("interviews").select("id, title, interview_date, participant").eq("company_id", data.company_id),
      sb.from("sectors").select("id, name").eq("company_id", data.company_id).order("name"),
    ]);
    for (const result of [company, indicators, plans, causes, pains, interviews, sectors]) if (result.error) throw new Error(result.error.message);
    const indicatorIds = (indicators.data ?? []).map((row: any) => row.id);
    const collections = indicatorIds.length
      ? await sb.from("indicator_collections").select("indicator_id, value, submitted_at, evaluation").in("indicator_id", indicatorIds).order("submitted_at")
      : { data: [], error: null };
    if (collections.error) throw new Error(collections.error.message);
    const rows = plans.data ?? [];
    return {
      company: company.data,
      indicators: indicators.data ?? [], plans: rows, causes: causes.data ?? [], pains: pains.data ?? [],
      interviews: interviews.data ?? [], sectors: sectors.data ?? [], collections: collections.data ?? [],
      metrics: {
        fronts: new Set(rows.map((row: any) => row.sector_id || row.sector).filter(Boolean)).size,
        bottlenecks: new Set(rows.filter((row: any) => row.status === "concluido").flatMap((row: any) => [row.root_cause_id, row.pain_point_id]).filter(Boolean)).size,
        completed: rows.filter((row: any) => row.status === "concluido").length,
        complexity: rows.filter((row: any) => row.root_cause_id || row.pain_point_id || row.interview_id).length,
      },
    };
  });

export const getActionPlanLinkOptions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ company_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await requireCompanyPermission(context.supabase, context.userId, data.company_id, "gestao");
    const [sectors, causes, indicators] = await Promise.all([
      context.supabase.from("sectors").select("id, name").eq("company_id", data.company_id).order("name"),
      context.supabase.from("root_cause_analyses").select("id, problem").eq("company_id", data.company_id).order("created_at", { ascending: false }),
      context.supabase.from("indicators").select("id, name, code").eq("company_id", data.company_id).order("name"),
    ]);
    for (const result of [sectors, causes, indicators]) if (result.error) throw new Error(result.error.message);
    return { sectors: sectors.data ?? [], causes: causes.data ?? [], indicators: indicators.data ?? [] };
  });

export const getMonthlyExecutiveData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ company_id: z.string().uuid(), month: z.string().regex(/^\d{4}-\d{2}$/) }).parse(input))
  .handler(async ({ data, context }) => {
    const sb: any = context.supabase;
    await requireCompanyPermission(sb, context.userId, data.company_id, "gestao");
    const [year, month] = data.month.split("-").map(Number);
    const from = `${data.month}-01`;
    const to = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
    const fromIso = `${from}T00:00:00.000Z`;
    const toIso = `${to}T23:59:59.999Z`;
    const [company, plans, causes, pains, opportunities, indicators, hours] = await Promise.all([
      sb.from("companies").select("id, name, public_title, public_company_logo_url, public_consultancy_logo_url").eq("id", data.company_id).maybeSingle(),
      sb.from("action_plans").select("id, title, status, sector, created_at, updated_at, expected_benefit").eq("company_id", data.company_id).or(`created_at.gte.${fromIso},updated_at.gte.${fromIso}`).lte("updated_at", toIso),
      sb.from("root_cause_analyses").select("id, problem, conclusion, created_at").eq("company_id", data.company_id).gte("created_at", fromIso).lte("created_at", toIso),
      sb.from("pain_points").select("id, description, severity, created_at").eq("company_id", data.company_id).gte("created_at", fromIso).lte("created_at", toIso),
      sb.from("improvement_opportunities").select("id, title, status, sector, expected_benefit, created_at").eq("company_id", data.company_id).gte("created_at", fromIso).lte("created_at", toIso),
      sb.from("indicators").select("id, name, code, unit, target, direction").eq("company_id", data.company_id).order("name"),
      sb.from("work_hours").select("hours, activity_type, responsible, work_date").eq("company_id", data.company_id).gte("work_date", from).lte("work_date", to),
    ]);
    for (const result of [company, plans, causes, pains, opportunities, indicators, hours]) if (result.error) throw new Error(result.error.message);
    const indicatorIds = (indicators.data ?? []).map((row: any) => row.id);
    const collections = indicatorIds.length ? await sb.from("indicator_collections").select("indicator_id, value, submitted_at, evaluation").in("indicator_id", indicatorIds).gte("submitted_at", fromIso).lte("submitted_at", toIso).order("submitted_at") : { data: [], error: null };
    if (collections.error) throw new Error(collections.error.message);
    const [companyLogo, consultancyLogo] = await Promise.all([
      logoDataUrl(sb, company.data?.public_company_logo_url), logoDataUrl(sb, company.data?.public_consultancy_logo_url),
    ]);
    return {
      company: company.data ? { id: company.data.id, name: company.data.name, title: company.data.public_title || company.data.name, company_logo: companyLogo, consultancy_logo: consultancyLogo } : null,
      period: { from, to, month: data.month }, plans: plans.data ?? [], causes: causes.data ?? [], pains: pains.data ?? [],
      opportunities: opportunities.data ?? [], indicators: indicators.data ?? [], collections: collections.data ?? [], hours: hours.data ?? [],
    };
  });

export const generateMonthlyExecutiveSummary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ company_id: z.string().uuid(), month: z.string().regex(/^\d{4}-\d{2}$/), facts: z.string().min(1).max(14000) }).parse(input))
  .handler(async ({ data, context }) => {
    await requireCompanyPermission(context.supabase, context.userId, data.company_id, "gestao");
    const key = process.env['LOVABLE_API_KEY'];
    if (!key) throw new Error("A geração inteligente não está configurada.");
    const response = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "fetch" },
      body: JSON.stringify({
        model: "openai/gpt-6-astra", stream: true,
        reasoning: { effort: "medium", summary: "auto" }, include: ["reasoning.encrypted_content"],
        input: [{ role: "user", content: [{ type: "input_text", text: `Escreva em português um sumário executivo mensal conciso, factual e sem inventar dados. Destaque valor gerado e gargalos tratados. Não mencione valores financeiros. Dados do período ${data.month}:\n${data.facts}` }] }],
      }),
    });
    if (!response.ok) {
      const safe = await response.text();
      throw new Error(safe.slice(0, 500) || "Não foi possível gerar o sumário.");
    }
    if (!response.body) throw new Error("A geração não retornou conteúdo.");
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let text = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const payload = line.slice(6);
        if (payload === "[DONE]") continue;
        try { const event = JSON.parse(payload); if (event.type === "response.output_text.delta") text += event.delta ?? ""; } catch { /* incomplete event */ }
      }
    }
    if (!text.trim()) throw new Error("A geração terminou sem texto disponível.");
    return { summary: text.trim() };
  });