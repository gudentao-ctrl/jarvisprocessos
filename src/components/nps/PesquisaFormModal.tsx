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
  Building2,
  Upload,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import type {
  Pesquisa,
  PesquisaPergunta,
  TipoPesquisa,
  ConfigVisualPesquisa,
} from "@/lib/nps-types";

interface PesquisaFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (pesquisa: Partial<Pesquisa>, perguntas: any[]) => Promise<void>;
  pesquisaEdit?: Pesquisa | null;
  perguntasEdit?: PesquisaPergunta[];
  companyId?: string | null;
  companyName?: string | null;
}

// Utilitário para garantir hex de 7 chars válido (#rrggbb) sem NaN
function toHex7(val: string | undefined, fallback: string): string {
  if (!val || typeof val !== "string") return fallback;
  const clean = val.trim();
  if (clean.includes("NaN")) return fallback;
  if (/^#[0-9a-fA-F]{6}$/.test(clean)) return clean.toLowerCase();
  if (/^[0-9a-fA-F]{6}$/.test(clean)) return `#${clean.toLowerCase()}`;
  if (/^#[0-9a-fA-F]{3}$/.test(clean)) {
    const r = clean[1], g = clean[2], b = clean[3];
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return fallback;
}

// Verifica se uma cor hex é escura
function isDarkColor(hex: string): boolean {
  const clean = toHex7(hex, "#ffffff").replace("#", "");
  const num = parseInt(clean, 16);
  if (isNaN(num)) return false;
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.5;
}

const DEFAULT_CONFIG_VISUAL: ConfigVisualPesquisa = {
  cor_fundo: "#FFF8F5",
  cor_primaria: "#E05A10",
  cor_texto: "#1F2937",
  card_bg_color: "#FFFFFF",
  mensagem_boas_vindas: "Sua opinião é fundamental para evoluirmos nossos serviços e cultura.",
  mensagem_agradecimento: "Muito obrigado por dedicar seu tempo! Suas respostas nos ajudam a construir uma experiência cada vez melhor.",
  permitir_anonimo: true,
};

const PRESET_THEMES = [
  {
    id: "gourmet",
    name: "JR Espetaria / Gourmet",
    icon: "🥩",
    cor_fundo: "#1A0A08",
    cor_card: "#261412",
    cor_primaria: "#630E0D",
    cor_texto: "#FBEB96",
  },
  {
    id: "dark",
    name: "Dark Moderno",
    icon: "🌑",
    cor_fundo: "#121212",
    cor_card: "#1E1E1E",
    cor_primaria: "#E05A10",
    cor_texto: "#F3F4F6",
  },
  {
    id: "maia",
    name: "Maia Clean / Padrão",
    icon: "☀️",
    cor_fundo: "#FFF8F5",
    cor_card: "#FFFFFF",
    cor_primaria: "#E05A10",
    cor_texto: "#1F2937",
  },
  {
    id: "corporativo",
    name: "Corporativo Azul",
    icon: "💼",
    cor_fundo: "#0F172A",
    cor_card: "#1E293B",
    cor_primaria: "#2563EB",
    cor_texto: "#F8FAFC",
  },
];

type TipoPerguntaForm = "nps_0_10" | "escala_1_5" | "texto_aberto" | "selecao_lista";

interface PerguntaFormState {
  id?: string;
  texto_pergunta: string;
  tipo: TipoPerguntaForm;
  obrigatoria: boolean;
  ordem: number;
  texto_ajuda?: string;
  opcoes_lista?: string[];
}

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

  // Personalização Visual (com limpeza de cores para evitar NaN)
  const initialVisual: ConfigVisualPesquisa = (() => {
    const raw = pesquisaEdit?.config_visual || DEFAULT_CONFIG_VISUAL;
    const rawBg = raw.cor_fundo || raw.bg_color || "#FFF8F5";
    const isDark = typeof rawBg === "string" && (rawBg.includes("NaN0f") || rawBg.includes("000000") || rawBg.toLowerCase().includes("#3e") || rawBg.toLowerCase().includes("#1a"));
    const fixedBg = toHex7(rawBg, isDark ? "#121212" : "#FFF8F5");

    return {
      cor_fundo: fixedBg,
      bg_color: fixedBg,
      cor_primaria: toHex7(raw.cor_primaria || raw.primary_color, "#E05A10"),
      primary_color: toHex7(raw.cor_primaria || raw.primary_color, "#E05A10"),
      cor_texto: toHex7(raw.cor_texto || raw.text_color, isDarkColor(fixedBg) ? "#FBEB96" : "#1F2937"),
      text_color: toHex7(raw.cor_texto || raw.text_color, isDarkColor(fixedBg) ? "#FBEB96" : "#1F2937"),
      card_bg_color: toHex7(raw.card_bg_color || raw.cor_card, isDarkColor(fixedBg) ? "#261412" : "#FFFFFF"),
      cor_card: toHex7(raw.card_bg_color || raw.cor_card, isDarkColor(fixedBg) ? "#261412" : "#FFFFFF"),
      logo_url: raw.logo_url || "",
      welcome_msg: raw.welcome_msg || raw.mensagem_boas_vindas || DEFAULT_CONFIG_VISUAL.mensagem_boas_vindas,
      mensagem_boas_vindas: raw.mensagem_boas_vindas || raw.welcome_msg || DEFAULT_CONFIG_VISUAL.mensagem_boas_vindas,
      thanks_msg: raw.thanks_msg || raw.mensagem_agradecimento || DEFAULT_CONFIG_VISUAL.mensagem_agradecimento,
      mensagem_agradecimento: raw.mensagem_agradecimento || raw.thanks_msg || DEFAULT_CONFIG_VISUAL.mensagem_agradecimento,
      permitir_anonimo: raw.permitir_anonimo ?? true,
    };
  })();

  const [configVisual, setConfigVisual] = useState<ConfigVisualPesquisa>(initialVisual);

  // Perguntas
  const [perguntas, setPerguntas] = useState<PerguntaFormState[]>(
    perguntasEdit && perguntasEdit.length > 0
      ? perguntasEdit.map((p) => {
          let t: TipoPerguntaForm = "nps_0_10";
          if (p.tipo_resposta === "rating" || (p as any).tipo === "escala_1_5") t = "escala_1_5";
          else if (p.tipo_resposta === "text_open" || (p as any).tipo === "texto_aberto") t = "texto_aberto";
          else if (p.tipo_resposta === "selecao_lista" || (p as any).tipo === "selecao_lista") t = "selecao_lista";

          return {
            id: p.id,
            texto_pergunta: p.titulo_pergunta || (p as any).texto_pergunta || "",
            tipo: t,
            obrigatoria: p.obrigatorio ?? (p as any).obrigatoria ?? true,
            ordem: p.ordem,
            texto_ajuda: p.placeholder || (p as any).texto_ajuda || "",
            opcoes_lista: p.opcoes_lista || (p as any).opcoes_lista || ["Opção 1", "Opção 2", "Opção 3"],
          };
        })
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
            opcoes_lista: [],
          },
          {
            texto_pergunta: "Qual o principal motivo para a sua avaliação?",
            tipo: "texto_aberto",
            obrigatoria: false,
            ordem: 2,
            texto_ajuda: "Sinta-se livre para compartilhar detalhes e sugestões de melhoria",
            opcoes_lista: [],
          },
        ]
  );

  const handleApplyPreset = (preset: typeof PRESET_THEMES[0]) => {
    setConfigVisual((prev) => ({
      ...prev,
      cor_fundo: preset.cor_fundo,
      bg_color: preset.cor_fundo,
      card_bg_color: preset.cor_card,
      cor_card: preset.cor_card,
      cor_primaria: preset.cor_primaria,
      primary_color: preset.cor_primaria,
      cor_texto: preset.cor_texto,
      text_color: preset.cor_texto,
    }));
    toast.success(`Tema "${preset.name}" aplicado!`);
  };

  const handleAddPergunta = (tipoPergunta: TipoPerguntaForm) => {
    let textoDefault = "Nova Pergunta";
    let textoAjuda = "";
    let opcoesDefault: string[] = [];
    if (tipoPergunta === "nps_0_10") {
      textoDefault = "Em uma escala de 0 a 10, o quanto você recomendaria nossos serviços?";
      textoAjuda = "0 = Pouco provável / 10 = Extremamente provável";
    } else if (tipoPergunta === "escala_1_5") {
      textoDefault = "Como você avalia o atendimento recebido?";
      textoAjuda = "1 = Insatisfeito / 5 = Totalmente Satisfeito";
    } else if (tipoPergunta === "selecao_lista") {
      textoDefault = "Selecione uma das opções abaixo:";
      textoAjuda = "Escolha a alternativa mais adequada";
      opcoesDefault = ["Opção 1", "Opção 2", "Opção 3"];
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
        opcoes_lista: opcoesDefault,
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
    field: keyof PerguntaFormState,
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

      // Higieniza rigorosamente todas as cores para nunca enviar NaN ou valores corrompidos
      const cleanFundo = toHex7(configVisual.cor_fundo || configVisual.bg_color, "#FFF8F5");
      const cleanCard = toHex7(configVisual.card_bg_color || configVisual.cor_card, isDarkColor(cleanFundo) ? "#261412" : "#FFFFFF");
      const cleanPrimaria = toHex7(configVisual.cor_primaria || configVisual.primary_color, "#E05A10");
      const cleanTexto = toHex7(configVisual.cor_texto || configVisual.text_color, isDarkColor(cleanFundo) ? "#FBEB96" : "#1F2937");

      const finalConfigVisual: ConfigVisualPesquisa = {
        ...configVisual,
        cor_fundo: cleanFundo,
        bg_color: cleanFundo,
        card_bg_color: cleanCard,
        cor_card: cleanCard,
        cor_primaria: cleanPrimaria,
        primary_color: cleanPrimaria,
        cor_texto: cleanTexto,
        text_color: cleanTexto,
        welcome_msg: configVisual.mensagem_boas_vindas || configVisual.welcome_msg || "",
        mensagem_boas_vindas: configVisual.mensagem_boas_vindas || configVisual.welcome_msg || "",
        thanks_msg: configVisual.mensagem_agradecimento || configVisual.thanks_msg || "",
        mensagem_agradecimento: configVisual.mensagem_agradecimento || configVisual.thanks_msg || "",
      };

      await onSave(
        {
          titulo: titulo.trim(),
          descricao: descricao.trim(),
          tipo,
          status,
          company_id: companyId || null,
          config_visual: finalConfigVisual,
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

  const previewFundo = toHex7(configVisual.cor_fundo, "#FFF8F5");
  const previewCard = toHex7(configVisual.card_bg_color, isDarkColor(previewFundo) ? "#261412" : "#FFFFFF");
  const previewPrimaria = toHex7(configVisual.cor_primaria, "#E05A10");
  const previewTexto = toHex7(configVisual.cor_texto, isDarkColor(previewCard) ? "#FBEB96" : "#1F2937");
  const isDarkCardPreview = isDarkColor(previewCard);

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
                {/* Paletas de Cores Prontas (1-Click Presets) */}
                <div className="p-4 rounded-xl border bg-muted/20 space-y-2.5">
                  <Label className="text-xs font-bold text-[#3E100C] flex items-center gap-1.5">
                    <Palette className="h-3.5 w-3.5 text-[#E05A10]" />
                    Paletas Rápidas (Temas Pré-Configurados)
                  </Label>
                  <p className="text-[11px] text-muted-foreground">
                    Clique em um tema para aplicar as combinações de cores recomendadas automaticamente:
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                    {PRESET_THEMES.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleApplyPreset(preset)}
                        className="p-2.5 rounded-lg border bg-background hover:border-[#E05A10] transition-all text-left space-y-1.5 group"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold truncate group-hover:text-[#E05A10] flex items-center gap-1">
                            <span>{preset.icon}</span>
                            <span className="truncate">{preset.name}</span>
                          </span>
                        </div>
                        <div className="flex items-center gap-1 pt-0.5">
                          <span
                            className="h-4 w-4 rounded-full border border-black/10 shrink-0"
                            style={{ backgroundColor: preset.cor_fundo }}
                            title={`Fundo: ${preset.cor_fundo}`}
                          />
                          <span
                            className="h-4 w-4 rounded-full border border-black/10 shrink-0"
                            style={{ backgroundColor: preset.cor_card }}
                            title={`Card: ${preset.cor_card}`}
                          />
                          <span
                            className="h-4 w-4 rounded-full border border-black/10 shrink-0"
                            style={{ backgroundColor: preset.cor_primaria }}
                            title={`Botão: ${preset.cor_primaria}`}
                          />
                          <span
                            className="h-4 w-4 rounded-full border border-black/10 shrink-0"
                            style={{ backgroundColor: preset.cor_texto }}
                            title={`Texto: ${preset.cor_texto}`}
                          />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Seletores de Cores Personalizados */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* Cor de Fundo */}
                  <div className="space-y-2 p-3.5 rounded-xl border bg-muted/20">
                    <Label className="text-xs font-semibold flex items-center justify-between">
                      Fundo da Página
                      <span className="text-[10px] font-mono text-muted-foreground">
                        {toHex7(configVisual.cor_fundo, "#FFF8F5")}
                      </span>
                    </Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={toHex7(configVisual.cor_fundo, "#FFF8F5")}
                        onChange={(e) =>
                          setConfigVisual((c) => ({
                            ...c,
                            cor_fundo: e.target.value,
                            bg_color: e.target.value,
                          }))
                        }
                        className="h-9 w-12 rounded cursor-pointer border p-0.5"
                      />
                      <Input
                        value={configVisual.cor_fundo || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          setConfigVisual((c) => ({
                            ...c,
                            cor_fundo: val,
                            bg_color: val,
                          }));
                        }}
                        onBlur={() => {
                          setConfigVisual((c) => ({
                            ...c,
                            cor_fundo: toHex7(c.cor_fundo, "#FFF8F5"),
                            bg_color: toHex7(c.cor_fundo, "#FFF8F5"),
                          }));
                        }}
                        placeholder="#1A0A08"
                        className="font-mono text-xs h-9"
                      />
                    </div>
                  </div>

                  {/* Cor do Card / Caixa Central */}
                  <div className="space-y-2 p-3.5 rounded-xl border bg-muted/20">
                    <Label className="text-xs font-semibold flex items-center justify-between">
                      Fundo do Card Central
                      <span className="text-[10px] font-mono text-muted-foreground">
                        {toHex7(configVisual.card_bg_color, isDarkColor(configVisual.cor_fundo || "") ? "#261412" : "#FFFFFF")}
                      </span>
                    </Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={toHex7(configVisual.card_bg_color, isDarkColor(configVisual.cor_fundo || "") ? "#261412" : "#FFFFFF")}
                        onChange={(e) =>
                          setConfigVisual((c) => ({
                            ...c,
                            card_bg_color: e.target.value,
                            cor_card: e.target.value,
                          }))
                        }
                        className="h-9 w-12 rounded cursor-pointer border p-0.5"
                      />
                      <Input
                        value={configVisual.card_bg_color || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          setConfigVisual((c) => ({
                            ...c,
                            card_bg_color: val,
                            cor_card: val,
                          }));
                        }}
                        onBlur={() => {
                          setConfigVisual((c) => ({
                            ...c,
                            card_bg_color: toHex7(c.card_bg_color, isDarkColor(c.cor_fundo || "") ? "#261412" : "#FFFFFF"),
                            cor_card: toHex7(c.card_bg_color, isDarkColor(c.cor_fundo || "") ? "#261412" : "#FFFFFF"),
                          }));
                        }}
                        placeholder="#261412"
                        className="font-mono text-xs h-9"
                      />
                    </div>
                  </div>

                  {/* Cor Primária dos Botões */}
                  <div className="space-y-2 p-3.5 rounded-xl border bg-muted/20">
                    <Label className="text-xs font-semibold flex items-center justify-between">
                      Botões de Ação
                      <span className="text-[10px] font-mono text-muted-foreground">
                        {toHex7(configVisual.cor_primaria, "#E05A10")}
                      </span>
                    </Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={toHex7(configVisual.cor_primaria, "#E05A10")}
                        onChange={(e) =>
                          setConfigVisual((c) => ({
                            ...c,
                            cor_primaria: e.target.value,
                            primary_color: e.target.value,
                          }))
                        }
                        className="h-9 w-12 rounded cursor-pointer border p-0.5"
                      />
                      <Input
                        value={configVisual.cor_primaria || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          setConfigVisual((c) => ({
                            ...c,
                            cor_primaria: val,
                            primary_color: val,
                          }));
                        }}
                        onBlur={() => {
                          setConfigVisual((c) => ({
                            ...c,
                            cor_primaria: toHex7(c.cor_primaria, "#E05A10"),
                            primary_color: toHex7(c.cor_primaria, "#E05A10"),
                          }));
                        }}
                        placeholder="#630E0D"
                        className="font-mono text-xs h-9"
                      />
                    </div>
                  </div>

                  {/* Cor das Letras / Texto */}
                  <div className="space-y-2 p-3.5 rounded-xl border bg-muted/20">
                    <Label className="text-xs font-semibold flex items-center justify-between">
                      Letras e Textos
                      <span className="text-[10px] font-mono text-muted-foreground">
                        {toHex7(configVisual.cor_texto, isDarkColor(configVisual.cor_fundo || "") ? "#FBEB96" : "#1F2937")}
                      </span>
                    </Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={toHex7(configVisual.cor_texto, isDarkColor(configVisual.cor_fundo || "") ? "#FBEB96" : "#1F2937")}
                        onChange={(e) =>
                          setConfigVisual((c) => ({
                            ...c,
                            cor_texto: e.target.value,
                            text_color: e.target.value,
                          }))
                        }
                        className="h-9 w-12 rounded cursor-pointer border p-0.5"
                      />
                      <Input
                        value={configVisual.cor_texto || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          setConfigVisual((c) => ({
                            ...c,
                            cor_texto: val,
                            text_color: val,
                          }));
                        }}
                        onBlur={() => {
                          setConfigVisual((c) => ({
                            ...c,
                            cor_texto: toHex7(c.cor_texto, isDarkColor(c.cor_fundo || "") ? "#FBEB96" : "#1F2937"),
                            text_color: toHex7(c.cor_texto, isDarkColor(c.cor_fundo || "") ? "#FBEB96" : "#1F2937"),
                          }));
                        }}
                        placeholder="#FBEB96"
                        className="font-mono text-xs h-9"
                      />
                    </div>
                  </div>
                </div>

                {/* Logomarca da Empresa */}
                <div className="space-y-2 p-4 rounded-xl border bg-muted/20">
                  <Label className="text-xs font-semibold block text-[#3E100C]">
                    Logomarca da Empresa / Cliente
                  </Label>
                  <p className="text-[11px] text-muted-foreground">
                    Faça upload da imagem do logo ou insira uma URL direta para exibir no topo da pesquisa.
                  </p>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 pt-1">
                    {/* Botão de Upload de Arquivo */}
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          if (file.size > 3 * 1024 * 1024) {
                            toast.error("O arquivo deve ter no máximo 3MB.");
                            return;
                          }
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            const rawDataUrl = event.target?.result as string;
                            if (!rawDataUrl) return;

                            // Comprime a imagem via Canvas para um tamanho ideal (max 600x240, ~20-50KB)
                            const img = new Image();
                            img.onload = () => {
                              const canvas = document.createElement("canvas");
                              let width = img.width;
                              let height = img.height;
                              const maxWidth = 600;
                              const maxHeight = 240;

                              if (width > maxWidth || height > maxHeight) {
                                const ratio = Math.min(maxWidth / width, maxHeight / height);
                                width = Math.round(width * ratio);
                                height = Math.round(height * ratio);
                              }

                              canvas.width = width;
                              canvas.height = height;
                              const ctx = canvas.getContext("2d");
                              if (ctx) {
                                ctx.drawImage(img, 0, 0, width, height);
                                const optimizedDataUrl = canvas.toDataURL("image/png", 0.88);
                                setConfigVisual((c) => ({
                                  ...c,
                                  logo_url: optimizedDataUrl,
                                }));
                                toast.success("Logo carregado e otimizado com sucesso!");
                              } else {
                                setConfigVisual((c) => ({ ...c, logo_url: rawDataUrl }));
                                toast.success("Logo carregado com sucesso!");
                              }
                            };
                            img.onerror = () => {
                              setConfigVisual((c) => ({ ...c, logo_url: rawDataUrl }));
                              toast.success("Logo carregado com sucesso!");
                            };
                            img.src = rawDataUrl;
                          };
                          reader.readAsDataURL(file);
                        }}
                      />
                      <div className="h-9 px-3 rounded-lg border border-dashed border-[#E05A10]/50 bg-background hover:bg-[#E05A10]/5 text-[#E05A10] flex items-center gap-2 text-xs font-medium transition-colors">
                        <Upload className="h-3.5 w-3.5" />
                        <span>Fazer Upload do Logo (PNG / JPG / SVG)</span>
                      </div>
                    </label>

                    <span className="text-[10px] text-muted-foreground font-semibold uppercase">ou</span>

                    {/* Input de URL direta */}
                    <div className="flex-1 w-full">
                      <Input
                        placeholder="Cole a URL da logomarca (https://...)"
                        value={configVisual.logo_url || ""}
                        onChange={(e) =>
                          setConfigVisual((c) => ({ ...c, logo_url: e.target.value }))
                        }
                        className="text-xs h-9 bg-background"
                      />
                    </div>
                  </div>

                  {/* Preview do Logo se existente */}
                  {configVisual.logo_url && (
                    <div className="flex items-center gap-3 pt-2">
                      <div className="p-2 rounded-lg border bg-white max-h-16 flex items-center justify-center">
                        <img
                          src={configVisual.logo_url}
                          alt="Logo Preview"
                          className="max-h-12 max-w-[160px] object-contain"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setConfigVisual((c) => ({ ...c, logo_url: "" }))}
                        className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 h-8"
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" />
                        Remover Logo
                      </Button>
                    </div>
                  )}
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

                {/* Pré-visualização Fiel e Realista do Link Público */}
                <div className="space-y-2 pt-2">
                  <Label className="text-xs font-bold text-[#3E100C] block">
                    Pré-visualização Fiel do Link Público
                  </Label>
                  <div
                    className="p-6 sm:p-10 rounded-2xl border transition-colors flex items-center justify-center min-h-[280px]"
                    style={{ backgroundColor: previewFundo }}
                  >
                    <div
                      className={`max-w-md w-full p-6 sm:p-8 rounded-2xl shadow-xl text-center space-y-4 border transition-colors ${
                        isDarkCardPreview ? "border-white/10" : "border-black/5"
                      }`}
                      style={{
                        backgroundColor: previewCard,
                        color: previewTexto,
                      }}
                    >
                      {configVisual.logo_url && (
                        <div className="flex items-center justify-center pb-1">
                          <img
                            src={configVisual.logo_url}
                            alt="Logo da Empresa"
                            className="max-h-16 max-w-[180px] object-contain drop-shadow"
                          />
                        </div>
                      )}

                      <h4 className="text-lg font-black tracking-tight">
                        {titulo || "Título da sua pesquisa"}
                      </h4>

                      {descricao && (
                        <p className="text-xs opacity-75">
                          {descricao}
                        </p>
                      )}

                      <div
                        className={`p-3 rounded-lg text-xs leading-relaxed opacity-90 ${
                          isDarkCardPreview ? "bg-white/5 border border-white/10" : "bg-black/5 border border-black/5"
                        }`}
                      >
                        {configVisual.mensagem_boas_vindas || "Sua opinião é fundamental para evoluirmos nossos serviços."}
                      </div>

                      <div className="pt-2 flex justify-center">
                        <button
                          type="button"
                          className="px-6 py-2.5 rounded-full text-white text-xs font-bold shadow-md transition-transform hover:scale-105"
                          style={{ backgroundColor: previewPrimaria }}
                        >
                          Iniciar Pesquisa →
                        </button>
                      </div>

                      <p className="text-[10px] opacity-50 pt-1">
                        Acesso anônimo • Respostas 100% confidenciais
                      </p>
                    </div>
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

                  <div className="flex items-center gap-2 flex-wrap">
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
                      onClick={() => handleAddPergunta("selecao_lista")}
                      className="text-xs border-emerald-500/30 hover:bg-emerald-500/10 text-emerald-600"
                    >
                      <ListOrdered className="h-3.5 w-3.5 mr-1" />
                      + Lista de Seleção
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
                                : perg.tipo === "selecao_lista"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-indigo-100 text-indigo-800"
                            }
                          >
                            {perg.tipo === "nps_0_10"
                              ? "NPS Padrão (0 a 10)"
                              : perg.tipo === "escala_1_5"
                              ? "Escala / Rating (1 a 5)"
                              : perg.tipo === "selecao_lista"
                              ? "Lista de Seleção"
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
                            onValueChange={(v: TipoPerguntaForm) => {
                              handleUpdatePergunta(idx, "tipo", v);
                              if (v === "selecao_lista" && (!perg.opcoes_lista || perg.opcoes_lista.length === 0)) {
                                handleUpdatePergunta(idx, "opcoes_lista", ["Opção 1", "Opção 2", "Opção 3"]);
                              }
                            }}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="nps_0_10">NPS (0 a 10)</SelectItem>
                              <SelectItem value="escala_1_5">Escala (1 a 5)</SelectItem>
                              <SelectItem value="selecao_lista">Lista de Seleção</SelectItem>
                              <SelectItem value="texto_aberto">Texto Aberto</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Configuração de opções da lista de seleção */}
                      {perg.tipo === "selecao_lista" && (
                        <div className="p-3 bg-muted/30 rounded-xl border space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs font-semibold text-[#3E100C]">
                              Alternativas da Lista de Seleção
                            </Label>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs text-emerald-700 hover:bg-emerald-50"
                              onClick={() => {
                                const current = perg.opcoes_lista || [];
                                handleUpdatePergunta(idx, "opcoes_lista", [
                                  ...current,
                                  `Opção ${current.length + 1}`,
                                ]);
                              }}
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              + Adicionar Opção
                            </Button>
                          </div>

                          <div className="space-y-2">
                            {(perg.opcoes_lista || []).map((opc, opcIdx) => (
                              <div key={opcIdx} className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground font-mono w-5">
                                   {opcIdx + 1}.
                                </span>
                                <Input
                                  value={opc}
                                  onChange={(e) => {
                                    const nextOpcoes = [...(perg.opcoes_lista || [])];
                                    nextOpcoes[opcIdx] = e.target.value;
                                    handleUpdatePergunta(idx, "opcoes_lista", nextOpcoes);
                                  }}
                                  placeholder={`Texto da alternativa ${opcIdx + 1}`}
                                  className="h-8 text-xs bg-background"
                                />
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 text-muted-foreground hover:text-red-600"
                                  onClick={() => {
                                    const nextOpcoes = (perg.opcoes_lista || []).filter(
                                      (_, i) => i !== opcIdx
                                    );
                                    handleUpdatePergunta(idx, "opcoes_lista", nextOpcoes);
                                  }}
                                  disabled={(perg.opcoes_lista || []).length <= 1}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

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
