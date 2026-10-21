// src/components/fives/AuditoriaModal.tsx
// Formulário Digital de Auditoria 5S com Passo a Passo, Evidências e Planos de Ação

import React, { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  FileCheck2,
  Image as ImageIcon,
  Sparkles,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import type { FivesSetor, FivesAuditoriaItem, Senso5S } from "@/lib/fives-types";
import { NOMES_SENSOS } from "@/lib/fives-types";
import { CHECKLIST_PADRAO_5S, saveFivesAuditoria } from "@/lib/fives-storage";

interface AuditoriaModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyId: string;
  setores: FivesSetor[];
  initialSetorId?: string;
  defaultAuditorNome?: string;
  onSuccess: () => void;
}

export function AuditoriaModal({
  isOpen,
  onClose,
  companyId,
  setores,
  initialSetorId,
  defaultAuditorNome,
  onSuccess,
}: AuditoriaModalProps) {
  // Cabeçalho da Auditoria
  const [selectedSetorId, setSelectedSetorId] = useState<string>(
    initialSetorId || setores[0]?.id || ""
  );
  const [dataAuditoria, setDataAuditoria] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [auditorNome, setAuditorNome] = useState<string>(
    defaultAuditorNome || "Consultor Maia"
  );
  const [observacoesGerais, setObservacoesGerais] = useState<string>("");

  // Senso Ativo no Wizard (Passo a Passo)
  const sensos: Senso5S[] = ["Seiri", "Seiton", "Seiso", "Seiketsu", "Shitsuke"];
  const [activeSenso, setActiveSenso] = useState<Senso5S>("Seiri");

  // Itens da Auditoria baseados no CHECKLIST_PADRAO_5S
  const [itens, setItens] = useState<FivesAuditoriaItem[]>(() =>
    CHECKLIST_PADRAO_5S.map((item, idx) => ({
      id: `item-${idx}`,
      senso: item.senso,
      pergunta: item.pergunta,
      nota: 5, // Nota padrão inicial excelente
      foto_evidencia_url: "",
      observacao: "",
      plano_acao_o_que: "",
      plano_acao_responsavel: "",
      plano_acao_prazo: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
      plano_acao_status: "PENDENTE",
    }))
  );

  const [saving, setSaving] = useState(false);

  // Recalcular Score Instantâneo
  const scoreInstantaneo = useMemo(() => {
    if (itens.length === 0) return 0;
    const total = itens.reduce((acc, curr) => acc + curr.nota, 0);
    const max = itens.length * 5;
    return Number(((total / max) * 100).toFixed(1));
  }, [itens]);

  const scoreColor =
    scoreInstantaneo >= 90
      ? "text-emerald-600"
      : scoreInstantaneo >= 80
      ? "text-amber-500"
      : "text-rose-600";

  // Itens por Senso
  const itensDoSenso = useMemo(
    () => itens.filter((i) => i.senso === activeSenso),
    [itens, activeSenso]
  );

  const handleUpdateItem = (itemId: string, updates: Partial<FivesAuditoriaItem>) => {
    setItens((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, ...updates } : item))
    );
  };

  // Upload/Seleção de Foto como Base64 Data URL
  const handlePhotoUpload = (itemId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 4 * 1024 * 1024) {
      toast.error("A imagem excede 4MB. Por favor selecione uma imagem menor.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      handleUpdateItem(itemId, { foto_evidencia_url: result });
      toast.success("Foto de evidência anexada!");
    };
    reader.readAsDataURL(file);
  };

  // Navegar entre sensos
  const currentIndex = sensos.indexOf(activeSenso);
  const isFirstSenso = currentIndex === 0;
  const isLastSenso = currentIndex === sensos.length - 1;

  const handleNextSenso = () => {
    if (!isLastSenso) {
      setActiveSenso(sensos[currentIndex + 1]);
    }
  };

  const handlePrevSenso = () => {
    if (!isFirstSenso) {
      setActiveSenso(sensos[currentIndex - 1]);
    }
  };

  // Validação e Envio
  const handleSubmitAuditoria = async () => {
    if (!selectedSetorId) {
      toast.error("Por favor selecione o setor auditado.");
      return;
    }
    if (!auditorNome.trim()) {
      toast.error("Por favor informe o nome do auditor responsável.");
      return;
    }

    // Verificar se algum item com nota < 4 está sem plano de ação ou evidência
    const pendencias = itens.filter(
      (item) =>
        item.nota < 4 &&
        (!item.plano_acao_o_que?.trim() || !item.foto_evidencia_url?.trim())
    );

    if (pendencias.length > 0) {
      toast.error(
        `Existem ${pendencias.length} item(ns) com nota abaixo de 4 que necessitam obrigatoriamente de foto da evidência e descrição do plano de ação corretivo.`
      );
      // Mudar para o primeiro senso com pendência
      setActiveSenso(pendencias[0].senso);
      return;
    }

    try {
      setSaving(true);
      await saveFivesAuditoria({
        company_id: companyId,
        setor_id: selectedSetorId,
        auditor_nome: auditorNome,
        data_auditoria: dataAuditoria,
        nota_final_percent: scoreInstantaneo,
        status_conclusao: "CONCLUIDO",
        observacoes_gerais: observacoesGerais,
        itens: itens,
      });

      toast.success("Auditoria 5S registrada com sucesso e score atualizado!");
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error("Erro ao salvar auditoria: " + (err?.message || "Tente novamente"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl w-full max-h-[92vh] flex flex-col p-0 overflow-hidden bg-background rounded-2xl shadow-2xl border">
        {/* Header Fixo com Big Score Instantâneo */}
        <div className="p-6 border-b bg-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-primary" />
              Auditoria Digital 5S • Registro em Campo
            </DialogTitle>
            <DialogDescription className="text-xs">
              Avalie cada um dos 5 Sensos. Notas &lt; 4 geram obrigatoriamente Plano de Ação e Evidência fotográfica.
            </DialogDescription>
          </div>

          {/* Big Number Instantâneo */}
          <div className="flex items-center gap-3 bg-muted/40 px-4 py-2 rounded-xl border shrink-0">
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                Score Instantâneo
              </span>
              <span className={`text-2xl font-black ${scoreColor}`}>
                {scoreInstantaneo}%
              </span>
            </div>
            <div className="w-12">
              <Progress value={scoreInstantaneo} className="h-2" />
            </div>
          </div>
        </div>

        {/* Corpo com Scroll */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Cabeçalho da Auditoria */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-muted/20 p-4 rounded-xl border">
            <div>
              <Label className="text-xs font-semibold">Setor Auditado</Label>
              <select
                value={selectedSetorId}
                onChange={(e) => setSelectedSetorId(e.target.value)}
                className="w-full mt-1.5 h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {setores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nome_setor} (Guardião: {s.guardiao_nome || "Comitê"})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label className="text-xs font-semibold">Data da Auditoria</Label>
              <Input
                type="date"
                value={dataAuditoria}
                onChange={(e) => setDataAuditoria(e.target.value)}
                className="mt-1.5 h-9 text-sm"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold">Auditor Responsável</Label>
              <Input
                value={auditorNome}
                onChange={(e) => setAuditorNome(e.target.value)}
                placeholder="Ex: Consultor Especialista"
                className="mt-1.5 h-9 text-sm"
              />
            </div>
          </div>

          {/* Navegação entre os 5 Sensos */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
              <span>Passo a Passo Metodológico:</span>
              <span>
                Senso {currentIndex + 1} de {sensos.length}
              </span>
            </div>

            <div className="grid grid-cols-5 gap-1.5">
              {sensos.map((senso, idx) => {
                const info = NOMES_SENSOS[senso];
                const isActive = activeSenso === senso;
                const itensSenso = itens.filter((i) => i.senso === senso);
                const scoreSenso =
                  itensSenso.length > 0
                    ? (itensSenso.reduce((acc, curr) => acc + curr.nota, 0) /
                        (itensSenso.length * 5)) *
                      100
                    : 100;
                const temAlerta = itensSenso.some((i) => i.nota < 4);

                return (
                  <button
                    key={senso}
                    type="button"
                    onClick={() => setActiveSenso(senso)}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      isActive
                        ? "border-primary bg-primary/10 shadow-sm"
                        : "border-border bg-card hover:bg-muted/30"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-foreground truncate">
                        {senso}
                      </span>
                      {temAlerta && (
                        <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                      )}
                    </div>
                    <span className="block text-[10px] text-muted-foreground truncate">
                      {info.nome}
                    </span>
                    <span className="text-xs font-black mt-1 block" style={{ color: info.cor }}>
                      {scoreSenso.toFixed(0)}%
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Checklist do Senso Ativo */}
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-muted/30 border flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: NOMES_SENSOS[activeSenso].cor }}
                  />
                  {activeSenso} • {NOMES_SENSOS[activeSenso].nome}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {NOMES_SENSOS[activeSenso].significado}
                </p>
              </div>
              <Badge variant="outline" className="text-xs font-bold">
                {itensDoSenso.length} Questões Avaliadas
              </Badge>
            </div>

            {itensDoSenso.map((item, qIdx) => {
              const isNotaBaixa = item.nota < 4;

              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-xl border transition-all space-y-4 ${
                    isNotaBaixa
                      ? "border-amber-300 bg-amber-500/5 shadow-sm"
                      : "border-border bg-card"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1 max-w-xl">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center font-bold text-xs text-muted-foreground">
                          {qIdx + 1}
                        </span>
                        <h4 className="font-bold text-sm text-foreground">
                          {item.pergunta}
                        </h4>
                      </div>
                    </div>

                    {/* Botões de Nota 1 a 5 */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {[1, 2, 3, 4, 5].map((val) => {
                        const isSelected = item.nota === val;
                        const btnColor =
                          val <= 2
                            ? "hover:border-rose-400"
                            : val === 3
                            ? "hover:border-amber-400"
                            : "hover:border-emerald-400";

                        const selectedBg =
                          val <= 2
                            ? "bg-rose-600 text-white border-rose-600"
                            : val === 3
                            ? "bg-amber-500 text-white border-amber-500"
                            : "bg-emerald-600 text-white border-emerald-600";

                        return (
                          <button
                            key={val}
                            type="button"
                            onClick={() => handleUpdateItem(item.id, { nota: val })}
                            className={`w-9 h-9 rounded-lg font-bold text-xs border transition-all ${
                              isSelected
                                ? `${selectedBg} shadow-md scale-105`
                                : `bg-background text-foreground border-border ${btnColor}`
                            }`}
                          >
                            {val}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Observação rápida */}
                  <div>
                    <Input
                      placeholder="Observação da auditoria (opcional)..."
                      value={item.observacao || ""}
                      onChange={(e) =>
                        handleUpdateItem(item.id, { observacao: e.target.value })
                      }
                      className="text-xs h-8"
                    />
                  </div>

                  {/* ALERTA E PLANO DE AÇÃO OBRIGATÓRIO SE NOTA < 4 */}
                  {isNotaBaixa && (
                    <div className="p-4 rounded-xl border border-amber-300 bg-amber-50/70 dark:bg-amber-950/20 space-y-4">
                      <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold text-xs">
                        <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
                        <span>
                          Nota {item.nota} abaixo da conformidade: Upload de Foto da Evidência e Plano de Ação obrigatórios.
                        </span>
                      </div>

                      {/* Upload de Foto da Evidência */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                          <Camera className="h-3.5 w-3.5 text-rose-600" />
                          Foto da Evidência (Não Conformidade) *
                        </Label>

                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handlePhotoUpload(item.id, e)}
                            className="text-xs h-8 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-white"
                          />
                          <span className="text-xs text-muted-foreground">ou URL:</span>
                          <Input
                            placeholder="https://exemplo.com/foto-evidencia.jpg"
                            value={item.foto_evidencia_url || ""}
                            onChange={(e) =>
                              handleUpdateItem(item.id, {
                                foto_evidencia_url: e.target.value,
                              })
                            }
                            className="text-xs h-8 sm:w-60"
                          />
                        </div>

                        {item.foto_evidencia_url && (
                          <div className="mt-2 w-32 h-24 rounded-lg overflow-hidden border shadow-sm relative group">
                            <img
                              src={item.foto_evidencia_url}
                              alt="Evidência"
                              className="w-full h-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateItem(item.id, { foto_evidencia_url: "" })
                              }
                              className="absolute top-1 right-1 bg-black/70 text-white rounded-full p-1 text-[10px] hover:bg-rose-600"
                            >
                              ✕
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Gerador Automático de Plano de Ação */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-amber-200">
                        <div className="sm:col-span-1">
                          <Label className="text-[11px] font-semibold text-foreground">
                            O que corrigir (Ação 5S) *
                          </Label>
                          <Input
                            placeholder="Descartar caixas, identificar prateleira..."
                            value={item.plano_acao_o_que || ""}
                            onChange={(e) =>
                              handleUpdateItem(item.id, {
                                plano_acao_o_que: e.target.value,
                              })
                            }
                            className="text-xs mt-1 h-8"
                          />
                        </div>

                        <div>
                          <Label className="text-[11px] font-semibold text-foreground">
                            Responsável no Setor *
                          </Label>
                          <Input
                            placeholder="Nome do colaborador / guardião"
                            value={item.plano_acao_responsavel || ""}
                            onChange={(e) =>
                              handleUpdateItem(item.id, {
                                plano_acao_responsavel: e.target.value,
                              })
                            }
                            className="text-xs mt-1 h-8"
                          />
                        </div>

                        <div>
                          <Label className="text-[11px] font-semibold text-foreground">
                            Prazo Limite *
                          </Label>
                          <Input
                            type="date"
                            value={item.plano_acao_prazo || ""}
                            onChange={(e) =>
                              handleUpdateItem(item.id, {
                                plano_acao_prazo: e.target.value,
                              })
                            }
                            className="text-xs mt-1 h-8"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Observações Gerais Finais */}
          <div className="space-y-1.5 pt-2">
            <Label className="text-xs font-semibold">
              Observações Gerais do Auditor e Recomendações
            </Label>
            <Textarea
              placeholder="Elogios ao setor, pontos de atenção geral e orientações para a comissão..."
              value={observacoesGerais}
              onChange={(e) => setObservacoesGerais(e.target.value)}
              className="text-xs min-h-[60px]"
            />
          </div>
        </div>

        {/* Rodapé Fixo com Navegação e Conclusão */}
        <div className="p-4 border-t bg-card flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrevSenso}
            disabled={isFirstSenso}
            className="text-xs"
          >
            <ChevronLeft className="h-4 w-4 mr-1" /> Senso Anterior
          </Button>

          <div className="flex items-center gap-2">
            {!isLastSenso ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextSenso}
                className="text-xs"
              >
                Próximo Senso <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : null}

            <Button
              onClick={handleSubmitAuditoria}
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 px-5 shadow-md"
            >
              <FileCheck2 className="h-4 w-4 mr-1.5" />
              {saving ? "Registrando Auditoria..." : "Concluir & Publicar Score"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}