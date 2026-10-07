// src/components/nps/PesquisaFormModal.tsx
// Construtor de Pesquisas NPS e eNPS (Form Builder com Branding e Questionário Dinâmico)

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Trash2,
  Palette,
  ListOrdered,
  HelpCircle,
  Sparkles,
  ArrowUp,
  ArrowDown,
  Smile,
  Star,
  MessageSquare,
  Check,
  Building2,
} from "lucide-react";
import { toast } from "sonner";
import type {
  Pesquisa,
  PesquisaPergunta,
  TipoPesquisa,
  TipoPerguntaNps,
  ConfigVisualPesquisa,
} from "@/lib/nps-types";

interface PesquisaFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (pesquisa: Partial<Pesquisa>, perguntas: Array<Omit<PesquisaPergunta, "id" | "pesquisa_id" | "criado_em">>) => Promise<void>;
  pesquisaEdit?: Pesquisa | null;
  perguntasEdit?: PesquisaPergunta[];
  companyId?: string | null;
  companyName?: string | null;
}

const DEFAULT_CONFIG_VISUAL: ConfigVisualPesquisa = {
  cor_fundo: "#FFF8F5",
  cor_primaria: "#E05A10",
  cor_texto: "#1F2937",
  mensagem_boas_vindas: "Sua opinião é fundamental para evoluirmos nossos serviços e cultura.",
  mensagem_agradecimento: "Muito obrigado por dedicar seu tempo! Suas respostas nos ajudam a construir uma experiência cada vez melhor.",
  permitir_anonimo: true,
};

