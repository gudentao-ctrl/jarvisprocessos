import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function callGateway(systemPrompt: string, userPrompt: string) {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY ausente");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    if (res.status === 429) throw new Error("Limite de IA atingido. Tente novamente em instantes.");
    if (res.status === 402) throw new Error("Créditos de IA esgotados.");
    throw new Error(`Falha IA (${res.status}): ${txt.slice(0, 200)}`);
  }
  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return json.choices?.[0]?.message?.content ?? "{}";
}

/* ============================================================
 * ANÁLISE CRÍTICA DE PROCESSO → gera oportunidades
 * ============================================================ */

const FindingSchema = z.object({
  title: z.string(),
  description: z.string(),
  category: z.enum([
    "desperdicio", "gargalo", "retrabalho", "nva", "aprovacao_excesso",
    "transferencia_excesso", "conflito_responsabilidade", "ausencia_indicador",
    "ausencia_responsavel", "dependencia_pessoa", "risco",
  ]),
  expected_benefit: z.string().default(""),
  effort: z.enum(["baixo", "medio", "alto"]).default("medio"),
  impact: z.enum(["baixo", "medio", "alto"]).default("medio"),
});

const AnalysisSchema = z.object({ findings: z.array(FindingSchema).default([]) });

export const analyzeProcessCritically = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ process_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: proc, error } = await context.supabase
      .from("processes").select("*, companies(name)").eq("id", data.process_id).single();
    if (error) throw new Error(error.message);

    const [{ data: acts }, { data: edges }, { data: inds }, { data: cronos }, { data: pains }, { data: info }, { data: dec }] = await Promise.all([
      context.supabase.from("process_activities").select("type,title,responsible,area,time_minutes,description").eq("process_id", data.process_id).order("ordering"),
      context.supabase.from("process_edges").select("source_id,target_id,label").eq("process_id", data.process_id),
      context.supabase.from("indicators").select("name,target,unit,frequency").eq("process_id", data.process_id),
      context.supabase.from("cronoanalysis_sessions").select("activity_name,observation_date").eq("process_id", data.process_id),
      context.supabase.from("pain_points").select("description,category").eq("company_id", proc.company_id),
      context.supabase.from("process_information_map").select("info_name,source,destination").eq("process_id", data.process_id),
      context.supabase.from("process_decision_map").select("decision,criteria,responsible").eq("process_id", data.process_id),
    ]);

    const ctx = {
      processo: { nome: proc.name, objetivo: proc.objective, responsavel: proc.responsible },
      atividades: acts ?? [],
      arestas: (edges ?? []).length,
      indicadores: inds ?? [],
      tem_cronoanalise: (cronos ?? []).length > 0,
      dores: pains ?? [],
      mapa_informacao: info ?? [],
      mapa_decisao: dec ?? [],
    };

    const systemPrompt = `Você é um consultor sênior de processos. Analise o processo abaixo e identifique oportunidades de melhoria.

REGRAS:
- Use APENAS o que está nos dados. NÃO invente.
- Identifique: desperdícios, gargalos, retrabalhos, atividades sem valor (NVA), excesso de aprovações, excesso de transferências, conflitos de responsabilidade, ausência de indicadores, ausência de responsáveis, dependência de pessoa específica, riscos operacionais.
- Para cada finding, classifique categoria, esforço (baixo/medio/alto) e impacto (baixo/medio/alto).
- Seja objetivo e citável. Máximo 12 findings.

Responda APENAS JSON: { "findings": [ { "title", "description", "category", "expected_benefit", "effort", "impact" } ] }`;

    const raw = await callGateway(systemPrompt, JSON.stringify(ctx));
    let parsed;
    try { parsed = AnalysisSchema.parse(JSON.parse(raw)); } catch { throw new Error("Resposta da IA inválida."); }

    // Persist as opportunities (status sugerida, source ia)
    const inserts = parsed.findings.map((f) => {
      const impactMap: Record<string, number> = { baixo: 1, medio: 2, alto: 3 };
      const effortMap: Record<string, number> = { baixo: 3, medio: 2, alto: 1 };
      const score = impactMap[f.impact] * 3 + effortMap[f.effort] * 2;
      let priority: "baixa" | "media" | "alta" | "critica" = "media";
      if (score >= 14) priority = "critica"; else if (score >= 11) priority = "alta"; else if (score < 7) priority = "baixa";
      return {
        company_id: proc.company_id, process_id: proc.id,
        title: f.title, description: f.description, category: f.category,
        expected_benefit: f.expected_benefit, effort: f.effort, impact: f.impact,
        priority_score: score, priority, status: "sugerida" as const, source: "ia" as const,
        created_by: context.userId,
      };
    });
    if (inserts.length) await context.supabase.from("improvement_opportunities").insert(inserts);
    return { count: inserts.length, findings: parsed.findings };
  });

