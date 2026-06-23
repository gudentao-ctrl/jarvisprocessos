import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/* ============================================================
 * PIPELINE IA pós-entrevista
 * Gera, em uma única chamada: ata da reunião + processos +
 * atividades BPM + arestas + dores + indicadores sugeridos +
 * oportunidades + mapa de informação + mapa de decisão.
 *
 * Itens já validados pelo consultor (validated_at IS NOT NULL)
 * são preservados — só rascunhos da IA são substituídos.
 * ============================================================ */

const ActivityType = z.enum([
  "start", "task", "decision", "wait", "approval", "end", "info_in", "info_out",
]);

const ActivitySchema = z.object({
  ref: z.string(), // identificador local (ex: "a1")
  type: ActivityType.default("task"),
  title: z.string(),
  responsible: z.string().default(""),
  area: z.string().default(""),
  time_minutes: z.number().default(0),
  systems: z.array(z.string()).default([]),
  notes: z.string().default(""),
});

const EdgeSchema = z.object({
  from: z.string(),
  to: z.string(),
  label: z.string().default(""),
});

const ProcessSchema = z.object({
  name: z.string(),
  objective: z.string().default(""),
  responsible: z.string().default(""),
  inputs: z.string().default(""),
  outputs: z.string().default(""),
  activities: z.array(ActivitySchema).default([]),
  edges: z.array(EdgeSchema).default([]),
});

const PainSchema = z.object({
  category: z.string().default("operacional"),
  description: z.string(),
  severity: z.enum(["baixa", "media", "alta", "critica"]).default("media"),
});

const IndicatorSchema = z.object({
  name: z.string(),
  description: z.string().default(""),
  unit: z.string().default(""),
  target: z.string().default(""),
  frequency: z.string().default("mensal"),
  process_ref: z.string().nullable().optional(),
});

const OpportunitySchema = z.object({
  title: z.string(),
  description: z.string().default(""),
  category: z.string().default("melhoria"),
  expected_benefit: z.string().default(""),
  effort: z.enum(["baixo", "medio", "alto"]).default("medio"),
  impact: z.enum(["baixo", "medio", "alto"]).default("medio"),
  process_ref: z.string().nullable().optional(),
});

const InfoMapSchema = z.object({
  process_ref: z.string().nullable().optional(),
  origin: z.string().default(""),
  destination: z.string().default(""),
  medium: z.string().default(""),
  responsible: z.string().default(""),
  document: z.string().default(""),
  loss_risk: z.string().default(""),
  notes: z.string().default(""),
});

const DecisionMapSchema = z.object({
  process_ref: z.string().nullable().optional(),
  decider: z.string().default(""),
  decision: z.string(),
  approval_required: z.boolean().default(false),
  reported_delay: z.string().default(""),
  notes: z.string().default(""),
});

const PipelineSchema = z.object({
  minutes_md: z.string().default(""),
  processes: z.array(ProcessSchema).default([]),
  pains: z.array(PainSchema).default([]),
  indicators: z.array(IndicatorSchema).default([]),
  opportunities: z.array(OpportunitySchema).default([]),
  information_map: z.array(InfoMapSchema).default([]),
  decision_map: z.array(DecisionMapSchema).default([]),
});

const SYSTEM_PROMPT = `Você é um consultor de processos sênior. A partir de uma transcrição de entrevista operacional, gere TODOS os entregáveis abaixo em uma única resposta JSON.

REGRAS RÍGIDAS:
- Use APENAS o que está EXPLICITAMENTE na transcrição. NÃO invente nomes, sistemas, números ou pessoas.
- Quando faltar informação, deixe o campo vazio ("").
- Português do Brasil. Objetivo, conciso e citável.
- Cada processo deve ter ao menos uma atividade de tipo "start" no início e "end" no fim quando o fluxo for completo. Se for parcial, omita.
- Use os refs "a1", "a2", ... para ligar atividades em "edges". Refs de processo: "p1", "p2", ... (use process_ref para vincular indicadores/oportunidades/mapas).
- Severidade de dores: baixa, media, alta, critica.
- Esforço e impacto: baixo, medio, alto.

ESTRUTURA OBRIGATÓRIA:
{
  "minutes_md": "ata da reunião em markdown (## Participantes, ## Pontos discutidos, ## Decisões, ## Próximos passos, ## Citações relevantes)",
  "processes": [{ "name", "objective", "responsible", "inputs", "outputs", "activities": [{"ref","type","title","responsible","area","time_minutes","systems":[],"notes"}], "edges": [{"from","to","label"}] }],
  "pains": [{ "category", "description", "severity" }],
  "indicators": [{ "name", "description", "unit", "target", "frequency", "process_ref" }],
  "opportunities": [{ "title", "description", "category", "expected_benefit", "effort", "impact", "process_ref" }],
  "information_map": [{ "process_ref", "origin", "destination", "medium", "responsible", "document", "loss_risk", "notes" }],
  "decision_map": [{ "process_ref", "decider", "decision", "approval_required", "reported_delay", "notes" }]
}

Responda APENAS este JSON, sem cercas de código.`;