export function PesquisaFormModal({
  isOpen,
  onClose,
  onSave,
  pesquisaEdit,
  perguntasEdit,
  companyId,
  companyName,
}: PesquisaFormModalProps) {
  const [activeTab, setActiveTab] = useState<"dados" | "visual" | "perguntas">("dados");
  const [salvando, setSalvando] = useState(false);

  // Dados Básicos
  const [titulo, setTitulo] = useState(pesquisaEdit?.titulo || "");
  const [descricao, setDescricao] = useState(pesquisaEdit?.descricao || "");
  const [tipo, setTipo] = useState<TipoPesquisa>(pesquisaEdit?.tipo || "nps");
  const [status, setStatus] = useState<"ativa" | "inativa">(pesquisaEdit?.status || "ativa");

  // Personalização Visual
  const [configVisual, setConfigVisual] = useState<ConfigVisualPesquisa>(
    pesquisaEdit?.config_visual || DEFAULT_CONFIG_VISUAL
  );

  // Perguntas
  const [perguntas, setPerguntas] = useState<Array<Omit<PesquisaPergunta, "id" | "pesquisa_id" | "criado_em">>>(
    perguntasEdit && perguntasEdit.length > 0
      ? perguntasEdit.map((p) => ({
          texto_pergunta: p.texto_pergunta,
          tipo: p.tipo,
          obrigatoria: p.obrigatoria,
          ordem: p.ordem,
          texto_ajuda: p.texto_ajuda || "",
        }))
      : [
          {
            texto_pergunta:
              tipo === "enps"
                ? "Em uma escala de 0 a 10, o quanto você recomendaria nossa empresa como um excelente lugar para se trabalhar?"
                : "Em uma escala de 0 a 10, qual a probabilidade de você recomendar nossos serviços para um amigo ou colega de trabalho?",
            tipo: "nps_0_10",
            obrigatoria: true,
            ordem: 1,
            texto_ajuda: "0 significa pouco provável e 10 significa extremamente provável",
          },
          {
            texto_pergunta: "Qual o principal motivo para a sua avaliação?",
            tipo: "texto_aberto",
            obrigatoria: false,
            ordem: 2,
            texto_ajuda: "Sinta-se livre para compartilhar detalhes e sugestões de melhoria",
          },
        ]
  );

  const handleAddPergunta = (tipoPergunta: TipoPerguntaNps) => {
    let textoDefault = "Nova Pergunta";
    let textoAjuda = "";
    if (tipoPergunta === "nps_0_10") {
      textoDefault = "Em uma escala de 0 a 10, o quanto você recomendaria nossos serviços?";
      textoAjuda = "0 = Pouco provável / 10 = Extremamente provável";
    } else if (tipoPergunta === "escala_1_5") {
      textoDefault = "Como você avalia o atendimento recebido?";
      textoAjuda = "1 = Insatisfeito / 5 = Totalmente Satisfeito";
    } else {
      textoDefault = "Deixe seus comentários e sugestões:";
      textoAjuda = "Sua resposta sincera nos ajuda muito.";
    }

    setPerguntas((prev) => [
      ...prev,
      {
        texto_pergunta: textoDefault,
        tipo: tipoPergunta,
        obrigatoria: true,
        ordem: prev.length + 1,
        texto_ajuda: textoAjuda,
      },
    ]);
  };

  const handleRemovePergunta = (index: number) => {
    if (perguntas.length <= 1) {
      toast.warning("A pesquisa deve ter pelo menos uma pergunta.");
      return;
    }
    setPerguntas((prev) =>
      prev
        .filter((_, i) => i !== index)
        .map((p, i) => ({ ...p, ordem: i + 1 }))
    );
  };

  const handleMovePergunta = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= perguntas.length) return;

    setPerguntas((prev) => {
      const copy = [...prev];
      const item = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = item;
      return copy.map((p, i) => ({ ...p, ordem: i + 1 }));
    });
  };

  const handleUpdatePergunta = (
    index: number,
    field: keyof Omit<PesquisaPergunta, "id" | "pesquisa_id" | "criado_em">,
    value: any
  ) => {
    setPerguntas((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim()) {
      toast.error("Informe o título da pesquisa.");
      setActiveTab("dados");
      return;
    }

    if (perguntas.length === 0) {
      toast.error("Adicione ao menos uma pergunta ao questionário.");
      setActiveTab("perguntas");
      return;
    }

    try {
      setSalvando(true);
      await onSave(
        {
          titulo: titulo.trim(),
          descricao: descricao.trim(),
          tipo,
          status,
          company_id: companyId || null,
          config_visual: configVisual,
        },
        perguntas
      );
      toast.success(pesquisaEdit ? "Pesquisa atualizada com sucesso!" : "Pesquisa criada com sucesso!");
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao salvar pesquisa: " + (err.message || "Tente novamente."));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b bg-gradient-to-r from-[#3E100C]/5 to-transparent">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-lg bg-[#3E100C]/10 flex items-center justify-center text-[#3E100C]">
                <Sparkles className="h-5 w-5 text-[#E05A10]" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-[#3E100C]">
                  {pesquisaEdit ? "Editar Pesquisa" : "Novo Construtor de Pesquisa (NPS / eNPS)"}
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Configure o design, identidade visual e o fluxo dinâmico de perguntas
                </p>
              </div>
            </div>
            {companyName && (
              <Badge variant="outline" className="border-[#E05A10]/40 text-[#E05A10] bg-[#FFF8F5]">
                <Building2 className="h-3 w-3 mr-1" />
                {companyName}
              </Badge>
            )}
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as any)}
            className="flex-1 flex flex-col overflow-hidden"
          >
            <div className="px-6 border-b bg-muted/20">
              <TabsList className="bg-transparent h-12 p-0 space-x-6 border-b-0">
                <TabsTrigger
                  value="dados"
                  className="data-[state=active]:border-b-2 data-[state=active]:border-[#E05A10] data-[state=active]:text-[#E05A10] rounded-none px-2 py-3 font-medium text-xs flex items-center gap-1.5"
                >
                  <ListOrdered className="h-4 w-4" />
                  1. Informações Básicas
                </TabsTrigger>
                <TabsTrigger
                  value="visual"
                  className="data-[state=active]:border-b-2 data-[state=active]:border-[#E05A10] data-[state=active]:text-[#E05A10] rounded-none px-2 py-3 font-medium text-xs flex items-center gap-1.5"
                >
                  <Palette className="h-4 w-4" />
                  2. Personalização Visual (Branding)
                </TabsTrigger>
                <TabsTrigger
                  value="perguntas"
                  className="data-[state=active]:border-b-2 data-[state=active]:border-[#E05A10] data-[state=active]:text-[#E05A10] rounded-none px-2 py-3 font-medium text-xs flex items-center gap-1.5"
                >
                  <HelpCircle className="h-4 w-4" />
                  3. Questionário Dinâmico ({perguntas.length})
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* ABA 1: DADOS BÁSICOS */}
              <TabsContent value="dados" className="m-0 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2 space-y-1.5">
                    <Label className="text-xs font-semibold">Título da Pesquisa *</Label>
                    <Input
                      placeholder="Ex: Pesquisa de Satisfação Q1 2026 / Clientes Maia"
                      value={titulo}
                      onChange={(e) => setTitulo(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Tipo de Pesquisa *</Label>
                    <Select value={tipo} onValueChange={(v: TipoPesquisa) => setTipo(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="nps">NPS (Clientes & Parceiros)</SelectItem>
                        <SelectItem value="enps">eNPS (Colaboradores / Interno)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Descrição / Contexto Interno</Label>
                  <Textarea
                    placeholder="Breve resumo da finalidade ou público-alvo desta rodada de avaliação..."
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border">
                  <div>
                    <h4 className="text-sm font-semibold text-[#3E100C]">Status da Pesquisa</h4>
                    <p className="text-xs text-muted-foreground">
                      Quando ativa, os links públicos aceitam respostas normalmente.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {status === "ativa" ? "Ativa (Recebendo respostas)" : "Inativa"}
                    </span>
                    <Switch
                      checked={status === "ativa"}
                      onCheckedChange={(checked) => setStatus(checked ? "ativa" : "inativa")}
                    />
                  </div>
                </div>
              </TabsContent>

              {/* ABA 2: PERSONALIZAÇÃO VISUAL */}
              <TabsContent value="visual" className="m-0 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2 p-4 rounded-xl border bg-muted/20">
                    <Label className="text-xs font-semibold flex items-center justify-between">
                      Cor de Fundo da Página
                      <span className="text-[10px] font-mono">{configVisual.cor_fundo}</span>
                    </Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={configVisual.cor_fundo || "#FFF8F5"}
                        onChange={(e) =>
                          setConfigVisual((c) => ({ ...c, cor_fundo: e.target.value }))
                        }
                        className="h-10 w-14 rounded cursor-pointer border p-0.5"
                      />
                      <Input
                        value={configVisual.cor_fundo || ""}
                        onChange={(e) =>
                          setConfigVisual((c) => ({ ...c, cor_fundo: e.target.value }))
                        }
                        className="font-mono text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-2 p-4 rounded-xl border bg-muted/20">
                    <Label className="text-xs font-semibold flex items-center justify-between">
                      Cor Primária dos Botões
                      <span className="text-[10px] font-mono">{configVisual.cor_primaria}</span>
                    </Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={configVisual.cor_primaria || "#E05A10"}
                        onChange={(e) =>
                          setConfigVisual((c) => ({ ...c, cor_primaria: e.target.value }))
                        }
                        className="h-10 w-14 rounded cursor-pointer border p-0.5"
                      />
                      <Input
                        value={configVisual.cor_primaria || ""}
                        onChange={(e) =>
                          setConfigVisual((c) => ({ ...c, cor_primaria: e.target.value }))
                        }
                        className="font-mono text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-2 p-4 rounded-xl border bg-muted/20">
                    <Label className="text-xs font-semibold flex items-center justify-between">
                      Cor das Letras / Texto
                      <span className="text-[10px] font-mono">{configVisual.cor_texto}</span>
                    </Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={configVisual.cor_texto || "#1F2937"}
                        onChange={(e) =>
                          setConfigVisual((c) => ({ ...c, cor_texto: e.target.value }))
                        }
                        className="h-10 w-14 rounded cursor-pointer border p-0.5"
                      />
                      <Input
                        value={configVisual.cor_texto || ""}
                        onChange={(e) =>
                          setConfigVisual((c) => ({ ...c, cor_texto: e.target.value }))
                        }
                        className="font-mono text-xs"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">URL da Logomarca ou Imagem de Fundo (Opcional)</Label>
                  <Input
                    placeholder="https://exemplo.com/logo.png ou anexe um link de imagem"
                    value={configVisual.logo_url || ""}
                    onChange={(e) =>
                      setConfigVisual((c) => ({ ...c, logo_url: e.target.value }))
                    }
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Se fornecido, será exibido no cabeçalho superior do questionário público.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Mensagem de Boas-Vindas (Tela de Abertura)</Label>
                  <Textarea
                    rows={2}
                    placeholder="Texto motivador de abertura que o respondente vê ao carregar a página..."
                    value={configVisual.mensagem_boas_vindas || ""}
                    onChange={(e) =>
                      setConfigVisual((c) => ({ ...c, mensagem_boas_vindas: e.target.value }))
                    }
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Mensagem de Agradecimento (Tela Final)</Label>
                  <Textarea
                    rows={2}
                    placeholder="Texto de agradecimento e confirmação após o envio..."
                    value={configVisual.mensagem_agradecimento || ""}
                    onChange={(e) =>
                      setConfigVisual((c) => ({ ...c, mensagem_agradecimento: e.target.value }))
                    }
                  />
                </div>

                {/* Preview Rápido */}
                <div
                  className="p-4 rounded-xl border text-center space-y-2"
                  style={{
                    backgroundColor: configVisual.cor_fundo || "#FFF8F5",
                    color: configVisual.cor_texto || "#1F2937",
                  }}
                >
                  <p className="text-[11px] uppercase tracking-wider font-semibold opacity-75">
                    Pré-visualização do Tema
                  </p>
                  <h4 className="text-base font-bold">{titulo || "Título da sua pesquisa"}</h4>
                  <p className="text-xs max-w-md mx-auto opacity-90">
                    {configVisual.mensagem_boas_vindas}
                  </p>
                  <div className="pt-2">
                    <button
                      type="button"
                      className="px-5 py-2 rounded-lg text-white text-xs font-semibold shadow-sm"
                      style={{ backgroundColor: configVisual.cor_primaria || "#E05A10" }}
                    >
                      Exemplo de Botão de Ação
                    </button>
                  </div>
                </div>
              </TabsContent>

              {/* ABA 3: QUESTIONÁRIO DINÂMICO */}
              <TabsContent value="perguntas" className="m-0 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b">
                  <div>
                    <h3 className="text-sm font-bold text-[#3E100C]">Perguntas da Pesquisa</h3>
                    <p className="text-xs text-muted-foreground">
                      Organize, adicione ou remova as questões do formulário interativo.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => handleAddPergunta("nps_0_10")}
                      className="text-xs border-[#E05A10]/30 hover:bg-[#E05A10]/10 text-[#E05A10]"
                    >
                      <Smile className="h-3.5 w-3.5 mr-1" />
                      + NPS (0 a 10)
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => handleAddPergunta("escala_1_5")}
                      className="text-xs border-amber-500/30 hover:bg-amber-500/10 text-amber-600"
                    >
                      <Star className="h-3.5 w-3.5 mr-1" />
                      + Escala (1 a 5)
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => handleAddPergunta("texto_aberto")}
                      className="text-xs border-indigo-500/30 hover:bg-indigo-500/10 text-indigo-600"
                    >
                      <MessageSquare className="h-3.5 w-3.5 mr-1" />
                      + Aberta (Texto)
                    </Button>
                  </div>
                </div>

                <div className="space-y-3">
                  {perguntas.map((perg, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl border bg-card hover:border-[#E05A10]/40 transition-all space-y-3 shadow-sm"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="h-6 w-6 rounded-full bg-[#3E100C] text-white text-xs font-bold flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <Badge
                            variant="secondary"
                            className={
                              perg.tipo === "nps_0_10"
                                ? "bg-orange-100 text-orange-800"
                                : perg.tipo === "escala_1_5"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-indigo-100 text-indigo-800"
                            }
                          >
                            {perg.tipo === "nps_0_10"
                              ? "NPS Padrão (0 a 10)"
                              : perg.tipo === "escala_1_5"
                              ? "Escala / Rating (1 a 5)"
                              : "Texto Aberto"}
                          </Badge>
                          {perg.obrigatoria && (
                            <Badge variant="outline" className="text-[10px] text-red-600 border-red-200">
                              Obrigatória
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-muted-foreground"
                            disabled={idx === 0}
                            onClick={() => handleMovePergunta(idx, "up")}
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-muted-foreground"
                            disabled={idx === perguntas.length - 1}
                            onClick={() => handleMovePergunta(idx, "down")}
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-red-500 hover:bg-red-50"
                            onClick={() => handleRemovePergunta(idx)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div className="md:col-span-3 space-y-1">
                          <Label className="text-[11px] text-muted-foreground">Pergunta / Enunciado</Label>
                          <Input
                            value={perg.texto_pergunta}
                            onChange={(e) =>
                              handleUpdatePergunta(idx, "texto_pergunta", e.target.value)
                            }
                            placeholder="Digite o texto da pergunta..."
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground">Tipo de Entrada</Label>
                          <Select
                            value={perg.tipo}
                            onValueChange={(v: TipoPerguntaNps) =>
                              handleUpdatePergunta(idx, "tipo", v)
                            }
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="nps_0_10">NPS (0 a 10)</SelectItem>
                              <SelectItem value="escala_1_5">Escala (1 a 5)</SelectItem>
                              <SelectItem value="texto_aberto">Texto Aberto</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-1">
                        <div className="md:col-span-3 space-y-1">
                          <Label className="text-[11px] text-muted-foreground">
                            Texto de Ajuda / Subtítulo (Opcional)
                          </Label>
                          <Input
                            value={perg.texto_ajuda || ""}
                            onChange={(e) =>
                              handleUpdatePergunta(idx, "texto_ajuda", e.target.value)
                            }
                            placeholder="Ex: 0 = Péssimo / 10 = Excelente"
                            className="h-8 text-xs"
                          />
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-4">
                          <span className="text-xs text-muted-foreground">Obrigatória</span>
                          <Switch
                            checked={perg.obrigatoria}
                            onCheckedChange={(checked) =>
                              handleUpdatePergunta(idx, "obrigatoria", checked)
                            }
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>
            </div>

            <DialogFooter className="p-4 border-t bg-muted/10 flex items-center justify-between sm:justify-between">
              <Button type="button" variant="outline" onClick={onClose} disabled={salvando}>
                Cancelar
              </Button>
              <div className="flex items-center gap-2">
                {activeTab !== "perguntas" ? (
                  <Button
                    type="button"
                    onClick={() => {
                      if (activeTab === "dados") setActiveTab("visual");
                      else if (activeTab === "visual") setActiveTab("perguntas");
                    }}
                    className="bg-[#3E100C] hover:bg-[#3E100C]/90 text-white"
                  >
                    Próxima Etapa
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={salvando}
                    className="bg-[#E05A10] hover:bg-[#E05A10]/90 text-white font-medium"
                  >
                    {salvando ? "Salvando..." : pesquisaEdit ? "Salvar Alterações" : "Publicar Pesquisa"}
                  </Button>
                )}
              </div>
            </DialogFooter>
          </Tabs>
        </form>
      </DialogContent>
    </Dialog>
  );
}
