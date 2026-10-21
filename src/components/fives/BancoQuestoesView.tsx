// src/components/fives/BancoQuestoesView.tsx
// Banco de Questões Técnicas e Customizadas do 5S por Empresa

import React, { useState, useEffect } from "react";
import {
  BookOpen,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  RotateCcw,
  Sparkles,
  HelpCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

import type { FivesPerguntaCustomizada, Senso5S } from "@/lib/fives-types";
import { NOMES_SENSOS } from "@/lib/fives-types";
import {
  getFivesPerguntasCustomizadas,
  saveFivesPerguntaCustomizada,
  deleteFivesPerguntaCustomizada,
  CHECKLIST_PADRAO_5S,
} from "@/lib/fives-storage";

interface BancoQuestoesViewProps {
  companyId: string;
  canEdit: boolean;
}

const SENSOS_LIST: Senso5S[] = ["Seiri", "Seiton", "Seiso", "Seiketsu", "Shitsuke"];

export function BancoQuestoesView({ companyId, canEdit }: BancoQuestoesViewProps) {
  const [selectedSenso, setSelectedSenso] = useState<Senso5S>("Seiri");
  const [customQuestions, setCustomQuestions] = useState<FivesPerguntaCustomizada[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<FivesPerguntaCustomizada | null>(null);
  const [formTitulo, setFormTitulo] = useState("");
  const [formCriterio, setFormCriterio] = useState("");
  const [formOrdem, setFormOrdem] = useState(1);
  const [formAtivo, setFormAtivo] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadQuestions = async () => {
    try {
      setLoading(true);
      const data = await getFivesPerguntasCustomizadas(companyId);
      setCustomQuestions(data);
    } catch (err: any) {
      console.error("Erro ao carregar questões:", err);
      toast.error("Não foi possível carregar as questões customizadas.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (companyId) {
      loadQuestions();
    }
  }, [companyId]);

  const handleOpenCreate = () => {
    setEditingQuestion(null);
    setFormTitulo("");
    setFormCriterio("");
    const questoesDoSenso = customQuestions.filter((q) => q.senso === selectedSenso);
    setFormOrdem(questoesDoSenso.length + 1);
    setFormAtivo(true);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (q: FivesPerguntaCustomizada) => {
    setEditingQuestion(q);
    setFormTitulo(q.titulo_pergunta);
    setFormCriterio(q.criterio_avaliacao);
    setFormOrdem(q.ordem);
    setFormAtivo(q.ativo);
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formTitulo.trim()) {
      toast.error("Informe o enunciado da pergunta.");
      return;
    }
    if (!formCriterio.trim()) {
      toast.error("Informe o critério técnico de avaliação.");
      return;
    }

    try {
      setSaving(true);
      await saveFivesPerguntaCustomizada({
        id: editingQuestion?.id,
        company_id: companyId,
        senso: selectedSenso,
        titulo_pergunta: formTitulo.trim(),
        criterio_avaliacao: formCriterio.trim(),
        ordem: formOrdem || 1,
        ativo: formAtivo,
      });

      toast.success(
        editingQuestion
          ? "Critério atualizado com sucesso!"
          : "Novo critério adicionado ao checklist!"
      );
      setIsDialogOpen(false);
      loadQuestions();
    } catch (err: any) {
      toast.error("Erro ao salvar pergunta: " + err?.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleAtivo = async (q: FivesPerguntaCustomizada) => {
    if (!canEdit) return;
    try {
      await saveFivesPerguntaCustomizada({
        ...q,
        ativo: !q.ativo,
      });
      toast.success(q.ativo ? "Critério desativado na auditoria." : "Critério ativado!");
      loadQuestions();
    } catch (err: any) {
      toast.error("Erro ao alterar status: " + err?.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja remover esta questão customizada?")) return;
    try {
      await deleteFivesPerguntaCustomizada(id, companyId);
      toast.success("Critério excluído.");
      loadQuestions();
    } catch (err: any) {
      toast.error("Erro ao excluir: " + err?.message);
    }
  };

  const handleRestaurarPadrao = async () => {
    if (
      !confirm(
        "Deseja redefinir e carregar os 20 critérios técnicos padrão da metodologia Maia Consultoria para esta empresa? Qualquer personalização anterior será substituída."
      )
    ) {
      return;
    }

    try {
      setLoading(true);
      // Apagar questões customizadas existentes
      for (const q of customQuestions) {
        await deleteFivesPerguntaCustomizada(q.id, companyId);
      }
      // Inserir os 20 itens padrão como customizados para a empresa
      for (const padrao of CHECKLIST_PADRAO_5S) {
        await saveFivesPerguntaCustomizada({
          company_id: companyId,
          senso: padrao.senso,
          titulo_pergunta: padrao.pergunta,
          criterio_avaliacao: padrao.dica,
          ordem: padrao.ordem,
          ativo: true,
        });
      }
      toast.success("Checklist padrão técnico de 20 perguntas importado com sucesso!");
      loadQuestions();
    } catch (err: any) {
      toast.error("Erro ao importar padrão: " + err?.message);
    } finally {
      setLoading(false);
    }
  };

  // Se a empresa já tem perguntas cadastradas
  const temPerguntasCustomizadas = customQuestions.length > 0;
  const perguntasExibidas = temPerguntasCustomizadas
    ? customQuestions
        .filter((q) => q.senso === selectedSenso)
        .sort((a, b) => a.ordem - b.ordem)
    : CHECKLIST_PADRAO_5S.filter((p) => p.senso === selectedSenso).map((p, idx) => ({
        id: `padrao-${idx}`,
        company_id: companyId,
        senso: p.senso,
        titulo_pergunta: p.pergunta,
        criterio_avaliacao: p.dica,
        ordem: p.ordem ?? idx + 1,
        ativo: true,
      }));

  return (
    <div className="space-y-6">
      {/* Header com ações */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            Banco de Questões & Critérios de Auditoria 5S
          </h2>
          <p className="text-xs text-muted-foreground">
            Personalize os critérios e perguntas técnicas avaliadas nos 5 Sensos de acordo com a realidade da empresa.
          </p>
        </div>

        {canEdit && (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleRestaurarPadrao}
              disabled={loading}
              className="text-xs font-semibold gap-1.5"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Carregar Padrão Maia (20 Perguntas)
            </Button>

            <Button
              size="sm"
              onClick={handleOpenCreate}
              className="bg-primary hover:bg-primary/90 text-white font-bold text-xs gap-1.5 shadow-md"
            >
              <Plus className="h-4 w-4" />
              + Nova Pergunta ({selectedSenso})
            </Button>
          </div>
        )}
      </div>

      {/* Banner de status do Checklist */}
      <Card
        className={`border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
          temPerguntasCustomizadas
            ? "bg-amber-500/10 border-amber-300 dark:border-amber-700/50"
            : "bg-blue-500/10 border-blue-300 dark:border-blue-700/50"
        }`}
      >
        <div className="flex items-center gap-3">
          {temPerguntasCustomizadas ? (
            <Sparkles className="h-5 w-5 text-amber-600 shrink-0" />
          ) : (
            <CheckCircle2 className="h-5 w-5 text-blue-600 shrink-0" />
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-foreground">
                {temPerguntasCustomizadas
                  ? `Checklist Personalizado Ativo (${customQuestions.length} perguntas cadastradas)`
                  : "Checklist Padrão Técnico Ativo (20 perguntas estruturadas pela metodologia Maia)"}
              </span>
              <Badge variant="outline" className="text-[10px] font-semibold">
                {temPerguntasCustomizadas ? "Customizado" : "Padrão Oficial"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {temPerguntasCustomizadas
                ? "As auditorias desta empresa utilizam este checklist personalizado. Você pode editar os critérios a qualquer momento."
                : "Os auditores respondem 4 perguntas técnicas detalhadas por Senso. Para personalizar este banco, clique em 'Carregar Padrão' ou crie novas perguntas."}
            </p>
          </div>
        </div>
      </Card>

      {/* Tabs por Senso */}
      <Tabs
        value={selectedSenso}
        onValueChange={(val: any) => setSelectedSenso(val)}
        className="w-full"
      >
        <TabsList className="grid grid-cols-5 max-w-2xl">
          {SENSOS_LIST.map((senso) => {
            const info = NOMES_SENSOS[senso];
            const count = temPerguntasCustomizadas
              ? customQuestions.filter((q) => q.senso === senso).length
              : CHECKLIST_PADRAO_5S.filter((p) => p.senso === senso).length;

            return (
              <TabsTrigger
                key={senso}
                value={senso}
                className="text-xs font-bold gap-1.5 data-[state=active]:shadow-sm"
              >
                <span
                  className="h-2 w-2 rounded-full inline-block"
                  style={{ backgroundColor: info.cor }}
                />
                {senso} ({count})
              </TabsTrigger>
            );
          })}
        </TabsList>

        {SENSOS_LIST.map((senso) => {
          const info = NOMES_SENSOS[senso];
          return (
            <TabsContent key={senso} value={senso} className="space-y-4 pt-3">
              {/* Card descritivo do Senso */}
              <div
                className="p-3.5 rounded-xl border flex items-center justify-between text-xs"
                style={{
                  borderLeftColor: info.cor,
                  borderLeftWidth: "4px",
                  backgroundColor: `${info.cor}10`,
                }}
              >
                <div>
                  <span className="font-bold text-sm text-foreground">
                    {senso} — Senso de {info.nome}
                  </span>
                  <p className="text-muted-foreground mt-0.5">{info.significado}</p>
                </div>
                <Badge
                  className="text-white text-[11px] font-bold"
                  style={{ backgroundColor: info.cor }}
                >
                  {perguntasExibidas.length} Critérios
                </Badge>
              </div>

              {/* Lista de Perguntas */}
              {perguntasExibidas.length === 0 ? (
                <Card className="p-8 text-center border-dashed">
                  <HelpCircle className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-muted-foreground">
                    Nenhum critério cadastrado para o senso de {senso}.
                  </p>
                  {canEdit && (
                    <Button
                      size="sm"
                      onClick={handleOpenCreate}
                      className="mt-3 text-xs font-bold"
                    >
                      + Adicionar Primeiro Critério de {senso}
                    </Button>
                  )}
                </Card>
              ) : (
                <div className="space-y-3">
                  {perguntasExibidas.map((q, idx) => (
                    <Card
                      key={q.id}
                      className={`p-4 border transition-all ${
                        !q.ativo ? "opacity-60 bg-muted/30" : "bg-card shadow-sm hover:border-primary/40"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[11px] font-bold px-2">
                              #{q.ordem || idx + 1}
                            </Badge>
                            <h4 className="font-bold text-sm text-foreground">
                              {q.titulo_pergunta}
                            </h4>
                            {!q.ativo && (
                              <Badge variant="secondary" className="text-[10px]">
                                Inativo na Auditoria
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed pl-1 border-l-2 border-muted-foreground/30">
                            <strong>Critério de Avaliação:</strong> {q.criterio_avaliacao}
                          </p>
                        </div>

                        {canEdit && temPerguntasCustomizadas && (
                          <div className="flex items-center gap-2 shrink-0 self-end sm:self-start">
                            <div className="flex items-center gap-1 mr-2">
                              <span className="text-[11px] text-muted-foreground">Ativo:</span>
                              <Switch
                                checked={q.ativo}
                                onCheckedChange={() => handleToggleAtivo(q as FivesPerguntaCustomizada)}
                              />
                            </div>

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenEdit(q as FivesPerguntaCustomizada)}
                              className="h-8 w-8 p-0"
                              title="Editar Pergunta"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>

                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(q.id)}
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-rose-600"
                              title="Excluir Pergunta"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          );
        })}
      </Tabs>

      {/* Modal Criar/Editar Pergunta */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <BookOpen className="h-4 w-4 text-primary" />
              {editingQuestion ? "Editar Critério 5S" : `Novo Critério para ${selectedSenso}`}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Defina a pergunta objetiva e o critério técnico para nortear a inspeção do auditor.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Senso Avaliado</Label>
              <Input value={`${selectedSenso} (${NOMES_SENSOS[selectedSenso].nome})`} disabled className="bg-muted text-xs font-semibold" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="titulo" className="text-xs font-semibold">
                Pergunta / Título do Critério *
              </Label>
              <Input
                id="titulo"
                placeholder="Ex: Identificação visual de ferramentas e materiais de consumo"
                value={formTitulo}
                onChange={(e) => setFormTitulo(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="criterio" className="text-xs font-semibold">
                Critério de Avaliação Técnico (O que observar?) *
              </Label>
              <Textarea
                id="criterio"
                rows={3}
                placeholder="Ex: Verificar se gabaritos de sombra, caixas ou suportes estão devidamente identificados com etiquetas legíveis e padrão visual adotado."
                value={formCriterio}
                onChange={(e) => setFormCriterio(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="ordem" className="text-xs font-semibold">
                  Ordem de Exibição
                </Label>
                <Input
                  id="ordem"
                  type="number"
                  min={1}
                  max={99}
                  value={formOrdem}
                  onChange={(e) => setFormOrdem(Number(e.target.value))}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5 flex flex-col justify-end pb-1">
                <div className="flex items-center gap-2">
                  <Switch
                    id="formAtivo"
                    checked={formAtivo}
                    onCheckedChange={setFormAtivo}
                  />
                  <Label htmlFor="formAtivo" className="text-xs font-semibold cursor-pointer">
                    Critério Ativo
                  </Label>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsDialogOpen(false)}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={saving}
              className="text-xs font-bold"
            >
              {saving ? "Salvando..." : editingQuestion ? "Atualizar Critério" : "Salvar Critério"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
