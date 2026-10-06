// src/components/recrutamento/CandidatoContratadoModal.tsx
// Dossiê Consolidado de Sucesso do Candidato Contratado (Coluna 7)
// Consolidação: Currículo, Pareceres de Entrevista, Relatório de Perfil Comportamental e Proposta Assinada

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Trophy,
  Download,
  FileText,
  UserCheck,
  Radar,
  Briefcase,
  CheckCircle2,
  Calendar,
  Building2,
  Printer,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { CandidaturaFunil } from "@/lib/recrutamento-types";
import { generatePropostaAdmissaoPDF } from "@/utils/propostaAdmissaoPdfGenerator";

interface CandidatoContratadoModalProps {
  candidatura: CandidaturaFunil | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function CandidatoContratadoModal({
  candidatura,
  isOpen,
  onClose,
}: CandidatoContratadoModalProps) {
  if (!candidatura) return null;

  const candidato = candidatura.candidato;
  const vaga = candidatura.vaga;
  const parecer = candidatura.parecer_consultoria;
  const perfil = candidatura.analise_perfil;
  const proposta = candidatura.proposta_contratacao;
  const avaliacaoCliente = candidatura.avaliacao_cliente;

  const handleDownloadPDF = () => {
    if (!candidato || !vaga || !proposta) {
      toast.error("Dados incompletos para download da proposta.");
      return;
    }
    const doc = generatePropostaAdmissaoPDF({
      candidato,
      vaga,
      proposta,
      empresaNome: vaga.empresa_nome,
      consultorResponsavel: parecer?.consultor_nome || "Maia Consultoria",
    });
    doc.save(`Termo_Admissao_${candidato.nome.replace(/\s+/g, "_")}.pdf`);
    toast.success("Download do Termo de Admissão iniciado!");
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 text-emerald-600">
            <Trophy className="h-6 w-6 text-amber-500" />
            <div>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                Dossiê do Profissional Contratado
                <Badge className="bg-emerald-600 text-white text-[10px]">
                  CONTRATAÇÃO HOMOLOGADA
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs">
                Processo seletivo concluído com êxito • Histórico completo e documentos consolidados
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* Banner de Celebração e Resumo */}
          <div className="p-4 bg-gradient-to-r from-emerald-500/10 via-amber-500/10 to-transparent border border-emerald-500/20 rounded-xl flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-300 tracking-wider">
                Profissional Admitido
              </span>
              <h3 className="text-lg font-bold text-foreground">{candidato?.nome}</h3>
              <div className="flex items-center gap-2 text-muted-foreground text-xs">
                <span>Vaga: <strong>{vaga?.titulo}</strong></span>
                <span>•</span>
                <span>Empresa: <strong>{vaga?.empresa_nome || "Cliente"}</strong></span>
              </div>
            </div>

            <Button
              type="button"
              size="sm"
              onClick={handleDownloadPDF}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shrink-0"
            >
              <Printer className="h-3.5 w-3.5 mr-1.5" />
              Baixar Termo de Admissão
            </Button>
          </div>

          {/* 1. O Currículo e Dados do Profissional */}
          <div className="border rounded-lg p-3 bg-muted/20 space-y-2">
            <div className="flex items-center justify-between border-b pb-1.5 font-semibold text-foreground">
              <span className="flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-primary" />
                1. Currículo e Qualificações
              </span>
              <span className="text-muted-foreground text-[11px]">CPF: {candidato?.cpf || "-"}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
              <div><strong>Formação:</strong> {candidato?.formacao || "-"}</div>
              <div><strong>Contato:</strong> {candidato?.telefone || "-"} • {candidato?.email || "-"}</div>
            </div>
            {candidato?.ferramentas && (
              <div className="flex flex-wrap gap-1 pt-1">
                {candidato.ferramentas.map((f, i) => (
                  <Badge key={i} variant="secondary" className="text-[10px]">
                    {f}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* 2. Os Pareceres de Entrevista da Consultoria */}
          <div className="border rounded-lg p-3 bg-muted/20 space-y-2">
            <div className="flex items-center justify-between border-b pb-1.5 font-semibold text-foreground">
              <span className="flex items-center gap-1.5">
                <UserCheck className="h-3.5 w-3.5 text-primary" />
                2. Parecer Técnico da Consultoria Maia
              </span>
              <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-500/30">
                Aderência: {parecer?.nota_aderencia || 9.5} / 10
              </Badge>
            </div>
            <div className="space-y-1.5 text-[11px] text-muted-foreground">
              <div>
                <strong className="text-foreground">Experiência Avaliada:</strong>{" "}
                {parecer?.experiencia || "Avaliação técnica extremamente positiva."}
              </div>
              <div>
                <strong className="text-foreground">Perfil Comportamental:</strong>{" "}
                {parecer?.perfil_comportamental || "Postura e inteligência emocional adequadas à governança."}
              </div>
            </div>
          </div>

          {/* 3. Relatório de Análise de Perfil (Bloco 23) */}
          <div className="border rounded-lg p-3 bg-muted/20 space-y-2">
            <div className="flex items-center justify-between border-b pb-1.5 font-semibold text-foreground">
              <span className="flex items-center gap-1.5">
                <Radar className="h-3.5 w-3.5 text-primary" />
                3. Relatório de Análise de Perfil Psicométrico
              </span>
              <Badge className="bg-emerald-500/10 text-emerald-600 text-[10px] border-emerald-500/20">
                {perfil?.recomendacao || "RECOMENDADO"}
              </Badge>
            </div>
            <div className="space-y-1 text-[11px] text-muted-foreground">
              <div>
                <strong className="text-foreground">Fator Dominante:</strong>{" "}
                {perfil?.fator_dominante || "Conscienciosidade & Foco em Metas"}
              </div>
              <div>
                <strong className="text-foreground">Síntese DISC:</strong>{" "}
                {perfil?.disc_resumo || "Perfil equilibrado com forte capacidade analítica e orientação a resultados."}
              </div>
            </div>
          </div>

          {/* 4. Proposta de Remuneração e Admissão Final */}
          <div className="border border-emerald-500/30 bg-emerald-500/5 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between border-b border-emerald-500/20 pb-1.5 font-semibold text-foreground">
              <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                <Briefcase className="h-3.5 w-3.5 text-emerald-600" />
                4. Proposta de Remuneração e Admissão Homologada
              </span>
              <span className="font-bold text-emerald-600 text-sm">
                R$ {(proposta?.remuneracao_mensal || vaga?.salario_min || 0).toLocaleString("pt-BR")} ({proposta?.tipo_contrato || "CLT"})
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
              <div><strong>Jornada:</strong> {proposta?.jornada || vaga?.jornada}</div>
              <div><strong>Início das Atividades:</strong> {proposta?.data_inicio_prevista || "Imediato"}</div>
              <div className="col-span-2">
                <strong>Benefícios Acordados:</strong>{" "}
                {(proposta?.beneficios_acordados || vaga?.beneficios || []).join(" • ")}
              </div>
              {avaliacaoCliente?.feedback_cliente && (
                <div className="col-span-2 pt-1 border-t border-emerald-500/10">
                  <strong className="text-foreground">Feedback do Contratante:</strong> {avaliacaoCliente.feedback_cliente}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-3 border-t flex justify-end">
          <Button variant="ghost" size="sm" onClick={onClose} className="text-xs">
            Fechar Dossiê
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
