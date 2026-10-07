// src/components/mentoria/AtendimentoModal.tsx
// Modal de Registro e Edição de Atendimento de Mentoria com novos blocos:
// 1. Objetivo da Sessão + Data e Horas + Resumo
// 2. Registro da Mentora (Grid 2x2 com Avanços, Desenvolvimento, Evidências, Foco)
// 3. Ações / Tarefas Expandidas com Status na próxima sessão e Resultado/Aprendizado
// 4. Painel de Diagnóstico (Escala 1 a 5 com os 6 pilares oficiais + Média + Evolução Percebida)

import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar,
  Clock,
  CheckSquare,
  Plus,
  Trash2,
  TrendingUp,
  AlertCircle,
  Award,
  Target,
  Sparkles,
  Eye,
  ArrowRight,
  CheckCircle2,
  ListTodo,
} from "lucide-react";
import type {
  MentoriaSessao,
  MentoriaAcao,
  MentoriaDiagnostico,
  MentoriaAcaoStatus,
} from "@/lib/mentoria-types";
import { calculateDiagnosticoMedia } from "@/lib/mentoria-storage";
import { toast } from "sonner";

// Os 6 pilares oficiais de diagnóstico (Escala estritamente de 1 a 5)
const DIAGNOSTICO_QUESITOS: Array<{
  key: "abertura_processo" | "engajamento_processo" | "autoconhecimento" | "equilibrio_emocional" | "autoconfianca" | "aplicacao_aprendizados";
  label: string;
  descricao: string;
}> = [
  {
    key: "abertura_processo",
    label: "1. Abertura ao processo",
    descricao: "Receptividade a feedbacks, novos paradigmas e disposição para mudança",
  },
  {
    key: "engajamento_processo",
    label: "2. Engajamento com o processo",
    descricao: "Comprometimento com os encontros, assiduidade e pontualidade",
  },
  {
    key: "autoconhecimento",
    label: "3. Autoconhecimento",
    descricao: "Consciência de forças, limites, reações automáticas e gatilhos",
  },
  {
    key: "equilibrio_emocional",
    label: "4. Equilíbrio emocional",
    descricao: "Gestão do estresse, ansiedade e serenidade sob pressão",
  },
  {
    key: "autoconfianca",
    label: "5. Autoconfiança",
    descricao: "Segurança para tomada de decisão e posicionamento firme",
  },
  {
    key: "aplicacao_aprendizados",
    label: "6. Aplicação dos aprendizados",
    descricao: "Transposição prática das reflexões e ferramentas no dia a dia com a equipe",
  },
];

const NOTA_LABELS: Record<number, string> = {
  1: "1 - Baixo",
  2: "2 - Em desenvolvimento",
  3: "3 - Adequado",
  4: "4 - Consistente",
  5: "5 - Muito consistente",
};

