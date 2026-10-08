// src/components/recrutamento/AnalisePerfilModal.tsx
// Modal de Análise de Perfil Comportamental (Coluna 4)
// Integração com teste de 240 questões, geração de link, parecer de recomendação e faixa salarial

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
  Radar,
  Copy,
  MessageCircle,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  UserX,
  ArrowRight,
  Sparkles,
  FileCheck,
} from "lucide-react";
import { toast } from "sonner";
import { CandidaturaFunil, AnalisePerfilData } from "@/lib/recrutamento-types";
import { avancarEtapaCandidatura } from "@/lib/recrutamento-storage";

interface AnalisePerfilModalProps {
  candidatura: CandidaturaFunil | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onReprovar: (candidatura: CandidaturaFunil) => void;
}

export default function AnalisePerfilModal({
  candidatura,
  isOpen,
  onClose,
  onSuccess,
  onReprovar,
}: AnalisePerfilModalProps) {
  if (!candidatura) return null;

  const candidato = candidatura.candidato;
  const vaga = candidatura.vaga;
  const analiseAtual = candidatura.analise_perfil;

  const [recomendacao, setRecomendacao] = useState<"RECOMENDADO" | "RECOMENDADO_COM_RESSALVAS" | "NAO_RECOMENDADO">(
    analiseAtual?.recomendacao || "RECOMENDADO",
  );
  const [faixaRemuneracao, setFaixaRemuneracao] = useState(
    analiseAtual?.faixa_remuneracao_sugerida ||
      (vaga ? `R$ ${vaga.salario_min.toLocaleString("pt-BR")} a R$ ${vaga.salario_max.toLocaleString("pt-BR")}` : "R$ 7.500,00"),
  );
  const [fatorDominante, setFatorDominante] = useState(
    analiseAtual?.fator_dominante || "Conscienciosidade & Dominância (Foco em Execução e Metas)",
  );
  const [discResumo, setDiscResumo] = useState(
    analiseAtual?.disc_resumo || "Perfil com alta disciplina executiva, facilidade para organização de fluxos e liderança firme.",
  );
  const [parecerFinal, setParecerFinal] = useState(
    analiseAtual?.parecer_final_consultoria ||
      "Candidato demonstrou maturidade emocional, aderência comportamental à liderança e perfil alinhado aos desafios operacionais da contratante.",
  );
  const [statusTeste, setStatusTeste] = useState<"PENDENTE" | "RESPONDIDO" | "DISPENSADO">(
    analiseAtual?.status_teste || "RESPONDIDO",
  );
  const [loading, setLoading] = useState(false);

  // Link do teste de 240 questões
  const candidateToken = candidato?.id || "teste-geral";
  const assessmentLink = typeof window !== "undefined"
    ? `${window.location.origin}/teste/${candidateToken}`
    : `https://maiaconsultoria.com.br/teste/${candidateToken}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(assessmentLink);
    toast.success("Link do teste de 240 questões copiado!");
  };

  const handleSendWhatsApp = () => {
    const telefone = candidato?.telefone?.replace(/\D/g, "");
    if (!telefone) {
      toast.error("Candidato não possui telefone válido.");
      return;
    }
    const formatted = telefone.startsWith("55") ? telefone : `55${telefone}`;
    const text = encodeURIComponent(
      `Olá ${candidato?.nome}, tudo bem?\n\nPara avançarmos no processo seletivo da vaga de ${vaga?.titulo} na Maia Consultoria, solicitamos o preenchimento da sua Avaliação de Perfil Comportamental (240 questões).\n\nAcesse pelo link oficial:\n${assessmentLink}\n\nO teste leva cerca de 25 minutos. Havendo dúvidas, estamos à disposição!`,
    );
    window.open(`https://wa.me/${formatted}?text=${text}`, "_blank");
  };

  const handleSalvarEAvancar = async (avancarParaAlinhamento = false) => {
    try {
      setLoading(true);
      const perfilData: AnalisePerfilData = {
        status_teste: statusTeste,
        fator_dominante: fatorDominante.trim(),
        disc_resumo: discResumo.trim(),
        recomendacao,
        faixa_remuneracao_sugerida: faixaRemuneracao.trim(),
        parecer_final_consultoria: parecerFinal.trim(),
        data_analise: new Date().toISOString().split("T")[0],
      };

      if (avancarParaAlinhamento) {
        await avancarEtapaCandidatura(
          candidatura.id,
          "ALINHAMENTO_CONTRATANTE",
          `Perfil analisado com parecer "${recomendacao}". Remuneração sugerida: ${faixaRemuneracao}.`,
          { analise_perfil: perfilData },
        );
        toast.success("Avançado para Alinhamento com Contratante!");
      } else {
        await avancarEtapaCandidatura(
          candidatura.id,
          candidatura.etapa_kanban,
          "Dados de análise de perfil atualizados.",
          { analise_perfil: perfilData },
        );
        toast.success("Análise de perfil salva com sucesso!");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar perfil.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary">
            <Radar className="h-5 w-5" />
            <DialogTitle className="text-base font-bold">
              Análise de Perfil Comportamental (Bloco 23)
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs">
            Candidato: <strong>{candidato?.nome}</strong> • Vaga: <strong>{vaga?.titulo}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* Caixa de Geração do Link de 240 Questões */}
          <div className="bg-primary/5 border border-primary/20 p-3 rounded-lg space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-primary flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-amber-500" />
                Link da Avaliação Psicométrica (240 Questões)
              </span>
              <Badge variant="outline" className="text-[10px]">
                Status: {statusTeste}
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground">
              O candidato pode responder pelo portal público sem necessidade de login.
            </p>
            <div className="flex items-center gap-2">
              <Input value={assessmentLink} readOnly className="text-xs font-mono bg-background" />
              <Button type="button" size="sm" variant="outline" onClick={handleCopyLink} className="text-xs shrink-0">
                <Copy className="h-3.5 w-3.5 mr-1" />
                Copiar
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleSendWhatsApp}
                className="text-xs shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <MessageCircle className="h-3.5 w-3.5 mr-1" />
                WhatsApp
              </Button>
            </div>
          </div>

          {/* Status do Teste */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Status do Questionário</Label>
              <Select value={statusTeste} onValueChange={(val: any) => setStatusTeste(val)}>
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RESPONDIDO" className="text-xs">
                    ✓ Teste Respondido / Perfil Mapeado
                  </SelectItem>
                  <SelectItem value="PENDENTE" className="text-xs">
                    ⏳ Aguardando Resposta do Candidato
                  </SelectItem>
                  <SelectItem value="DISPENSADO" className="text-xs">
                    Perfil Já Conhecido / Dispensado
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Recomendação Final da Consultoria *</Label>
              <Select value={recomendacao} onValueChange={(val: any) => setRecomendacao(val)}>
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RECOMENDADO" className="text-xs text-emerald-600 font-semibold">
                    ✓ RECOMENDADO
                  </SelectItem>
                  <SelectItem value="RECOMENDADO_COM_RESSALVAS" className="text-xs text-amber-600 font-semibold">
                    ⚠️ RECOMENDADO COM RESSALVAS
                  </SelectItem>
                  <SelectItem value="NAO_RECOMENDADO" className="text-xs text-rose-600 font-semibold">
                    ✕ NÃO RECOMENDADO
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Fatores Dominantes & DISC */}
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="fatorDom" className="text-xs font-semibold">
                Fator Comportamental Dominante (Big Five & DISC)
              </Label>
              <Input
                id="fatorDom"
                value={fatorDominante}
                onChange={(e) => setFatorDominante(e.target.value)}
                placeholder="Ex: Conscienciosidade & Dominância"
                className="text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="disc" className="text-xs font-semibold">
                Síntese do Perfil DISC & Estilo de Trabalho
              </Label>
              <Textarea
                id="disc"
                rows={2}
                value={discResumo}
                onChange={(e) => setDiscResumo(e.target.value)}
                placeholder="Traços de comunicação, resposta a prazos curtos e convivência em equipe..."
                className="text-xs"
              />
            </div>
          </div>

          {/* Faixa de Remuneração Sugerida */}
          <div className="space-y-1 bg-muted/40 p-3 rounded-lg border">
            <Label htmlFor="faixaRem" className="text-xs font-semibold text-primary">
              Sugestão de Faixa de Remuneração para Contratação *
            </Label>
            <Input
              id="faixaRem"
              value={faixaRemuneracao}
              onChange={(e) => setFaixaRemuneracao(e.target.value)}
              placeholder="Ex: R$ 7.500,00 a R$ 8.500,00 CLT"
              className="text-xs bg-background"
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              Este valor servirá de subsídio financeiro para o desenho da proposta na etapa seguinte.
            </p>
          </div>

          {/* Parecer Qualitativo da Consultoria */}
          <div className="space-y-1">
            <Label htmlFor="parecerFinal" className="text-xs font-semibold">
              Parecer Técnico da Maia para Apresentação ao Cliente
            </Label>
            <Textarea
              id="parecerFinal"
              rows={3}
              value={parecerFinal}
              onChange={(e) => setParecerFinal(e.target.value)}
              placeholder="Resumo dos diferenciais do candidato, maturidade e aderência cultural..."
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
              onClick={() => handleSalvarEAvancar(false)}
              disabled={loading}
              className="text-xs"
            >
              Salvar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => handleSalvarEAvancar(true)}
              disabled={loading}
              className="text-xs bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
              Avançar para Alinhamento com Contratante
              <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
