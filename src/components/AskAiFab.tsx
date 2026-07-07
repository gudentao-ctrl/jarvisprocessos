import { useMemo, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { askConsultantAi } from "@/lib/ask-ai.functions";
import { useActiveCompany } from "@/lib/active-company";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Loader2, X, Building2 } from "lucide-react";

type Props = {
  scope?: "project" | "process" | "company";
  scopeId?: string;
};

const QUICK_COMMANDS = [
  "Diagnosticar empresa",
  "Resumir situação",
  "Mostrar ações atrasadas",
  "Mostrar indicadores críticos",
  "Preparar reunião",
  "Gerar plano de ação",
  "Gerar relatório executivo",
  "Mostrar prioridades",
  "Mostrar riscos",
];

const COMMAND_PROMPTS: Record<string, string> = {
  "Diagnosticar empresa":
    "Faça um DIAGNÓSTICO COMPLETO desta empresa com base em TODOS os dados fornecidos (entrevistas, BPM, cronoanálises, indicadores, planos, agenda, horas, oportunidades, dores). Estruture em: ## Resumo Executivo, ## Principais Gargalos, ## Causas Prováveis, ## Processos Críticos, ## Riscos, ## Oportunidades, ## Prioridades, ## Quick Wins, ## Melhorias Estruturais, ## Próximos Passos.",
  "Resumir situação":
    "Resuma a situação atual da empresa em até 8 bullets, citando números reais (planos abertos/atrasados, indicadores fora da meta, horas, reuniões).",
  "Mostrar ações atrasadas":
    "Liste todos os planos de ação cujo due_date é anterior a hoje e status != 'concluido'. Formato: título, responsável, prazo, dias em atraso, processo/categoria.",
  "Mostrar indicadores críticos":
    "Liste indicadores fora da meta considerando direction (higher_better/lower_better) e a última coleta. Inclua: código, nome, meta, último valor, gap %, e indicadores sem coleta no período.",
  "Preparar reunião":
    "Prepare um briefing para a próxima reunião com o cliente com: ## Situação atual, ## Evolução desde a última visita, ## Pendências, ## Indicadores críticos, ## Planos atrasados, ## Assuntos prioritários, ## Perguntas sugeridas ao cliente.",
  "Gerar plano de ação":
    "Com base nas dores, indicadores fora da meta e gargalos identificados, sugira 3 a 5 planos de ação. Para cada um: **Problema**, **Causa provável**, **Objetivo**, **Responsável sugerido**, **Prazo sugerido (dias)**, **Prioridade**, **GUT (G/U/T de 1-5)**. Baseie tudo em dados reais.",
  "Gerar relatório executivo":
    "Gere um relatório executivo do período com seções: ## Resumo, ## Ações no período, ## Indicadores, ## Cronoanálise, ## Horas investidas, ## Recomendações. Cite números concretos.",
  "Mostrar prioridades":
    "Liste as 5 prioridades mais urgentes para o consultor tratar na próxima visita, ordenadas por impacto x urgência, com justificativa baseada nos dados.",
  "Mostrar riscos":
    "Identifique os principais riscos operacionais da empresa com base nos dados (processos sem indicador, indicadores sem coleta, dores severas sem plano, ações atrasadas antigas). Formato: risco, evidência, impacto potencial.",
};

