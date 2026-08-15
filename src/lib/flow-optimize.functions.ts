import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/* IA "Otimizar Processo" — analisa o fluxo AS IS + indicadores + cronoanálise
 * e devolve achados categorizados com sugestões de melhoria.
 * Não altera dados: apenas retorna o relatório para revisão do consultor. */

const CATEGORIES = [
  "duplicidade",
  "retrabalho",
  "aprovacao_desnecessaria",
  "espera",
  "gargalo",
  "sem_valor_agregado",
  "automacao",
  "padronizacao",
] as const;

const Finding = z.object({
  category: z.enum(CATEGORIES),
  title: z.string(),
  description: z.string(),
  activity_titles: z.array(z.string()).default([]),
  impact: z.enum(["alto", "medio", "baixo"]).default("medio"),
  suggestion: z.string(),
});

const OptimizeResult = z.object({
  summary: z.string(),
  findings: z.array(Finding),
});

const SYSTEM = `Você é um consultor sênior em processos, Lean e BPMN 2.0.
Analise o processo AS IS e proponha melhorias objetivas.
Categorias: duplicidade, retrabalho, aprovacao_desnecessaria, espera, gargalo, sem_valor_agregado, automacao, padronizacao.
Para cada achado: aponte as atividades envolvidas, avalie o impacto (alto/medio/baixo) e escreva uma sugestão prática.
Português do Brasil. Responda APENAS o JSON no formato:
{
  "summary": "string curta",
  "findings": [
    { "category": "duplicidade", "title": "...", "description": "...", "activity_titles": ["..."], "impact": "alto", "suggestion": "..." }
  ]
}`;

function condense(text: string, max: number): string {
  const s = String(text ?? "").trim();
  if (s.length <= max) return s;
  const head = Math.floor(max * 0.7);
  return `${s.slice(0, head)}\n[…trecho omitido…]\n${s.slice(-(max - head))}`;
}

function extractJson(raw: string): any {
  const s = raw.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  try {
    return JSON.parse(s);
  } catch {
    const i = s.indexOf("{");
    const j = s.lastIndexOf("}");
    if (i >= 0 && j > i) return JSON.parse(s.slice(i, j + 1));
    throw new Error("resposta sem JSON");
  }
}

async function callModel(model: string, user: string): Promise<string> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY ausente");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Lovable-API-Key": key, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
      max_tokens: 6000,
    }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    if (res.status === 429) throw new Error("Limite de IA atingido. Aguarde alguns instantes.");
    if (res.status === 402) throw new Error("Créditos de IA esgotados.");
    throw new Error(`Falha IA (${res.status}): ${t.slice(0, 200)}`);
  }
  const j = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return j.choices?.[0]?.message?.content ?? "{}";
}

async function callAi(user: string): Promise<string> {
  const models = ["google/gemini-2.5-flash", "google/gemini-3-flash-preview"];
  let lastErr: any;
  for (const m of models) {
    try {
      return await callModel(m, user);
    } catch (e: any) {
      lastErr = e;
      if (/Limite de IA|Créditos/.test(e?.message ?? "")) throw e;
    }
  }
  throw lastErr ?? new Error("Falha IA");
}


export const optimizeProcess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ process_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    const pid = data.process_id;

    const [{ data: proc }, { data: acts }, { data: conns }, { data: decs }, { data: inds }, { data: cronos }] = await Promise.all([
      sb.from("processes").select("id, name, objective, description, responsible, inputs, outputs").eq("id", pid).single(),
      sb.from("process_activities").select("*").eq("process_id", pid).order("ordering"),
      sb.from("activity_connections").select("*").eq("process_id", pid).order("order_index"),
      sb.from("process_decisions").select("*"),
      sb.from("indicators").select("name, unit, target, direction").eq("process_id", pid).limit(30),
      sb.from("cronoanalysis_sessions").select("production_line, product, cycle_time_seconds, observation_date").eq("process_id", pid).limit(20),
    ]);

    if (!proc) throw new Error("Processo não encontrado");
    const activities = acts ?? [];
    const idToTitle = new Map<string, string>(activities.map((a: any) => [a.id, a.title]));

    const flowText = activities.map((a: any, i: number) => {
      const outs = (conns ?? []).filter((c) => c.from_activity_id === a.id).map((c) =>
        `→ ${idToTitle.get(c.to_activity_id) ?? "?"}${c.label ? ` [${c.label}]` : ""}${c.type !== "sequential" ? ` (${c.type})` : ""}`,
      ).join("  ");
      const dq = (decs ?? []).find((d) => d.activity_id === a.id)?.question;
      const meta = [
        a.responsible && `resp:${a.responsible}`,
        a.time_minutes && `${a.time_minutes}min`,
        a.problems && `problemas:${a.problems}`,
      ].filter(Boolean).join(" · ");
      return `${i + 1}. [${a.type}] ${a.title}${dq ? ` ?${dq}` : ""}${meta ? ` — ${meta}` : ""}${outs ? `\n   ${outs}` : ""}`;
    }).join("\n");

    const indsText = (inds ?? []).map((i: any) => `- ${i.name}${i.unit ? ` (${i.unit})` : ""}${i.target != null ? ` meta:${i.target}` : ""}`).join("\n");
    const cronoText = (cronos ?? []).map((c: any) => `- ${c.production_line ?? ""} ${c.product ?? ""} tc:${c.cycle_time_seconds ?? "-"}s`).join("\n");

    const userMsg = [
      `PROCESSO: ${proc.name}`,
      proc.objective ? `Objetivo: ${proc.objective}` : "",
      proc.description ? `Descrição: ${proc.description}` : "",
      "",
      "ATIVIDADES E FLUXO:",
      flowText || "(nenhuma)",
      indsText ? `\nINDICADORES:\n${indsText}` : "",
      cronoText ? `\nCRONOANÁLISE:\n${cronoText}` : "",
    ].filter(Boolean).join("\n");

    const raw = await callAi(userMsg);
    let parsed: z.infer<typeof OptimizeResult>;
    try {
      parsed = OptimizeResult.parse(JSON.parse(raw));
    } catch (e: any) {
      throw new Error("IA retornou JSON inválido: " + (e?.message ?? ""));
    }
    return parsed;
  });

/* Cria uma nova versão TO BE a partir do AS IS atual (snapshot), sem
 * alterar o processo original. Consultor aplica manualmente as melhorias
 * depois no próprio TO BE. */
export const createToBeVersionFromFindings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    process_id: z.string().uuid(),
    label: z.string().default("TO BE — Otimização IA"),
    notes: z.string().default(""),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    const [{ data: proc }, { data: acts }, { data: conns }, { data: decs }] = await Promise.all([
      sb.from("processes").select("*").eq("id", data.process_id).single(),
      sb.from("process_activities").select("*").eq("process_id", data.process_id),
      sb.from("activity_connections").select("*").eq("process_id", data.process_id),
      sb.from("process_decisions").select("*"),
    ]);
    const { count } = await sb
      .from("process_versions").select("*", { count: "exact", head: true }).eq("process_id", data.process_id);
    const version_no = (count ?? 0) + 1;
    const { data: row, error } = await sb.from("process_versions").insert({
      process_id: data.process_id,
      version_no,
      kind: "to_be",
      label: data.label,
      notes: data.notes,
      snapshot: {
        process: proc,
        activities: acts ?? [],
        connections: conns ?? [],
        decisions: decs ?? [],
      },
      created_by: context.userId,
    }).select().single();
    if (error) throw new Error(error.message);
    return row;
  });
