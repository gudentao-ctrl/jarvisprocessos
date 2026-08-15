import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/* ============================================================
 * IA: gera Fluxo (novo modelo) diretamente em process_activities
 * + activity_connections + process_decisions para um processo.
 * ============================================================ */

const ACT_TYPES = ["start", "task", "decision", "wait", "approval", "end"] as const;
const CONN_TYPES = ["sequential", "decision", "parallel", "return", "subprocess"] as const;

const AiActivity = z.object({
  ref: z.string(),
  type: z.enum(ACT_TYPES).default("task"),
  title: z.string(),
  responsible: z.string().default(""),
  area: z.string().default(""),
  time_minutes: z.number().default(0),
  inputs: z.string().default(""),
  outputs: z.string().default(""),
  documents: z.array(z.string()).default([]),
  systems: z.array(z.string()).default([]),
  problems: z.string().default(""),
  improvements: z.string().default(""),
  notes: z.string().default(""),
  decision_question: z.string().optional().default(""),
});

const AiConnection = z.object({
  from: z.string(),
  to: z.string(),
  type: z.enum(CONN_TYPES).default("sequential"),
  label: z.string().default(""),
});

const AiFlow = z.object({
  activities: z.array(AiActivity),
  connections: z.array(AiConnection),
});

const SYSTEM = `Você é um consultor de processos sênior especializado em BPMN 2.0.
A partir do contexto abaixo, produza um fluxo COMPLETO e VÁLIDO em JSON.

REGRAS:
- Use exatamente uma atividade "start" e ao menos uma "end".
- Toda decisão precisa de decision_question e ao menos 2 saídas do tipo "decision" com labels distintos (ex: "Sim", "Não").
- Use tipos: start, task, decision, wait, approval, end.
- Conexões do tipo "parallel" para caminhos executados em paralelo; "return" para retrabalho; "subprocess" para chamadas a subprocessos; "sequential" para fluxo normal.
- Nunca invente números, sistemas ou pessoas: se faltar, deixe vazio.
- Português do Brasil, verbos no infinitivo nos títulos.

ESTRUTURA (responda APENAS este JSON, sem cercas):
{
  "activities": [
    { "ref": "a1", "type": "start", "title": "Início", "responsible": "", "area": "", "time_minutes": 0, "inputs": "", "outputs": "", "documents": [], "systems": [], "problems": "", "improvements": "", "notes": "", "decision_question": "" }
  ],
  "connections": [
    { "from": "a1", "to": "a2", "type": "sequential", "label": "" }
  ]
}`;

/** Extrai o primeiro objeto JSON válido de uma resposta (tolera cercas/ruído). */
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

async function callModel(model: string, user: string) {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY ausente");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Lovable-API-Key": key,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
      max_tokens: 8000,
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

/** Modelo rápido primeiro (evita estouro de tempo com contextos grandes),
 * com fallback para outro modelo caso a resposta venha inválida. */
async function callAi(user: string) {
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


export const generateFlowForProcess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      process_id: z.string().uuid(),
      description: z.string().optional().default(""),
      replace: z.boolean().optional().default(false),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase;

    const { data: proc, error: pe } = await sb
      .from("processes")
      .select("id, name, objective, responsible, inputs, outputs, description, source_interview_id")
      .eq("id", data.process_id)
      .single();
    if (pe || !proc) throw new Error("Processo não encontrado");

    // Reúne contexto: descrição do processo + trecho da entrevista (se houver).
    // Transcrições longas são condensadas (início + fim) para não estourar o
    // tamanho do pedido nem o tempo de resposta da IA.
    let transcript = "";
    if (proc.source_interview_id) {
      const { data: t } = await sb
        .from("transcripts")
        .select("content")
        .eq("interview_id", proc.source_interview_id)
        .maybeSingle();
      transcript = condense(t?.content ?? "", 6000);
    }

    const userMsg = [
      `Nome do processo: ${proc.name}`,
      proc.objective ? `Objetivo: ${proc.objective}` : "",
      proc.responsible ? `Responsável: ${proc.responsible}` : "",
      proc.inputs ? `Entradas: ${proc.inputs}` : "",
      proc.outputs ? `Saídas: ${proc.outputs}` : "",
      proc.description ? `Descrição: ${condense(proc.description, 2000)}` : "",
      data.description ? `Contexto adicional do consultor: ${condense(data.description, 2000)}` : "",
      transcript ? `\nTrecho da entrevista (referência):\n${transcript}` : "",
      "\nGere no máximo 25 atividades.",
    ].filter(Boolean).join("\n");

    const raw = await callAi(userMsg);
    let parsed: z.infer<typeof AiFlow>;
    try {
      parsed = AiFlow.parse(extractJson(raw));
    } catch (e: any) {
      throw new Error("IA retornou JSON inválido: " + (e?.message ?? ""));
    }

    if (parsed.activities.length === 0) throw new Error("IA não gerou atividades");

    // Se replace, apaga fluxo atual desse processo
    if (data.replace) {
      await sb.from("activity_connections").delete().eq("process_id", data.process_id);
      const { data: acts } = await sb
        .from("process_activities")
        .select("id")
        .eq("process_id", data.process_id);
      const ids = (acts ?? []).map((a) => a.id);
      if (ids.length) {
        await sb.from("process_decisions").delete().in("activity_id", ids);
        await sb.from("activity_links").delete().in("activity_id", ids);
        await sb.from("process_activities").delete().eq("process_id", data.process_id);
      }
    }

    // Descobre próximo ordering
    const { data: maxRow } = await sb
      .from("process_activities")
      .select("ordering")
      .eq("process_id", data.process_id)
      .order("ordering", { ascending: false })
      .limit(1)
      .maybeSingle();
    let nextOrder = (maxRow?.ordering ?? -1) + 1;

    // Cria atividades
    const idByRef = new Map<string, string>();
    for (const a of parsed.activities) {
      const { data: row, error } = await sb
        .from("process_activities")
        .insert({
          process_id: data.process_id,
          ordering: nextOrder++,
          type: a.type,
          title: a.title,
          responsible: a.responsible,
          area: a.area,
          time_minutes: a.time_minutes,
          inputs: a.inputs,
          outputs: a.outputs,
          documents: a.documents,
          systems: a.systems,
          problems: a.problems,
          improvements: a.improvements,
          notes: a.notes,
          generated_by_ai: true,
        })
        .select("id")
        .single();
      if (error || !row) continue;
      idByRef.set(a.ref, row.id);
      if (a.type === "decision" && a.decision_question) {
        await sb.from("process_decisions").insert({ activity_id: row.id, question: a.decision_question });
      }
    }

    // Cria conexões
    let orderIdx = 0;
    for (const c of parsed.connections) {
      const from = idByRef.get(c.from);
      const to = idByRef.get(c.to);
      if (!from || !to) continue;
      await sb.from("activity_connections").insert({
        process_id: data.process_id,
        from_activity_id: from,
        to_activity_id: to,
        type: c.type,
        label: c.label,
        order_index: orderIdx++,
      });
    }

    return {
      ok: true,
      activities: parsed.activities.length,
      connections: parsed.connections.length,
    };
  });
