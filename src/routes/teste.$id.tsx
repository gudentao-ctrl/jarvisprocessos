import { useState, useEffect, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CheckCircle2, Shield, ArrowRight, ArrowLeft, Check, Clock } from "lucide-react";
import { bancoQuestoes, LIKERT_OPTIONS } from "@/data/bancoQuestoes";
import { processAssessmentResults } from "@/utils/psychometrics";
import { getCandidateById, updateCandidateRecord } from "@/lib/assessment-storage";

export const Route = createFileRoute("/teste/$id")({
  component: CandidatoTestePage,
});

const ITEMS_PER_PAGE = 10;
const TOTAL_PAGES = Math.ceil(bancoQuestoes.length / ITEMS_PER_PAGE); // 24 páginas

export default function CandidatoTestePage() {
  const { id } = Route.useParams();
  const [candidate, setCandidate] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [startTime] = useState<number>(Date.now());
  const [isCompleted, setIsCompleted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function loadCand() {
      try {
        const cand = await getCandidateById(id);
        if (cand) {
          setCandidate(cand);
          if (cand.status === "concluido") {
            setIsCompleted(true);
          }
        } else {
          setCandidate({ id, full_name: "Candidato Convidado" });
        }
      } catch (err) {
        console.warn("Could not load candidate for teste:", err);
      }
    }
    loadCand();
  }, [id]);

  const currentQuestions = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return bancoQuestoes.slice(start, start + ITEMS_PER_PAGE);
  }, [currentPage]);

  const isCurrentPageComplete = useMemo(() => {
    return currentQuestions.every((q) => answers[q.id] !== undefined);
  }, [currentQuestions, answers]);

  const totalAnsweredCount = Object.keys(answers).length;
  const progressPercent = Math.round((totalAnsweredCount / bancoQuestoes.length) * 100);

  const handleSelectOption = (questionId: number, value: number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleNextPage = () => {
    if (!isCurrentPageComplete) {
      toast.error("Por favor, responda todas as afirmações desta tela antes de prosseguir.");
      return;
    }
    if (currentPage < TOTAL_PAGES) {
      setCurrentPage((p) => p + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage((p) => p - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleFinishAssessment = async () => {
    if (totalAnsweredCount < bancoQuestoes.length) {
      toast.error(`Existem afirmações pendentes. Você respondeu ${totalAnsweredCount} de ${bancoQuestoes.length}.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const elapsedSeconds = Math.max(60, Math.round((Date.now() - startTime) / 1000));

      const psychometricResults = processAssessmentResults(answers, elapsedSeconds, {
        id,
        nome: candidate?.full_name || "Colaborador Avaliado",
        cargoPretendido: candidate?.desired_role || candidate?.current_role || "Operações",
      });

      // Salva no banco de dados / storage com todas as métricas psicométricas calculadas para o consultor
      await updateCandidateRecord(id, {
        status: "concluido",
        profile_data: {
          psychometrics: psychometricResults,
          answers,
          radar: psychometricResults.disc.adaptado.map((d) => ({
            name: d.nome,
            value: d.valor,
            factor: d.fator,
          })),
          dominant_factor: psychometricResults.disc.estiloLideranca,
        },
        ai_summary: {
          natural: psychometricResults.parecerConsultor.sinteseQualitativa,
        },
      });

      // Regra de Ouro Psicométrica: O candidato NUNCA vê gráficos, escores ou relatórios.
      setIsCompleted(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      console.error(err);
      toast.error("Erro ao enviar respostas. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // =========================================================================
  // TELA DE CONCLUSÃO DO CANDIDATO (REGRA DE OURO PSICOMÉTRICA)
  // =========================================================================
  if (isCompleted) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 sm:p-6 text-foreground">
        <Card className="w-full max-w-lg shadow-md border text-center p-8 bg-card">
          <div className="mx-auto h-16 w-16 rounded-full bg-emerald-500/15 text-emerald-600 flex items-center justify-center mb-4">
            <CheckCircle2 className="h-10 w-10" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground mb-3">
            Avaliação Concluída!
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Sua avaliação foi concluída e enviada com sucesso ao consultor. Obrigado por sua participação!
          </p>
          <div className="mt-6 pt-6 border-t text-xs text-muted-foreground flex items-center justify-center gap-1.5">
            <Shield className="h-3.5 w-3.5 text-primary" />
            <span>Jarvis Processos & Gestão — Protocolo Seguro de Testagem</span>
          </div>
        </Card>
      </div>
    );
  }

  // =========================================================================
  // INTERFACE DE RESPOSTA DO QUESTIONÁRIO (10 ITENS POR TELA)
  // =========================================================================
  return (
    <div className="min-h-screen bg-slate-50/70 flex flex-col items-center justify-center p-4 sm:p-6 text-foreground">
      <header className="mb-6 text-center max-w-2xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-2">
          <Shield className="h-3.5 w-3.5" />
          JARVIS HUB DE PESSOAS — AVALIAÇÃO DE PERFIL
        </div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Questionário de Perfil Profissional</h1>
        <p className="text-xs text-muted-foreground mt-1">
          Leia cada afirmação com atenção e responda como você habitualmente se comporta no ambiente profissional.
        </p>
      </header>

      <div className="w-full max-w-3xl space-y-5">
        {/* Barra de Progresso e Indicador de Etapa */}
        <div className="bg-card p-4 rounded-xl border shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                Etapa {currentPage} de {TOTAL_PAGES}
              </span>
              <h2 className="text-base font-bold">
                Afirmações {(currentPage - 1) * ITEMS_PER_PAGE + 1} a{" "}
                {Math.min(currentPage * ITEMS_PER_PAGE, bancoQuestoes.length)} de {bancoQuestoes.length}
              </h2>
            </div>
            <div className="text-right">
              <span className="text-xs text-muted-foreground font-medium">
                {totalAnsweredCount} de {bancoQuestoes.length} respondidas ({progressPercent}%)
              </span>
            </div>
          </div>

          <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-primary h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Questões da Página (10 Itens) */}
        <div className="space-y-3.5">
          {currentQuestions.map((q, idx) => {
            const questionNumber = (currentPage - 1) * ITEMS_PER_PAGE + idx + 1;
            const selectedValue = answers[q.id];

            return (
              <Card
                key={q.id}
                className={`border transition-all ${
                  selectedValue !== undefined
                    ? "border-primary/40 bg-card shadow-xs"
                    : "border-border bg-card"
                }`}
              >
                <CardContent className="p-4 sm:p-5 space-y-3">
                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center mt-0.5">
                      {questionNumber}
                    </span>
                    <p className="text-sm font-medium leading-relaxed flex-1">
                      {q.texto}
                    </p>
                    {selectedValue !== undefined && (
                      <Check className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                    )}
                  </div>

                  {/* Escala Likert de 5 Opções */}
                  <div className="pt-2 border-t border-border/40">
                    <div className="grid grid-cols-5 gap-1.5 sm:gap-2 text-center">
                      {LIKERT_OPTIONS.map((opt) => {
                        const isSelected = selectedValue === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => handleSelectOption(q.id, opt.value)}
                            className={`p-2 sm:p-2.5 rounded-lg border text-xs flex flex-col items-center justify-center gap-1 transition-all ${
                              isSelected
                                ? "bg-primary text-primary-foreground border-primary shadow-xs font-semibold scale-[1.02]"
                                : "bg-background hover:bg-muted/60 text-muted-foreground hover:text-foreground border-input"
                            }`}
                          >
                            <span className="h-5 w-5 rounded-full border flex items-center justify-center text-xs font-bold border-current">
                              {opt.value}
                            </span>
                            <span className="text-[10px] sm:text-[11px] leading-tight line-clamp-2">
                              {opt.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Navegação entre Etapas */}
        <div className="flex items-center justify-between pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={handlePrevPage}
            disabled={currentPage === 1 || isSubmitting}
            className="gap-1.5 text-xs"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Etapa Anterior
          </Button>

          {currentPage < TOTAL_PAGES ? (
            <Button
              type="button"
              onClick={handleNextPage}
              disabled={!isCurrentPageComplete || isSubmitting}
              className="gap-1.5 text-xs shadow-xs"
            >
              Próxima Etapa ({currentPage + 1}/{TOTAL_PAGES}){" "}
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleFinishAssessment}
              disabled={totalAnsweredCount < bancoQuestoes.length || isSubmitting}
              className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
            >
              <CheckCircle2 className="h-4 w-4" />
              {isSubmitting ? "Enviando Avaliação..." : "Concluir e Enviar Avaliação"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
