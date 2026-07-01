import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const MODEL_FALLBACKS = [
  "google/gemini-2.5-flash",
  "google/gemini-3-flash-preview",
  "google/gemini-2.5-pro",
  "openai/gpt-5-mini",
] as const;

const Input = z.object({
  question: z.string().min(3).max(2000),
  scope: z.enum(["project", "process"]),
  scopeId: z.string().uuid(),
});

export const askConsultantAi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data, context }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY ausente");
    const sb = context.supabase;

    // Assemble grounded context (only real records — nunca inventar)
    let contextBlock = "";
    if (data.scope === "project") {
      const [proj, procs, inds, plans, pains, opps] = await Promise.all([
        sb.from("projects").select("name, description, responsible, status, companies(name)").eq("id", data.scopeId).maybeSingle(),
        sb.from("processes").select("name, objective, status").eq("project_id", data.scopeId).limit(50),
        sb.from("indicators").select("code, name, target, unit, frequency").eq("project_id", data.scopeId).limit(50),
        sb.from("action_plans").select("title, status, due_date, responsible").eq("project_id", data.scopeId).limit(50),
        sb.from("pain_points").select("description, category, severity").eq("project_id", data.scopeId).limit(50),
        sb.from("improvement_opportunities").select("title, category, expected_impact").eq("project_id", data.scopeId).limit(50),
      ]);
      contextBlock = JSON.stringify({
        projeto: proj.data,
        processos: procs.data ?? [],
        indicadores: inds.data ?? [],
        planos: plans.data ?? [],
        dores: pains.data ?? [],
        oportunidades: opps.data ?? [],
      });
    } else {
      const [proc, acts, pains, info, dec, inds] = await Promise.all([
        sb.from("processes").select("name, objective, status, project_id, companies(name)").eq("id", data.scopeId).maybeSingle(),
        sb.from("process_activities").select("name, type, responsible, time_va, time_nva, time_nnva").eq("process_id", data.scopeId).limit(80),
        sb.from("pain_points").select("description, category, severity").eq("source_id", data.scopeId).limit(50),
        sb.from("process_information_map").select("origin, destination, medium, responsible, document, loss_risk").eq("process_id", data.scopeId).limit(50),
        sb.from("process_decision_map").select("decision_point, decider, criteria, frequency").eq("process_id", data.scopeId).limit(50),
        sb.from("indicators").select("code, name, target, unit").eq("process_id", data.scopeId).limit(50),
      ]);
      contextBlock = JSON.stringify({
        processo: proc.data,
        atividades: acts.data ?? [],
        dores: pains.data ?? [],
        mapa_informacao: info.data ?? [],
        mapa_decisao: dec.data ?? [],
        indicadores: inds.data ?? [],
      });
    }

    const systemPrompt = `Você é um consultor sênior de melhoria contínua (Lean, Six Sigma, BPM).
REGRAS ESTRITAS:
- Responda APENAS com base nos dados fornecidos abaixo. NÃO invente informações.
- Se faltar evidência para uma resposta, diga claramente "Sem evidência nos dados atuais".
- Seja objetivo, use bullets, negrito nos pontos-chave. Máx. 400 palavras.
- Sempre que possível, cite o nome do processo, indicador ou plano correspondente.
- Formate em Markdown.`;

    let lastErr = "";
    for (const model of MODEL_FALLBACKS) {
      try {
        const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: `Contexto (JSON):\n${contextBlock}\n\nPergunta: ${data.question}` },
            ],
          }),
        });
        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          lastErr = `[${model}] ${res.status}: ${txt.slice(0, 200)}`;
          if (res.status === 429) throw new Error("Limite de IA atingido. Aguarde alguns minutos.");
          if (res.status === 402) throw new Error("Créditos de IA esgotados.");
          continue;
        }
        const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
        const answer = json.choices?.[0]?.message?.content?.trim() ?? "";
        if (!answer) { lastErr = `[${model}] resposta vazia`; continue; }
        return { answer, model };
      } catch (e: any) {
        if (e?.message?.startsWith("Limite") || e?.message?.startsWith("Créditos")) throw e;
        lastErr = `[${model}] ${e?.message ?? "erro"}`;
      }
    }
    throw new Error(`Nenhum modelo respondeu. ${lastErr}`);
  });
