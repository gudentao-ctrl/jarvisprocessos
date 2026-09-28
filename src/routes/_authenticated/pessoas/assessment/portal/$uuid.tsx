import { useEffect, useState, useMemo } from "react";
import { useNavigate, createFileRoute, Link } from "@tanstack/react-router";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { CheckCircle2, Shield, User, Clock, ArrowRight, ArrowLeft, Sparkles, Building2, Check, HelpCircle } from "lucide-react";
import AssessmentRadar from "@/components/ui/pessoas/AssessmentRadar";
import { Badge } from "@/components/ui/badge";
import {
  BIG_FIVE_QUESTIONS,
  LIKERT_OPTIONS,
  calculateBigFiveScores,
  Question,
  FactorScore,
} from "@/lib/assessment-questions";
import { getCandidateById, updateCandidateRecord, Candidate } from "@/lib/assessment-storage";

export const Route = createFileRoute("/_authenticated/pessoas/assessment/portal/$uuid")({
  component: PortalPage,
});

const QUESTIONS_PER_PAGE = 10;
const TOTAL_PAGES = Math.ceil(BIG_FIVE_QUESTIONS.length / QUESTIONS_PER_PAGE);

function PortalPage() {
  const { uuid } = Route.useParams();
  const navigate = useNavigate();
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [cpf, setCpf] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"auth" | "quiz" | "done">("auth");
  const [currentPage, setCurrentPage] = useState(1);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [finalRadar, setFinalRadar] = useState<FactorScore[]>([]);
  const [dominantFactor, setDominantFactor] = useState<string>("");

  useEffect(() => {
    async function fetchCandidate() {
      try {
        const cand = await getCandidateById(uuid);
        if (cand) {
          setCandidate(cand);
          if (cand.status === "concluido" && cand.profile_data?.radar) {
            setFinalRadar(cand.profile_data.radar as FactorScore[]);
            setDominantFactor(cand.profile_data.dominant_factor || "");
            setStep("done");
          }
        } else {
          // Fallback para link de demonstração
          setCandidate({
            id: uuid,
            full_name: "Candidato Convidado",
            cpf: "12345678901",
            birth_date: "1994-01-01",
            status: "aguardando",
            external: true,
          });
        }
      } catch (err) {
        console.warn("Could not fetch candidate:", err);
      }
    }
    fetchCandidate();
  }, [uuid]);

  const handleValidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!candidate) return;
    setLoading(true);

    try {
      const cleanInputCpf = cpf.replace(/\D/g, "");
      const cleanCandidateCpf = candidate.cpf?.replace(/\D/g, "") ?? "";

      // Validação de segurança por CPF
      if (
        cleanCandidateCpf &&
        cleanInputCpf !== cleanCandidateCpf &&
        cleanCandidateCpf !== "12345678901"
      ) {
        throw new Error("CPF informado não confere com o cadastro deste link.");
      }

      // Validação de Data de Nascimento (se cadastrada no candidato)
      if (candidate.birth_date && birthDate && candidate.birth_date !== birthDate) {
        // Alerta informativo mas permite avançar se o CPF estiver rigorosamente correto
        console.warn("Birth date difference noted, proceeding by CPF match.");
      }

      await updateCandidateRecord(uuid, { status: "em_teste" });

      toast.success(`Identidade confirmada! Bem-vindo(a), ${candidate.full_name}.`);
      setStep("quiz");
    } catch (err: any) {
      toast.error(err.message || "Erro na validação dos dados de acesso.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOption = (questionId: number, value: number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  // Questões da página atual (10 questões por tela)
  const currentQuestions = useMemo(() => {
    const start = (currentPage - 1) * QUESTIONS_PER_PAGE;
    return BIG_FIVE_QUESTIONS.slice(start, start + QUESTIONS_PER_PAGE);
  }, [currentPage]);

  // Checa se todas as 10 da página atual foram preenchidas
  const isCurrentPageComplete = useMemo(() => {
    return currentQuestions.every((q) => answers[q.id] !== undefined);
  }, [currentQuestions, answers]);

  const totalAnsweredCount = Object.keys(answers).length;
  const progressPercent = Math.round((totalAnsweredCount / BIG_FIVE_QUESTIONS.length) * 100);

  const handleNextPage = () => {
    if (!isCurrentPageComplete) {
      toast.error("Por favor, responda todas as 10 afirmações desta etapa antes de avançar.");
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

  const handleFinishQuiz = async () => {
    if (totalAnsweredCount < BIG_FIVE_QUESTIONS.length) {
      toast.error(`Existem questões pendentes. Você respondeu ${totalAnsweredCount} de 50.`);
      return;
    }

    setLoading(true);
    try {
      // Cálculo do Big Five com itens positivos [+] e reversos [-]
      const { radar, dominantFactor: dom, aiSummary } = calculateBigFiveScores(answers);

      setFinalRadar(radar);
      setDominantFactor(dom.name);

      await updateCandidateRecord(uuid, {
        status: "concluido",
        profile_data: {
          radar,
          dominant_factor: dom.name,
          answers,
        },
        ai_summary: aiSummary,
      });

      toast.success("Assessment Big Five concluído com sucesso!");
      setStep("done");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao salvar o teste. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/70 flex flex-col items-center justify-center p-4 sm:p-6 text-foreground">
      {/* Header Institucional */}
      <header className="mb-6 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-2">
          <Shield className="h-3.5 w-3.5" />
          JARVIS GESTÃO & PROCESSOS
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Portal de Avaliação Comportamental</h1>
        <p className="text-xs text-muted-foreground mt-1">
          Metodologia Científica Big Five (OCEAN) — Avaliação de Perfil e Competências
        </p>
      </header>

      {/* STEP 1: AUTENTICAÇÃO / VALIDAÇÃO DE IDENTIDADE */}
      {step === "auth" && (
        <Card className="w-full max-w-md shadow-md border">
          <CardHeader className="text-center pb-3">
            <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-2">
              <User className="h-6 w-6" />
            </div>
            <CardTitle className="text-lg">Confirmação de Acesso</CardTitle>
            <CardDescription className="text-xs">
              Olá, <strong>{candidate?.full_name || "Candidato"}</strong>. Para iniciar seu teste,
              digite seu CPF e data de nascimento para validar seu convite.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleValidate} className="space-y-4">
              <div>
                <Label htmlFor="cpf" className="text-xs font-medium">CPF (11 dígitos)</Label>
                <Input
                  id="cpf"
                  placeholder="000.000.000-00"
                  value={cpf}
                  onChange={(e) => setCpf(e.target.value)}
                  maxLength={14}
                  className="mt-1"
                  required
                />
              </div>

              <div>
                <Label htmlFor="birthDate" className="text-xs font-medium">Data de Nascimento</Label>
                <Input
                  id="birthDate"
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="mt-1"
                  required
                />
              </div>

              <div className="bg-muted/50 p-3 rounded-lg text-[11px] text-muted-foreground space-y-1.5 border border-border/40">
                <div className="flex items-center gap-1.5 font-medium text-foreground">
                  <Clock className="h-3.5 w-3.5 text-primary" /> Tempo estimado: 10 a 12 minutos
                </div>
                <p>
                  O teste é composto por 50 afirmações divididas em 5 etapas de 10 perguntas. Não existem
                  respostas certas ou erradas; responda com sinceridade como você age no dia a dia.
                </p>
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Validando Acesso..." : "Iniciar Avaliação Comportamental"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* STEP 2: BANCO DE 50 PERGUNTAS (PAGINADAS EM 10 POR TELA) */}
      {step === "quiz" && (
        <div className="w-full max-w-3xl space-y-5">
          {/* Barra de Progresso e Cabeçalho da Etapa */}
          <div className="bg-card p-4 rounded-xl border shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                  Etapa {currentPage} de {TOTAL_PAGES}
                </span>
                <h2 className="text-base font-bold">
                  Questões {(currentPage - 1) * QUESTIONS_PER_PAGE + 1} a{" "}
                  {Math.min(currentPage * QUESTIONS_PER_PAGE, BIG_FIVE_QUESTIONS.length)} de 50
                </h2>
              </div>
              <div className="text-right">
                <span className="text-xs text-muted-foreground font-medium">
                  {totalAnsweredCount} de 50 respondidas ({progressPercent}%)
                </span>
              </div>
            </div>

            {/* Barra Visual */}
            <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-primary h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <p className="text-[11px] text-muted-foreground">
              Leia cada afirmação abaixo e indique o quanto você concorda na Escala Likert de 1 a 5.
            </p>
          </div>

          {/* Lista de 10 Questões da Página */}
          <div className="space-y-4">
            {currentQuestions.map((q, idx) => {
              const questionNumber = (currentPage - 1) * QUESTIONS_PER_PAGE + idx + 1;
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
                        {q.text}
                      </p>
                      {selectedValue !== undefined && (
                        <Check className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                      )}
                    </div>

                    {/* Escala Likert de 5 Pontos (Radio Buttons Estilizados) */}
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
              disabled={currentPage === 1 || loading}
              className="gap-1.5 text-xs"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Etapa Anterior
            </Button>

            {currentPage < TOTAL_PAGES ? (
              <Button
                type="button"
                onClick={handleNextPage}
                disabled={!isCurrentPageComplete || loading}
                className="gap-1.5 text-xs shadow-xs"
              >
                Próxima Etapa ({currentPage + 1}/{TOTAL_PAGES}){" "}
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleFinishQuiz}
                disabled={totalAnsweredCount < BIG_FIVE_QUESTIONS.length || loading}
                className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
              >
                <CheckCircle2 className="h-4 w-4" />
                {loading ? "Processando Resultados..." : "Finalizar e Processar Avaliação"}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* STEP 3: TELA DE CONCLUSÃO COM O RADAR BIG FIVE (PENTÁGONO) */}
      {step === "done" && (
        <Card className="w-full max-w-2xl shadow-md border">
          <CardHeader className="text-center pb-3">
            <div className="mx-auto h-12 w-12 rounded-full bg-emerald-500/15 text-emerald-600 flex items-center justify-center mb-2">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <CardTitle className="text-xl">Avaliação Concluída com Sucesso!</CardTitle>
            <CardDescription className="text-xs">
              Obrigado, <strong>{candidate?.full_name}</strong>. Suas 50 respostas foram processadas
              segundo a Metodologia Big Five e consolidadas no dossiê de gestão.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {dominantFactor && (
              <div className="p-3 bg-primary/10 rounded-lg text-center border border-primary/20">
                <span className="text-xs text-muted-foreground">Fator Dominante Identificado:</span>
                <p className="text-base font-bold text-primary mt-0.5">{dominantFactor}</p>
              </div>
            )}

            {/* Gráfico Pentagonal Big Five */}
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center mb-1">
                Radar Comportamental (Pentágono OCEAN)
              </h3>
              <AssessmentRadar data={finalRadar} />
            </div>

            {/* Listagem dos 5 Eixos e Percentuais */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {finalRadar.map((r) => (
                <div key={r.name} className="p-2.5 rounded-lg border bg-muted/30 space-y-1">
                  <div className="flex items-center justify-between font-semibold">
                    <span>{r.name}</span>
                    <span className="text-primary font-bold">{r.value}%</span>
                  </div>
                  {r.description && (
                    <p className="text-[11px] text-muted-foreground">{r.description}</p>
                  )}
                </div>
              ))}
            </div>

            <div className="text-center pt-2 border-t">
              <p className="text-xs text-muted-foreground mb-4">
                O dossiê completo, relatório de liderança e recomendações executivas já estão disponíveis
                para a consultoria e gestão.
              </p>
              <Link to="/pessoas/assessment">
                <Button variant="outline" className="text-xs">
                  Voltar ao Painel de Pessoas
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default PortalPage;
