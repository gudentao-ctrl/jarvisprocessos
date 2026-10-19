// src/components/nps/PublicSurveyView.tsx
// Componente Público e Anônimo para Resposta de Pesquisas NPS e eNPS (Estilo Typeform - One Question at a Time)

import { useState, useEffect, useMemo } from "react";
import { getPesquisaByHash, saveRespostaPublica } from "@/lib/nps-storage";
import { Pesquisa, PesquisaPergunta } from "@/lib/nps-types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Heart,
  Send,
  Star,
  Building2,
  Lock,
} from "lucide-react";

export interface PublicSurveyViewProps {
  hash: string;
}

export const Route = createFileRoute("/p/$hash")({
  head: () => ({
    meta: [
      { title: "Pesquisa de Satisfação | Maia Consultoria" },
      { name: "description", content: "Sua opinião é fundamental para aprimorarmos nossa entrega contínua." },
      { property: "og:title", content: "Pesquisa de Satisfação | Maia Consultoria" },
      { property: "og:description", content: "Sua opinião é fundamental para aprimorarmos nossa entrega contínua." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PublicSurveyView,
});

export function PublicSurveyView({ hash }: PublicSurveyViewProps) {
  const [pesquisa, setPesquisa] = useState<Pesquisa | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasStarted, setHasStarted] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, { valor_nota?: number; valor_texto?: string }>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  // Carrega a pesquisa pelo hash da URL
  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        // Verifica se já respondeu nesta sessão/navegador
        const alreadyAnswered = typeof window !== "undefined" ? localStorage.getItem(`maia_nps_answered_${hash}`) : null;
        if (alreadyAnswered) {
          setIsCompleted(true);
        }

        const data = await getPesquisaByHash(hash);
        setPesquisa(data);
      } catch (err) {
        console.error("Erro ao carregar pesquisa:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [hash]);

  const perguntas = useMemo(() => {
    return pesquisa?.perguntas || [];
  }, [pesquisa]);

  const currentQuestion: PesquisaPergunta | undefined = perguntas[currentQuestionIndex];
  const totalQuestions = perguntas.length;
  const progressPct = totalQuestions > 0 ? Math.round(((currentQuestionIndex + 1) / totalQuestions) * 100) : 0;

  // Cores dinâmicas configuradas pelo usuário (compatível com cor_fundo / bg_color)
  const cv = pesquisa?.config_visual as any;
  const visual = useMemo(() => {
    const bgColor = cv?.bg_color || cv?.cor_fundo || "#FFF8F5";
    const primaryColor = cv?.primary_color || cv?.cor_primaria || "#E05A10";
    const textColor = cv?.text_color || cv?.cor_texto || "#2B1B17";
    const cardBgColor = cv?.card_bg_color || (bgColor === "#3E100C" ? "#2B0B08" : "#FFFFFF");
    const welcomeMsg = cv?.welcome_msg || cv?.mensagem_boas_vindas || "Bem-vindo(a) à nossa pesquisa de satisfação!";
    const thanksMsg = cv?.thanks_msg || cv?.mensagem_agradecimento || "Muito obrigado pelas suas respostas!";
    const logoUrl = cv?.logo_url || "";

    return {
      bg_color: bgColor,
      primary_color: primaryColor,
      text_color: textColor,
      card_bg_color: cardBgColor,
      welcome_msg: welcomeMsg,
      thanks_msg: thanksMsg,
      logo_url: logoUrl,
    };
  }, [cv]);

  // Manipulação de resposta com auto-advance para classificações numéricas (300ms)
  const handleSelectScore = (perguntaId: string, nota: number) => {
    setAnswers((prev) => ({
      ...prev,
      [perguntaId]: { valor_nota: nota },
    }));

    // Auto-advance
    setTimeout(() => {
      if (currentQuestionIndex < totalQuestions - 1) {
        setCurrentQuestionIndex((prev) => prev + 1);
      }
    }, 300);
  };

  const handleTextChange = (perguntaId: string, texto: string) => {
    setAnswers((prev) => ({
      ...prev,
      [perguntaId]: { valor_texto: texto },
    }));
  };

  const handleNext = () => {
    if (!currentQuestion) return;

    // Validação de obrigatoriedade
    if (currentQuestion.obrigatorio) {
      const resp = answers[currentQuestion.id];
      if (!resp || (resp.valor_nota === undefined && !resp.valor_texto?.trim())) {
        toast.error("Por favor, responda esta pergunta antes de prosseguir.");
        return;
      }
    }

    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    }
  };

  const handleSubmit = async () => {
    if (!pesquisa) return;

    // Validação da última pergunta se obrigatória
    if (currentQuestion?.obrigatorio) {
      const resp = answers[currentQuestion.id];
      if (!resp || (resp.valor_nota === undefined && !resp.valor_texto?.trim())) {
        toast.error("Por favor, preencha a resposta antes de finalizar.");
        return;
      }
    }

    try {
      setIsSubmitting(true);
      const itens = Object.entries(answers).map(([pergunta_id, val]) => ({
        pergunta_id,
        valor_nota: val.valor_nota,
        valor_texto: val.valor_texto,
      }));

      await saveRespostaPublica(hash, itens);

      // Marca como respondido no navegador
      if (typeof window !== "undefined") {
        localStorage.setItem(`maia_nps_answered_${hash}`, "true");
      }
      setIsCompleted(true);
      toast.success("Respostas enviadas com sucesso!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao enviar respostas.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFF8F5] text-[#2B1B17]">
        <div className="text-center space-y-3">
          <div className="h-10 w-10 border-4 border-[#E05A10] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold">Carregando pesquisa...</p>
        </div>
      </div>
    );
  }

  if (!pesquisa) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFF8F5] p-6 text-[#2B1B17]">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-md border border-[#E5D5CE] text-center space-y-4">
          <div className="h-12 w-12 bg-[#3E100C]/10 text-[#3E100C] rounded-full flex items-center justify-center mx-auto">
            <Lock className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-bold">Pesquisa Não Encontrada ou Inativa</h2>
          <p className="text-xs text-muted-foreground">
            O link acessado pode ter expirado ou a pesquisa foi temporariamente desativada pela coordenação.
          </p>
        </div>
      </div>
    );
  }

  // Tela de Agradecimento Final
  if (isCompleted) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-6 transition-colors duration-500"
        style={{ backgroundColor: visual.bg_color, color: visual.text_color }}
      >
        <div
          className="max-w-lg w-full p-8 sm:p-10 rounded-3xl shadow-xl text-center space-y-5 animate-in fade-in zoom-in-95 duration-500"
          style={{ backgroundColor: visual.card_bg_color }}
        >
          {visual.logo_url && (
            <div className="flex items-center justify-center pb-3">
              <img
                src={visual.logo_url}
                alt="Logo do Cliente"
                className="max-h-48 sm:max-h-64 max-w-[500px] sm:max-w-[720px] object-contain drop-shadow-lg"
              />
            </div>
          )}

          <div
            className="h-16 w-16 rounded-full flex items-center justify-center mx-auto shadow-md"
            style={{ backgroundColor: visual.primary_color, color: "#FFFFFF" }}
          >
            <CheckCircle2 className="h-9 w-9" />
          </div>

          <h2 className="text-2xl font-black tracking-tight" style={{ color: visual.primary_color }}>
            Muito Obrigado!
          </h2>

          <p className="text-sm leading-relaxed opacity-90">
            {visual.thanks_msg || "Agradecemos imensamente pela sua participação! Suas respostas nos ajudam a evoluir continuamente."}
          </p>

          <div className="pt-2">
            <button
              type="button"
              onClick={() => {
                if (typeof window !== "undefined") {
                  localStorage.removeItem(`maia_nps_answered_${hash}`);
                }
                setIsCompleted(false);
                setHasStarted(false);
                setCurrentQuestionIndex(0);
                setAnswers({});
              }}
              className="text-[11px] underline opacity-70 hover:opacity-100 transition-opacity"
            >
              Enviar outra resposta
            </button>
          </div>
          <div className="pt-4 border-t border-black/10 flex items-center justify-center gap-1.5 text-xs opacity-75 font-medium">
            <Sparkles className="h-4 w-4" style={{ color: visual.primary_color }} />
            <span>Maia Consultoria Empresarial • Hub de Pessoas</span>
          </div>
        </div>
      </div>
    );
  }

  // Tela Inicial de Boas-Vindas
  if (!hasStarted) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-6 transition-colors duration-500"
        style={{ backgroundColor: visual.bg_color, color: visual.text_color }}
      >
        <div
          className="max-w-xl w-full p-8 sm:p-12 rounded-3xl shadow-xl space-y-6 text-center animate-in fade-in zoom-in-95 duration-500 border border-black/5"
          style={{ backgroundColor: visual.card_bg_color }}
        >
          {visual.logo_url && (
            <div className="flex items-center justify-center pb-4">
              <img
                src={visual.logo_url}
                alt="Logo do Cliente"
                className="max-h-48 sm:max-h-64 max-w-[500px] sm:max-w-[720px] object-contain drop-shadow-lg"
              />
            </div>
          )}

          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight mt-1">
              {pesquisa.titulo}
            </h1>
            {pesquisa.descricao && (
              <p className="text-xs sm:text-sm opacity-80 max-w-md mx-auto">
                {pesquisa.descricao}
              </p>
            )}
          </div>

          <div className="p-4 rounded-xl bg-black/5 text-xs leading-relaxed opacity-90">
            {visual.welcome_msg}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Button
              size="lg"
              onClick={() => setHasStarted(true)}
              className="w-full sm:w-auto h-12 px-8 font-bold text-sm rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95 text-white"
              style={{ backgroundColor: visual.primary_color }}
            >
              Iniciar Pesquisa
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>

          <div className="text-[11px] opacity-60 flex items-center justify-center gap-1.5">
            <Lock className="h-3.5 w-3.5" />
            <span>Acesso anônimo • Respostas 100% confidenciais</span>
          </div>
        </div>
      </div>
    );
  }

  // TELA DO RESPONDENTE (ESTILO TYPEFORM: ONE-AT-A-TIME)
  return (
    <div
      className="min-h-screen flex flex-col justify-between transition-colors duration-500"
      style={{ backgroundColor: visual.bg_color, color: visual.text_color }}
    >
      {/* Barra de Progresso Superior */}
      <div className="w-full bg-black/5 p-4 sm:px-8 border-b border-black/5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs font-semibold">
          <span style={{ color: visual.primary_color }}>Pergunta {currentQuestionIndex + 1}</span>
          <span className="opacity-40">/</span>
          <span className="opacity-60">{totalQuestions}</span>
        </div>

        <div className="w-48 sm:w-64">
          <Progress value={progressPct} className="h-2 rounded-full" />
        </div>

        <span className="text-xs font-mono font-bold opacity-80">{progressPct}%</span>
      </div>

      {/* Container Central com a Pergunta Única */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div
          className="max-w-2xl w-full p-6 sm:p-10 rounded-3xl shadow-xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300 border border-black/5"
          style={{ backgroundColor: visual.card_bg_color }}
        >
          {/* Logomarca da Empresa Centralizada e de Grande Destaque */}
          {visual.logo_url && (
            <div className="flex items-center justify-center pb-4 border-b border-black/10">
              <img
                src={visual.logo_url}
                alt="Logo do Cliente"
                className="max-h-28 sm:max-h-36 max-w-[320px] sm:max-w-[440px] object-contain drop-shadow-md"
              />
            </div>
          )}

          {/* Título da Questão Atual */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span
                className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full"
                style={{ backgroundColor: `${visual.primary_color}20`, color: visual.primary_color }}
              >
                {currentQuestionIndex + 1}
              </span>
              {currentQuestion?.obrigatorio && (
                <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider">
                  Obrigatória
                </span>
              )}
            </div>

            <h2 className="text-xl sm:text-2xl font-bold leading-tight">
              {currentQuestion?.titulo_pergunta}
            </h2>
          </div>

          {/* Renderização Dinâmica do Tipo de Resposta */}
          <div className="py-2">
            {/* TIPO 1: NPS SCORE (0 a 10) */}
            {currentQuestion?.tipo_resposta === "nps_score" && (
              <div className="space-y-3">
                <div className="grid grid-cols-6 sm:grid-cols-11 gap-1.5 sm:gap-2">
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => {
                    const isSelected = answers[currentQuestion.id]?.valor_nota === score;
                    return (
                      <button
                        key={score}
                        type="button"
                        onClick={() => handleSelectScore(currentQuestion.id, score)}
                        className={`h-11 sm:h-13 rounded-xl font-bold text-sm sm:text-base transition-all duration-200 border ${
                          isSelected
                            ? "text-white shadow-lg scale-105"
                            : "bg-black/5 hover:bg-black/10 border-black/10"
                        }`}
                        style={{
                          backgroundColor: isSelected ? visual.primary_color : undefined,
                          borderColor: isSelected ? visual.primary_color : undefined,
                        }}
                      >
                        {score}
                      </button>
                    );
                  })}
                </div>

                <div className="flex justify-between items-center text-[11px] opacity-70 px-1 pt-1 font-medium">
                  <span className="text-rose-600 font-semibold">0 - Nada provável</span>
                  <span className="text-emerald-600 font-semibold">10 - Extremamente provável</span>
                </div>
              </div>
            )}

            {/* TIPO 2: AVALIAÇÃO DE ESTRELAS / NOTA 1 A 5 */}
            {currentQuestion?.tipo_resposta === "rating" && (
              <div className="flex items-center justify-center gap-3 sm:gap-4 py-4">
                {[1, 2, 3, 4, 5].map((star) => {
                  const currentNota = answers[currentQuestion.id]?.valor_nota || 0;
                  const isFilled = star <= currentNota;
                  return (
                    <button
                      key={star}
                      type="button"
                      onClick={() => handleSelectScore(currentQuestion.id, star)}
                      className="p-2 sm:p-3 rounded-2xl hover:scale-125 transition-transform duration-200 focus:outline-none"
                    >
                      <Star
                        className={`h-9 w-9 sm:h-12 sm:w-12 transition-colors ${
                          isFilled ? "fill-amber-400 text-amber-400 drop-shadow" : "text-black/20"
                        }`}
                      />
                      <span className="block text-center text-xs font-bold mt-1 opacity-70">
                        {star}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* TIPO 3: TEXTO ABERTO */}
            {currentQuestion?.tipo_resposta === "text_open" && (
              <div className="space-y-2">
                <Textarea
                  rows={4}
                  value={answers[currentQuestion.id]?.valor_texto || ""}
                  onChange={(e) => handleTextChange(currentQuestion.id, e.target.value)}
                  placeholder={currentQuestion.placeholder || "Escreva sua resposta com sinceridade..."}
                  className="w-full text-sm sm:text-base p-4 rounded-2xl border-2 border-black/10 focus:border-opacity-100 bg-black/5 resize-none"
                  style={{
                    borderColor: answers[currentQuestion.id]?.valor_texto ? visual.primary_color : undefined,
                  }}
                />
              </div>
            )}

            {/* TIPO 4: MULTIPLA ESCOLHA (SELECIONAR UMA OPÇÃO) */}
            {currentQuestion?.tipo_resposta === "choice" && (
              <div className="space-y-2">
                {(currentQuestion.opcoes_lista || []).map((opcao, optIdx) => {
                  const isSelected = answers[currentQuestion.id]?.valor_texto === opcao;
                  return (
                    <button
                      key={optIdx}
                      type="button"
                      onClick={() => {
                        handleTextChange(currentQuestion.id, opcao);
                        setTimeout(() => {
                          if (currentQuestionIndex < totalQuestions - 1) {
                            setCurrentQuestionIndex((prev) => prev + 1);
                          }
                        }, 300);
                      }}
                      className={`w-full p-4 rounded-2xl text-left text-sm sm:text-base font-semibold border-2 transition-all flex items-center justify-between ${
                        isSelected
                          ? "text-white shadow-md"
                          : "bg-black/5 hover:bg-black/10 border-black/10"
                      }`}
                      style={{
                        backgroundColor: isSelected ? visual.primary_color : undefined,
                        borderColor: isSelected ? visual.primary_color : undefined,
                      }}
                    >
                      <span>{opcao}</span>
                      {isSelected && <CheckCircle2 className="h-5 w-5" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Navegação Inferior (Voltar / Avançar / Concluir) */}
          <div className="flex items-center justify-between pt-6 border-t border-black/10">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={currentQuestionIndex === 0}
              onClick={handlePrev}
              className="text-xs font-semibold opacity-70 hover:opacity-100"
            >
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Anterior
            </Button>

            {currentQuestionIndex < totalQuestions - 1 ? (
              <Button
                type="button"
                onClick={handleNext}
                className="font-bold text-xs sm:text-sm px-6 rounded-full shadow-md text-white"
                style={{ backgroundColor: visual.primary_color }}
              >
                Próxima
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            ) : (
              <Button
                type="button"
                disabled={isSubmitting}
                onClick={handleSubmit}
                className="font-bold text-xs sm:text-sm px-7 rounded-full shadow-lg text-white"
                style={{ backgroundColor: visual.primary_color }}
              >
                {isSubmitting ? (
                  "Enviando..."
                ) : (
                  <>
                    Finalizar Respostas
                    <Send className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Footer da Pesquisa Pública */}
      <footer className="w-full p-4 text-center text-xs opacity-60">
        <p>Pesquisa gerenciada via Plataforma Maia Consultoria Empresarial • Resposta 100% segura e anônima</p>
      </footer>
    </div>
  );
}
