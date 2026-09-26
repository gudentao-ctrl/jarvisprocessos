import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/** Reduz textos longos mantendo início e fim (o miolo é omitido). */
function condense(text: string, max: number): string {
  const s = String(text ?? "").trim();
  if (s.length <= max) return s;
  const head = Math.floor(max * 0.7);
  return `${s.slice(0, head)}\n[…trecho omitido…]\n${s.slice(-(max - head))}`;
}

/** Condensa qualquer payload de contexto para caber no limite de tokens. */
function condenseContext(ctx: unknown, max = 24000): string {
  return condense(JSON.stringify(ctx), max);
}

/** Extrai o primeiro objeto JSON válido (tolera cercas/ruído). */
function extractJson(raw: string): any {
  const s = String(raw ?? "").replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  try {
    return JSON.parse(s);
  } catch {
    const i = s.indexOf("{");
    const j = s.lastIndexOf("}");
    if (i >= 0 && j > i) return JSON.parse(s.slice(i, j + 1));
    throw new Error("resposta sem JSON");
  }
}

async function callModel(model: string, systemPrompt: string, userPrompt: string) {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY ausente");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Lovable-API-Key": apiKey,
      "Content-Type": "application/json",
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      max_tokens: 8000,
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

/** Modelo rápido primeiro, com fallback caso a resposta falhe. */
async function callGateway(systemPrompt: string, userPrompt: string) {
  const models = ["google/gemini-2.5-flash", "google/gemini-3-flash-preview"];
  let lastErr: unknown;
  for (const m of models) {
    try {
      return await callModel(m, systemPrompt, userPrompt);
    } catch (e) {
      lastErr = e;
      if (/Limite de IA|Créditos/.test((e as Error)?.message ?? "")) throw e;
    }
  }
  throw lastErr ?? new Error("Falha IA");
}

async function callAstraResponses(prompt: string) {
  const apiKey = process.env['LOVABLE_API_KEY'];
  if (!apiKey) throw new Error("A geração inteligente não está configurada.");
  const response = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
    method: "POST",
    headers: {
      "Lovable-API-Key": apiKey,
      "Content-Type": "application/json",
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify({
      model: "openai/gpt-6-astra",
      stream: true,
      store: false,
      reasoning: { effort: "medium", summary: "auto" },
      include: ["reasoning.encrypted_content"],
      input: [{ role: "user", content: [{ type: "input_text", text: prompt }] }],
    }),
  });
  if (!response.ok) {
    const safeMessage = (await response.text().catch(() => "")).slice(0, 500);
    if (response.status === 402) throw new Error(safeMessage || "Créditos de IA insuficientes.");
    if (response.status === 403) throw new Error(safeMessage || "A geração inteligente não está liberada.");
    if (response.status === 429) throw new Error(safeMessage || "Limite temporário de IA atingido. Tente novamente mais tarde.");
    throw new Error(safeMessage || "Não foi possível gerar o diagnóstico executivo.");
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
      try {
        const event = JSON.parse(payload);
        if (event.type === "response.output_text.delta") text += event.delta ?? "";
      } catch { /* event incompleto */ }
    }
  }
  if (!text.trim()) throw new Error("A geração terminou sem conteúdo disponível.");
  return text;
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

    const raw = await callGateway(systemPrompt, condenseContext(ctx));
    let parsed;
    try { parsed = AnalysisSchema.parse(extractJson(raw)); } catch { throw new Error("Resposta da IA inválida."); }

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
    const [{ data: comp }, { data: pains }, { data: procs }, { data: opps }, { data: rcas }, { data: cronos }, { data: interviews }, { data: previousDiagnostics }] = await Promise.all([
      context.supabase.from("companies").select("name").eq("id", data.company_id).single(),
      context.supabase.from("pain_points").select("description,category,severity").eq("company_id", data.company_id),
      context.supabase.from("processes").select("name,level,kind").eq("company_id", data.company_id),
      context.supabase.from("improvement_opportunities").select("title,description,category,priority,status,expected_benefit").eq("company_id", data.company_id),
      context.supabase.from("root_cause_analyses").select("problem,method,conclusion").eq("company_id", data.company_id),
      context.supabase.from("cronoanalysis_sessions").select("activity_name,total_observations").eq("company_id", data.company_id),
      context.supabase.from("interviews").select("id,title,participant,interview_date,interview_analysis(summary,insights,critical_points,pains,problems,decisions,flows,systems)").eq("company_id", data.company_id).order("interview_date"),
      context.supabase.from("executive_diagnostics").select("title,content,generated_at").eq("company_id", data.company_id).order("generated_at").limit(20),
    ]);

    const ctx = {
      empresa: comp,
      dores: (pains ?? []).slice(0, 80),
      processos: (procs ?? []).slice(0, 120),
      oportunidades: (opps ?? []).slice(0, 120),
      causas: (rcas ?? []).slice(0, 60),
      cronoanalises: (cronos ?? []).slice(0, 60),
      entrevistas_e_analises: (interviews ?? []).slice(0, 80),
      diagnosticos_anteriores: (previousDiagnostics ?? []).slice(0, 20),
    };

    const prompt = `Você é um consultor organizacional sênior. Cruze todas as análises de entrevistas e diagnósticos da empresa fornecidos abaixo e produza um relatório executivo em português brasileiro.

REGRAS OBRIGATÓRIAS:
- Use SOMENTE evidências presentes nos dados. Não invente fatos, avaliações, números ou elogios.
- Organize o relatório EXATAMENTE nos seis pilares abaixo, sem criar ou remover pilares.
- Em cada pilar, apresente primeiro características positivas, depois problemas identificados e depois propostas de intervenção.
- Quando não houver evidência para uma lista, retorne uma lista vazia.
- Cada problema e proposta deve permanecer como item separado.
- Retorne somente JSON válido, sem markdown.

Formato obrigatório:
{
  "resumo": "síntese executiva factual",
  "pilares": {
    "clareza_objetivos": { "positivos": [], "problemas": [], "intervencoes": [] },
    "relacionamento_comunicacao": { "positivos": [], "problemas": [], "intervencoes": [] },
    "remuneracao_reconhecimento": { "positivos": [], "problemas": [], "intervencoes": [] },
    "estrutura_fisica_pessoas": { "positivos": [], "problemas": [], "intervencoes": [] },
    "estilo_lideranca": { "positivos": [], "problemas": [], "intervencoes": [] },
    "processos_qualidade": { "positivos": [], "problemas": [], "intervencoes": [] }
  }
}

Os seis pilares são: Clareza dos objetivos da empresa; Relacionamento interpessoal e comunicação; Sistemas de remuneração, recompensas e reconhecimento; Análise da estrutura física e de pessoas; Estilo e impacto da liderança; Processos e qualidade.

Dados reais da empresa:
${condenseContext(ctx, 30000)}`;

    const PillarSchema = z.object({ positivos: z.array(z.string()), problemas: z.array(z.string()), intervencoes: z.array(z.string()) });
    const ExecutiveSchema = z.object({
      resumo: z.string(),
      pilares: z.object({
        clareza_objetivos: PillarSchema,
        relacionamento_comunicacao: PillarSchema,
        remuneracao_reconhecimento: PillarSchema,
        estrutura_fisica_pessoas: PillarSchema,
        estilo_lideranca: PillarSchema,
        processos_qualidade: PillarSchema,
      }),
    });
    let content: z.infer<typeof ExecutiveSchema>;
    try { content = ExecutiveSchema.parse(extractJson(await callAstraResponses(prompt))); }
    catch (error) {
      if (error instanceof Error && !error.message.includes("JSON")) throw error;
      throw new Error("A resposta do diagnóstico não veio no formato esperado.");
    }

    const { data: row, error } = await context.supabase.from("executive_diagnostics").insert({
      company_id: data.company_id,
      title: `Diagnóstico Executivo — ${comp?.name ?? ""}`,
      content: content as never,
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

    const raw = await callGateway(systemPrompt, condenseContext({ processo: { name: proc.name, objective: proc.objective, responsible: proc.responsible, description: condense(String(proc.description ?? ""), 3000) }, atividades_as_is: (acts ?? []).slice(0, 150), oportunidades: (opps ?? []).slice(0, 60) }));
    try { return TobeSuggestionSchema.parse(extractJson(raw)); } catch { throw new Error("Resposta da IA inválida."); }
  });