function hashString(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return String(h);
}

async function callGemini(systemPrompt: string, userPrompt: string, model = "google/gemini-2.5-pro") {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY ausente");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Lovable-API-Key": apiKey,
      "Content-Type": "application/json",
      "X-Lovable-AIG-SDK": "vercel-ai-sdk",
    },
    body: JSON.stringify({
      model,
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
    throw new Error(`Falha IA (${res.status}): ${txt.slice(0, 300)}`);
  }
  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return json.choices?.[0]?.message?.content ?? "{}";
}

export const generateArtifactsFromInterview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ interview_id: z.string().uuid(), force: z.boolean().optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: interview, error: ie } = await supabase
      .from("interviews")
      .select("id, title, company_id, sector_id, project_id, transcript_hash, generation_status")
      .eq("id", data.interview_id)
      .single();
    if (ie || !interview) throw new Error("Entrevista não encontrada");
    if (!interview.company_id) throw new Error("Vincule a entrevista a uma empresa antes de gerar.");

    const { data: t } = await supabase
      .from("transcripts")
      .select("content")
      .eq("interview_id", data.interview_id)
      .maybeSingle();
    const content = (t?.content ?? "").trim();
    if (content.length < 50) throw new Error("Transcrição vazia ou muito curta.");

    const hash = hashString(content);
    if (!data.force && interview.transcript_hash === hash && interview.generation_status === "done") {
      return { skipped: true, reason: "Transcrição inalterada — use 'Regenerar' para forçar." };
    }

    await supabase
      .from("interviews")
      .update({ generation_status: "running" })
      .eq("id", interview.id);

    let parsed: z.infer<typeof PipelineSchema>;
    try {
      const raw = await callGemini(SYSTEM_PROMPT, `Transcrição:\n\n${content}`);
      parsed = PipelineSchema.parse(JSON.parse(raw));
    } catch (e: any) {
      await supabase
        .from("interviews")
        .update({ generation_status: "failed" })
        .eq("id", interview.id);
      throw new Error("Falha ao gerar entregáveis: " + (e?.message ?? "desconhecido"));
    }

    const stats = {
      processes: 0, activities: 0, edges: 0, pains: 0,
      indicators: 0, opportunities: 0, info_map: 0, decision_map: 0,
    };

    // Salva ata na entrevista
    await supabase
      .from("interviews")
      .update({ minutes_md: parsed.minutes_md })
      .eq("id", interview.id);

    // Mapeia process_ref -> uuid criado
    const processIdByRef = new Map<string, string>();

    // PROCESSOS (apaga só rascunhos IA não validados desta entrevista)
    {
      const { data: existing } = await supabase
        .from("processes")
        .select("id")
        .eq("source_interview_id", interview.id)
        .eq("status", "draft");
      const ids = (existing ?? []).map((r) => r.id);
      if (ids.length) {
        // Apaga atividades/edges órfãs primeiro via cascade do FK
        await supabase.from("processes").delete().in("id", ids);
      }

      for (let i = 0; i < parsed.processes.length; i++) {
        const p = parsed.processes[i];
        const ref = `p${i + 1}`;
        const { data: created, error } = await supabase
          .from("processes")
          .insert({
            company_id: interview.company_id,
            project_id: interview.project_id ?? null,
            name: p.name,
            objective: p.objective,
            responsible: p.responsible,
            inputs: p.inputs,
            outputs: p.outputs,
            source_interview_id: interview.id,
            status: "draft",
            kind: "as_is",
            created_by: userId,
          })
          .select("id")
          .single();
        if (error || !created) continue;
        processIdByRef.set(ref, created.id);
        stats.processes++;

        // Atividades
        const actIdByRef = new Map<string, string>();
        for (let j = 0; j < p.activities.length; j++) {
          const a = p.activities[j];
          const { data: ar } = await supabase
            .from("process_activities")
            .insert({
              process_id: created.id,
              ordering: j,
              type: a.type,
              title: a.title,
              responsible: a.responsible,
              area: a.area,
              systems: a.systems,
              time_minutes: a.time_minutes,
              notes: a.notes,
              x: 100 + (j % 4) * 220,
              y: 80 + Math.floor(j / 4) * 140,
              generated_by_ai: true,
              source_interview_id: interview.id,
            })
            .select("id")
            .single();
          if (ar) {
            actIdByRef.set(a.ref, ar.id);
            stats.activities++;
          }
        }

        // Edges
        for (const e of p.edges) {
          const sid = actIdByRef.get(e.from);
          const tid = actIdByRef.get(e.to);
          if (!sid || !tid) continue;
          await supabase.from("process_edges").insert({
            process_id: created.id,
            source_id: sid,
            target_id: tid,
            label: e.label,
          });
          stats.edges++;
        }
      }
    }

    // DORES (substitui rascunhos IA desta entrevista)
    {
      await supabase
        .from("pain_points")
        .delete()
        .eq("source_interview_id", interview.id)
        .eq("generated_by_ai", true)
        .is("validated_at", null);
      const rows = parsed.pains.map((p) => ({
        company_id: interview.company_id!,
        project_id: interview.project_id ?? null,
        source: "interview",
        source_id: interview.id,
        category: p.category,
        description: p.description,
        severity: p.severity,
        generated_by_ai: true,
        source_interview_id: interview.id,
      }));
      if (rows.length) {
        const { error } = await supabase.from("pain_points").insert(rows);
        if (!error) stats.pains = rows.length;
      }
    }

    // INDICADORES sugeridos
    {
      await supabase
        .from("indicators")
        .delete()
        .eq("source_interview_id", interview.id)
        .eq("generated_by_ai", true)
        .is("validated_at", null);
      const rows = parsed.indicators.map((ind) => ({
        company_id: interview.company_id!,
        project_id: interview.project_id ?? null,
        process_id: ind.process_ref ? processIdByRef.get(ind.process_ref) ?? null : null,
        name: ind.name,
        description: ind.description,
        unit: ind.unit,
        target: ind.target,
        frequency: ind.frequency,
        generated_by_ai: true,
        source_interview_id: interview.id,
      }));
      if (rows.length) {
        const { error } = await supabase.from("indicators").insert(rows);
        if (!error) stats.indicators = rows.length;
      }
    }

    // OPORTUNIDADES
    {
      await supabase
        .from("improvement_opportunities")
        .delete()
        .eq("source_interview_id", interview.id)
        .eq("generated_by_ai", true)
        .is("validated_at", null);
      const impactMap: Record<string, number> = { baixo: 1, medio: 2, alto: 3 };
      const effortMap: Record<string, number> = { baixo: 3, medio: 2, alto: 1 };
      const rows = parsed.opportunities.map((o) => {
        const score = impactMap[o.impact] * 3 + effortMap[o.effort] * 2;
        let priority: "baixa" | "media" | "alta" | "critica" = "media";
        if (score >= 14) priority = "critica";
        else if (score >= 11) priority = "alta";
        else if (score < 7) priority = "baixa";
        return {
          company_id: interview.company_id!,
          project_id: interview.project_id ?? null,
          process_id: o.process_ref ? processIdByRef.get(o.process_ref) ?? null : null,
          title: o.title,
          description: o.description,
          category: o.category,
          expected_benefit: o.expected_benefit,
          effort: o.effort,
          impact: o.impact,
          priority_score: score,
          priority,
          source: "ia",
          status: "sugerida",
          created_by: userId,
          generated_by_ai: true,
          source_interview_id: interview.id,
        };
      });
      if (rows.length) {
        const { error } = await supabase.from("improvement_opportunities").insert(rows);
        if (!error) stats.opportunities = rows.length;
      }
    }

    // MAPA DE INFORMAÇÃO
    {
      await supabase
        .from("process_information_map")
        .delete()
        .eq("source_interview_id", interview.id)
        .eq("generated_by_ai", true)
        .is("validated_at", null);
      const rows = parsed.information_map
        .filter((m) => m.process_ref && processIdByRef.has(m.process_ref))
        .map((m) => ({
          process_id: processIdByRef.get(m.process_ref!)!,
          origin: m.origin,
          destination: m.destination,
          medium: m.medium,
          responsible: m.responsible,
          document: m.document,
          loss_risk: m.loss_risk,
          notes: m.notes,
          generated_by_ai: true,
          source_interview_id: interview.id,
        }));
      if (rows.length) {
        const { error } = await supabase.from("process_information_map").insert(rows);
        if (!error) stats.info_map = rows.length;
      }
    }

    // MAPA DE DECISÃO
    {
      await supabase
        .from("process_decision_map")
        .delete()
        .eq("source_interview_id", interview.id)
        .eq("generated_by_ai", true)
        .is("validated_at", null);
      const rows = parsed.decision_map
        .filter((m) => m.process_ref && processIdByRef.has(m.process_ref))
        .map((m) => ({
          process_id: processIdByRef.get(m.process_ref!)!,
          decider: m.decider,
          decision: m.decision,
          approval_required: m.approval_required,
          reported_delay: m.reported_delay,
          notes: m.notes,
          generated_by_ai: true,
          source_interview_id: interview.id,
        }));
      if (rows.length) {
        const { error } = await supabase.from("process_decision_map").insert(rows);
        if (!error) stats.decision_map = rows.length;
      }
    }

    await supabase
      .from("interviews")
      .update({
        generation_status: "done",
        generated_at: new Date().toISOString(),
        transcript_hash: hash,
      })
      .eq("id", interview.id);

    return { ok: true, stats };
  });