export function AtendimentoModal({
  open,
  onOpenChange,
  mentoriaId,
  mentoradoNome,
  sessaoToEdit,
  onSaveSessao,
  isSaving,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mentoriaId: string;
  mentoradoNome: string;
  sessaoToEdit?: MentoriaSessao | null;
  onSaveSessao: (payload: any) => Promise<any>;
  isSaving?: boolean;
}) {
  // BLOCO 1: Dados do Atendimento
  const [dataAtendimento, setDataAtendimento] = useState(new Date().toISOString().slice(0, 10));
  const [horas, setHoras] = useState(1.5);
  const [objetivoSessao, setObjetivoSessao] = useState("");
  const [resumo, setResumo] = useState("");

  // BLOCO 2: Registro da Mentora (Grid 2x2)
  const [avancosObservados, setAvancosObservados] = useState("");
  const [pontosDesenvolvimento, setPontosDesenvolvimento] = useState("");
  const [evidenciasComportamentais, setEvidenciasComportamentais] = useState("");
  const [focoProximaSessao, setFocoProximaSessao] = useState("");

  // BLOCO 3: Ações / Tarefas Definidas
  const [acoes, setAcoes] = useState<MentoriaAcao[]>([]);
  const [novaAcaoTexto, setNovaAcaoTexto] = useState("");
  const [novaAcaoPrazo, setNovaAcaoPrazo] = useState("");

  // BLOCO 4: Painel de Diagnóstico (1 a 5)
  const [diagnostico, setDiagnostico] = useState<{
    abertura_processo: number;
    engajamento_processo: number;
    autoconhecimento: number;
    equilibrio_emocional: number;
    autoconfianca: number;
    aplicacao_aprendizados: number;
  }>({
    abertura_processo: 3,
    engajamento_processo: 4,
    autoconhecimento: 3,
    equilibrio_emocional: 3,
    autoconfianca: 3,
    aplicacao_aprendizados: 3,
  });

  // NOVO COMPONENTE FINAL: Evolução percebida (Escala 1 a 5)
  const [evolucaoPercebida, setEvolucaoPercebida] = useState<number>(3);

  useEffect(() => {
    if (sessaoToEdit) {
      setDataAtendimento(sessaoToEdit.data_atendimento);
      setHoras(sessaoToEdit.horas);
      setObjetivoSessao(sessaoToEdit.objetivo_sessao || "");
      setResumo(sessaoToEdit.resumo || "");

      // Bloco 2
      setAvancosObservados(sessaoToEdit.avancos_observados || sessaoToEdit.pontos_informe || "");
      setPontosDesenvolvimento(sessaoToEdit.pontos_desenvolvimento || sessaoToEdit.pontos_atencao || "");
      setEvidenciasComportamentais(sessaoToEdit.evidencias_comportamentais || "");
      setFocoProximaSessao(sessaoToEdit.foco_proxima_sessao || "");

      // Bloco 3: Garante status em cada ação
      const acoesTratadas = (sessaoToEdit.acoes || []).map((a) => ({
        ...a,
        status: (a.status || (a.concluida ? "Concluída" : "Pendente")) as MentoriaAcaoStatus,
      }));
      setAcoes(acoesTratadas);

      // Bloco 4
      if (sessaoToEdit.diagnostico) {
        setDiagnostico({
          abertura_processo: Math.max(1, sessaoToEdit.diagnostico.abertura_processo ?? 3),
          engajamento_processo: Math.max(1, sessaoToEdit.diagnostico.engajamento_processo ?? sessaoToEdit.diagnostico.engajamento ?? 4),
          autoconhecimento: Math.max(1, sessaoToEdit.diagnostico.autoconhecimento ?? 3),
          equilibrio_emocional: Math.max(1, sessaoToEdit.diagnostico.equilibrio_emocional ?? sessaoToEdit.diagnostico.nivel_estresse ?? 3),
          autoconfianca: Math.max(1, sessaoToEdit.diagnostico.autoconfianca ?? 3),
          aplicacao_aprendizados: Math.max(1, sessaoToEdit.diagnostico.aplicacao_aprendizados ?? 3),
        });
        setEvolucaoPercebida(Math.max(1, sessaoToEdit.diagnostico.evolucao_percebida ?? 3));
      }
    } else {
      setDataAtendimento(new Date().toISOString().slice(0, 10));
      setHoras(1.5);
      setObjetivoSessao("");
      setResumo("");
      setAvancosObservados("");
      setPontosDesenvolvimento("");
      setEvidenciasComportamentais("");
      setFocoProximaSessao("");
      setAcoes([]);
      setNovaAcaoTexto("");
      setNovaAcaoPrazo("");
      setDiagnostico({
        abertura_processo: 3,
        engajamento_processo: 4,
        autoconhecimento: 3,
        equilibrio_emocional: 3,
        autoconfianca: 3,
        aplicacao_aprendizados: 3,
      });
      setEvolucaoPercebida(3);
    }
  }, [sessaoToEdit, open]);

  // Cálculo da média das notas dos 6 pilares em tempo real
  const mediaNotas = useMemo(() => {
    return calculateDiagnosticoMedia(diagnostico);
  }, [diagnostico]);

  // Gerenciamento de Ações
  const handleAddAcao = () => {
    if (!novaAcaoTexto.trim()) {
      toast.error("Informe a descrição da tarefa/ação.");
      return;
    }
    const newAcao: MentoriaAcao = {
      id: `acao-${Date.now()}`,
      texto: novaAcaoTexto.trim(),
      concluida: false,
      status: "Pendente",
      prazo: novaAcaoPrazo || undefined,
      resultado_aprendizado: "",
    };
    setAcoes([...acoes, newAcao]);
    setNovaAcaoTexto("");
    setNovaAcaoPrazo("");
  };

  const handleUpdateAcaoStatus = (id: string, newStatus: MentoriaAcaoStatus) => {
    setAcoes(
      acoes.map((a) =>
        a.id === id
          ? {
              ...a,
              status: newStatus,
              concluida: newStatus === "Concluída",
            }
          : a,
      ),
    );
  };

  const handleUpdateAcaoResultado = (id: string, resultado: string) => {
    setAcoes(
      acoes.map((a) =>
        a.id === id
          ? {
              ...a,
              resultado_aprendizado: resultado,
            }
          : a,
      ),
    );
  };

  const handleRemoveAcao = (id: string) => {
    setAcoes(acoes.filter((a) => a.id !== id));
  };

  // Submissão
  const handleSubmit = async () => {
    if (!resumo.trim()) {
      toast.error("Preencha o Resumo do Atendimento com os temas abordados.");
      return;
    }
    if (horas <= 0) {
      toast.error("Informe a quantidade de horas da sessão.");
      return;
    }

    try {
      await onSaveSessao({
        id: sessaoToEdit?.id,
        mentoria_id: mentoriaId,
        data_atendimento: dataAtendimento,
        horas: Number(horas),
        objetivo_sessao: objetivoSessao.trim(),
        resumo: resumo.trim(),
        acoes,
        avancos_observados: avancosObservados.trim(),
        pontos_desenvolvimento: pontosDesenvolvimento.trim(),
        evidencias_comportamentais: evidenciasComportamentais.trim(),
        foco_proxima_sessao: focoProximaSessao.trim(),
        // Legado
        pontos_atencao: pontosDesenvolvimento.trim(),
        pontos_informe: avancosObservados.trim(),
        diagnostico: {
          ...diagnostico,
          media_nota: mediaNotas,
          evolucao_percebida: Number(evolucaoPercebida),
        },
      });
      toast.success(sessaoToEdit ? "Sessão atualizada com sucesso!" : "Atendimento registrado com sucesso!");
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao salvar atendimento.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92dvh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader className="border-b pb-3">
          <div className="flex items-center gap-2">
            <Award className="h-5 w-5 text-[#E05A10]" />
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold text-[#3E100C]">
                {sessaoToEdit ? "Editar Atendimento de Mentoria" : "Registrar Novo Atendimento (Sessão)"}
              </DialogTitle>
              <p className="text-xs text-muted-foreground">
                Mentorado(a): <strong className="text-foreground">{mentoradoNome}</strong>
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* ========================================================================= */}
          {/* 1. BLOCO: DADOS DO ATENDIMENTO (Topo) */}
          {/* ========================================================================= */}
          <div className="space-y-3 p-3.5 rounded-xl border border-[#E5D5CE]/80 bg-[#FFF8F5]/50">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#3E100C] uppercase tracking-wider">
              <Calendar className="h-3.5 w-3.5 text-[#E05A10]" />
              Dados do Atendimento
            </div>

            {/* Data e Horas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold flex items-center gap-1.5 mb-1 text-[#3E100C]">
                  <Calendar className="h-3.5 w-3.5 text-[#E05A10]" />
                  Data do Atendimento *
                </Label>
                <Input
                  type="date"
                  value={dataAtendimento}
                  onChange={(e) => setDataAtendimento(e.target.value)}
                  className="h-9 text-xs bg-white"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold flex items-center gap-1.5 mb-1 text-[#3E100C]">
                  <Clock className="h-3.5 w-3.5 text-[#E05A10]" />
                  Total de Horas da Sessão (h) *
                </Label>
                <Input
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="12"
                  value={horas}
                  onChange={(e) => setHoras(Number(e.target.value))}
                  className="h-9 text-xs bg-white"
                  placeholder="Ex: 1.5"
                />
              </div>
            </div>

            {/* NOVO CAMPO: Objetivo da sessão */}
            <div>
              <Label className="text-xs font-semibold flex items-center gap-1.5 mb-1 text-[#3E100C]">
                <Target className="h-3.5 w-3.5 text-[#E05A10]" />
                Objetivo da sessão
              </Label>
              <Input
                value={objetivoSessao}
                onChange={(e) => setObjetivoSessao(e.target.value)}
                placeholder="Ex: Alinhamento de maturidade da liderança, rotinas de feedback e delegação operacional..."
                className="h-9 text-xs bg-white"
              />
            </div>

            {/* Resumo do Atendimento */}
            <div className="space-y-1 pt-1">
              <Label className="text-xs font-bold text-[#3E100C] flex items-center justify-between">
                <span>Resumo do Atendimento (Temas e Tópicos Abordados) *</span>
                <span className="text-[10px] text-muted-foreground font-normal">Obrigatório</span>
              </Label>
              <Textarea
                rows={3}
                placeholder="Descreva detalhadamente os principais assuntos tratados, reflexões estimuladas e direcionamentos passados nesta sessão..."
                value={resumo}
                onChange={(e) => setResumo(e.target.value)}
                className="text-xs leading-relaxed bg-white"
              />
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 2. BLOCO: REGISTRO DA MENTORA (Grid de 4 Textareas 2x2) */}
          {/* ========================================================================= */}
          <div className="space-y-3 rounded-xl border border-[#E5D5CE] p-3.5 bg-muted/10">
            <div className="flex items-center justify-between border-b border-[#E5D5CE]/60 pb-2">
              <div className="flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-[#E05A10]" />
                <h3 className="text-xs font-bold text-[#3E100C] uppercase tracking-wide">
                  Registro da Mentora / Consultoria
                </h3>
              </div>
              <Badge variant="outline" className="text-[10px] bg-white font-normal text-muted-foreground">
                Parecer Qualitativo
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
              {/* 1. Principais avanços observados */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  Principais avanços observados
                </Label>
                <Textarea
                  rows={3}
                  placeholder="Evoluções notórias, superações e conquistas do mentorado desde o último encontro..."
                  value={avancosObservados}
                  onChange={(e) => setAvancosObservados(e.target.value)}
                  className="text-xs leading-relaxed bg-white"
                />
              </div>

              {/* 2. Pontos que ainda demandam desenvolvimento */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                  Pontos que ainda demandam desenvolvimento
                </Label>
                <Textarea
                  rows={3}
                  placeholder="Aspectos técnicos, posturais ou emocionais que requerem maior maturação..."
                  value={pontosDesenvolvimento}
                  onChange={(e) => setPontosDesenvolvimento(e.target.value)}
                  className="text-xs leading-relaxed bg-white"
                />
              </div>

              {/* 3. Evidências comportamentais observadas */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-sky-800 dark:text-sky-300 flex items-center gap-1.5">
                  <Eye className="h-3.5 w-3.5 text-sky-600" />
                  Evidências comportamentais observadas
                </Label>
                <Textarea
                  rows={3}
                  placeholder="Exemplos práticos, falas e atitudes concretas demonstradas durante a sessão..."
                  value={evidenciasComportamentais}
                  onChange={(e) => setEvidenciasComportamentais(e.target.value)}
                  className="text-xs leading-relaxed bg-white"
                />
              </div>

              {/* 4. Foco recomendado para a próxima sessão */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#3E100C] dark:text-[#E05A10] flex items-center gap-1.5">
                  <ArrowRight className="h-3.5 w-3.5 text-[#E05A10]" />
                  Foco recomendado para a próxima sessão
                </Label>
                <Textarea
                  rows={3}
                  placeholder="Temas prioritários, exercícios práticos ou desafios a serem acompanhados no próximo encontro..."
                  value={focoProximaSessao}
                  onChange={(e) => setFocoProximaSessao(e.target.value)}
                  className="text-xs leading-relaxed bg-white"
                />
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 3. BLOCO: AÇÕES / TAREFAS DEFINIDAS (Plano Prático Expandido) */}
          {/* ========================================================================= */}
          <div className="space-y-3 rounded-xl border border-[#E5D5CE] p-3.5 bg-muted/10">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-[#3E100C] flex items-center gap-1.5">
                <ListTodo className="h-4 w-4 text-[#E05A10]" />
                Ações / Tarefas Definidas (Plano Prático)
              </Label>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] bg-white font-mono">
                  {acoes.filter((a) => a.status === "Concluída" || a.concluida).length}/{acoes.length} Concluídas
                </Badge>
              </div>
            </div>

            {/* Input para criação de nova ação */}
            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <Input
                placeholder="Nova ação / tarefa prática para o mentorado..."
                value={novaAcaoTexto}
                onChange={(e) => setNovaAcaoTexto(e.target.value)}
                className="h-8 text-xs bg-white flex-1"
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddAcao())}
              />
              <Input
                type="date"
                value={novaAcaoPrazo}
                onChange={(e) => setNovaAcaoPrazo(e.target.value)}
                className="h-8 text-xs bg-white w-full sm:w-36"
                title="Prazo limite para realização"
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 text-xs gap-1 border-[#3E100C]/30 text-[#3E100C] hover:bg-[#FFF8F5]"
                onClick={handleAddAcao}
              >
                <Plus className="h-3.5 w-3.5 text-[#E05A10]" /> Adicionar Ação
              </Button>
            </div>

            {/* Lista de Ações com Card Expandido */}
            <div className="space-y-2.5 pt-1 max-h-72 overflow-y-auto pr-1">
              {acoes.length === 0 ? (
                <p className="text-[11px] text-muted-foreground italic py-1 text-center">
                  Nenhuma ação registrada nesta sessão. Adicione compromissos de desenvolvimento acima.
                </p>
              ) : (
                acoes.map((acao, index) => {
                  const statusAtual: MentoriaAcaoStatus = acao.status || (acao.concluida ? "Concluída" : "Pendente");
                  return (
                    <div
                      key={acao.id || index}
                      className="p-3 rounded-lg bg-white border border-[#E5D5CE]/80 shadow-2xs space-y-2.5 text-xs"
                    >
                      {/* Topo do Card da Ação */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-0.5 flex-1 min-w-0">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase">
                            Ação #{index + 1}
                          </span>
                          <div className="font-semibold text-foreground text-xs leading-snug">
                            {acao.texto}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {acao.prazo && (
                            <span className="text-[10px] text-muted-foreground bg-muted/40 px-2 py-0.5 rounded font-mono">
                              Prazo: {new Date(acao.prazo).toLocaleDateString("pt-BR")}
                            </span>
                          )}
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-destructive"
                            onClick={() => handleRemoveAcao(acao.id)}
                            title="Remover ação"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>

                      {/* Atributos Expandidos da Ação */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 border-t border-muted/50 items-start">
                        {/* Status na próxima sessão */}
                        <div className="space-y-1">
                          <Label className="text-[10px] font-semibold text-[#3E100C]">
                            Status na próxima sessão:
                          </Label>
                          <Select
                            value={statusAtual}
                            onValueChange={(val: MentoriaAcaoStatus) => handleUpdateAcaoStatus(acao.id, val)}
                          >
                            <SelectTrigger className="h-7 text-xs bg-muted/20">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Pendente" className="text-xs">
                                ⏳ Pendente
                              </SelectItem>
                              <SelectItem value="Concluída" className="text-xs text-emerald-700 font-semibold">
                                ✓ Concluída
                              </SelectItem>
                              <SelectItem value="Parcial" className="text-xs text-sky-700 font-semibold">
                                ◐ Parcial
                              </SelectItem>
                              <SelectItem value="Não realizada" className="text-xs text-rose-700 font-semibold">
                                ✕ Não realizada
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Resultado / Aprendizado */}
                        <div className="sm:col-span-2 space-y-1">
                          <Label className="text-[10px] font-semibold text-muted-foreground">
                            Resultado / Aprendizado:
                          </Label>
                          <Textarea
                            rows={1}
                            placeholder="Como foi a execução da tarefa? Anote aqui aprendizados ou desdobramentos..."
                            value={acao.resultado_aprendizado || ""}
                            onChange={(e) => handleUpdateAcaoResultado(acao.id, e.target.value)}
                            className="text-[11px] min-h-[28px] py-1 bg-muted/15"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 4. BLOCO: PAINEL DE DIAGNÓSTICO (Escala Estritamente de 1 a 5) */}
          {/* ========================================================================= */}
          <div className="space-y-4 rounded-xl border border-[#E05A10]/30 bg-[#FFF8F5]/40 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E5D5CE]/60 pb-2">
              <div>
                <h4 className="text-xs font-bold text-[#3E100C] uppercase tracking-wide flex items-center gap-1.5">
                  <TrendingUp className="h-4 w-4 text-[#E05A10]" />
                  Painel de Diagnóstico & Aproveitamento (Escala 1 a 5)
                </h4>
                <p className="text-[11px] text-muted-foreground">
                  1=Baixo · 2=Em desenvolvimento · 3=Adequado · 4=Consistente · 5=Muito consistente
                </p>
              </div>

              {/* Média em Tempo Real dos 6 Pilares */}
              <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-[#E5D5CE] shadow-2xs">
                <span className="text-xs font-semibold text-muted-foreground">Média dos 6 Pilares:</span>
                <span className="text-sm font-black text-[#E05A10]">
                  {mediaNotas.toFixed(1)} / 5.0
                </span>
              </div>
            </div>

            {/* Os 6 Pilares Oficiais */}
            <div className="space-y-3 pt-1">
              {DIAGNOSTICO_QUESITOS.map((q) => {
                const currentVal = Number(diagnostico[q.key] ?? 3);
                return (
                  <div key={q.key} className="space-y-1 bg-white p-2.5 rounded-lg border border-[#E5D5CE]/60">
                    <div className="flex flex-wrap items-center justify-between gap-1">
                      <span className="text-xs font-bold text-[#3E100C]">{q.label}</span>
                      <span className="text-[11px] font-semibold text-[#E05A10]">
                        {NOTA_LABELS[currentVal] || `${currentVal}/5`}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">{q.descricao}</p>

                    {/* Segmented Control de 1 a 5 */}
                    <div className="grid grid-cols-5 gap-1 pt-1">
                      {[1, 2, 3, 4, 5].map((val) => {
                        const isSelected = currentVal === val;
                        return (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setDiagnostico({ ...diagnostico, [q.key]: val })}
                            className={`h-7.5 rounded text-xs font-bold transition-all ${
                              isSelected
                                ? "bg-[#E05A10] text-white shadow-xs scale-102"
                                : "bg-muted/40 hover:bg-muted text-muted-foreground"
                            }`}
                          >
                            {val}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Rodapé do Painel com Cálculo Automático da Média */}
            <div className="p-3 bg-white rounded-lg border border-[#E05A10]/40 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-[#3E100C]">
                Cálculo Automático do Indicador da Sessão:
              </span>
              <div className="flex items-center gap-2">
                <Badge
                  className={`text-xs font-bold px-2.5 py-0.5 ${
                    mediaNotas >= 4.0
                      ? "bg-emerald-600 text-white"
                      : mediaNotas >= 3.0
                        ? "bg-blue-600 text-white"
                        : "bg-amber-600 text-white"
                  }`}
                >
                  Nota Média: {mediaNotas.toFixed(1)}
                </Badge>
                <span className="text-[11px] text-muted-foreground">
                  ({mediaNotas >= 4.0 ? "Alto Aproveitamento" : mediaNotas >= 3.0 ? "Aproveitamento Adequado" : "Requer Atenção"})
                </span>
              </div>
            </div>

            {/* NOVO COMPONENTE FINAL: Evolução percebida (Escala 1 a 5) */}
            <div className="p-3.5 bg-gradient-to-r from-[#FFF8F5] via-white to-white rounded-xl border border-[#E05A10]/40 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-1">
                <div>
                  <div className="flex items-center gap-1.5 font-bold text-xs text-[#3E100C]">
                    <TrendingUp className="h-4 w-4 text-[#E05A10]" />
                    Evolução percebida
                  </div>
                  <p className="text-[11px] text-muted-foreground italic">
                    Considerar a evolução em relação ao início do processo.
                  </p>
                </div>

                <span className="text-xs font-bold text-[#E05A10]">
                  {NOTA_LABELS[evolucaoPercebida] || `${evolucaoPercebida}/5`}
                </span>
              </div>

              {/* Botões de 1 a 5 para Evolução Percebida */}
              <div className="grid grid-cols-5 gap-1.5 pt-1">
                {[1, 2, 3, 4, 5].map((val) => {
                  const isSelected = evolucaoPercebida === val;
                  return (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setEvolucaoPercebida(val)}
                      className={`h-8 rounded-md text-xs font-bold transition-all ${
                        isSelected
                          ? "bg-[#E05A10] text-white shadow-xs scale-102"
                          : "bg-white hover:bg-muted/50 text-muted-foreground border border-[#E5D5CE]/60"
                      }`}
                    >
                      {val}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="border-t pt-3">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            type="button"
            className="bg-[#3E100C] hover:bg-[#3E100C]/90 text-white font-semibold text-xs h-10 px-6 shadow-xs"
            disabled={isSaving}
            onClick={handleSubmit}
          >
            {isSaving ? "Salvando..." : sessaoToEdit ? "Salvar Alterações" : "Gravar Atendimento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
