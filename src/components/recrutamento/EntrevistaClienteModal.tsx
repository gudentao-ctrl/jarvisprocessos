// src/components/recrutamento/EntrevistaClienteModal.tsx
// Modal da Etapa 6: Entrevista com o Contratante
// Avaliação da empresa cliente, aprovação decisória e geração imediata do PDF de Proposta de Remuneração & Admissão com assinaturas

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  FileCheck2,
  Download,
  CheckCircle2,
  UserX,
  Printer,
  Sparkles,
  ArrowRight,
  Handshake,
} from "lucide-react";
import { toast } from "sonner";
import { CandidaturaFunil, AvaliacaoCliente } from "@/lib/recrutamento-types";
import { avancarEtapaCandidatura } from "@/lib/recrutamento-storage";
import { generatePropostaAdmissaoPDF } from "@/utils/propostaAdmissaoPdfGenerator";

interface EntrevistaClienteModalProps {
  candidatura: CandidaturaFunil | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onReprovar: (candidatura: CandidaturaFunil) => void;
}

export default function EntrevistaClienteModal({
  candidatura,
  isOpen,
  onClose,
  onSuccess,
  onReprovar,
}: EntrevistaClienteModalProps) {
  if (!candidatura) return null;

  const candidato = candidatura.candidato;
  const vaga = candidatura.vaga;
  const proposta = candidatura.proposta_contratacao;
  const avaliacaoAtual = candidatura.avaliacao_cliente;

  const [resultado, setResultado] = useState<"APROVADO" | "REPROVADO" | "EM_NEGOCIACAO">(
    avaliacaoAtual?.resultado || "APROVADO",
  );
  const [avaliadorCliente, setAvaliadorCliente] = useState(
    avaliacaoAtual?.avaliador_cliente || "Diretoria Executiva / Gestor da Área",
  );
  const [feedbackCliente, setFeedbackCliente] = useState(
    avaliacaoAtual?.feedback_cliente ||
      "O cliente aprovou o perfil profissional com entusiasmo, destacando a postura consultiva e o domínio técnico para início imediato.",
  );
  const [propostaAceita, setPropostaAceita] = useState(avaliacaoAtual?.proposta_aceita ?? true);
  const [loading, setLoading] = useState(false);

  const handleGerarPDF = () => {
    if (!candidato || !vaga || !proposta) {
      toast.error("Dados da proposta ou candidato incompletos para geração do PDF.");
      return;
    }

    try {
      const doc = generatePropostaAdmissaoPDF({
        candidato,
        vaga,
        proposta,
        empresaNome: vaga.empresa_nome,
        consultorResponsavel: candidatura.parecer_consultoria?.consultor_nome || "Maia Consultoria",
      });

      doc.save(`Proposta_Admissao_${candidato.nome.replace(/\s+/g, "_")}.pdf`);
      toast.success("PDF da Proposta de Admissão gerado com sucesso!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao gerar PDF da proposta.");
    }
  };

  const handleConfirmarContratacao = async () => {
    if (!proposta) {
      toast.error("Desenhe a proposta comercial antes de finalizar a contratação.");
      return;
    }

    try {
      setLoading(true);
      const avaliacao: AvaliacaoCliente = {
        resultado,
        avaliador_cliente: avaliadorCliente.trim(),
        feedback_cliente: feedbackCliente.trim(),
        proposta_aceita: propostaAceita,
        data_entrevista: new Date().toISOString().split("T")[0],
      };

      if (resultado === "APROVADO") {
        await avancarEtapaCandidatura(
          candidatura.id,
          "FINALIZACAO_CONTRATADO",
          `Aprovado na entrevista com o contratante! Termo de admissão gerado e contratação consolidada.`,
          { avaliacao_cliente: avaliacao },
        );
        toast.success(`🎉 Parabéns! ${candidato?.nome} foi CONTRATADO com sucesso!`);
        // Baixa o PDF automaticamente
        handleGerarPDF();
      } else {
        await avancarEtapaCandidatura(
          candidatura.id,
          candidatura.etapa_kanban,
          "Parecer da entrevista com o contratante atualizado.",
          { avaliacao_cliente: avaliacao },
        );
        toast.success("Avaliação salva com sucesso!");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Erro ao processar aprovação.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary">
            <Handshake className="h-5 w-5 text-emerald-600" />
            <DialogTitle className="text-base font-bold">
              Entrevista com o Contratante • Decisão de Admissão
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs">
            Candidato: <strong>{candidato?.nome}</strong> • Vaga: <strong>{vaga?.titulo}</strong> ({vaga?.empresa_nome || "Cliente"})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* Card da Proposta em Pauta */}
          <div className="bg-muted/40 p-3 rounded-lg border space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-semibold text-muted-foreground">
                Termos da Proposta Submetida ao Cliente
              </span>
              <Badge variant="outline" className="text-[10px] font-mono">
                {proposta?.tipo_contrato || vaga?.tipo_contratacao || "CLT"}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground block text-[11px]">Remuneração:</span>
                <span className="font-bold text-emerald-600 text-sm">
                  {proposta?.remuneracao_mensal ? `R$ ${proposta.remuneracao_mensal.toLocaleString("pt-BR")}` : "A definir"}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Início Previsto:</span>
                <span className="font-medium text-foreground">{proposta?.data_inicio_prevista || "Imediato"}</span>
              </div>
            </div>
          </div>

          {/* Resultado da Entrevista com o Cliente */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Decisão do Contratante *</Label>
              <Select value={resultado} onValueChange={(val: any) => setResultado(val)}>
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="APROVADO" className="text-xs text-emerald-600 font-semibold">
                    ✓ APROVADO PELO CLIENTE (CONTRATAR)
                  </SelectItem>
                  <SelectItem value="EM_NEGOCIACAO" className="text-xs text-amber-600 font-semibold">
                    ⏳ EM NEGOCIAÇÃO DE VALORES / DATAS
                  </SelectItem>
                  <SelectItem value="REPROVADO" className="text-xs text-rose-600 font-semibold">
                    ✕ REPROVADO PELO CLIENTE
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="avaliador" className="text-xs font-semibold">
                Gestor / Avaliador no Cliente
              </Label>
              <Input
                id="avaliador"
                value={avaliadorCliente}
                onChange={(e) => setAvaliadorCliente(e.target.value)}
                className="text-xs"
              />
            </div>
          </div>

          {/* Feedback Detalhado */}
          <div className="space-y-1">
            <Label htmlFor="fbCliente" className="text-xs font-semibold">
              Parecer / Feedback do Decisor do Cliente
            </Label>
            <Textarea
              id="fbCliente"
              rows={3}
              value={feedbackCliente}
              onChange={(e) => setFeedbackCliente(e.target.value)}
              placeholder="Comentários sobre a entrevista, alinhamento técnico e aceitação..."
              className="text-xs"
            />
          </div>

          {/* Caixa de Geração do PDF com Assinaturas */}
          <div className="p-3.5 bg-gradient-to-r from-primary/10 via-amber-500/10 to-transparent border border-primary/20 rounded-xl space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCheck2 className="h-5 w-5 text-primary" />
                <div>
                  <h4 className="font-bold text-foreground text-xs">
                    PDF de Proposta de Remuneração e Admissão
                  </h4>
                  <p className="text-[11px] text-muted-foreground">
                    Documento formal com dados da vaga, proposta econômica e campos para assinatura das partes.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleGerarPDF}
                className="text-xs bg-background hover:bg-muted"
              >
                <Printer className="h-3.5 w-3.5 mr-1.5 text-primary" />
                Gerar & Baixar PDF de Admissão
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              onClose();
              onReprovar(candidatura);
            }}
            className="text-rose-600 border-rose-200 hover:bg-rose-50 text-xs"
          >
            <UserX className="h-3.5 w-3.5 mr-1" />
            Reprovar & Enviar Devolutiva
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={loading}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleConfirmarContratacao}
              disabled={loading}
              className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            >
              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
              {resultado === "APROVADO" ? "Concluir Contratação & Emitir Termo" : "Salvar Decisão"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