// Guess module label from current path
function moduleFromPath(path: string): string {
  if (path.includes("/entrevistas")) return "Entrevistas";
  if (path.includes("/processos")) return "Processos / BPM";
  if (path.includes("/cronoanalise")) return "Cronoanálise";
  if (path.includes("/indicadores")) return "Indicadores";
  if (path.includes("/planos-acao")) return "Planos de ação";
  if (path.includes("/calendario")) return "Agenda";
  if (path.includes("/horas")) return "Horas";
  if (path.includes("/relatorio")) return "Relatórios";
  if (path.includes("/mapas/dores")) return "Mapa de dores";
  if (path.includes("/mapas/informacao")) return "Fluxo de informação";
  if (path.includes("/mapas/decisao")) return "Fluxo de decisão";
  if (path.includes("/analise-critica")) return "Análise crítica";
  if (path.includes("/oportunidades")) return "Oportunidades";
  if (path.includes("/causa-raiz")) return "Causa raiz";
  if (path.includes("/priorizacao")) return "Priorização";
  if (path.includes("/tobe")) return "TO BE";
  if (path.includes("/dashboard")) return "Dashboard";
  if (path.includes("/diagnostico")) return "Diagnóstico";
  if (path.includes("/roadmap")) return "Roadmap";
  if (path.includes("/fase/")) return "Fase";
  if (path.includes("/controle")) return "Controle";
  return "Aplicação";
}

const HIDDEN_PATHS = ["/auth"];

export function AskAiFab(props: Props = {}) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const { companyId, company } = useActiveCompany();
  const path = useRouterState({ select: (s) => s.location.pathname });

  const scope = props.scope ?? (companyId ? "company" : undefined);
  const scopeId = props.scopeId ?? (scope === "company" ? companyId ?? undefined : undefined);
  const moduleHint = useMemo(() => moduleFromPath(path), [path]);

  const ask = useServerFn(askConsultantAi);
  const mut = useMutation({
    mutationFn: (q: string) => {
      if (!scope || !scopeId) throw new Error("Selecione uma empresa para conversar com a IA");
      return ask({ data: { question: q, scope, scopeId, moduleHint } });
    },
    onSuccess: (r) => setAnswer(r.answer),
    onError: (e: any) => setAnswer(`⚠ ${e?.message ?? "Erro ao consultar IA"}`),
  });

  function submit(q: string) {
    const raw = q.trim();
    if (raw.length < 2) return;
    const finalPrompt = COMMAND_PROMPTS[raw] ?? raw;
    setQuestion(raw);
    setAnswer(null);
    mut.mutate(finalPrompt);
  }

  if (HIDDEN_PATHS.some((p) => path.startsWith(p))) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95 lg:bottom-8"
        aria-label="Perguntar à IA"
      >
        <Sparkles className="h-6 w-6" />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          className="max-h-[90vh] overflow-y-auto rounded-t-2xl pb-8 sm:max-w-xl sm:mx-auto"
        >
          <SheetHeader className="text-left">
            <SheetTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" /> Copiloto Jarvis
            </SheetTitle>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Building2 className="h-3.5 w-3.5" />
              {company?.name ?? "Nenhuma empresa selecionada"} · {moduleHint}
            </p>
          </SheetHeader>

          <div className="mt-4 space-y-4">
            {!companyId && (
              <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
                Selecione uma empresa no topo para que a IA responda com base nos dados reais.
              </div>
            )}

            <Textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Pergunte algo ou escolha um comando rápido…"
              className="min-h-20 text-base"
            />
            <Button
              onClick={() => submit(question)}
              disabled={mut.isPending || question.trim().length < 2 || !companyId}
              className="min-h-11 w-full"
            >
              {mut.isPending ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analisando dados…</>) : "Perguntar"}
            </Button>

            {!answer && !mut.isPending && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Comandos rápidos</p>
                <div className="flex flex-wrap gap-2">
                  {QUICK_COMMANDS.map((s) => (
                    <button
                      key={s}
                      onClick={() => submit(s)}
                      disabled={!companyId}
                      className="rounded-full border bg-secondary px-3 py-1.5 text-xs font-medium hover:bg-secondary/70 active:scale-95 disabled:opacity-40"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {mut.isPending && (
              <div className="rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground">
                Consultando os dados reais da empresa…
              </div>
            )}

            {answer && (
              <div className="rounded-xl border bg-muted/30 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Resposta</span>
                  <button onClick={() => setAnswer(null)} className="text-muted-foreground hover:text-foreground">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="prose prose-sm max-w-none whitespace-pre-wrap text-sm">{answer}</div>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
