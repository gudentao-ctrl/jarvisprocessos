import React, { useState, useMemo } from "react";
import {
  CandidatePsychometricResult,
  MOCK_CONSULTANT_REPORT_STATE,
} from "@/utils/psychometrics";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Progress } from "@/components/ui/progress";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  User,
  Calendar,
  Clock,
  Briefcase,
  GraduationCap,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Download,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Target,
  Building2,
  FileText,
  Activity,
  Award,
  TrendingUp,
  BarChart3,
} from "lucide-react";
import { toast } from "sonner";
import { generateAssessmentReport } from "@/lib/pdf-generator";

interface ConsultantReportProps {
  data?: CandidatePsychometricResult;
  onExportPdf?: () => void;
}

export function ConsultantReport({ data = MOCK_CONSULTANT_REPORT_STATE, onExportPdf }: ConsultantReportProps) {
  const [openAccordions, setOpenAccordions] = useState<Record<string, boolean>>({
    neuroticismo: true,
    extroversao: false,
    abertura: false,
    amabilidade: false,
    conscienciosidade: true,
  });

  const [generatingPdf, setGeneratingPdf] = useState(false);

  const metricasConfiabilidade = useMemo(() => {
    const calcularAlfaEpm = (facetas: Record<string, number>) => {
      const valores = Object.values(facetas);
      const k = valores.length || 6;
      if (k === 0) return { alpha: 0, epm: 0, sd: 0, mean: 0, valores: [] };
      
      const mean = valores.reduce((a, b) => a + b, 0) / k;
      const sumVars = valores.reduce((a, b) => a + Math.pow(b - mean, 2), 0);
      const sd = Math.sqrt(sumVars / k);
      
      const totalVariance = sumVars + k * 225;
      let alpha = (k / (k - 1)) * (1 - sumVars / totalVariance);
      alpha = Math.max(0, Math.min(0.99, alpha));
      
      const epm = sd * Math.sqrt(1 - alpha);
      
      return { alpha, epm, sd, mean, valores };
    };

    let allValues: number[] = [];
    const alphaEpmData: Record<string, ReturnType<typeof calcularAlfaEpm>> = {};
    let sumAlphas = 0;

    Object.entries(data.bigFive.fatores).forEach(([key, fData]) => {
      const res = calcularAlfaEpm(fData.facetas);
      alphaEpmData[key] = res;
      sumAlphas += res.alpha;
      allValues = allValues.concat(res.valores);
    });

    const overallAlpha = sumAlphas / 5;
    const allMean = allValues.reduce((a, b) => a + b, 0) / (allValues.length || 1);
    const allSd = Math.sqrt(allValues.reduce((a, b) => a + Math.pow(b - allMean, 2), 0) / (allValues.length || 1));
    const extremos = allValues.filter(v => v > 85 || v < 15).length;

    return {
      alphaEpmData,
      overallAlpha,
      aquiescencia: allMean,
      tendenciaCentral: allSd,
      polarizacao: extremos
    };
  }, [data.bigFive.fatores]);

  const toggleAccordion = (key: string) => {
    setOpenAccordions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleDownloadPdf = async () => {
    if (onExportPdf) {
      onExportPdf();
      return;
    }

    setGeneratingPdf(true);
    try {
      // Prepara o objeto compatível para a geração executiva de PDF
      const pdfCandidate = {
        full_name: data.candidato.nome,
        current_role: data.candidato.cargoPretendido,
        desired_role: data.candidato.cargoPretendido,
        birth_date: "1990-01-01",
        profile_data: {
          radar: [
            { name: "Neuroticismo", value: data.bigFive.fatores.neuroticismo.percentil, description: "Estabilidade Emocional" },
            { name: "Extroversão", value: data.bigFive.fatores.extroversao.percentil, description: "Sociabilidade e Assertividade" },
            { name: "Abertura", value: data.bigFive.fatores.abertura.percentil, description: "Criatividade e Inovação" },
            { name: "Amabilidade", value: data.bigFive.fatores.amabilidade.percentil, description: "Empatia e Cooperação" },
            { name: "Conscienciosidade", value: data.bigFive.fatores.conscienciosidade.percentil, description: "Foco em Metas e Ordem" },
          ],
          dominant_factor: data.bigFive.fatorDominante,
        },
        ai_summary: {
          natural: data.parecerConsultor.sinteseQualitativa,
          strengths: `Liderança: ${data.disc.estiloLideranca}. Aderência de Cargo: ${data.matchCargo.percentual}%.`,
          ideal_env: data.disc.ambienteIdeal,
          blind_spots: data.disc.pontosCegos.join(" "),
        },
      };

      const blob = await generateAssessmentReport(pdfCandidate);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Relatorio_Tecnico_Consultor_${data.candidato.nome.replace(/\s+/g, "_")}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Relatório Técnico do Consultor exportado em PDF com sucesso!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao gerar o PDF.");
    } finally {
      setGeneratingPdf(false);
    }
  };

  // Cores do gráfico DISC
  const discChartData = [
    {
      fator: "D - Dominância",
      Natural: data.disc.natural.find((f) => f.fator === "D")?.valor || 0,
      Adaptado: data.disc.adaptado.find((f) => f.fator === "D")?.valor || 0,
    },
    {
      fator: "I - Influência",
      Natural: data.disc.natural.find((f) => f.fator === "I")?.valor || 0,
      Adaptado: data.disc.adaptado.find((f) => f.fator === "I")?.valor || 0,
    },
    {
      fator: "S - Estabilidade",
      Natural: data.disc.natural.find((f) => f.fator === "S")?.valor || 0,
      Adaptado: data.disc.adaptado.find((f) => f.fator === "S")?.valor || 0,
    },
    {
      fator: "C - Conformidade",
      Natural: data.disc.natural.find((f) => f.fator === "C")?.valor || 0,
      Adaptado: data.disc.adaptado.find((f) => f.fator === "C")?.valor || 0,
    },
  ];

  // Dados para Donut Chart de Match de Cargo
  const matchValue = data.matchCargo.percentual;
  const matchChartData = [
    { name: "Aderência", value: matchValue, color: matchValue >= 75 ? "#10b981" : matchValue >= 60 ? "#f59e0b" : "#ef4444" },
    { name: "Gap", value: 100 - matchValue, color: "#e2e8f0" },
  ];

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12 text-foreground">
      {/* ========================================================================= */}
      {/* CABEÇALHO DO RELATÓRIO DO CONSULTOR */}
      {/* ========================================================================= */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-5 bg-card rounded-xl border shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">
              Módulo Psicométrico 240 Itens
            </Badge>
            <Badge variant="outline" className="text-xs">
              IGFP-5 Big Five + DISC + TRI
            </Badge>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Relatório Técnico do Consultor</h1>
          <p className="text-xs text-muted-foreground">
            Dossiê executivo e psicométrico de alta fidelidade para tomada de decisão e contratação
          </p>
        </div>

        <Button onClick={handleDownloadPdf} disabled={generatingPdf} className="gap-2 shadow-xs text-xs">
          <Download className="h-4 w-4" />
          {generatingPdf ? "Gerando Relatório..." : "Exportar Relatório em PDF"}
        </Button>
      </div>

      {/* ========================================================================= */}
      {/* SEÇÃO 1: DADOS DO AVALIADO E ÍNDICES DE VALIDADE DO TESTE */}
      {/* ========================================================================= */}
      <Card className="border shadow-xs overflow-hidden">
        <CardHeader className="bg-muted/30 pb-3 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-6 w-6 rounded-md bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                1
              </span>
              <CardTitle className="text-base font-bold">
                Dados do Avaliado e Índices de Validade do Teste
              </CardTitle>
            </div>
            <Badge
              className={`text-xs px-2.5 py-0.5 ${
                data.validade.statusGeral === "TESTE_VALIDO"
                  ? "bg-emerald-500/15 text-emerald-700 border-emerald-300"
                  : data.validade.statusGeral === "VALIDO_COM_RESSALVAS"
                  ? "bg-amber-500/15 text-amber-700 border-amber-300"
                  : "bg-red-500/15 text-red-700 border-red-300"
              }`}
            >
              {data.validade.statusGeral === "TESTE_VALIDO"
                ? "TESTE VÁLIDO"
                : data.validade.statusGeral === "VALIDO_COM_RESSALVAS"
                ? "VÁLIDO COM RESSALVAS"
                : "TESTE INVÁLIDO"}
            </Badge>
          </div>
          <CardDescription className="text-xs">
            Checagem estatística de Desejabilidade Social, Inconsistência (VRIN) e Latência de Tempo (TMI)
          </CardDescription>
        </CardHeader>

        <CardContent className="p-5 space-y-5">
          {/* Dados Gerais do Avaliado */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 p-3.5 bg-muted/20 rounded-lg border text-xs">
            <div>
              <span className="text-muted-foreground block text-[11px]">Nome:</span>
              <strong className="text-foreground">{data.candidato.nome}</strong>
            </div>
            <div>
              <span className="text-muted-foreground block text-[11px]">Idade:</span>
              <strong className="text-foreground">{data.candidato.idade} anos</strong>
            </div>
            <div>
              <span className="text-muted-foreground block text-[11px]">Escolaridade:</span>
              <strong className="text-foreground truncate block">{data.candidato.escolaridade}</strong>
            </div>
            <div>
              <span className="text-muted-foreground block text-[11px]">Cargo Alvo:</span>
              <strong className="text-foreground truncate block">{data.candidato.cargoPretendido}</strong>
            </div>
            <div>
              <span className="text-muted-foreground block text-[11px]">Data de Execução:</span>
              <strong className="text-foreground">{data.candidato.dataTeste}</strong>
            </div>
            <div>
              <span className="text-muted-foreground block text-[11px]">Tempo Total:</span>
              <strong className="text-foreground">{data.candidato.tempoTotalMinutos} min</strong>
            </div>
          </div>

          {/* Badges de Confiabilidade Psicométrica */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Desejabilidade Social */}
            <div className="p-3.5 rounded-lg border bg-card space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold">Desejabilidade Social (T-Score)</span>
                <Badge
                  variant="outline"
                  className={
                    data.validade.desejabilidadeT <= 60
                      ? "text-emerald-600 border-emerald-300"
                      : data.validade.desejabilidadeT <= 70
                      ? "text-amber-600 border-amber-300"
                      : "text-red-600 border-red-300 font-bold"
                  }
                >
                  T = {data.validade.desejabilidadeT}
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {data.validade.desejabilidadeT <= 60
                  ? "Respostas autênticas e genuínas. Baixa tendência a maquiagem."
                  : data.validade.desejabilidadeT <= 70
                  ? "Tendência moderada a projetar imagem profissional idealizada."
                  : "Alerta Crítico: Elevada probabilidade de maquiagem de perfil (faking good)."}
              </p>
            </div>

            {/* Índice VRIN */}
            <div className="p-3.5 rounded-lg border bg-card space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold">Inconsistência (VRIN)</span>
                <Badge
                  variant="outline"
                  className={
                    data.validade.vrinEscore <= 3
                      ? "text-emerald-600 border-emerald-300"
                      : data.validade.vrinEscore <= 6
                      ? "text-amber-600 border-amber-300"
                      : "text-red-600 border-red-300 font-bold"
                  }
                >
                  VRIN = {data.validade.vrinEscore}
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {data.validade.vrinEscore <= 3
                  ? "Respostas altamente coerentes nos pares refraseados."
                  : data.validade.vrinEscore <= 6
                  ? "Inconsistência moderada de posicionamento entre perguntas similares."
                  : "Alerta Crítico: Respostas aleatórias ou preenchimento sem reflexão."}
              </p>
            </div>

            {/* Tempo Médio por Item (TMI) */}
            <div className="p-3.5 rounded-lg border bg-card space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold">Tempo Médio por Item (TMI)</span>
                <Badge
                  variant="outline"
                  className={
                    data.validade.tmiSegundos >= 2.5
                      ? "text-emerald-600 border-emerald-300"
                      : data.validade.tmiSegundos >= 1.8
                      ? "text-amber-600 border-amber-300"
                      : "text-red-600 border-red-300 font-bold"
                  }
                >
                  {data.validade.tmiSegundos} s/item
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {data.validade.tmiSegundos >= 2.5
                  ? "Latência adequada de leitura e deliberação (acima de 2.5s)."
                  : data.validade.tmiSegundos >= 1.8
                  ? "Atenção: ritmo acelerado de preenchimento."
                  : "Invalidação Automática: velocidade incompatível com leitura atenta (< 1.8s)."}
              </p>
            </div>
          </div>

          {/* Mensagem e Alertas do Parecer de Validade */}
          <div
            className={`p-3 rounded-lg border text-xs flex items-start gap-2.5 ${
              data.validade.statusGeral === "TESTE_VALIDO"
                ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-900"
                : data.validade.statusGeral === "VALIDO_COM_RESSALVAS"
                ? "bg-amber-500/5 border-amber-500/20 text-amber-900"
                : "bg-red-500/5 border-red-500/20 text-red-900"
            }`}
          >
            {data.validade.statusGeral === "TESTE_VALIDO" ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
            )}
            <div className="space-y-1">
              <strong className="block text-xs font-semibold">Parecer Metodológico da Validade:</strong>
              <p className="text-xs leading-relaxed">{data.validade.mensagem}</p>
              {data.validade.alertas.length > 0 && (
                <ul className="list-disc list-inside text-[11px] pt-1 space-y-0.5 opacity-90">
                  {data.validade.alertas.map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ========================================================================= */}
      {/* SEÇÃO 1.5: INDICADORES DE CONFIABILIDADE PSICOMÉTRICA */}
      {/* ========================================================================= */}
      <Card className="border shadow-xs overflow-hidden">
        <CardHeader className="bg-muted/30 pb-3 border-b">
          <div className="flex items-center gap-2">
            <span className="h-6 w-6 rounded-md bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
              <ShieldCheck className="h-3 w-3" />
            </span>
            <CardTitle className="text-base font-bold">
              Indicadores de Confiabilidade Psicométrica
            </CardTitle>
          </div>
          <CardDescription className="text-xs">
            Métricas avançadas de consistência interna e padrões de resposta do teste
          </CardDescription>
        </CardHeader>

        <CardContent className="p-5 space-y-6">
          {/* Alfa de Cronbach & Padrões de Resposta */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-muted/20 rounded-xl border space-y-3">
              <div className="flex items-center gap-2 border-b pb-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                <span className="font-semibold text-xs">Consistência Interna (Alfa de Cronbach Estimado)</span>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">Alfa Geral</span>
                  <Badge className={metricasConfiabilidade.overallAlpha >= 0.8 ? "bg-emerald-500/15 text-emerald-700 border-emerald-300" : metricasConfiabilidade.overallAlpha >= 0.65 ? "bg-amber-500/15 text-amber-700 border-amber-300" : "bg-red-500/15 text-red-700 border-red-300"}>
                    {metricasConfiabilidade.overallAlpha.toFixed(2)}
                  </Badge>
                </div>
                <div className="space-y-1.5 pt-1">
                  {Object.entries(metricasConfiabilidade.alphaEpmData).map(([fator, metrics]) => (
                    <div key={fator} className="flex flex-col gap-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="capitalize">{fator}</span>
                        <span className="font-mono">{metrics.alpha.toFixed(2)}</span>
                      </div>
                      <Progress 
                        value={metrics.alpha * 100} 
                        className="h-1" 
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 bg-muted/20 rounded-xl border space-y-3">
              <div className="flex items-center gap-2 border-b pb-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <span className="font-semibold text-xs">Análise de Padrões de Resposta</span>
              </div>
              <div className="space-y-4 pt-1">
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Aquiescência (Média Geral)</span>
                    <strong className="font-mono">{metricasConfiabilidade.aquiescencia.toFixed(1)}%</strong>
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-tight">Média das respostas (tendência a concordar/discordar).</p>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Tendência Central (Desvio Padrão)</span>
                    <strong className="font-mono">{metricasConfiabilidade.tendenciaCentral.toFixed(1)}</strong>
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-tight">Dispersão em relação à média (menor indica respostas neutras).</p>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Polarização (Extremos &gt;85 ou &lt;15)</span>
                    <strong className="font-mono">{metricasConfiabilidade.polarizacao} facetas</strong>
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-tight">Quantidade de características marcadas nos extremos da escala.</p>
                </div>
              </div>
            </div>
          </div>

          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="epm" className="border rounded-lg bg-card px-4">
              <AccordionTrigger className="text-xs font-semibold py-3 hover:no-underline">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  Erro Padrão de Medida (EPM) & Intervalos de Confiança
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-1 pb-4">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="text-[11px] h-8">Fator</TableHead>
                        <TableHead className="text-[11px] h-8 text-right">EPM</TableHead>
                        <TableHead className="text-[11px] h-8 text-right">IC (95%)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(metricasConfiabilidade.alphaEpmData).map(([fator, metrics]) => {
                        const pct = (data.bigFive.fatores as any)[fator].percentil;
                        const icMin = Math.max(0, Math.round(pct - 1.96 * metrics.epm));
                        const icMax = Math.min(100, Math.round(pct + 1.96 * metrics.epm));
                        return (
                          <TableRow key={fator} className="border-b-0 hover:bg-muted/10">
                            <TableCell className="py-2 text-[11px] capitalize font-medium">{fator}</TableCell>
                            <TableCell className="py-2 text-[11px] text-right font-mono">{metrics.epm.toFixed(1)}</TableCell>
                            <TableCell className="py-2 text-[11px] text-right font-mono text-muted-foreground">
                              [{icMin} - {icMax}]
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="normativa" className="border rounded-lg bg-card px-4 mt-3">
              <AccordionTrigger className="text-xs font-semibold py-3 hover:no-underline">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  Tabela Normativa Classificatória
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-1 pb-4">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="text-[11px] h-8">Faixa Percentil</TableHead>
                        <TableHead className="text-[11px] h-8">Classificação</TableHead>
                        <TableHead className="text-[11px] h-8">Referência Normativa</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[
                        { faixa: "91 - 100", classif: "Muito Alto", ref: "Extremo superior da curva normal" },
                        { faixa: "76 - 90", classif: "Alto", ref: "Acima de 1 desvio padrão" },
                        { faixa: "61 - 75", classif: "Médio Alto", ref: "Acima da média geral" },
                        { faixa: "41 - 60", classif: "Médio", ref: "Dentro da média da população" },
                        { faixa: "26 - 40", classif: "Médio Baixo", ref: "Abaixo da média geral" },
                        { faixa: "11 - 25", classif: "Baixo", ref: "Abaixo de 1 desvio padrão" },
                        { faixa: "0 - 10", classif: "Muito Baixo", ref: "Extremo inferior da curva normal" },
                      ].map((row, idx) => (
                        <TableRow key={idx} className="border-b-0 hover:bg-muted/10">
                          <TableCell className="py-2 text-[11px] font-mono whitespace-nowrap">{row.faixa}</TableCell>
                          <TableCell className="py-2 text-[11px] font-medium">{row.classif}</TableCell>
                          <TableCell className="py-2 text-[11px] text-muted-foreground">{row.ref}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      {/* ========================================================================= */}
      {/* SEÇÃO 2: PERFIL DISC (ESTILO COMPORTAMENTAL APLICADO) */}
      {/* ========================================================================= */}
      <Card className="border shadow-xs overflow-hidden">
        <CardHeader className="bg-muted/30 pb-3 border-b">
          <div className="flex items-center gap-2">
            <span className="h-6 w-6 rounded-md bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
              2
            </span>
            <CardTitle className="text-base font-bold">
              Perfil DISC (Estilo Comportamental Aplicado ao Ambiente de Trabalho)
            </CardTitle>
          </div>
          <CardDescription className="text-xs">
            Comparação empírica entre o Perfil Natural (Espontâneo) vs. Perfil Adaptado (Exigência do Cargo)
          </CardDescription>
        </CardHeader>

        <CardContent className="p-5 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* Gráfico Recharts Comparativo Natural vs Adaptado */}
            <div className="lg:col-span-7 h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={discChartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="fator" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(value: any) => [`${value}%`, ""]}
                    contentStyle={{ borderRadius: "8px", fontSize: "12px" }}
                  />
                  <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} />
                  <Bar dataKey="Natural" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Adaptado" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Painel do Delta DISC e Indicador de Estresse */}
            <div className="lg:col-span-5 space-y-3.5 bg-muted/20 p-4 rounded-xl border">
              <div className="flex items-center justify-between border-b pb-2">
                <div>
                  <span className="text-[11px] text-muted-foreground uppercase tracking-wider block font-semibold">
                    Delta de Adaptação (Δ DISC)
                  </span>
                  <div className="text-2xl font-bold text-primary mt-0.5">
                    {data.disc.deltaEstresse} <span className="text-xs font-normal text-muted-foreground">pontos</span>
                  </div>
                </div>
                <Badge
                  className={
                    data.disc.deltaEstresse <= 15
                      ? "bg-blue-500/15 text-blue-700 border-blue-300"
                      : data.disc.deltaEstresse <= 30
                      ? "bg-emerald-500/15 text-emerald-700 border-emerald-300"
                      : "bg-red-500/15 text-red-700 border-red-300 font-bold"
                  }
                >
                  {data.disc.classificacaoEstresse}
                </Badge>
              </div>

              <div className="space-y-1.5 text-xs">
                <span className="font-semibold text-foreground block">Estilo de Liderança Dominante:</span>
                <p className="text-muted-foreground leading-relaxed bg-card p-2.5 rounded-md border text-[11px]">
                  {data.disc.estiloLideranca}
                </p>
              </div>

              <div className="space-y-1 text-xs">
                <span className="font-semibold text-foreground block">Ambiente de Trabalho Ideal:</span>
                <p className="text-muted-foreground text-[11px] leading-relaxed">
                  {data.disc.ambienteIdeal}
                </p>
              </div>
            </div>
          </div>

          {/* Pontos Cegos sob Forte Pressão */}
          <div className="p-3.5 rounded-lg border bg-amber-500/5 border-amber-500/20 space-y-2">
            <span className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              Pontos Cegos Identificados sob Forte Pressão:
            </span>
            <ul className="grid grid-cols-1 md:grid-cols-3 gap-2 text-[11px] text-amber-900">
              {data.disc.pontosCegos.map((pc, idx) => (
                <li key={idx} className="bg-card p-2.5 rounded-md border border-amber-500/20 leading-relaxed">
                  • {pc}
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* ========================================================================= */}
      {/* SEÇÃO 3: PERFIL BIG FIVE (IGFP-5 EXPANDIDO - MAPA DE PERSONALIDADE) */}
      {/* ========================================================================= */}
      <Card className="border shadow-xs overflow-hidden">
        <CardHeader className="bg-muted/30 pb-3 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-6 w-6 rounded-md bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                3
              </span>
              <CardTitle className="text-base font-bold">
                Perfil Big Five (IGFP-5 Expandido — Mapa de Personalidade)
              </CardTitle>
            </div>
            <Badge variant="outline" className="text-xs font-normal">
              Fator Dominante: <strong className="ml-1 text-primary">{data.bigFive.fatorDominante}</strong>
            </Badge>
          </div>
          <CardDescription className="text-xs">
            150 itens avaliados sob Teoria de Resposta ao Item (TRI) e 30 facetas de personalidade
          </CardDescription>
        </CardHeader>

        <CardContent className="p-5 space-y-4">
          {/* Accordion Interativo para cada um dos 5 fatores */}
          {[
            {
              key: "neuroticismo",
              nome: "Neuroticismo (Instabilidade Emocional vs. Resiliência)",
              desc: "Reatividade emocional a estresse, ansiedade e vulnerabilidade sob cobrança.",
              data: data.bigFive.fatores.neuroticismo,
            },
            {
              key: "extroversao",
              nome: "Extroversão (Sociabilidade, Energia e Assertividade)",
              desc: "Direcionamento da energia vital, proatividade social e facilidade em assumir liderança.",
              data: data.bigFive.fatores.extroversao,
            },
            {
              key: "abertura",
              nome: "Abertura à Experiência (Inovação, Criatividade e Curiosidade)",
              desc: "Receptividade a ideias abstratas, visão estratégica de longo prazo e tolerância ao novo.",
              data: data.bigFive.fatores.abertura,
            },
            {
              key: "amabilidade",
              nome: "Amabilidade (Empatia, Cooperação e Trabalho em Equipe)",
              desc: "Orientação interpessoal, confiança básica nos pares e capacidade de mediar consenso.",
              data: data.bigFive.fatores.amabilidade,
            },
            {
              key: "conscienciosidade",
              nome: "Conscienciosidade (Organização, Rigor e Foco em Metas)",
              desc: "Senso de dever, pontualidade de entregas, autodisciplina e método operacional.",
              data: data.bigFive.fatores.conscienciosidade,
            },
          ].map((fator) => {
            const isOpen = openAccordions[fator.key];
            const pct = fator.data.percentil;

            return (
              <div key={fator.key} className="border rounded-lg overflow-hidden bg-card transition-all">
                <button
                  type="button"
                  onClick={() => toggleAccordion(fator.key)}
                  className="w-full flex items-center justify-between p-4 hover:bg-muted/40 text-left transition-colors"
                >
                  <div className="space-y-1 flex-1 pr-4">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-foreground">{fator.nome}</span>
                      <Badge variant="secondary" className="text-[10px]">
                        {fator.data.nivel}
                      </Badge>
                      <span className="text-xs text-muted-foreground hidden sm:inline">
                        (Escore T = {fator.data.escoreT})
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">{fator.desc}</p>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="text-xs text-muted-foreground block text-[10px]">Percentil</span>
                      <span className="text-lg font-bold text-primary">{pct}%</span>
                    </div>
                    {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </button>

                {/* Barra do Fator Principal */}
                <div className="px-4 pb-2">
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                {/* Facetas Internas (Expanded Accordion Content) */}
                {isOpen && (
                  <div className="p-4 pt-2 border-t bg-muted/10">
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-2.5">
                      Facetas Específicas do Fator (Percentil Normativo):
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {Object.entries(fator.data.facetas || {}).map(([facetaNome, facetaPct]) => (
                        <div key={facetaNome} className="p-2.5 bg-card rounded-md border text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-foreground text-[11px] truncate">{facetaNome}</span>
                            <span className="font-bold text-primary">{facetaPct}%</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-primary/70 h-1.5 rounded-full"
                              style={{ width: `${facetaPct}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* ========================================================================= */}
      {/* SEÇÃO 4: CRUZAMENTO E MATRIZ DE CONVERGÊNCIA (BIG FIVE x DISC) */}
      {/* ========================================================================= */}
      <Card className="border shadow-xs overflow-hidden">
        <CardHeader className="bg-muted/30 pb-3 border-b">
          <div className="flex items-center gap-2">
            <span className="h-6 w-6 rounded-md bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
              4
            </span>
            <CardTitle className="text-base font-bold">
              Cruzamento e Matriz de Convergência (Big Five x DISC)
            </CardTitle>
          </div>
          <CardDescription className="text-xs">
            Verificação cruzada de consistência interna entre Personalidade de Base e Comportamento Aplicado
          </CardDescription>
        </CardHeader>

        <CardContent className="p-5 space-y-4">
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-xs">
              <thead className="bg-muted/50 border-b text-muted-foreground font-semibold text-[11px]">
                <tr>
                  <th className="p-3 text-left">Traço DISC</th>
                  <th className="p-3 text-left">Fator Big Five Correlato</th>
                  <th className="p-3 text-center">Cruzamento</th>
                  <th className="p-3 text-left">Diagnóstico do Consultor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.matrizConvergencia.map((row, i) => (
                  <tr key={i} className="hover:bg-muted/20 transition-colors">
                    <td className="p-3 font-semibold text-foreground whitespace-nowrap">{row.tracoDisc}</td>
                    <td className="p-3 text-muted-foreground">{row.fatorBigFive}</td>
                    <td className="p-3 text-center">
                      <Badge
                        className={`text-[10px] ${
                          row.cruzamento === "Confirmado"
                            ? "bg-emerald-500/15 text-emerald-700 border-emerald-300"
                            : "bg-amber-500/15 text-amber-700 border-amber-300"
                        }`}
                      >
                        {row.cruzamento}
                      </Badge>
                    </td>
                    <td className="p-3 text-muted-foreground leading-relaxed">{row.diagnostico}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-3.5 bg-primary/5 rounded-lg border border-primary/20 text-xs space-y-1">
            <span className="font-semibold text-primary block">Síntese de Autenticidade do Perfil:</span>
            <p className="text-muted-foreground text-[11px] leading-relaxed">{data.sinteseAutenticidade}</p>
          </div>
        </CardContent>
      </Card>

      {/* ========================================================================= */}
      {/* SEÇÃO 5: ADEQUAÇÃO AO CARGO (MATCH DE COMPETÊNCIAS) */}
      {/* ========================================================================= */}
      <Card className="border shadow-xs overflow-hidden">
        <CardHeader className="bg-muted/30 pb-3 border-b">
          <div className="flex items-center gap-2">
            <span className="h-6 w-6 rounded-md bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
              5
            </span>
            <CardTitle className="text-base font-bold">
              Adequação ao Cargo (Match Euclidiano de Competências)
            </CardTitle>
          </div>
          <CardDescription className="text-xs">
            Cálculo de Distância Euclidiana Ponderada em relação ao perfil de excelência cadastrado para o cargo
          </CardDescription>
        </CardHeader>

        <CardContent className="p-5 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            {/* Donut Chart de Aderência Profissional */}
            <div className="md:col-span-4 flex flex-col items-center justify-center p-4 bg-muted/20 rounded-xl border">
              <div className="relative h-44 w-44">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={matchChartData}
                      dataKey="value"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={75}
                      startAngle={90}
                      endAngle={-270}
                    >
                      {matchChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-3xl font-extrabold text-foreground">{matchValue}%</span>
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold">Match do Cargo</span>
                </div>
              </div>
              <span className="text-xs text-muted-foreground mt-2 text-center">
                Distância Euclidiana: <strong>{data.matchCargo.distanciaEuclidiana}</strong>
              </span>
            </div>

            {/* Mapeamento das 5 Competências Chave */}
            <div className="md:col-span-8 space-y-2.5">
              {data.matchCargo.competencias.map((comp) => (
                <div key={comp.nome} className="p-3 bg-card rounded-lg border text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground text-xs">{comp.nome}</span>
                    <Badge
                      className={
                        comp.status === "Fortaleza"
                          ? "bg-emerald-500/15 text-emerald-700 border-emerald-300 font-semibold"
                          : comp.status === "Adequado"
                          ? "bg-blue-500/15 text-blue-700 border-blue-300"
                          : "bg-amber-500/15 text-amber-700 border-amber-300 font-bold"
                      }
                    >
                      {comp.status}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{comp.descricao}</p>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ========================================================================= */}
      {/* SEÇÃO 6: PERGUNTAS SUGERIDAS PARA A ENTREVISTA INVESTIGATIVA (TÉCNICA STAR) */}
      {/* ========================================================================= */}
      <Card className="border shadow-xs overflow-hidden">
        <CardHeader className="bg-muted/30 pb-3 border-b">
          <div className="flex items-center gap-2">
            <span className="h-6 w-6 rounded-md bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
              6
            </span>
            <CardTitle className="text-base font-bold">
              Perguntas Sugeridas para a Entrevista Investigativa (Técnica STAR)
            </CardTitle>
          </div>
          <CardDescription className="text-xs">
            Roteiro estruturado focado nos pontos cegos e divergências para validação em entrevista pelo consultor
          </CardDescription>
        </CardHeader>

        <CardContent className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.perguntasStar.map((q, idx) => (
              <div key={idx} className="p-4 bg-muted/20 rounded-xl border text-xs space-y-2.5">
                <div className="flex items-center justify-between border-b pb-1.5">
                  <span className="font-bold text-primary text-xs">Pergunta {idx + 1} — {q.competencia}</span>
                  <Badge variant="outline" className="text-[10px]">Técnica STAR</Badge>
                </div>

                <div className="space-y-1.5 text-[11px]">
                  <p className="text-foreground leading-relaxed">
                    <strong className="text-primary font-semibold">Situação:</strong> {q.situacao}
                  </p>
                  <p className="text-muted-foreground leading-relaxed">
                    <strong className="text-foreground font-semibold">Tarefa:</strong> {q.tarefa}
                  </p>
                  <p className="text-muted-foreground leading-relaxed">
                    <strong className="text-foreground font-semibold">Ação Esperada:</strong> {q.acao}
                  </p>
                  <p className="text-muted-foreground leading-relaxed">
                    <strong className="text-foreground font-semibold">Resultado a Investigar:</strong> {q.resultado}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ========================================================================= */}
      {/* SEÇÃO 7: PARECER TÉCNICO E RECOMENDAÇÕES DO CONSULTOR */}
      {/* ========================================================================= */}
      <Card className="border shadow-xs overflow-hidden">
        <CardHeader className="bg-muted/30 pb-3 border-b">
          <div className="flex items-center gap-2">
            <span className="h-6 w-6 rounded-md bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
              7
            </span>
            <CardTitle className="text-base font-bold">
              Parecer Técnico e Recomendações Finais do Consultor
            </CardTitle>
          </div>
          <CardDescription className="text-xs">
            Síntese integrativa de aprovação e Plano de Desenvolvimento Individual (PDI)
          </CardDescription>
        </CardHeader>

        <CardContent className="p-5 space-y-6">
          {/* Quadro Resumo Executivo (KPIs) */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="p-3 bg-muted/20 rounded-lg border flex flex-col justify-center items-center text-center space-y-1">
              <span className="text-[10px] text-muted-foreground uppercase font-semibold">Match Cargo</span>
              <span className={`text-lg font-bold ${data.matchCargo.percentual >= 75 ? "text-emerald-600" : data.matchCargo.percentual >= 60 ? "text-amber-600" : "text-red-600"}`}>
                {data.matchCargo.percentual}%
              </span>
            </div>
            <div className="p-3 bg-muted/20 rounded-lg border flex flex-col justify-center items-center text-center space-y-1">
              <span className="text-[10px] text-muted-foreground uppercase font-semibold">Convergência</span>
              <span className={`text-lg font-bold ${(data.matrizConvergencia.filter(m => m.cruzamento === "Confirmado").length / Math.max(1, data.matrizConvergencia.length)) >= 0.7 ? "text-emerald-600" : "text-amber-600"}`}>
                {Math.round((data.matrizConvergencia.filter(m => m.cruzamento === "Confirmado").length / Math.max(1, data.matrizConvergencia.length)) * 100)}%
              </span>
            </div>
            <div className="p-3 bg-muted/20 rounded-lg border flex flex-col justify-center items-center text-center space-y-1">
              <span className="text-[10px] text-muted-foreground uppercase font-semibold">Delta Estresse</span>
              <span className={`text-lg font-bold ${data.disc.deltaEstresse <= 15 ? "text-emerald-600" : data.disc.deltaEstresse <= 30 ? "text-amber-600" : "text-red-600"}`}>
                {data.disc.deltaEstresse}
              </span>
            </div>
            <div className="p-3 bg-muted/20 rounded-lg border flex flex-col justify-center items-center text-center space-y-1">
              <span className="text-[10px] text-muted-foreground uppercase font-semibold">Estabilidade Emoc.</span>
              <span className={`text-lg font-bold ${(100 - data.bigFive.fatores.neuroticismo.percentil) >= 60 ? "text-emerald-600" : (100 - data.bigFive.fatores.neuroticismo.percentil) >= 40 ? "text-amber-600" : "text-red-600"}`}>
                {100 - data.bigFive.fatores.neuroticismo.percentil}%
              </span>
            </div>
            <div className="p-3 bg-muted/20 rounded-lg border flex flex-col justify-center items-center text-center space-y-1">
              <span className="text-[10px] text-muted-foreground uppercase font-semibold">Conscienciosidade</span>
              <span className={`text-lg font-bold ${data.bigFive.fatores.conscienciosidade.percentil >= 60 ? "text-emerald-600" : data.bigFive.fatores.conscienciosidade.percentil >= 40 ? "text-amber-600" : "text-red-600"}`}>
                {data.bigFive.fatores.conscienciosidade.percentil}%
              </span>
            </div>
            <div className="p-3 bg-muted/20 rounded-lg border flex flex-col justify-center items-center text-center space-y-1">
              <span className="text-[10px] text-muted-foreground uppercase font-semibold">Fortalezas</span>
              <span className={`text-lg font-bold ${data.matchCargo.competencias.filter(c => c.status === "Fortaleza").length >= 3 ? "text-emerald-600" : data.matchCargo.competencias.filter(c => c.status === "Fortaleza").length >= 1 ? "text-amber-600" : "text-red-600"}`}>
                {data.matchCargo.competencias.filter(c => c.status === "Fortaleza").length}
              </span>
            </div>
          </div>

          {/* Recomendação Final em Destaque */}
          <div className="p-4 bg-card rounded-xl border space-y-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
              Recomendação Conclusiva do Consultor:
            </span>
            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              {[
                { status: "RECOMENDADO", label: "RECOMENDADO", color: "bg-emerald-600 text-white" },
                { status: "RECOMENDADO COM RESSALVAS", label: "RECOMENDADO COM RESSALVAS", color: "bg-amber-600 text-white" },
                { status: "NÃO RECOMENDADO PARA A FUNÇÃO ATUAL", label: "NÃO RECOMENDADO PARA A FUNÇÃO ATUAL", color: "bg-red-600 text-white" },
              ].map((opt) => {
                const isSelected = data.parecerConsultor.recomendacao === opt.status;
                return (
                  <div
                    key={opt.status}
                    className={`px-3.5 py-2 rounded-lg border text-xs font-bold flex items-center gap-2 transition-all ${
                      isSelected
                        ? `${opt.color} shadow-sm scale-[1.02]`
                        : "bg-muted/40 text-muted-foreground border-border opacity-60"
                    }`}
                  >
                    <span className="h-4 w-4 rounded-full border flex items-center justify-center text-[10px]">
                      {isSelected ? "✓" : ""}
                    </span>
                    {opt.label}
                  </div>
                );
              })}
            </div>
            <div className="pt-3 mt-2 border-t text-[10px] text-muted-foreground italic leading-relaxed opacity-80">
              Relatório gerado com metodologia psicométrica baseada em Big Five (NEO-PI-R / IPIP), DISC (Marston), TRI (Teoria de Resposta ao Item) e validação cruzada multifatorial. Normatização: amostra referencial brasileira de profissionais em cargos de gestão.
            </div>
          </div>

          {/* Síntese Qualitativa */}
          <div className="p-4 bg-muted/20 rounded-xl border text-xs space-y-1.5">
            <span className="font-bold text-foreground text-xs flex items-center gap-1.5">
              <FileText className="h-4 w-4 text-primary" /> Síntese Qualitativa Integrativa:
            </span>
            <p className="text-muted-foreground leading-relaxed text-[11px] pt-1">
              {data.parecerConsultor.sinteseQualitativa}
            </p>
          </div>

          {/* Plano de Desenvolvimento Individual (PDI Sugerido) */}
          <div className="space-y-3">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Award className="h-4 w-4 text-primary" />
              Plano de Desenvolvimento Individual (PDI Recomendado — 3 Ações Práticas):
            </span>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {data.parecerConsultor.pdi.map((item, idx) => (
                <div key={idx} className="p-3.5 rounded-lg border bg-card text-xs space-y-2">
                  <div className="flex items-center justify-between border-b pb-1.5">
                    <span className="font-semibold text-primary text-[11px]">Ação {idx + 1}: {item.area}</span>
                    <Badge variant="outline" className="text-[10px]">{item.prazoSugerido}</Badge>
                  </div>
                  <p className="text-muted-foreground text-[11px] leading-relaxed">{item.acao}</p>
                  <div className="pt-1 border-t text-[10px] text-muted-foreground">
                    <strong className="text-foreground">Evidência de Sucesso:</strong> {item.indicadorSucesso}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Ação de Saída do Consultor */}
          <div className="flex justify-end pt-4 border-t">
            <Button onClick={handleDownloadPdf} disabled={generatingPdf} className="gap-2 shadow-xs text-xs">
              <Download className="h-4 w-4" />
              {generatingPdf ? "Exportando PDF..." : "Exportar Relatório Técnico Completo em PDF"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default ConsultantReport;
