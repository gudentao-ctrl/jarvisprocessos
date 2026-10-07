// src/routes/p.$hash.tsx
// Rota Pública e Anônima para Resposta de Pesquisas NPS e eNPS (Estilo Typeform - One Question at a Time)

import { useState, useEffect, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
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

export const Route = createFileRoute("/p/$hash")({
  head: () => ({
    meta: [
      { title: "Pesquisa de Satisfação | Maia Consultoria" },
      { name: "description", content: "Sua opinião é fundamental para aprimorarmos nossa entrega contínua." },
    ],
  }),
  component: PublicSurveyView,
});

export default function PublicSurveyView() {
  const { hash } = Route.useParams();
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
        const alreadyAnswered = localStorage.getItem(`maia_nps_answered_${hash}`);
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

      await saveRespostaPublica(pesquisa.id, itens);

      // Marca como respondido no navegador
      localStorage.setItem(`maia_nps_answered_${hash}`, "true");
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
            <div className="flex items-center justify-center pb-2">
              <img
                src={visual.logo_url}
                alt="Logo do Cliente"
                className="max-h-20 sm:max-h-24 max-w-[260px] sm:max-w-[320px] object-contain drop-shadow-sm"
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
                localStorage.removeItem(`maia_nps_answered_${hash}`);
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
            <div className="flex items-center justify-center pb-2">
              <img
                src={visual.logo_url}
                alt="Logo do Cliente"
                className="max-h-24 sm:max-h-28 max-w-[280px] sm:max-w-[340px] object-contain drop-shadow-sm"
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
          {/* Logomarca da Empresa se configurada */}
          {visual.logo_url && (
            <div className="flex items-center justify-start pb-3 border-b border-black/5">
              <img
                src={visual.logo_url}
                alt="Logo do Cliente"
                className="max-h-20 sm:max-h-24 max-w-[260px] sm:max-w-[320px] object-contain drop-shadow-sm"
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
              {currentQuestion?.tituloPergunta || currentQuestion?.titulo_pergunta}
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

                <div className="flex justify-between text-[11px] opacity-70 px-1 font-medium">
                  <span>0 - Pouco Provável</span>
                  <span>5 - Neutro</span>
                  <span>10 - Altamente Provável</span>
                </div>
              </div>
            )}

            {/* TIPO 2: RATING (1 a 5 Estrelas ou Botões) */}
            {currentQuestion?.tipo_resposta === "rating" && (
              <div className="space-y-4">
                <div className="grid grid-cols-5 gap-2 sm:gap-3">
                  {[1, 2, 3, 4, 5].map((stars) => {
                    const isSelected = answers[currentQuestion.id]?.valor_nota === stars;
                    return (
                      <button
                        key={stars}
                        type="button"
                        onClick={() => handleSelectScore(currentQuestion.id, stars)}
                        className={`h-14 sm:h-16 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all duration-200 border ${
                          isSelected
                            ? "text-white shadow-lg scale-105"
                            : "bg-black/5 hover:bg-black/10 border-black/10"
                        }`}
                        style={{
                          backgroundColor: isSelected ? visual.primary_color : undefined,
                          borderColor: isSelected ? visual.primary_color : undefined,
                        }}
                      >
                        <Star className={`h-5 w-5 ${isSelected ? "fill-white" : "fill-transparent"}`} />
                        <span className="text-xs font-bold">{stars}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex justify-between text-[11px] opacity-70 px-1 font-medium">
                  <span>1 - Muito Baixo / Insatisfeito</span>
                  <span>5 - Excelente / Muito Satisfeito</span>
                </div>
              </div>
            )}

            {/* TIPO 3: LISTA DE SELEÇÃO / MÚLTIPLA ESCOLHA */}
            {currentQuestion?.tipo_resposta === "selecao_lista" && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 gap-2.5">
                  {(currentQuestion.opcoes_lista && currentQuestion.opcoes_lista.length > 0
                    ? currentQuestion.opcoes_lista
                    : ["Opção 1", "Opção 2", "Opção 3"]
                  ).map((opcao, opcIdx) => {
                    const isSelected = answers[currentQuestion.id]?.valor_texto === opcao;
                    return (
                      <button
                        key={opcIdx}
                        type="button"
                        onClick={() => {
                          handleTextChange(currentQuestion.id, opcao);
                          // Auto-advance suave após seleção
                          setTimeout(() => {
                            if (currentQuestionIndex < totalQuestions - 1) {
                              setCurrentQuestionIndex((prev) => prev + 1);
                            }
                          }, 320);
                        }}
                        className={`w-full text-left p-4 rounded-2xl font-medium text-sm sm:text-base flex items-center justify-between transition-all duration-200 border ${
                          isSelected
                            ? "text-white shadow-md scale-[1.01]"
                            : "bg-black/5 hover:bg-black/10 border-black/10"
                        }`}
                        style={{
                          backgroundColor: isSelected ? visual.primary_color : undefined,
                          borderColor: isSelected ? visual.primary_color : undefined,
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold font-mono ${
                              isSelected ? "bg-white text-black" : "bg-black/10 opacity-70"
                            }`}
                          >
                            {String.fromCharCode(65 + opcIdx)}
                          </span>
                          <span>{opcao}</span>
                        </div>
                        {isSelected && <CheckCircle2 className="h-5 w-5 text-white" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TIPO 4: TEXTO ABERTO (Textarea) */}
            {currentQuestion?.tipo_resposta === "text_open" && (
              <div className="space-y-2">
                <Textarea
                  rows={4}
                  value={answers[currentQuestion.id]?.valor_texto || ""}
                  onChange={(e) => handleTextChange(currentQuestion.id, e.target.value)}
                  placeholder={currentQuestion.placeholder || "Digite seus comentários aqui..."}
                  className="w-full text-sm leading-relaxed p-4 rounded-xl border border-black/20 focus:outline-none focus:ring-2 bg-black/5"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      if (currentQuestionIndex === totalQuestions - 1) {
                        handleSubmit();
                      } else {
                        handleNext();
                      }
                    }
                  }}
                />
                <span className="text-[11px] opacity-60 block text-right">
                  Dica: Pressione Enter para avançar
                </span>
              </div>
            )}
          </div>

          {/* Botões de Navegação Inferiores */}
          <div className="flex items-center justify-between pt-4 border-t border-black/10">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={currentQuestionIndex === 0}
              onClick={handlePrev}
              className="text-xs gap-1 font-medium disabled:opacity-30"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Anterior
            </Button>

            {currentQuestionIndex < totalQuestions - 1 ? (
              <Button
                type="button"
                size="sm"
                onClick={handleNext}
                className="h-9 px-5 text-xs font-bold rounded-full text-white shadow-md transition-transform hover:scale-105"
                style={{ backgroundColor: visual.primary_color }}
              >
                Próxima <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                disabled={isSubmitting}
                onClick={handleSubmit}
                className="h-10 px-6 text-xs font-black rounded-full text-white shadow-lg transition-transform hover:scale-105"
                style={{ backgroundColor: visual.primary_color }}
              >
                {isSubmitting ? "Enviando..." : "Enviar Respostas"}
                <Send className="h-3.5 w-3.5 ml-1.5" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Rodapé institucional sutil */}
      <div className="p-3 text-center text-[10px] opacity-60">
        Desenvolvido por Maia Consultoria Empresarial • Plataforma Jarvis
      </div>
    </div>
  );
}
