// src/components/recrutamento/PropostaContratacaoModal.tsx
// Modal da Etapa 5: Alinhamento com Contratante (Desenho da Proposta Comercial de Contratação)

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
  FileSpreadsheet,
  DollarSign,
  Briefcase,
  Calendar,
  CheckCircle2,
  Plus,
  X,
  UserX,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { CandidaturaFunil, PropostaContratacao, TipoContratacao } from "@/lib/recrutamento-types";
import { avancarEtapaCandidatura } from "@/lib/recrutamento-storage";

interface PropostaContratacaoModalProps {
  candidatura: CandidaturaFunil | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onReprovar: (candidatura: CandidaturaFunil) => void;
}

export default function PropostaContratacaoModal({
  candidatura,
  isOpen,
  onClose,
  onSuccess,
  onReprovar,
}: PropostaContratacaoModalProps) {
  if (!candidatura) return null;

  const candidato = candidatura.candidato;
  const vaga = candidatura.vaga;
  const propostaAtual = candidatura.proposta_contratacao;

  const [remuneracao, setRemuneracao] = useState<number>(
    propostaAtual?.remuneracao_mensal || vaga?.salario_min || 7500,
  );
  const [tipoContrato, setTipoContrato] = useState<TipoContratacao>(
    propostaAtual?.tipo_contrato || vaga?.tipo_contratacao || "CLT",
  );
  const [jornada, setJornada] = useState(
    propostaAtual?.jornada || vaga?.jornada || "Presencial - 44h semanais",
  );
  const [dataInicio, setDataInicio] = useState(
    propostaAtual?.data_inicio_prevista ||
      new Date(Date.now() + 15 * 86400000).toISOString().split("T")[0],
  );
  const [observacoes, setObservacoes] = useState(
    propostaAtual?.observacoes_contratante ||
      "Proposta desenhada pela consultoria com base na média salarial da vaga e expectativa do profissional.",
  );

  // Benefícios Acordados (Tags)
  const [beneficios, setBeneficios] = useState<string[]>(
    propostaAtual?.beneficios_acordados || vaga?.beneficios || ["VR R$ 42,00/dia", "Plano de Saúde"],
  );
  const [novoBeneficio, setNovoBeneficio] = useState("");

  const [loading, setLoading] = useState(false);

  const handleAddBeneficio = () => {
    if (!novoBeneficio.trim()) return;
    if (!beneficios.includes(novoBeneficio.trim())) {
      setBeneficios([...beneficios, novoBeneficio.trim()]);
    }
    setNovoBeneficio("");
  };

  const handleSalvarProposta = async (avancarParaEntrevistaCliente = false) => {
    if (remuneracao <= 0) {
      toast.error("Informe a remuneração mensal acordada.");
      return;
    }

    try {
      setLoading(true);
      const proposta: PropostaContratacao = {
        remuneracao_mensal: Number(remuneracao),
        tipo_contrato: tipoContrato,
        jornada: jornada.trim(),
        beneficios_acordados: beneficios,
        data_inicio_prevista: dataInicio,
        observacoes_contratante: observacoes.trim(),
        data_criacao_proposta: new Date().toISOString().split("T")[0],
      };

      if (avancarParaEntrevistaCliente) {
        await avancarEtapaCandidatura(
          candidatura.id,
          "ENTREVISTA_CONTRATANTE",
          `Proposta desenhada (R$ ${remuneracao.toLocaleString("pt-BR")} - ${tipoContrato}). Candidato agendado para Entrevista com o Contratante.`,
          { proposta_contratacao: proposta },
        );
        toast.success("Proposta desenhada e avançado para Entrevista com o Contratante!");
      } else {
        await avancarEtapaCandidatura(
          candidatura.id,
          candidatura.etapa_kanban,
          "Minuta da proposta comercial atualizada.",
          { proposta_contratacao: proposta },
        );
        toast.success("Minuta de proposta salva com sucesso!");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar proposta.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary">
            <FileSpreadsheet className="h-5 w-5" />
            <DialogTitle className="text-base font-bold">
              Alinhamento com Contratante • Desenho da Proposta Comercial
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs">
            Estruture os termos financeiros e contratuais que servirão de base para a entrevista decisória com a empresa cliente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* Card Resumo do Candidato Aprovado */}
          <div className="p-3 bg-muted/30 border rounded-lg flex items-center justify-between">
            <div>
              <span className="text-[10px] text-muted-foreground uppercase font-semibold">Profissional Selecionado</span>
              <div className="font-bold text-foreground text-sm">{candidato?.nome}</div>
              <div className="text-muted-foreground text-[11px]">
                Pretensão do candidato: {candidato?.pretensao_salarial ? `R$ ${candidato.pretensao_salarial.toLocaleString("pt-BR")}` : "A combinar"}
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-muted-foreground uppercase font-semibold">Empresa Contratante</span>
              <div className="font-medium text-foreground">{vaga?.empresa_nome || "Cliente"}</div>
              <div className="text-muted-foreground text-[11px]">{vaga?.titulo}</div>
            </div>
          </div>

          {/* Dados Econômicos da Proposta */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-primary/5 p-3 rounded-lg border border-primary/20">
            <div className="space-y-1">
              <Label htmlFor="remuneracao" className="text-xs font-semibold text-primary">
                Remuneração Mensal Acordada (R$) *
              </Label>
              <Input
                id="remuneracao"
                type="number"
                value={remuneracao}
                onChange={(e) => setRemuneracao(Number(e.target.value))}
                className="text-xs bg-background font-bold text-emerald-600"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-primary">Tipo de Contrato *</Label>
              <Select value={tipoContrato} onValueChange={(val: any) => setTipoContrato(val)}>
                <SelectTrigger className="text-xs bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CLT" className="text-xs">CLT (Consolidação das Leis do Trabalho)</SelectItem>
                  <SelectItem value="PJ" className="text-xs">PJ (Pessoa Jurídica)</SelectItem>
                  <SelectItem value="Estágio" className="text-xs">Estágio</SelectItem>
                  <SelectItem value="Temporário" className="text-xs">Temporário</SelectItem>
                  <SelectItem value="Cooperado" className="text-xs">Cooperado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Jornada & Data de Início */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="jornada" className="text-xs font-semibold">
                Jornada e Regime de Trabalho
              </Label>
              <Input
                id="jornada"
                value={jornada}
                onChange={(e) => setJornada(e.target.value)}
                placeholder="Ex: Presencial - Segunda a Sexta das 08h às 18h"
                className="text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="dataInicio" className="text-xs font-semibold">
                Data Prevista para Início das Atividades
              </Label>
              <Input
                id="dataInicio"
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="text-xs"
              />
            </div>
          </div>

          {/* Benefícios Acordados */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Benefícios e Compensações Acordadas</Label>
            <div className="flex gap-2">
              <Input
                value={novoBeneficio}
                onChange={(e) => setNovoBeneficio(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddBeneficio())}
                placeholder="Ex: VR R$ 45,00/dia, Assistência Médica..."
                className="text-xs"
              />
              <Button type="button" size="sm" variant="outline" onClick={handleAddBeneficio} className="text-xs">
                <Plus className="h-3.5 w-3.5 mr-1" />
                Adicionar
              </Button>
            </div>
            <div className="flex flex-wrap gap-1 mt-1">
              {beneficios.map((b, i) => (
                <Badge key={i} variant="secondary" className="text-[10px] gap-1 text-emerald-700 dark:text-emerald-300">
                  {b}
                  <X
                    className="h-3 w-3 cursor-pointer hover:text-destructive"
                    onClick={() => setBeneficios(beneficios.filter((_, idx) => idx !== i))}
                  />
                </Badge>
              ))}
            </div>
          </div>

          {/* Observações da Proposta */}
          <div className="space-y-1">
            <Label htmlFor="obs" className="text-xs font-semibold">
              Observações Estratégicas para a Reunião com o Contratante
            </Label>
            <Textarea
              id="obs"
              rows={3}
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Pontos de flexibilidade, contrapartidas ou prazos acordados..."
              className="text-xs"
            />
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
              onClick={() => handleSalvarProposta(false)}
              disabled={loading}
              className="text-xs"
            >
              Salvar Minuta
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => handleSalvarProposta(true)}
              disabled={loading}
              className="text-xs bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
              Avançar para Entrevista com o Contratante
              <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
