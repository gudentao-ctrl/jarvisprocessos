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
  question: z.string().min(2).max(2000),
  scope: z.enum(["project", "process", "company"]),
  scopeId: z.string().uuid(),
  moduleHint: z.string().max(80).optional(),
});

async function buildCompanyContext(sb: any, companyId: string) {
  const today = new Date().toISOString();
  const [
    company, projects, processes, indicators, collections, plans,
    interviews, calendar, hours, opps, pains, crono, cronoObs,
  ] = await Promise.all([
    sb.from("companies").select("id, name, description").eq("id", companyId).maybeSingle(),
    sb.from("projects").select("id, name, status, responsible").eq("company_id", companyId).limit(50),
    sb.from("processes").select("id, name, status, objective").eq("company_id", companyId).limit(100),
    sb.from("indicators").select("id, code, name, target, unit, frequency, direction").eq("company_id", companyId).limit(100),
    sb.from("indicator_collections").select("indicator_id, value, reference_period, submitted_at, evaluation").limit(500),
    sb.from("action_plans").select("id, title, status, priority, responsible, due_date, gut_score, process_id, category").eq("company_id", companyId).limit(200),
    sb.from("interviews").select("id, title, participant, interview_date, status, generation_status").eq("company_id", companyId).limit(80),
    sb.from("calendar_events").select("title, event_type, starts_at, ends_at, participants").eq("company_id", companyId).limit(80),
    sb.from("work_hours").select("work_date, hours, activity_type, responsible").eq("company_id", companyId).limit(200),
    sb.from("improvement_opportunities").select("title, category, status, expected_impact").eq("company_id", companyId).limit(80),
    sb.from("pain_points").select("description, category, severity, source_id").limit(200),
    sb.from("cronoanalysis_sessions").select("id, process_id, observation_date, product").eq("company_id", companyId).limit(50),
    sb.from("cronoanalysis_observations").select("session_id, activity, classification, time_minutes").limit(500),
  ]);

  // Scope collections by indicator ids that belong to this company
  const indIds = new Set((indicators.data ?? []).map((i: any) => i.id));
  const scopedCollections = (collections.data ?? []).filter((c: any) => indIds.has(c.indicator_id));

  const sessIds = new Set((crono.data ?? []).map((s: any) => s.id));
  const scopedObs = (cronoObs.data ?? []).filter((o: any) => sessIds.has(o.session_id));

  return {
    empresa: company.data,
    hoje: today,
    projetos: projects.data ?? [],
    processos: processes.data ?? [],
    indicadores: indicators.data ?? [],
    coletas_indicadores: scopedCollections,
    planos_acao: plans.data ?? [],
    entrevistas: interviews.data ?? [],
    agenda: calendar.data ?? [],
    horas: hours.data ?? [],
    oportunidades: opps.data ?? [],
    dores: pains.data ?? [],
    cronoanalises: crono.data ?? [],
    observacoes_crono: scopedObs,
  };
}

export const askConsultantAi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data, context }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY ausente");
    const sb = context.supabase;

    let contextBlock = "";
    if (data.scope === "company") {
      contextBlock = JSON.stringify(await buildCompanyContext(sb, data.scopeId));
    } else if (data.scope === "project") {
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

    const systemPrompt = `Você é o copiloto de consultoria da Jarvis Processos — especialista em Lean, Six Sigma e BPM.
REGRAS ESTRITAS:
- Responda EXCLUSIVAMENTE com base nos dados JSON fornecidos abaixo. NUNCA invente informações, nomes ou números.
- Se faltar evidência, diga claramente "Sem evidência nos dados atuais" e sugira o que cadastrar.
- Cite explicitamente nomes de processos, indicadores, responsáveis, datas e planos quando existirem.
- Considere datas: um plano é "atrasado" quando due_date < hoje e status != 'concluido'. Um indicador é "abaixo da meta" conforme direction (higher_better/lower_better).
- Seja objetivo, direto, use bullets e negrito nos pontos-chave. Formate em Markdown.
- Máx. 500 palavras. Ao gerar diagnóstico ou plano de ação completo, use seções claras (## Título).
${data.moduleHint ? `- Contexto do usuário: está no módulo "${data.moduleHint}".` : ""}`;

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
              { role: "user", content: `Dados da empresa (JSON):\n${contextBlock}\n\nPergunta / comando: ${data.question}` },
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
