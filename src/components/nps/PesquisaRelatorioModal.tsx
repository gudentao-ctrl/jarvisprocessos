// src/components/nps/PesquisaRelatorioModal.tsx
// Modal Analítico de Resultados NPS / eNPS com Big Numbers, Zonas, Distribuição, Feedbacks e Exportação Excel

import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Download,
  Users,
  Smile,
  Meh,
  Frown,
  MessageSquare,
  TrendingUp,
  Award,
  AlertTriangle,
  Calendar,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import type { Pesquisa, NpsRelatorioConsolidado } from "@/lib/nps-types";

interface PesquisaRelatorioModalProps {
  isOpen: boolean;
  onClose: () => void;
  pesquisa: Pesquisa;
  relatorio: NpsRelatorioConsolidado;
}

export function PesquisaRelatorioModal({
  isOpen,
  onClose,
  pesquisa,
  relatorio,
}: PesquisaRelatorioModalProps) {
  const [activeTab, setActiveTab] = useState<"visao_geral" | "questoes" | "feedbacks">("visao_geral");

  const zonaColor = useMemo(() => {
    switch (relatorio.zona) {
      case "Excelente":
        return "text-emerald-700 bg-emerald-50 border-emerald-300";
      case "Muito Bom":
        return "text-sky-700 bg-sky-50 border-sky-300";
      case "Razoável":
        return "text-amber-700 bg-amber-50 border-amber-300";
      case "Crítico":
        return "text-rose-700 bg-rose-50 border-rose-300";
      default:
        return "text-muted-foreground bg-muted";
    }
  }, [relatorio.zona]);

  // Exportar para Excel usando XLSX
  const handleExportExcel = () => {
    try {
      const wb = XLSX.utils.book_new();

      // Aba 1: Resumo Executivo
      const resumoData = [
        ["RELATÓRIO DE PESQUISA NPS / eNPS - MAIA CONSULTORIA"],
        [""],
        ["Pesquisa:", pesquisa.titulo],
        ["Tipo:", pesquisa.tipo.toUpperCase()],
        ["Hash de Acesso:", pesquisa.hash_publico],
        ["Total de Respostas:", relatorio.totalRespostas],
        ["Score NPS / eNPS:", relatorio.scoreNps],
        ["Zona de Classificação:", relatorio.zona],
        ["Promotores (9-10):", `${relatorio.promotores} (${relatorio.pctPromotores}%)`],
        ["Neutros (7-8):", `${relatorio.neutros} (${relatorio.pctNeutros}%)`],
        ["Detratores (0-6):", `${relatorio.detratores} (${relatorio.pctDetratores}%)`],
        ["Data da Exportação:", new Date().toLocaleString("pt-BR")],
      ];
      const wsResumo = XLSX.utils.aoa_to_sheet(resumoData);
      XLSX.utils.book_append_sheet(wb, wsResumo, "Resumo");

      // Aba 2: Respostas Brutas
      const respostasRows = relatorio.respostasBrutas.map((r) => {
        const row: Record<string, string | number> = {
          "ID Resposta": r.id,
          "Data Envio": r.data,
          ...r.respostas,
        };

        return row;
      });

      if (respostasRows.length > 0) {
        const wsRespostas = XLSX.utils.json_to_sheet(respostasRows);
        XLSX.utils.book_append_sheet(wb, wsRespostas, "Respostas Brutas");
      }

      // Aba 3: Comentários e Feedbacks Abertos
      const feedbacksRows = relatorio.feedbacksAbertos.map((f, i) => ({
        "#": i + 1,
        "Pergunta": f.perguntaTexto,
        "Comentário": f.comentario,
        "Respondente": f.respondente || "Anônimo",
        "Data": new Date(f.data).toLocaleDateString("pt-BR"),
      }));

      if (feedbacksRows.length > 0) {
        const wsFeedbacks = XLSX.utils.json_to_sheet(feedbacksRows);
        XLSX.utils.book_append_sheet(wb, wsFeedbacks, "Comentários");
      }

      const fileName = `Relatorio_${pesquisa.tipo.toUpperCase()}_${pesquisa.hash_publico}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(wb, fileName);
      toast.success("Relatório Excel exportado com sucesso!");
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao gerar arquivo Excel: " + (err.message || "Tente novamente."));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl max-h-[92vh] flex flex-col p-0 overflow-hidden">
        {/* Header com Identidade Visual Maia */}
        <DialogHeader className="p-6 pb-4 border-b bg-gradient-to-r from-[#3E100C]/5 via-[#E05A10]/5 to-transparent">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Badge
                  className={
                    pesquisa.tipo === "enps"
                      ? "bg-purple-100 text-purple-800 border-purple-200"
                      : "bg-orange-100 text-[#E05A10] border-orange-200"
                  }
                >
                  {pesquisa.tipo.toUpperCase()}
                </Badge>
                <DialogTitle className="text-xl font-bold text-[#3E100C]">
                  {pesquisa.titulo}
                </DialogTitle>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Análise de satisfação consolidada • {relatorio.totalRespostas} resposta(s) coletada(s)
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportExcel}
                className="border-emerald-600/40 text-emerald-700 hover:bg-emerald-50 text-xs font-semibold"
              >
                <Download className="h-4 w-4 mr-1.5" />
                Exportar para Excel (.xlsx)
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Abas e Conteúdo */}
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as any)}
          className="flex-1 flex flex-col overflow-hidden"
        >
          <div className="px-6 border-b bg-muted/20">
            <TabsList className="bg-transparent h-12 p-0 space-x-6 border-b-0">
              <TabsTrigger
                value="visao_geral"
                className="data-[state=active]:border-b-2 data-[state=active]:border-[#E05A10] data-[state=active]:text-[#E05A10] rounded-none px-2 py-3 font-medium text-xs flex items-center gap-1.5"
              >
                <TrendingUp className="h-4 w-4" />
                Visão Geral & Score NPS
              </TabsTrigger>
              <TabsTrigger
                value="questoes"
                className="data-[state=active]:border-b-2 data-[state=active]:border-[#E05A10] data-[state=active]:text-[#E05A10] rounded-none px-2 py-3 font-medium text-xs flex items-center gap-1.5"
              >
                <Award className="h-4 w-4" />
                Métricas por Questão ({relatorio.perguntas.length})
              </TabsTrigger>
              <TabsTrigger
                value="feedbacks"
                className="data-[state=active]:border-b-2 data-[state=active]:border-[#E05A10] data-[state=active]:text-[#E05A10] rounded-none px-2 py-3 font-medium text-xs flex items-center gap-1.5"
              >
                <MessageSquare className="h-4 w-4" />
                Feedbacks & Comentários ({relatorio.feedbacksAbertos.length})
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* ABA 1: VISÃO GERAL */}
            <TabsContent value="visao_geral" className="m-0 space-y-6">
              {/* Big Numbers Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Card Score NPS */}
                <Card className="border-2 border-[#E05A10]/20 bg-gradient-to-br from-[#FFF8F5] to-white shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
                      SCORE {pesquisa.tipo.toUpperCase()}
                      <Badge variant="outline" className={zonaColor}>
                        Zona {relatorio.zona}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-extrabold text-[#3E100C]">
                      {relatorio.scoreNps > 0 ? `+${relatorio.scoreNps}` : relatorio.scoreNps}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Escala oficial de -100 a +100
                    </p>
                  </CardContent>
                </Card>

                {/* Card Promotores */}
                <Card className="border-emerald-200 bg-emerald-50/30 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-semibold text-emerald-800 flex items-center justify-between">
                      <span>Promotores (9 a 10)</span>
                      <Smile className="h-4 w-4 text-emerald-600" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-emerald-700">
                      {relatorio.pctPromotores}%
                    </div>
                    <p className="text-[11px] text-emerald-800/80 mt-1">
                      {relatorio.promotores} respondente(s) fiéis e entusiastas
                    </p>
                  </CardContent>
                </Card>

                {/* Card Neutros */}
                <Card className="border-amber-200 bg-amber-50/30 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-semibold text-amber-800 flex items-center justify-between">
                      <span>Neutros (7 a 8)</span>
                      <Meh className="h-4 w-4 text-amber-600" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-amber-700">
                      {relatorio.pctNeutros}%
                    </div>
                    <p className="text-[11px] text-amber-800/80 mt-1">
                      {relatorio.neutros} respondente(s) passivos
                    </p>
                  </CardContent>
                </Card>

                {/* Card Detratores */}
                <Card className="border-rose-200 bg-rose-50/30 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-semibold text-rose-800 flex items-center justify-between">
                      <span>Detratores (0 a 6)</span>
                      <Frown className="h-4 w-4 text-rose-600" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-rose-700">
                      {relatorio.pctDetratores}%
                    </div>
                    <p className="text-[11px] text-rose-800/80 mt-1">
                      {relatorio.detratores} respondente(s) insatisfeitos
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Barra Segmentada de Distribuição */}
              <div className="p-5 rounded-2xl border bg-card shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-[#3E100C]">
                      Distribuição Percentual de Satisfação
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Cálculo: % Promotores ({relatorio.pctPromotores}%) - % Detratores ({relatorio.pctDetratores}%) = Score {relatorio.scoreNps}
                    </p>
                  </div>
                  <div className="text-xs font-medium text-muted-foreground">
                    Total: {relatorio.totalRespostas} respostas
                  </div>
                </div>

                {/* Barra tricolor */}
                <div className="h-5 w-full rounded-full overflow-hidden flex bg-muted shadow-inner">
                  <div
                    style={{ width: `${relatorio.pctPromotores}%` }}
                    className="bg-emerald-500 transition-all duration-500"
                    title={`Promotores: ${relatorio.pctPromotores}%`}
                  />
                  <div
                    style={{ width: `${relatorio.pctNeutros}%` }}
                    className="bg-amber-400 transition-all duration-500"
                    title={`Neutros: ${relatorio.pctNeutros}%`}
                  />
                  <div
                    style={{ width: `${relatorio.pctDetratores}%` }}
                    className="bg-rose-500 transition-all duration-500"
                    title={`Detratores: ${relatorio.pctDetratores}%`}
                  />
                </div>

                {/* Legenda com Zonas */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-2 text-xs">
                  <div className="p-2.5 rounded-lg border bg-muted/20">
                    <span className="font-semibold text-emerald-700">Zona de Excelência:</span>
                    <p className="text-muted-foreground text-[11px]">Score entre 75 e 100</p>
                  </div>
                  <div className="p-2.5 rounded-lg border bg-muted/20">
                    <span className="font-semibold text-sky-700">Zona de Qualidade:</span>
                    <p className="text-muted-foreground text-[11px]">Score entre 50 e 74</p>
                  </div>
                  <div className="p-2.5 rounded-lg border bg-muted/20">
                    <span className="font-semibold text-amber-700">Zona de Aperfeiçoamento:</span>
                    <p className="text-muted-foreground text-[11px]">Score entre 0 e 49</p>
                  </div>
                  <div className="p-2.5 rounded-lg border bg-muted/20">
                    <span className="font-semibold text-rose-700">Zona Crítica:</span>
                    <p className="text-muted-foreground text-[11px]">Score menor que 0</p>
                  </div>
                </div>
              </div>

              {/* Feed rápido com os últimos comentários */}
              <div className="p-5 rounded-2xl border bg-card shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-[#3E100C] flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-[#E05A10]" />
                    Últimos Feedbacks e Comentários Abertos
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-[#E05A10]"
                    onClick={() => setActiveTab("feedbacks")}
                  >
                    Ver todos ({relatorio.feedbacksAbertos.length})
                  </Button>
                </div>

                {relatorio.feedbacksAbertos.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic py-3 text-center">
                    Nenhum feedback aberto registrado nesta pesquisa até o momento.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {relatorio.feedbacksAbertos.slice(0, 3).map((f, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-muted/30 border text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between text-muted-foreground text-[10px]">
                          <span className="font-semibold text-[#3E100C]">
                            {f.respondente || "Anônimo"}
                          </span>
                          <span>{new Date(f.data).toLocaleDateString("pt-BR")}</span>
                        </div>
                        <p className="text-foreground italic">"{f.comentario}"</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* ABA 2: MÉTRICAS POR QUESTÃO */}
            <TabsContent value="questoes" className="m-0 space-y-4">
              {relatorio.questoesStats.map((q, idx) => (
                <div
                  key={idx}
                  className="p-5 rounded-2xl border bg-card shadow-sm space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="h-6 w-6 rounded-full bg-[#3E100C] text-white text-xs font-bold flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <h4 className="text-sm font-bold text-[#3E100C]">{q.perguntaTexto}</h4>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 ml-8">
                        Tipo:{" "}
                        {q.tipo === "nps_0_10"
                          ? "NPS (0 a 10)"
                          : q.tipo === "escala_1_5"
                          ? "Escala (1 a 5)"
                          : q.tipo === "selecao_lista"
                          ? "Lista de Seleção"
                          : "Texto Aberto"}{" "}
                        • {q.totalRespostas} respostas computadas
                      </p>
                    </div>

                    {q.media !== null && (
                      <div className="text-right">
                        <span className="text-xs text-muted-foreground block">Média Geral</span>
                        <span className="text-xl font-extrabold text-[#E05A10]">
                          {q.media.toFixed(1)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Distribuição por nota ou opção selecionada */}
                  {q.distribuicao && Object.keys(q.distribuicao).length > 0 && (
                    <div className="space-y-2 pt-2 border-t">
                      <p className="text-[11px] font-semibold text-muted-foreground">
                        {q.tipo === "selecao_lista" ? "Distribuição das Alternativas:" : "Frequência de Notas:"}
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                        {Object.entries(q.distribuicao).map(([nota, count]) => {
                          const pct =
                            q.totalRespostas > 0
                              ? Math.round((count / q.totalRespostas) * 100)
                              : 0;
                          return (
                            <div
                              key={nota}
                              className="p-2 rounded-lg bg-muted/30 border text-center space-y-1"
                            >
                              <span className="text-xs font-bold block">{nota}</span>
                              <span className="text-[11px] text-muted-foreground block font-medium">
                                {count} ({pct}%)
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </TabsContent>

            {/* ABA 3: FEEDBACKS COMPLETOS */}
            <TabsContent value="feedbacks" className="m-0 space-y-3">
              {relatorio.feedbacksAbertos.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground space-y-2">
                  <MessageSquare className="h-8 w-8 mx-auto opacity-40" />
                  <p className="text-sm">Nenhum comentário aberto registrado nesta pesquisa.</p>
                </div>
              ) : (
                relatorio.feedbacksAbertos.map((f, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl border bg-card shadow-sm space-y-2 hover:border-[#E05A10]/30 transition-all"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-[#3E100C]">
                        {f.respondente || "Anônimo"}
                      </span>
                      <span className="text-muted-foreground">
                        {new Date(f.data).toLocaleString("pt-BR")}
                      </span>
                    </div>
                    <Badge variant="outline" className="text-[10px] text-muted-foreground">
                      {f.perguntaTexto}
                    </Badge>
                    <p className="text-sm text-foreground bg-muted/20 p-3 rounded-lg border">
                      "{f.comentario}"
                    </p>
                  </div>
                ))
              )}
            </TabsContent>
          </div>

          <DialogFooter className="p-4 border-t bg-muted/10">
            <Button variant="outline" onClick={onClose}>
              Fechar Relatório
            </Button>
          </DialogFooter>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
