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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Calendar,
  Clock,
  CheckSquare,
  Plus,
  Trash2,
  TrendingUp,
  AlertCircle,
  Users,
  Award,
} from "lucide-react";
import type { MentoriaSessao, MentoriaAcao, MentoriaDiagnostico } from "@/lib/mentoria-types";
import { calculateDiagnosticoMedia } from "@/lib/mentoria-storage";
import { toast } from "sonner";

const DIAGNOSTICO_QUESITOS: Array<{
  key: keyof Omit<MentoriaDiagnostico, "media_nota">;
  label: string;
  descricao: string;
}> = [
  { key: "abertura_processo", label: "1. Abertura ao Processo", descricao: "Receptividade a feedbacks e novos paradigmas" },
  { key: "autoconhecimento", label: "2. Autoconhecimento", descricao: "Consciência de forças, limites e gatilhos" },
  { key: "autoconfianca", label: "3. Autoconfiança", descricao: "Postura e segurança para assumir desafios" },
  { key: "nivel_estresse", label: "4. Nível de Estresse", descricao: "Equilíbrio emocional e resiliência (0=Crítico, 5=Totalmente sob controle)" },
  { key: "engajamento", label: "5. Engajamento", descricao: "Comprometimento com tarefas e pontualidade" },
  { key: "ansiedade", label: "6. Ansiedade", descricao: "Gestão do ritmo e foco no presente (0=Alta ansiedade, 5=Tranquilo/Focado)" },
  { key: "aplicacao_aprendizados", label: "7. Aplicação dos Aprendizados", descricao: "Colocação prática no dia a dia com a equipe" },
];

