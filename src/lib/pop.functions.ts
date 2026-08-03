import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { normalizePop, POP_UNKNOWN, type PopContent } from "@/lib/pop-types";

const MODEL_FALLBACKS = [
  "google/gemini-3-flash-preview",
  "google/gemini-2.5-flash",
  "google/gemini-2.5-pro",
] as const;

/* ---------------- CRUD ---------------- */

export const listPops = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ company_id: z.string().uuid().optional() }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("pops")
      .select("id, title, status, source_type, company_id, process_id, updated_at, companies(name), processes(name)")
      .order("updated_at", { ascending: false });
    if (data.company_id) q = q.eq("company_id", data.company_id);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getPop = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("pops")
      .select("*, companies(name), processes(name)")
      .eq("id", data.id)
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

const SaveInput = z.object({
  id: z.string().uuid().optional(),
  company_id: z.string().uuid().nullish(),
  project_id: z.string().uuid().nullish(),
  process_id: z.string().uuid().nullish(),
  title: z.string().min(1),
  status: z.enum(["rascunho", "aprovado"]).default("rascunho"),
  source_type: z.enum(["texto", "imagem", "fluxo"]).default("texto"),
  source_path: z.string().nullish(),
  content: z.record(z.string(), z.any()),
});

export const savePop = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SaveInput.parse(d))
  .handler(async ({ data, context }) => {
    const payload: any = {
      company_id: data.company_id ?? null,
      project_id: data.project_id ?? null,
      process_id: data.process_id ?? null,
      title: data.title,
      status: data.status,
      source_type: data.source_type,
      source_path: data.source_path ?? null,
      content: data.content,
    };
    if (data.id) {
      const { data: row, error } = await context.supabase
        .from("pops").update(payload).eq("id", data.id).select("id").single();
      if (error) throw new Error(error.message);
      return { id: row.id };
    }
    payload.created_by = context.userId;
    const { data: row, error } = await context.supabase
      .from("pops").insert(payload).select("id").single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const deletePop = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("pops").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ---------------- Geração com IA ---------------- */

const GenInput = z.object({
  mode: z.enum(["texto", "imagem", "fluxo"]),
  company_id: z.string().uuid().nullish(),
  process_id: z.string().uuid().nullish(),
  description: z.string().max(20000).optional(),
  file_data_url: z.string().max(14_000_000).optional(),
  file_name: z.string().max(200).optional(),
  current: z.record(z.string(), z.any()).optional(),
});

async function buildFlowContext(sb: any, processId: string) {
  const [{ data: process }, { data: activities }, { data: connections }, { data: infoMap }, { data: decisionMap }, { data: indicators }] =
    await Promise.all([
      sb.from("processes").select("name, objective, responsible, inputs, outputs, systems, companies(name)").eq("id", processId).maybeSingle(),
      sb.from("process_activities").select("ordering, type, title, description, responsible, area, systems, documents, inputs, outputs, problems, time_minutes").eq("process_id", processId).order("ordering"),
      sb.from("activity_connections").select("from_activity_id, to_activity_id, type, label").eq("process_id", processId),
      sb.from("process_information_map").select("origin, destination, medium, responsible, document").eq("process_id", processId).limit(50),
      sb.from("process_decision_map").select("decision, decider, criteria, frequency").eq("process_id", processId).limit(50),
      sb.from("indicators").select("name, unit, target").eq("process_id", processId).limit(30),
    ]);
  return { processo: process, atividades: activities ?? [], conexoes: connections ?? [], mapa_informacao: infoMap ?? [], mapa_decisao: decisionMap ?? [], indicadores: indicators ?? [] };
}

const SYSTEM_PROMPT = `Você é um especialista sênior em BPM e Gestão por Processos, responsável por redigir Procedimentos Operacionais Padrão (POP) corporativos.

REGRAS ESTRITAS:
- Baseie-se EXCLUSIVAMENTE nas informações fornecidas (texto, fluxograma enviado ou fluxo mapeado). NUNCA invente atividades, responsáveis, sistemas ou números.
- Se alguma informação não puder ser identificada, preencha o campo com exatamente: "${POP_UNKNOWN}".
- Identifique automaticamente as etapas do processo e organize o procedimento em linguagem clara, impessoal e padronizada (verbo no infinitivo).
- Sugira indicadores pertinentes ao processo (ex.: tempo médio de ciclo, SLA, retrabalho, demandas em atraso, volume executado), explicando brevemente cada um.
- Não use markdown nos valores. Responda SOMENTE com JSON válido.

FORMATO DE SAÍDA (JSON):
{
  "process_name": string,
  "objective": string,
  "scope": string,
  "responsibles": string[],
  "inputs": string[],
  "steps": [{ "title": string, "description": string, "responsible": string }],
  "outputs": string[],
  "attention_points": string[],
  "indicators": [{ "name": string, "description": string }]
}`;

function extractJson(text: string): any {
  const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  try { return JSON.parse(cleaned); } catch { /* continue */ }
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1));
  throw new Error("A IA retornou um formato inesperado. Tente novamente.");
}

