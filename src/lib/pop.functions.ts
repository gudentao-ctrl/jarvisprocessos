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

const SYSTEM_PROMPT = `Você é um consultor sênior especialista em BPM, Arquitetura Organizacional, ISO 9001, Gestão por Processos e redação de Procedimentos Operacionais Padrão (POP) corporativos, com experiência em grandes indústrias e consultorias.

MISSÃO
Transformar a entrada recebida (descrição textual, fluxograma enviado ou fluxo mapeado no sistema) em um POP corporativo COMPLETO, TÉCNICO e PRONTO PARA USO OPERACIONAL — com qualidade suficiente para ser usado como manual de treinamento de novos colaboradores e para auditoria ISO 9001. NÃO produza um resumo do fluxo.

REGRAS ESTRITAS
- NUNCA invente fatos: nomes de pessoas, sistemas, prazos, números, códigos, setores ou aprovadores que não estejam na entrada.
- Quando um fato não estiver disponível, escreva exatamente: "${POP_UNKNOWN}".
- É PERMITIDO e ESPERADO expandir tecnicamente: detalhar COMO executar cada atividade, explicar boas práticas de gestão por processos, deduzir riscos operacionais típicos, pontos de controle e indicadores coerentes com as atividades descritas. Isso não é inventar fatos — mas deixe explícito quando for recomendação (ex.: "Recomenda-se ...").
- Linguagem impessoal, padronizada, verbo no infinitivo ("Receber", "Conferir", "Registrar").
- Cada etapa do procedimento operacional deve ter descrição RICA (3 a 6 frases), explicando entradas, execução passo a passo, conferências e o que fazer em exceções.
- Mínimo desejável: 6 a 20 etapas (se o fluxo for menor, desdobre as atividades em subações operacionais reais, sem inventar novas atividades de negócio).
- Regras de negócio, pontos de controle e riscos devem ser específicos ao processo, nunca genéricos vazios. Se não for possível identificar, informe que devem ser validados.
- Datas: se não houver informação, use "${POP_UNKNOWN}". Versão inicial é "1.0".
- Não use markdown nos valores. Responda SOMENTE com JSON válido, sem comentários.

FORMATO DE SAÍDA (JSON exato):
{
  "identification": {
    "process_name": string,
    "code": string,
    "version": string,
    "issue_date": string,
    "last_revision": string,
    "process_owner": string,
    "area": string,
    "prepared_by": string,
    "approved_by": string
  },
  "objective": string,            // parágrafo elaborado (4+ frases), não uma frase curta
  "scope": string,                // onde inicia, onde termina, setores participantes, situações de uso
  "definitions": [{ "term": string, "definition": string }],
  "responsibilities": [{ "role": string, "job_function": string, "responsibility": string }],
  "inputs": string[],             // documentos, sistemas, informações, requisitos, aprovações
  "steps": [{
    "title": string,
    "description": string,
    "responsible": string,
    "documents": string,
    "system": string,
    "decision_criteria": string,
    "expected_result": string
  }],
  "business_rules": string[],     // aprovações, exceções, obrigatoriedades, limites, validações
  "control_points": string[],     // conferências, validações, assinaturas, registros
  "risks": [{ "description": string, "impact": string, "mitigation": string }],
  "indicators": [{ "name": string, "description": string, "formula": string, "goal": string }],
  "outputs": string[],
  "systems": string[],
  "related_documents": string[],
  "attention_points": string[],
  "notes": string
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
