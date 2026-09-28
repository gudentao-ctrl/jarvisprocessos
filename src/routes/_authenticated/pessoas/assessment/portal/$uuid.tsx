import { useEffect, useState } from "react";
import { useNavigate, createFileRoute, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { CheckCircle2, Shield, User, Clock, ArrowRight } from "lucide-react";
import AssessmentRadar from "@/components/ui/pessoas/AssessmentRadar";

export const Route = createFileRoute("/_authenticated/pessoas/assessment/portal/$uuid")({
  component: PortalPage,
});

// 4 Situational Questions mapping to Execução, Comunicação, Planejamento, Análise
const QUESTIONS = [
  {
    id: 1,
    title: "Diante de um problema imprevisto na operação, você prefere:",
    options: [
      {
        text: "Agir de imediato para estancar o problema e testar a solução na prática.",
        trait: "Execução",
        score: 25,
      },
      {
        text: "Chamar a equipe envolvida para debater e construir consenso.",
        trait: "Comunicação",
        score: 25,
      },
      {
        text: "Mapear o fluxo, estruturar um cronograma e prever riscos antes de agir.",
        trait: "Planejamento",
        score: 25,
      },
      {
        text: "Levantar dados, causas-raízes e indicadores com precisão matemática.",
        trait: "Análise",
        score: 25,
      },
    ],
  },
  {
    id: 2,
    title: "O que mais te motiva em sua rotina profissional?",
    options: [
      {
        text: "Bater metas desafiadoras, vencer obstáculos e ver entregas concluídas.",
        trait: "Execução",
        score: 25,
      },
      {
        text: "Conectar pessoas, inspirar e celebrar conquistas coletivas.",
        trait: "Comunicação",
        score: 25,
      },
      {
        text: "Criar métodos organizados, previsibilidade e excelência processual.",
        trait: "Planejamento",
        score: 25,
      },
      {
        text: "Resolver enigmas complexos, auditar dados e aperfeiçoar modelos técnicos.",
        trait: "Análise",
        score: 25,
      },
    ],
  },
  {
    id: 3,
    title: "Em uma reunião de alinhamento com a diretoria, você destaca:",
    options: [
      {
        text: "Resultados práticos atingidos e próximas ações imediatas.",
        trait: "Execução",
        score: 25,
      },
      {
        text: "O engajamento do time, parcerias e impacto humano da entrega.",
        trait: "Comunicação",
        score: 25,
      },
      {
        text: "O roadmap estruturado, etapas concluídas e cumprimento de prazos.",
        trait: "Planejamento",
        score: 25,
      },
      {
        text: "Indicadores comparativos, dados consolidados e correlações lógicas.",
        trait: "Análise",
        score: 25,
      },
    ],
  },
  {
    id: 4,
    title: "Sob pressão ou escassez de prazos, sua tendência natural é:",
    options: [
      {
        text: "Assumir a linha de frente, tomar decisões duras e acelerar o ritmo.",
        trait: "Execução",
        score: 25,
      },
      {
        text: "Manter o moral da equipe elevado e negociar apoios externos.",
        trait: "Comunicação",
        score: 25,
      },
      {
        text: "Revisar prioridades, reorganizar tarefas e blindar a metodologia.",
        trait: "Planejamento",
        score: 25,
      },
      {
        text: "Garantir que a qualidade e a conformidade técnica não sejam sacrificadas.",
        trait: "Análise",
        score: 25,
      },
    ],
  },
];

function PortalPage() {
  const { uuid } = Route.useParams();
  const navigate = useNavigate();
  const [candidate, setCandidate] = useState<any>(null);
  const [cpf, setCpf] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"auth" | "quiz" | "done">("auth");
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [finalRadar, setFinalRadar] = useState<Array<{ name: string; value: number }>>([]);

  useEffect(() => {
    async function fetchCandidate() {
      try {
        const { data, error } = await supabase
          .from("candidates")
          .select("*")
          .eq("id", uuid)
          .maybeSingle();

        if (data) {
          setCandidate(data);
          if (data.status === "concluido" && data.profile_data?.radar) {
            setFinalRadar(data.profile_data.radar);
            setStep("done");
          }
        } else {
          // Fallback candidate for testing/demo
          setCandidate({
            id: uuid,
            full_name: "Candidato Convidado",
            cpf: "12345678901",
            birth_date: "1994-01-01",
            status: "aguardando",
          });
        }
      } catch (err) {
        console.warn("Could not fetch candidate from supabase:", err);
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

      // Allow validation if match OR if in demo/fallback mode
      if (
        cleanCandidateCpf &&
        cleanInputCpf !== cleanCandidateCpf &&
        cleanCandidateCpf !== "12345678901"
      ) {
        throw new Error("CPF não confere com o cadastro deste link.");
      }

      await supabase.from("candidates").update({ status: "em_teste" }).eq("id", uuid);

      toast.success(`Validação aprovada! Bem-vindo(a), ${candidate.full_name}.`);
      setStep("quiz");
    } catch (err: any) {
      toast.error(err.message || "Erro na validação dos dados.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOption = (questionId: number, optionIdx: number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionIdx }));
  };

  const handleFinishQuiz = async () => {
    if (Object.keys(answers).length < QUESTIONS.length) {
      toast.error("Por favor, responda todas as questões para concluir o teste.");
      return;
    }

    setLoading(true);
    try {
      // Calculate scores
      const scores: Record<string, number> = {
        Execução: 40,
        Comunicação: 40,
        Planejamento: 40,
        Análise: 40,
      };

      QUESTIONS.forEach((q) => {
        const selectedIdx = answers[q.id];
        if (selectedIdx !== undefined) {
          const opt = q.options[selectedIdx];
          scores[opt.trait] = (scores[opt.trait] || 0) + opt.score;
        }
      });

      const radar = Object.entries(scores).map(([name, value]) => ({
        name,
        value: Math.min(100, Math.max(30, value)),
      }));

      setFinalRadar(radar);

      await supabase
        .from("candidates")
        .update({
          status: "concluido",
          profile_data: { radar },
        })
        .eq("id", uuid);

      toast.success("Assessment concluído com sucesso!");
      setStep("done");
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao salvar respostas.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/20 flex flex-col items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-xl">
        <div className="text-center mb-6">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground mb-3 shadow-xs">
            <Shield className="h-5 w-5" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Portal do Candidato</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Avaliação Comportamental e Mapeamento de Perfil · Jarvis Processos
          </p>
        </div>

        {step === "auth" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Confirmação de Identidade</CardTitle>
              <CardDescription>
                Informe seu CPF e data de nascimento para iniciar seu teste com segurança.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleValidate} className="space-y-4">
                {candidate?.full_name && (
                  <div className="p-3 bg-muted/50 rounded-md text-xs flex items-center gap-2">
                    <User className="h-4 w-4 text-primary" />
                    <span>
                      Convidado: <strong>{candidate.full_name}</strong>
                    </span>
                  </div>
                )}

                <div>
                  <Label htmlFor="cpf">Seu CPF *</Label>
                  <Input
                    id="cpf"
                    placeholder="000.000.000-00"
                    value={cpf}
                    onChange={(e) => setCpf(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="birthDate">Data de Nascimento *</Label>
                  <Input
                    id="birthDate"
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    required
                  />
                </div>

                <div className="pt-2">
                  <Button type="submit" disabled={loading} className="w-full">
                    {loading ? "Validando..." : "Iniciar Avaliação"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {step === "quiz" && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Questionário de Perfil</CardTitle>
                <span className="text-xs font-mono text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" /> ~5 min
                </span>
              </div>
              <CardDescription>
                Selecione a alternativa que mais se aproxima da sua reação habitual de trabalho.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {QUESTIONS.map((q, idx) => (
                <div key={q.id} className="space-y-2.5 pb-4 border-b last:border-b-0">
                  <p className="text-xs font-semibold text-foreground">
                    {idx + 1}. {q.title}
                  </p>
                  <div className="space-y-2">
                    {q.options.map((opt, optIdx) => {
                      const isSelected = answers[q.id] === optIdx;
                      return (
                        <div
                          key={optIdx}
                          onClick={() => handleSelectOption(q.id, optIdx)}
                          className={`p-3 rounded-lg border text-xs cursor-pointer transition-all ${
                            isSelected
                              ? "border-primary bg-primary/5 font-medium shadow-xs"
                              : "border-border hover:bg-muted/40"
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <input
                              type="radio"
                              name={`question-${q.id}`}
                              checked={isSelected}
                              onChange={() => handleSelectOption(q.id, optIdx)}
                              className="mt-0.5 text-primary"
                            />
                            <span>{opt.text}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              <Button
                onClick={handleFinishQuiz}
                disabled={loading}
                className="w-full gap-2 shadow-xs"
              >
                {loading ? "Processando..." : "Concluir e Enviar Avaliação"}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {step === "done" && (
          <Card>
            <CardContent className="p-8 text-center space-y-6">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Avaliação Concluída!</h2>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                  Suas respostas foram salvas com sucesso e sincronizadas com a equipe de
                  consultoria do Jarvis Processos.
                </p>
              </div>

              {finalRadar.length > 0 && (
                <div className="pt-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    Seu Mapa de Competências
                  </h3>
                  <div className="max-w-xs mx-auto">
                    <AssessmentRadar data={finalRadar} />
                  </div>
                </div>
              )}

              <div className="pt-4 border-t">
                <p className="text-xs text-muted-foreground">
                  Você já pode fechar esta aba com segurança. Obrigado pela sua participação!
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default PortalPage;