export const generatePop = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => GenInput.parse(d))
  .handler(async ({ data, context }): Promise<PopContent> => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY ausente");

    const parts: any[] = [];
    let intro = "";

    if (data.mode === "fluxo") {
      if (!data.process_id) throw new Error("Selecione um processo com fluxo mapeado.");
      const ctx = await buildFlowContext(context.supabase, data.process_id);
      if (!ctx.atividades.length) throw new Error("Este processo ainda não possui atividades no fluxo.");
      intro = `Gere o POP a partir do fluxo mapeado no JARVIS (JSON):\n${JSON.stringify(ctx)}`;
    } else if (data.mode === "imagem") {
      if (!data.file_data_url) throw new Error("Envie um arquivo de fluxograma.");
      intro = "Interprete o fluxograma enviado em anexo e gere o POP correspondente.";
      const isPdf = data.file_data_url.startsWith("data:application/pdf");
      parts.push(
        isPdf
          ? { type: "file", file: { filename: data.file_name ?? "fluxograma.pdf", file_data: data.file_data_url } }
          : { type: "image_url", image_url: { url: data.file_data_url } },
      );
      if (data.description?.trim()) intro += `\n\nContexto adicional do usuário: ${data.description.trim()}`;
    } else {
      if (!data.description?.trim()) throw new Error("Descreva o processo.");
      intro = `Gere o POP a partir da seguinte descrição do processo:\n${data.description.trim()}`;
    }

    if (data.process_id && data.mode !== "fluxo") {
      const { data: p } = await context.supabase.from("processes").select("name, objective").eq("id", data.process_id).maybeSingle();
      if (p) intro += `\n\nProcesso vinculado no JARVIS: ${JSON.stringify(p)}`;
    }
    if (data.current && Object.keys(data.current).length) {
      intro += `\n\nO usuário já editou manualmente este POP. Preserve as edições coerentes e apenas complemente/refine:\n${JSON.stringify(data.current)}`;
    }

    const userContent = parts.length ? [{ type: "text", text: intro }, ...parts] : intro;

    let lastErr = "";
    for (const model of MODEL_FALLBACKS) {
      try {
        const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              { role: "user", content: userContent },
            ],
          }),
        });
        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          if (res.status === 429) throw new Error("Limite de IA atingido. Aguarde alguns minutos.");
          if (res.status === 402) throw new Error("Créditos de IA esgotados.");
          lastErr = `[${model}] ${res.status}: ${txt.slice(0, 200)}`;
          continue;
        }
        const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
        const answer = json.choices?.[0]?.message?.content?.trim() ?? "";
        if (!answer) { lastErr = `[${model}] resposta vazia`; continue; }
        return normalizePop(extractJson(answer));
      } catch (e: any) {
        if (e?.message?.startsWith("Limite") || e?.message?.startsWith("Créditos")) throw e;
        lastErr = `[${model}] ${e?.message ?? "erro"}`;
      }
    }
    throw new Error(`Não foi possível gerar o POP. ${lastErr}`);
  });