const NOTA_LABELS: Record<number, string> = {
  0: "0 - Baixo",
  1: "1 - Inicial",
  2: "2 - Moderado",
  3: "3 - Adequado",
  4: "4 - Bom",
  5: "5 - Alto",
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
  const [dataAtendimento, setDataAtendimento] = useState(new Date().toISOString().slice(0, 10));
  const [horas, setHoras] = useState(1.5);
  const [resumo, setResumo] = useState("");
  const [pontosAtencao, setPontosAtencao] = useState("");
  const [pontosInforme, setPontosInforme] = useState("");
  const [acoes, setAcoes] = useState<MentoriaAcao[]>([]);
  const [novaAcaoTexto, setNovaAcaoTexto] = useState("");
  const [novaAcaoPrazo, setNovaAcaoPrazo] = useState("");

  const [diagnostico, setDiagnostico] = useState<Omit<MentoriaDiagnostico, "media_nota">>({
    abertura_processo: 3,
    autoconhecimento: 3,
    autoconfianca: 3,
    nivel_estresse: 3,
    engajamento: 4,
    ansiedade: 3,
    aplicacao_aprendizados: 3,
  });

  useEffect(() => {
    if (sessaoToEdit) {
      setDataAtendimento(sessaoToEdit.data_atendimento);
      setHoras(sessaoToEdit.horas);
      setResumo(sessaoToEdit.resumo);
      setPontosAtencao(sessaoToEdit.pontos_atencao || "");
      setPontosInforme(sessaoToEdit.pontos_informe || "");
      setAcoes(sessaoToEdit.acoes || []);
      if (sessaoToEdit.diagnostico) {
        setDiagnostico({
          abertura_processo: sessaoToEdit.diagnostico.abertura_processo ?? 3,
          autoconhecimento: sessaoToEdit.diagnostico.autoconhecimento ?? 3,
          autoconfianca: sessaoToEdit.diagnostico.autoconfianca ?? 3,
          nivel_estresse: sessaoToEdit.diagnostico.nivel_estresse ?? 3,
          engajamento: sessaoToEdit.diagnostico.engajamento ?? 4,
          ansiedade: sessaoToEdit.diagnostico.ansiedade ?? 3,
          aplicacao_aprendizados: sessaoToEdit.diagnostico.aplicacao_aprendizados ?? 3,
        });
      }
    } else {
      setDataAtendimento(new Date().toISOString().slice(0, 10));
      setHoras(1.5);
      setResumo("");
      setPontosAtencao("");
      setPontosInforme("");
      setAcoes([]);
      setNovaAcaoTexto("");
      setNovaAcaoPrazo("");
      setDiagnostico({
        abertura_processo: 3,
        autoconhecimento: 3,
        autoconfianca: 3,
        nivel_estresse: 3,
        engajamento: 4,
        ansiedade: 3,
        aplicacao_aprendizados: 3,
      });
    }
  }, [sessaoToEdit, open]);

  // Cálculo da média das notas em tempo real
  const mediaNotas = useMemo(() => {
    return calculateDiagnosticoMedia(diagnostico);
  }, [diagnostico]);

  const handleAddAcao = () => {
    if (!novaAcaoTexto.trim()) {
      toast.error("Informe a descrição da tarefa/ação.");
      return;
    }
    const newAcao: MentoriaAcao = {
      id: `acao-${Date.now()}`,
      texto: novaAcaoTexto.trim(),
      concluida: false,
      prazo: novaAcaoPrazo || undefined,
    };
    setAcoes([...acoes, newAcao]);
    setNovaAcaoTexto("");
    setNovaAcaoPrazo("");
  };

  const handleToggleAcao = (id: string) => {
    setAcoes(acoes.map((a) => (a.id === id ? { ...a, concluida: !a.concluida } : a)));
  };

  const handleRemoveAcao = (id: string) => {
    setAcoes(acoes.filter((a) => a.id !== id));
  };

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
        resumo: resumo.trim(),
        acoes,
        pontos_atencao: pontosAtencao.trim(),
        pontos_informe: pontosInforme.trim(),
        diagnostico: {
          ...diagnostico,
          media_nota: mediaNotas,
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
      <DialogContent className="max-w-3xl max-h-[92dvh] overflow-y-auto p-4 sm:p-6">
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

        <div className="space-y-5 py-2">
          {/* Cabeçalho: Data do Atendimento, Total de Horas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-lg border border-[#E5D5CE]/70 bg-[#FFF8F5]/50">
            <div>
              <Label className="text-xs font-semibold flex items-center gap-1.5 mb-1.5 text-[#3E100C]">
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
              <Label className="text-xs font-semibold flex items-center gap-1.5 mb-1.5 text-[#3E100C]">
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

          {/* 1. Resumo do Atendimento */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-[#3E100C] flex items-center justify-between">
              <span>Resumo do Atendimento (Temas e Tópicos Abordados) *</span>
              <span className="text-[10px] text-muted-foreground font-normal">Obrigatório</span>
            </Label>
            <Textarea
              rows={3}
              placeholder="Descreva detalhadamente os principais assuntos tratados, reflexões estimuladas e direcionamentos passados nesta sessão..."
              value={resumo}
              onChange={(e) => setResumo(e.target.value)}
              className="text-xs leading-relaxed"
            />
          </div>

          {/* 2. Ações / Tarefas Definidas (Checklist) */}
          <div className="space-y-2 rounded-xl border border-[#E5D5CE] p-3.5 bg-muted/10">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-[#3E100C] flex items-center gap-1.5">
                <CheckSquare className="h-4 w-4 text-[#E05A10]" />
                Ações / Tarefas Definidas (Plano Prático)
              </Label>
              <Badge variant="outline" className="text-[10px] bg-white">
                {acoes.filter((a) => a.concluida).length}/{acoes.length} Concluídas
              </Badge>
            </div>

            {/* Input para nova ação */}
            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <Input
                placeholder="Nova tarefa ou compromisso de desenvolvimento..."
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
                title="Prazo sugerido"
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 text-xs gap-1 border-[#3E100C]/30 text-[#3E100C] hover:bg-[#FFF8F5]"
                onClick={handleAddAcao}
              >
                <Plus className="h-3.5 w-3.5 text-[#E05A10]" /> Adicionar
              </Button>
            </div>

            {/* Lista de Ações */}
            <div className="space-y-1.5 pt-2 max-h-40 overflow-y-auto">
              {acoes.length === 0 ? (
                <p className="text-[11px] text-muted-foreground italic py-1">
                  Nenhuma tarefa adicionada nesta sessão ainda.
                </p>
              ) : (
                acoes.map((acao) => (
                  <div
                    key={acao.id}
                    className="flex items-center justify-between gap-2 p-2 rounded-md bg-white border border-[#E5D5CE]/60 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <Checkbox
                        checked={acao.concluida}
                        onCheckedChange={() => handleToggleAcao(acao.id)}
                      />
                      <span
                        className={`truncate ${
                          acao.concluida ? "line-through text-muted-foreground font-normal" : "font-medium text-foreground"
                        }`}
                      >
                        {acao.texto}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {acao.prazo && (
                        <span className="text-[10px] text-muted-foreground bg-muted/40 px-1.5 py-0.5 rounded">
                          Prazo: {new Date(acao.prazo).toLocaleDateString("pt-BR")}
                        </span>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
                        onClick={() => handleRemoveAcao(acao.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 3. Pontos de Atenção & Pontos de Informe */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#3E100C] flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                Pontos de Atenção e Melhoria
              </Label>
              <Textarea
                rows={2}
                placeholder="Comportamentos observados, resistências ou aspectos a monitorar no mentorado..."
                value={pontosAtencao}
                onChange={(e) => setPontosAtencao(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#3E100C] flex items-center gap-1">
                <Users className="h-3.5 w-3.5 text-blue-600" />
                Pontos de Informe para a Equipe
              </Label>
              <Textarea
                rows={2}
                placeholder="Alinhamentos que podem ser compartilhados com lideranças ou equipe do projeto..."
                value={pontosInforme}
                onChange={(e) => setPontosInforme(e.target.value)}
                className="text-xs"
              />
            </div>
          </div>

          {/* 4. Painel de Diagnóstico e Aproveitamento (Escala 0 a 5) */}
          <div className="space-y-3 rounded-xl border border-[#E05A10]/30 bg-[#FFF8F5]/40 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E5D5CE]/60 pb-2">
              <div>
                <h4 className="text-xs font-bold text-[#3E100C] uppercase tracking-wide flex items-center gap-1.5">
                  <TrendingUp className="h-4 w-4 text-[#E05A10]" />
                  Painel de Diagnóstico & Aproveitamento (Escala 0 a 5)
                </h4>
                <p className="text-[11px] text-muted-foreground">
                  0=Baixo · 1-2=Moderado · 3=Adequado · 4=Bom · 5=Alto
                </p>
              </div>

              {/* Média em Tempo Real */}
              <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-lg border border-[#E5D5CE] shadow-2xs">
                <span className="text-xs font-semibold text-muted-foreground">Média do Atendimento:</span>
                <span className="text-sm font-black text-[#E05A10]">
                  {mediaNotas.toFixed(1)} / 5.0
                </span>
              </div>
            </div>

            {/* Quesitos */}
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

                    {/* Segmented Control de 0 a 5 */}
                    <div className="grid grid-cols-6 gap-1 pt-1">
                      {[0, 1, 2, 3, 4, 5].map((val) => {
                        const isSelected = currentVal === val;
                        return (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setDiagnostico({ ...diagnostico, [q.key]: val })}
                            className={`h-7 rounded text-xs font-bold transition-all ${
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

            {/* Rodapé do Painel com Cálculo Automático */}
            <div className="p-3 bg-white rounded-lg border border-[#E05A10]/40 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-[#3E100C]">
                Cálculo Automático do Indicador da Sessão:
              </span>
              <div className="flex items-center gap-2">
                <Badge
                  className={`text-xs font-bold px-2 py-0.5 ${
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
          </div>
        </div>

        <DialogFooter className="border-t pt-3">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            type="button"
            className="bg-[#3E100C] hover:bg-[#3E100C]/90 text-white font-semibold text-xs h-10 px-5"
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
