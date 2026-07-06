import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const MODEL_FALLBACKS = [
  "google/gemini-3-flash-preview",
  "google/gemini-2.5-flash",
  "google/gemini-2.5-pro",
  "openai/gpt-5-mini",
] as const;

const Input = z.object({
  company_id: z.string().uuid(),
  from: z.string(),
  to: z.string(),
});

function compactContext(sb: any, from: string, to: string, company_id: string) {
  // We re-fetch here but with tighter projections to keep tokens small
  return Promise.all([
    sb.from("companies").select("name").eq("id", company_id).maybeSingle(),
    sb.from("interviews").select("title,participant,interview_date,status").eq("company_id", company_id)
      .gte("interview_date", from).lte("interview_date", to).limit(30),
    sb.from("processes").select("name,status,objective").eq("company_id", company_id).limit(40),
    sb.from("cronoanalysis_sessions").select("product,observation_date,machine").eq("company_id", company_id)
      .gte("observation_date", from).lte("observation_date", to).limit(20),
    sb.from("indicators").select("code,name,unit,target,direction").eq("company_id", company_id).limit(40),
    sb.from("action_plans").select("title,status,priority,responsible,due_date").eq("company_id", company_id).limit(60),
    sb.from("calendar_events").select("title,event_type,starts_at").eq("company_id", company_id)
      .gte("starts_at", `${from}T00:00:00Z`).lte("starts_at", `${to}T23:59:59Z`).limit(40),
    sb.from("work_hours").select("work_date,hours,activity_type,responsible").eq("company_id", company_id)
      .gte("work_date", from).lte("work_date", to).limit(80),
    sb.from("improvement_opportunities").select("title,category,status,expected_impact").eq("company_id", company_id).limit(40),
  ]);
}

export const generateReportNarrative = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data, context }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY ausente");

    const [company, interviews, processes, crono, indicators, plans, calendar, hours, opps] =
      await compactContext(context.supabase, data.from, data.to, data.company_id);

    const contextBlock = JSON.stringify({
      empresa: company.data?.name,
      periodo: { de: data.from, ate: data.to },
      entrevistas: interviews.data ?? [],
      processos: processes.data ?? [],
      cronoanalises: crono.data ?? [],
      indicadores: indicators.data ?? [],
      planos_acao: plans.data ?? [],
      agenda: calendar.data ?? [],
      horas: hours.data ?? [],
      oportunidades: opps.data ?? [],
    });

    const systemPrompt = `Você é um consultor sênior de melhoria contínua (Lean, Six Sigma, BPM) gerando um Relatório Executivo de Acompanhamento.

REGRAS ESTRITAS:
- Baseie-se APENAS nos dados fornecidos. NÃO invente informações, nomes, números ou processos.
- Se não houver dados para uma seção, diga "Sem evidência no período".
- Seja objetivo, direto e profissional. Use português brasileiro.
- Personalize para a empresa citada nos dados. Nunca use texto genérico.
- Cite nomes de processos, indicadores, planos ou responsáveis reais.

Retorne JSON válido no formato:
{
  "resumo_executivo": "parágrafo de 4-6 linhas com panorama do período",
  "gargalos": ["até 5 gargalos observados"],
  "riscos": ["até 5 riscos identificados"],
  "oportunidades": ["até 5 oportunidades relevantes"],
  "proximos_passos": ["até 6 próximos passos priorizados"],
  "recomendacoes": ["até 5 recomendações da consultoria"]
}`;

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
              { role: "user", content: `Dados (JSON):\n${contextBlock}\n\nGere o relatório em JSON estrito.` },
            ],
            response_format: { type: "json_object" },
          }),
        });
        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          lastErr = `[${model}] ${res.status}: ${txt.slice(0, 200)}`;
          if (res.status === 429) throw new Error("Limite de IA atingido. Aguarde alguns minutos.");
          if (res.status === 402) throw new Error("Créditos de IA esgotados.");
          continue;
        }
        const json = (await res.json()) as any;
        const content = json.choices?.[0]?.message?.content?.trim() ?? "";
        if (!content) { lastErr = `[${model}] vazio`; continue; }
        try {
          const parsed = JSON.parse(content);
          return {
            model,
            resumo_executivo: String(parsed.resumo_executivo ?? ""),
            gargalos: Array.isArray(parsed.gargalos) ? parsed.gargalos.map(String) : [],
            riscos: Array.isArray(parsed.riscos) ? parsed.riscos.map(String) : [],
            oportunidades: Array.isArray(parsed.oportunidades) ? parsed.oportunidades.map(String) : [],
            proximos_passos: Array.isArray(parsed.proximos_passos) ? parsed.proximos_passos.map(String) : [],
            recomendacoes: Array.isArray(parsed.recomendacoes) ? parsed.recomendacoes.map(String) : [],
          };
        } catch {
          lastErr = `[${model}] JSON inválido`;
          continue;
        }
      } catch (e: any) {
        if (e?.message?.startsWith("Limite") || e?.message?.startsWith("Créditos")) throw e;
        lastErr = `[${model}] ${e?.message ?? "erro"}`;
      }
    }
    throw new Error(`Nenhum modelo respondeu. ${lastErr}`);
  });
