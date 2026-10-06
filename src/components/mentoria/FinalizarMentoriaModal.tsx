import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Award,
  FileDown,
  CheckCircle2,
  Calendar,
  Clock,
  TrendingUp,
  FileText,
  ShieldCheck,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import type { Mentorado } from "@/lib/mentoria-types";
import { generateMentoriaFinalReportPDF } from "@/utils/mentoriaPdfGenerator";
import { toast } from "sonner";

export function FinalizarMentoriaModal({
  open,
  onOpenChange,
  mentorado,
  companyName = "Empresa Cliente",
  onConfirmFinalizacao,
  isProcessing,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mentorado: Mentorado;
  companyName?: string;
  onConfirmFinalizacao: (parecerFinal: string, pdfBlobUrl?: string) => Promise<any>;
  isProcessing?: boolean;
}) {
  const defaultParecer =
    mentorado.parecer_final ||
    `Conclusão do ciclo de mentoria de liderança e desenvolvimento individual de ${mentorado.nome}. Ao longo de ${mentorado.totalAtendimentos || 0} atendimentos totalizando ${(mentorado.totalHoras || 0).toFixed(1)} horas, foram mapeadas e acompanhadas ${mentorado.totalAcoes || 0} ações de desenvolvimento, com nota média final de avanço de ${(mentorado.mediaAvanco || 0).toFixed(1)}/5.0. O mentorado demonstrou expressiva evolução na aplicação prática de rotinas de gestão, comunicação assertiva e postura de liderança frente à equipe.`;

  const [parecer, setParecer] = useState(defaultParecer);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const handleFinalizarEGerarPdf = async () => {
    if (!parecer.trim()) {
      toast.error("Informe o parecer final de encerramento da mentoria.");
      return;
    }

    setGeneratingPdf(true);
    try {
      // 1. Gera o PDF oficial do relatório
      const pdf = await generateMentoriaFinalReportPDF(mentorado, parecer, companyName);

      // Cria URL para o blob
      const pdfUrl = URL.createObjectURL(pdf.blob);

      // Baixa automaticamente o arquivo para o usuário
      pdf.download();

      // 2. Salva no backend / storage e move para inativas
      await onConfirmFinalizacao(parecer, pdfUrl);

      toast.success("Mentoria finalizada e Relatório de Conclusão PDF gerado com sucesso!");
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao finalizar mentoria.");
    } finally {
      setGeneratingPdf(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92dvh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader className="border-b pb-3">
          <div className="flex items-center gap-2">
            <Award className="h-6 w-6 text-[#E05A10]" />
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold text-[#3E100C]">
                Finalizar Projeto de Mentoria & Emissão de Relatório
              </DialogTitle>
              <p className="text-xs text-muted-foreground">
                Mentorado(a): <strong className="text-foreground">{mentorado.nome}</strong> ·{" "}
                {companyName}
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Card de Alerta Informativo */}
          <div className="flex items-start gap-2.5 p-3 rounded-lg border border-amber-300 bg-amber-50/70 text-xs text-amber-900">
            <AlertTriangle className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Confirmação de Conclusão do Ciclo</p>
              <p className="text-[11px] text-amber-800 mt-0.5">
                Ao finalizar, o sistema consolidará automaticamente todo o histórico de atendimentos, matriz de ações e evolução dos indicadores em um relatório PDF timbrado, movendo o mentorado para a aba <strong>Mentorias Inativas/Finalizadas</strong>.
              </p>
            </div>
          </div>

          {/* 1. Consolidação Automática (Big Numbers) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
            <div className="p-2.5 rounded-lg border bg-muted/20">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                Total Sessões
              </span>
              <span className="text-base font-black text-[#3E100C]">
                {mentorado.totalAtendimentos || 0}
              </span>
            </div>
            <div className="p-2.5 rounded-lg border bg-muted/20">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                Carga Horária
              </span>
              <span className="text-base font-black text-[#3E100C]">
                {(mentorado.totalHoras || 0).toFixed(1)}h
              </span>
            </div>
            <div className="p-2.5 rounded-lg border bg-muted/20">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                Ações Mapeadas
              </span>
              <span className="text-base font-black text-[#E05A10]">
                {mentorado.acoesConcluidas || 0}/{mentorado.totalAcoes || 0}
              </span>
            </div>
            <div className="p-2.5 rounded-lg border bg-muted/20">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                Nota Média Avanço
              </span>
              <span className="text-base font-black text-[#E05A10]">
                {(mentorado.mediaAvanco || 0).toFixed(1)}/5.0
              </span>
            </div>
          </div>

          {/* 2. Resumo Consolidado de Temas e Mapeamento Comportamental */}
          <div className="space-y-2 rounded-xl border border-[#E5D5CE] p-3.5 bg-[#FFF8F5]/50 text-xs">
            <h4 className="font-bold text-[#3E100C] flex items-center gap-1.5">
              <FileText className="h-4 w-4 text-[#E05A10]" />
              Consolidação de Temas e Histórico
            </h4>

            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {(mentorado.sessoes || []).map((s, idx) => (
                <div key={s.id} className="p-2 rounded bg-white border border-[#E5D5CE]/50">
                  <div className="flex items-center justify-between text-[11px] font-bold text-[#3E100C]">
                    <span>Sessão #{idx + 1} ({new Date(s.data_atendimento).toLocaleDateString("pt-BR")}) - {s.horas}h</span>
                    <Badge variant="outline" className="text-[9px]">
                      Nota: {Number(s.diagnostico?.media_nota || 0).toFixed(1)}/5.0
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                    {s.resumo}
                  </p>
                </div>
              ))}
            </div>

            {mentorado.behavioral_profile?.dominant_factor && (
              <div className="pt-2 border-t border-[#E5D5CE]/60 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-[#E05A10]" />
                <span className="font-medium text-[#3E100C]">
                  Perfil Comportamental Vinculado: Fator Dominante{" "}
                  <strong>{mentorado.behavioral_profile.dominant_factor}</strong>
                </span>
              </div>
            )}
          </div>

          {/* 3. Parecer Final do Consultor (Editável) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-[#3E100C]">
                Parecer Final do Consultor (Editável para o Relatório) *
              </Label>
              <span className="text-[10px] text-muted-foreground">
                Será impresso com destaque no documento oficial
              </span>
            </div>
            <Textarea
              rows={5}
              value={parecer}
              onChange={(e) => setParecer(e.target.value)}
              className="text-xs leading-relaxed"
              placeholder="Descreva o parecer de encerramento, conquistas alcançadas e recomendações para continuidade do desenvolvimento..."
            />
          </div>
        </div>

        <DialogFooter className="border-t pt-3 flex items-center justify-between">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>

          <Button
            type="button"
            className="bg-[#E05A10] hover:bg-[#E05A10]/90 text-white font-bold text-xs h-10 px-5 gap-1.5 shadow-sm"
            disabled={isProcessing || generatingPdf}
            onClick={handleFinalizarEGerarPdf}
          >
            {generatingPdf || isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Processando...
              </>
            ) : (
              <>
                <FileDown className="h-4 w-4" /> Emitir e Concluir Mentoria (PDF)
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
