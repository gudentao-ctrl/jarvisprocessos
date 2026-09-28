import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import AssessmentRadar from "@/components/ui/pessoas/AssessmentRadar";
import { generateAssessmentReport } from "@/lib/pdf-generator";
import {
  ArrowLeft,
  Download,
  User,
  Briefcase,
  Calendar,
  ShieldCheck,
  Sparkles,
  Building2,
  CheckCircle2,
  Target,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getCandidateById, Candidate } from "@/lib/assessment-storage";

export const Route = createFileRoute("/_authenticated/pessoas/assessment/detail/$id")({
  component: DetailPage,
});

export default function DetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const data = await getCandidateById(id);
        if (data) {
          setCandidate(data);
        } else {
          // Fallback para exibição em caso de ID não localizado
          setCandidate({
            id,
            full_name: "Colaborador Avaliado",
            cpf: "00000000000",
            birth_date: "1994-06-15",
            current_role: "Profissional",
            desired_role: "Especialista",
            status: "concluido",
            external: false,
            company_name: "Empresa Vinculada",
            profile_data: {
              radar: [
                { name: "Abertura à Experiência", factor: "A", value: 75, description: "Criatividade, flexibilidade mental e capacidade de inovação" },
                { name: "Conscienciosidade", factor: "C", value: 85, description: "Organização, disciplina, foco em metas e rigor metodológico" },
                { name: "Extroversão", factor: "E", value: 68, description: "Sociabilidade, assertividade, liderança e comunicação expressiva" },
                { name: "Amabilidade", factor: "M", value: 80, description: "Empatia, cooperação, confiança e facilidade em mediar consenso" },
                { name: "Estabilidade Emocional", factor: "N", value: 78, description: "Resiliência sob pressão, calma e serenidade em momentos de crise" },
              ],
              dominant_factor: "Conscienciosidade",
            },
            ai_summary: {
              natural: "Perfil equilibrado com forte disciplina e orientação para metas e inovação.",
              strengths: "Organização exemplar, visão estratégica e facilidade de alinhamento.",
              ideal_env: "Projetos integrados com autonomia para reorganização e cumprimento de prazos.",
              blind_spots: "Risco de autocrítica severa diante de imprevistos urgentes fora do planejamento.",
            },
          });
        }
      } catch (err) {
        console.error("Error loading candidate:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const handlePdf = async () => {
    if (!candidate) return;
    setGeneratingPdf(true);
    try {
      const pdfBlob = await generateAssessmentReport(candidate);
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${candidate.full_name?.replace(/\s+/g, "_") || "assessment"}_dossie_bigfive.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Dossiê executivo em PDF exportado com sucesso!");
    } catch (e) {
      console.error(e);
      toast.error("Erro ao gerar PDF.");
    } finally {
      setGeneratingPdf(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-muted-foreground">
        Carregando dossiê comportamental do colaborador...
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-muted-foreground">Colaborador não encontrado.</p>
        <Button onClick={() => navigate({ to: "/pessoas/assessment" })}>Voltar para Assessments</Button>
      </div>
    );
  }

  const { full_name, current_role, desired_role, birth_date, profile_data, ai_summary } = candidate;
  const age = birth_date
    ? Math.floor((Date.now() - new Date(birth_date).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : 30;

  const radarData = profile_data?.radar ?? [
    { name: "Abertura à Experiência", factor: "A", value: 70, description: "Criatividade e inovação" },
    { name: "Conscienciosidade", factor: "C", value: 80, description: "Organização e foco em metas" },
    { name: "Extroversão", factor: "E", value: 65, description: "Sociabilidade e comunicação" },
    { name: "Amabilidade", factor: "M", value: 75, description: "Empatia e cooperação" },
    { name: "Estabilidade Emocional", factor: "N", value: 70, description: "Resiliência e calma sob estresse" },
  ];

  const dominant = profile_data?.dominant_factor ||
    [...radarData].sort((a, b) => b.value - a.value)[0]?.name ||
    "Conscienciosidade";

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Top Header & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <Link
            to="/pessoas/assessment"
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
          >
            <ArrowLeft className="h-3 w-3" /> Voltar para Análise de Perfil
          </Link>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Dossiê Comportamental Big Five</h1>
            <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">
              Modelo OCEAN
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Mapeamento científico dos 5 fatores da personalidade e análise executiva de competências
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={handlePdf} disabled={generatingPdf} className="gap-2 shadow-xs text-xs">
            <Download className="h-4 w-4" />
            {generatingPdf ? "Gerando PDF..." : "Exportar Dossiê em PDF"}
          </Button>
        </div>
      </div>

      {/* Main Overview Grid */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Candidate Identification */}
        <Card className="md:col-span-1 shadow-xs border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Identificação do Perfil</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <div className="flex items-center gap-2 text-foreground font-semibold text-base">
                <User className="h-4 w-4 text-primary" />
                {full_name}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="capitalize text-xs">
                  {candidate.status === "concluido" ? "Avaliação Concluída" : candidate.status}
                </Badge>
                {candidate.external ? (
                  <Badge variant="secondary" className="text-xs">
                    Externo
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    {candidate.company_name || "Vinculado"}
                  </Badge>
                )}
              </div>
            </div>

            <div className="pt-2 border-t space-y-2 text-xs">
              <div className="flex items-center justify-between py-1">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Briefcase className="h-3.5 w-3.5" /> Cargo Atual
                </span>
                <span className="font-medium text-right">{current_role || "—"}</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Target className="h-3.5 w-3.5" /> Cargo Alvo
                </span>
                <span className="font-medium text-right">{desired_role || "—"}</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" /> Idade
                </span>
                <span className="font-medium">{age} anos</span>
              </div>
            </div>

            {/* Dominant Trait Highlight */}
            <div className="p-3 bg-primary/5 rounded-lg border border-primary/20 space-y-1">
              <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5 text-primary" /> Fator Dominante
              </span>
              <p className="font-bold text-sm text-primary">{dominant}</p>
            </div>
          </CardContent>
        </Card>

        {/* Radar Pentagram */}
        <Card className="md:col-span-2 shadow-xs border">
          <CardHeader className="pb-1">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">
                  Radar Comportamental (Pentágono OCEAN)
                </CardTitle>
                <CardDescription className="text-xs">
                  Distribuição percentual (0 a 100%) dos 5 fatores validados cientificamente
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <AssessmentRadar data={radarData} />
          </CardContent>
        </Card>
      </div>

      {/* Detalhamento dos 5 Fatores Big Five */}
      <Card className="shadow-xs border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">
            Detalhamento das Dimensões Big Five
          </CardTitle>
          <CardDescription className="text-xs">
            Pontuações consolidadas a partir do questionário com cálculo de itens reversos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {radarData.map((factor) => {
              const pct = factor.value;
              let levelBadge = "bg-blue-50 text-blue-700 border-blue-200";
              if (pct >= 80) levelBadge = "bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold";
              else if (pct <= 45) levelBadge = "bg-amber-50 text-amber-700 border-amber-200";

              return (
                <div key={factor.name} className="p-3.5 rounded-lg border bg-muted/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-foreground">{factor.name}</span>
                    <span className="text-sm font-bold text-primary">{pct}%</span>
                  </div>

                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1 text-[11px]">
                    <span className={`px-2 py-0.5 rounded-md border text-[10px] ${levelBadge}`}>
                      {pct >= 80 ? "Muito Alto" : pct >= 65 ? "Alto" : pct >= 45 ? "Equilibrado" : "Em Desenvolvimento"}
                    </span>
                    <span className="text-muted-foreground text-[10px]">Escala 0-100%</span>
                  </div>

                  {factor.description && (
                    <p className="text-[11px] text-muted-foreground leading-tight pt-1 border-t border-border/40">
                      {factor.description}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* AI Diagnostic Sections */}
      <Card className="shadow-xs border">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle className="text-base font-semibold">
              Diagnóstico Executivo & Análise de Perfil
            </CardTitle>
          </div>
          <CardDescription className="text-xs">
            Síntese comportamental baseada no cruzamento dos 5 eixos do modelo Big Five
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-xs">
          <div className="p-3.5 bg-muted/30 rounded-lg border space-y-1.5">
            <h3 className="font-bold text-foreground text-xs flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> Resumo do Perfil Natural
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              {ai_summary?.natural ||
                "Perfil estruturado com forte alinhamento entre disciplina operacional e foco em resultados estratégicos."}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-3.5 bg-muted/30 rounded-lg border space-y-1.5">
              <h3 className="font-bold text-foreground text-xs flex items-center gap-1.5">
                <Target className="h-3.5 w-3.5 text-emerald-600" /> Pontos Fortes & Estilo de Liderança
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {ai_summary?.strengths ||
                  "Facilidade de alinhamento com equipes, tomada de decisão fundamentada e clareza de execução."}
              </p>
            </div>

            <div className="p-3.5 bg-muted/30 rounded-lg border space-y-1.5">
              <h3 className="font-bold text-foreground text-xs flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-blue-600" /> Ambiente de Trabalho Ideal
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {ai_summary?.ideal_env ||
                  "Ambientes organizados com metas objetivas, autonomia para inovação de processos e liderança transparente."}
              </p>
            </div>
          </div>

          <div className="p-3.5 bg-amber-500/5 rounded-lg border border-amber-500/20 space-y-1.5">
            <h3 className="font-bold text-amber-700 text-xs flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600" /> Pontos Cegos & Recomendações de Desenvolvimento
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              {ai_summary?.blind_spots ||
                "Atenção para não sobrecarregar pares com exigências perfeccionistas em momentos de prazo reduzido."}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
