import { useState, useEffect, useMemo, useCallback } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CheckCircle2, Shield, ArrowRight, ArrowLeft, Check, Clock } from "lucide-react";
import { bancoQuestoes, LIKERT_OPTIONS } from "@/data/bancoQuestoes";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { getPublicAssessment, startPublicAssessment, savePublicAssessment, completePublicAssessment } from "@/lib/assessment.functions";

export const Route = createFileRoute("/teste/$id")({
  head: () => ({
    meta: [
      { title: "Avaliação de Perfil | Jarvis Processos" },
      { name: "description", content: "Avaliação individual de perfil profissional e comportamental." },
      { property: "og:title", content: "Avaliação de Perfil | Jarvis Processos" },
      { property: "og:description", content: "Acesso individual à avaliação de perfil profissional." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CandidatoTestePage,
});

const ITEMS_PER_PAGE = 10;
const TOTAL_PAGES = Math.ceil(bancoQuestoes.length / ITEMS_PER_PAGE); // 24 páginas

export default function CandidatoTestePage() {
  const { id } = Route.useParams();
  const loadAssessment = useServerFn(getPublicAssessment);
  const startAssessment = useServerFn(startPublicAssessment);
  const saveAssessment = useServerFn(savePublicAssessment);
  const completeAssessment = useServerFn(completePublicAssessment);
  const [candidate, setCandidate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [cpf, setCpf] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [consent, setConsent] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [isCompleted, setIsCompleted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadAssessment({ data: { token: id } })
      .then((cand) => {
        setCandidate(cand);
        setAnswers(cand.answers ?? {});
        setHasStarted(Boolean(cand.started_at));
        setIsCompleted(Boolean(cand.completed_at) || cand.status === "concluido");
        setStartTime(cand.started_at ? new Date(cand.started_at).getTime() : Date.now());
      })
      .catch(() => setLoadError("Este convite não está disponível."))
      .finally(() => setLoading(false));
  }, [id, loadAssessment]);

  const handleStart = async () => {
    const cpfDigits = cpf.replace(/\D/g, "");
    if (fullName.trim().length < 2 || !email.includes("@") || cpfDigits.length !== 11 || !birthDate || !consent) {
      toast.error("Preencha todos os dados e confirme o aceite antes de iniciar.");
      return;
    }
    setIsSubmitting(true);
    try {
      const row = await startAssessment({ data: { token: id, fullName: fullName.trim(), email: email.trim(), cpf: cpfDigits, birthDate, consentAccepted: true } });
      setCandidate(row);
      setHasStarted(true);
      setStartTime(row.started_at ? new Date(row.started_at).getTime() : Date.now());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível iniciar a avaliação.");
    } finally {
      setIsSubmitting(false);
    }
  };

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

  const persistProgress = useCallback(async (nextAnswers: Record<number, number>) => {
    try { await saveAssessment({ data: { token: id, answers: nextAnswers } }); } catch { toast.error("Não foi possível salvar seu progresso."); }
  }, [id, saveAssessment]);

  const handleNextPage = () => {
    if (!isCurrentPageComplete) {
      toast.error("Por favor, responda todas as afirmações desta tela antes de prosseguir.");
      return;
    }
    if (currentPage < TOTAL_PAGES) {
      void persistProgress(answers);
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

      await completeAssessment({ data: { token: id, answers, elapsedSeconds } });

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


  if (loading) return <div className="min-h-screen grid place-items-center text-sm text-muted-foreground">Carregando convite...</div>;
  if (loadError) return <div className="min-h-screen grid place-items-center p-6"><Card className="max-w-md p-8 text-center"><h1 className="text-xl font-bold">Convite indisponível</h1><p className="mt-2 text-sm text-muted-foreground">{loadError}</p></Card></div>;

  if (!hasStarted && !isCompleted) {
    const instructions = [
      "Leia atentamente as instruções antes do preenchimento.",
      "Você só pode clicar uma vez em iniciar.",
      "Responda em um momento sereno, sem interferências externas.",
      "Uma vez iniciada, a avaliação deve ser concluída; seu progresso será preservado em caso de falha técnica.",
      "Preferencialmente utilize um computador ou tablet.",
      "Não existem respostas certas ou erradas.",
      "Seja você mesmo(a): sua sinceridade faz diferença na análise.",
      "O uso é simples, rápido e intuitivo.",
    ];
    return (
      <div className="min-h-screen bg-muted/30 p-4 sm:p-8 grid place-items-center">
        <Card className="w-full max-w-3xl"><CardContent className="p-5 sm:p-8 space-y-6">
          <div><div className="flex items-center gap-2 text-primary text-xs font-semibold"><Shield className="h-4 w-4" /> JARVIS HUB DE PESSOAS</div><h1 className="mt-2 text-2xl font-bold">Antes de iniciar sua avaliação</h1><p className="mt-1 text-sm text-muted-foreground">Confirme seus dados e leia todas as orientações.</p></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><Label htmlFor="name">Nome completo</Label><Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={150} /></div>
            <div><Label htmlFor="email">E-mail</Label><Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={255} /></div>
            <div><Label htmlFor="cpf">CPF</Label><Input id="cpf" inputMode="numeric" value={cpf} onChange={(e) => setCpf(e.target.value)} maxLength={14} placeholder="000.000.000-00" /></div>
            <div><Label htmlFor="birth">Data de nascimento</Label><Input id="birth" type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} /></div>
          </div>
          <div className="rounded-lg border bg-muted/30 p-4"><h2 className="font-semibold">Instruções</h2><ul className="mt-3 space-y-2 text-sm text-muted-foreground">{instructions.map((item) => <li key={item} className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-primary mt-0.5" />{item}</li>)}</ul></div>
          <label className="flex items-start gap-3 rounded-lg border p-4 cursor-pointer"><Checkbox checked={consent} onCheckedChange={(value) => setConsent(value === true)} /><span className="text-sm">Eu li as instruções e concordo com o tratamento dos meus dados para esta avaliação, conforme a Política de Privacidade.</span></label>
          <Button className="w-full h-11" onClick={handleStart} disabled={isSubmitting || !consent}>{isSubmitting ? "Iniciando..." : "Iniciar avaliação"}<ArrowRight className="h-4 w-4 ml-2" /></Button>
          <p className="text-xs text-muted-foreground text-center">Avaliação confidencial para análise profissional.</p>
        </CardContent></Card>
      </div>
    );
  }

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