/* ============================================================
 * GERAR DIAGNÓSTICO EXECUTIVO
 * ============================================================ */

export const generateExecutiveDiagnostic = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ company_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const [{ data: comp }, { data: pains }, { data: procs }, { data: opps }, { data: rcas }, { data: cronos }] = await Promise.all([
      context.supabase.from("companies").select("name, sector").eq("id", data.company_id).single(),
      context.supabase.from("pain_points").select("description,category,severity").eq("company_id", data.company_id),
      context.supabase.from("processes").select("name,level,kind").eq("company_id", data.company_id),
      context.supabase.from("improvement_opportunities").select("title,description,category,priority,status,expected_benefit").eq("company_id", data.company_id),
      context.supabase.from("root_cause_analyses").select("problem,method,conclusion").eq("company_id", data.company_id),
      context.supabase.from("cronoanalysis_sessions").select("activity_name,total_observations").eq("company_id", data.company_id),
    ]);

    const ctx = { empresa: comp, dores: pains ?? [], processos: procs ?? [], oportunidades: opps ?? [], causas: rcas ?? [], cronoanalises: cronos ?? [] };

    const systemPrompt = `Você é um consultor de melhoria de processos. Gere um Diagnóstico Executivo objetivo, em português, usando APENAS os dados fornecidos.

Estruture a resposta em JSON com chaves:
- "resumo": parágrafo executivo (4-6 linhas)
- "principais_dores": array de strings (top 5)
- "causas_sistemicas": array de strings
- "processos_criticos": array de strings
- "gargalos": array de strings
- "riscos": array de strings
- "oportunidades": array de strings (top 8)
- "projetos_recomendados": array de { "nome", "descricao", "prazo": "curto"|"medio"|"longo" }

Use APENAS o que está nos dados. Seja conciso.`;

    const raw = await callGateway(systemPrompt, JSON.stringify(ctx));
    let content: Record<string, unknown> = {};
    try { content = JSON.parse(raw); } catch { throw new Error("Resposta da IA inválida."); }

    const { data: row, error } = await context.supabase.from("executive_diagnostics").insert({
      company_id: data.company_id,
      title: `Diagnóstico Executivo — ${comp?.name ?? ""}`,
      content,
      generated_at: new Date().toISOString(),
      created_by: context.userId,
    }).select().single();
    if (error) throw new Error(error.message);
    return row;
  });

/* ============================================================
 * SUGERIR TO BE A PARTIR DO AS IS
 * ============================================================ */

const TobeSuggestionSchema = z.object({
  process_name: z.string(),
  description: z.string().default(""),
  activities: z.array(z.object({
    type: z.enum(["start", "task", "decision", "wait", "approval", "end", "info_in", "info_out"]),
    title: z.string(),
    responsible: z.string().default(""),
    area: z.string().default(""),
    time_minutes: z.number().default(0),
    notes: z.string().default(""),
  })),
  changes: z.array(z.object({
    change_type: z.enum(["added", "removed", "modified", "simplified"]),
    target_ref: z.string(),
    problem_addressed: z.string(),
    expected_benefit: z.string(),
  })).default([]),
});

export const suggestTobeFromAsIs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ process_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: proc } = await context.supabase.from("processes").select("*").eq("id", data.process_id).single();
    if (!proc) throw new Error("Processo não encontrado");
    const { data: acts } = await context.supabase.from("process_activities")
      .select("type,title,responsible,area,time_minutes,notes").eq("process_id", data.process_id).order("ordering");
    const { data: opps } = await context.supabase.from("improvement_opportunities")
      .select("title,description,category,expected_benefit").eq("process_id", data.process_id).in("status", ["sugerida", "aprovada"]);

    const systemPrompt = `Você é um consultor de redesenho de processos. Proponha um TO BE para o processo a seguir, considerando as oportunidades já levantadas.

REGRAS:
- Eliminar atividades sem valor agregado, simplificar fluxos, reduzir aprovações redundantes, consolidar transferências, automatizar onde óbvio.
- Manter todas as atividades essenciais.
- Para cada alteração, registre em "changes" o que mudou e por quê.
- Tipos: start, task, decision, wait, approval, end, info_in, info_out.

Responda APENAS JSON: { "process_name", "description", "activities": [...], "changes": [...] }`;

    const raw = await callGateway(systemPrompt, JSON.stringify({ processo: proc, atividades_as_is: acts ?? [], oportunidades: opps ?? [] }));
    try { return TobeSuggestionSchema.parse(JSON.parse(raw)); } catch { throw new Error("Resposta da IA inválida."); }
  });
