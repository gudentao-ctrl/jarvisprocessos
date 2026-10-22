// src/components/fives/PortalColaboradorView.tsx
// Componente Principal do Portal do Colaborador 5S (Público e Integrado)

import React, { useState, useMemo } from "react";
import {
  Trophy,
  Award,
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
  QrCode,
  FileText,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Share2,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Eye,
  Filter,
  Flame,
  Info,
  Pencil,
  Trash2,
  Plus,
  Camera,
  CheckCheck,
  Clock,
} from "lucide-react";
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Tooltip,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

import type {
  FivesPortalData,
  FivesSetor,
  FivesMuralFoto,
  FivesInstrucaoTrabalho,
  FivesCronogramaProjeto,
  Senso5S,
} from "@/lib/fives-types";
import { NOMES_SENSOS } from "@/lib/fives-types";
import { saveFivesMuralFoto, deleteFivesMuralFoto, saveFivesCronogramaEtapa, deleteFivesCronogramaEtapa, formatFivesDate, isUuid } from "@/lib/fives-storage";
import { SectorQrModal } from "./SectorQrModal";

interface PortalColaboradorViewProps {
  portalData: FivesPortalData;
  isPublic?: boolean;
  onOpenAuditoria?: (setorId?: string) => void;
  selectedSectorIdFilter?: string | null;
}

export function PortalColaboradorView({
  portalData,
  isPublic = false,
  onOpenAuditoria,
  selectedSectorIdFilter,
}: PortalColaboradorViewProps) {
  const { config, company, setores, radarData, kpis, muralFotos, instrucoesTrabalho } = portalData;
  const cronogramaProjeto = portalData.cronogramaProjeto ?? [];

  // Setor selecionado na Central de ITs
  const [selectedSectorId, setSelectedSectorId] = useState<string>(
    selectedSectorIdFilter || setores[0]?.id || ""
  );

  // Modal QR Code
  const [qrModalSector, setQrModalSector] = useState<FivesSetor | null>(null);

  // Modal de Zoom de Foto Antes/Depois
  const [zoomMuralFoto, setZoomMuralFoto] = useState<FivesMuralFoto | null>(null);

  // Modal Editar Mural Foto
  const [editMuralFoto, setEditMuralFoto] = useState<FivesMuralFoto | null>(null);
  const [editFotoTitulo, setEditFotoTitulo] = useState("");
  const [editFotoDescricao, setEditFotoDescricao] = useState("");
  const [editFotoSetorId, setEditFotoSetorId] = useState("");
  const [editFotoAntes, setEditFotoAntes] = useState("");
  const [editFotoDepois, setEditFotoDepois] = useState("");
  const [savingMural, setSavingMural] = useState(false);

  // Modal Cronograma (editar etapa)
  const [editCronoEtapa, setEditCronoEtapa] = useState<FivesCronogramaProjeto | null>(null);
  const [cronoTitulo, setCronoTitulo] = useState("");
  const [cronoDtInicio, setCronoDtInicio] = useState("");
  const [cronoDtFim, setCronoDtFim] = useState("");
  const [cronoDtExecucao, setCronoDtExecucao] = useState("");
  const [cronoResponsavel, setCronoResponsavel] = useState("");
  const [cronoStatus, setCronoStatus] = useState<FivesCronogramaProjeto["status"]>("PENDENTE");
  const [savingCrono, setSavingCrono] = useState(false);

  const canEditPortal = !isPublic;

  const handleOpenEditMural = (foto: FivesMuralFoto) => {
    setEditMuralFoto(foto);
    setEditFotoTitulo(foto.titulo);
    setEditFotoDescricao(foto.descricao || "");
    setEditFotoSetorId(foto.setor_id || "");
    setEditFotoAntes(foto.foto_antes_url);
    setEditFotoDepois(foto.foto_depois_url);
  };

  const handleOpenNovoMural = () => {
    const defaultSectorId = selectedSectorId || (setores[0]?.id ?? "");
    const setorObj = setores.find((s) => s.id === defaultSectorId);
    const novaFoto: FivesMuralFoto = {
      id: crypto.randomUUID(),
      company_id: company.id,
      titulo: "",
      descricao: "",
      foto_antes_url: "",
      foto_depois_url: "",
      setor_id: defaultSectorId,
      setor_nome: setorObj?.nome_setor || "Geral",
      data_registro: new Date().toISOString().slice(0, 10),
    };
    setEditMuralFoto(novaFoto);
    setEditFotoTitulo("");
    setEditFotoDescricao("");
    setEditFotoSetorId(defaultSectorId);
    setEditFotoAntes("");
    setEditFotoDepois("");
  };

  const handleUploadMuralFoto = (
    setter: (val: string) => void,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("A foto excede o limite de 5MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setter(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSaveMural = async () => {
    if (!editMuralFoto) return;
    if (!editFotoTitulo.trim()) { toast.error("Informe o título da melhoria."); return; }
    if (!editFotoAntes.trim()) { toast.error("Forneça a foto do 'Antes'."); return; }
    if (!editFotoDepois.trim()) { toast.error("Forneça a foto do 'Depois'."); return; }

    const isNovo = !muralFotos.some((f) => f.id === editMuralFoto.id);
    const setorObj = setores.find((s) => s.id === editFotoSetorId);

    try {
      setSavingMural(true);
      await saveFivesMuralFoto({
        ...editMuralFoto,
        company_id: company.id,
        titulo: editFotoTitulo.trim(),
        descricao: editFotoDescricao.trim(),
        setor_id: editFotoSetorId || null,
        setor_nome: setorObj?.nome_setor || "Geral",
        foto_antes_url: editFotoAntes,
        foto_depois_url: editFotoDepois,
        data_registro: editMuralFoto.data_registro || new Date().toISOString().slice(0, 10),
      });
      toast.success(isNovo ? "Nova transformação adicionada ao mural com sucesso!" : "Registro do mural atualizado!");
      setEditMuralFoto(null);
    } catch (err: any) {
      toast.error("Erro ao salvar no mural: " + err?.message);
    } finally {
      setSavingMural(false);
    }
  };

  const handleDeleteMural = async (foto: FivesMuralFoto) => {
    if (!confirm("Excluir este registro do Mural Antes vs. Depois?")) return;
    try {
      await deleteFivesMuralFoto(foto.id, foto.company_id);
      toast.success("Foto removida do mural.");
    } catch (err: any) {
      toast.error("Erro ao excluir: " + err?.message);
    }
  };

  const handleOpenEditCrono = (etapa: FivesCronogramaProjeto) => {
    setEditCronoEtapa(etapa);
    setCronoTitulo(etapa.etapa_titulo);
    setCronoDtInicio(etapa.data_inicio || "");
    setCronoDtFim(etapa.data_fim || "");
    setCronoDtExecucao(etapa.data_execucao || "");
    setCronoResponsavel(etapa.responsavel || "");
    setCronoStatus(etapa.status);
  };

  const handleSaveCrono = async () => {
    if (!editCronoEtapa) return;
    try {
      setSavingCrono(true);
      await saveFivesCronogramaEtapa({
        ...editCronoEtapa,
        etapa_titulo: cronoTitulo.trim() || editCronoEtapa.etapa_titulo,
        data_inicio: cronoDtInicio || null,
        data_fim: cronoDtFim || null,
        data_execucao: cronoDtExecucao || null,
        responsavel: cronoResponsavel || null,
        status: cronoStatus,
        company_id: company.id,
      });
      toast.success("Etapa do cronograma atualizada!");
      setEditCronoEtapa(null);
    } catch (err: any) {
      toast.error("Erro ao salvar etapa: " + err?.message);
    } finally {
      setSavingCrono(false);
    }
  };

  // IT do Setor Atual
  const currentIT: FivesInstrucaoTrabalho | undefined = instrucoesTrabalho[selectedSectorId];
  const currentSetor = setores.find((s) => s.id === selectedSectorId);

  // Cores dinâmicas whitelabel
  const primaryColor = config.primary_color || "#3E100C";
  const secondaryColor = config.secondary_color || "#E05A10";
  const bgColor = config.bg_color || "#FFF8F5";

  // Formatação do link público dinâmico por empresa:
  // Usa SEMPRE o company.id se for UUID válido, garantindo unicidade por empresa
  // O link público usa o código aleatório da empresa, nunca o identificador interno.
  const portalHash = config.url_hash || "";
  const publicUrl = typeof window !== "undefined"
    ? `${window.location.origin}/p/5s/${portalHash}`
    : `https://jarvisprocessos.lovable.app/p/5s/${portalHash}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    toast.success("Link público do Portal 5S copiado com sucesso!");
  };

  // Cor do Big Number Nota Global
  const globalScore = kpis.notaMediaGlobal || 0;
  const globalScoreColor =
    globalScore >= 90 ? "text-emerald-600" : globalScore >= 80 ? "text-amber-500" : "text-rose-600";
  const globalScoreBadge =
    globalScore >= 90 ? "bg-emerald-50 text-emerald-700 border-emerald-200" : globalScore >= 80 ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-rose-50 text-rose-700 border-rose-200";

  return (
    <div
      className="min-h-screen space-y-8 pb-16 transition-colors duration-300"
      style={
        {
          "--company-primary": primaryColor,
          "--company-secondary": secondaryColor,
          "--company-bg": bgColor,
        } as React.CSSProperties
      }
    >
      {/* 1. HEADER WHITELABEL */}
      <header className="relative overflow-hidden rounded-2xl shadow-xl border bg-card">
        {/* Banner de Capa */}
        <div
          className="h-44 sm:h-52 w-full bg-gradient-to-r relative"
          style={{
            backgroundImage: config.header_banner_url
              ? `linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.75)), url(${config.header_banner_url})`
              : `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          {isPublic && (
            <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
              <Badge className="bg-black/60 text-white backdrop-blur-md border-white/20 px-3 py-1 text-xs">
                <Sparkles className="h-3 w-3 mr-1 text-amber-400" /> Portal Oficial 5S
              </Badge>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCopyLink}
                className="bg-white/90 hover:bg-white text-slate-800 text-xs shadow-md border-none h-7"
              >
                <Share2 className="h-3.5 w-3.5 mr-1" /> Compartilhar
              </Button>
            </div>
          )}

          {!isPublic && (
            <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={handleCopyLink}
                className="bg-white/90 hover:bg-white text-slate-800 text-xs shadow-md"
              >
                <Share2 className="h-3.5 w-3.5 mr-1" /> Copiar Link Público
              </Button>
              <a href={publicUrl} target="_blank" rel="noopener noreferrer">
                <Button size="sm" variant="outline" className="bg-white/20 hover:bg-white/30 text-white border-white/30 text-xs">
                  <ExternalLink className="h-3.5 w-3.5 mr-1" /> Abrir no Navegador
                </Button>
              </a>
            </div>
          )}
        </div>

        {/* Informações da Empresa & Slogan */}
        <div className="p-6 sm:p-8 pt-0 relative flex flex-col sm:flex-row items-center sm:items-end justify-between gap-4 -mt-16 sm:-mt-14">
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5 text-center sm:text-left">
            {/* Logo da Empresa */}
            <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl bg-white p-2 shadow-2xl border-4 border-background flex items-center justify-center overflow-hidden shrink-0">
              {config.logo_url || company.logo_url ? (
                <img
                  src={config.logo_url || company.logo_url || ""}
                  alt={company.name}
                  className="max-h-full max-w-full object-contain"
                />
              ) : (
                <div
                  className="w-full h-full rounded-xl flex items-center justify-center font-black text-2xl text-white shadow-inner"
                  style={{ backgroundColor: primaryColor }}
                >
                  {company.name.slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
                  {company.name}
                </h1>
                <Badge
                  variant="outline"
                  className="font-bold text-xs px-2.5 py-0.5 border-primary/30"
                  style={{ color: primaryColor, backgroundColor: `${primaryColor}10` }}
                >
                  Programa 5S Maia
                </Badge>
              </div>
              <p className="text-sm font-medium text-muted-foreground italic max-w-xl">
                "{config.slogan_campanha || "Cuidar do nosso espaço de trabalho é valorizar as pessoas e a excelência operacional."}"
              </p>
            </div>
          </div>

          {/* Botão de Nova Auditoria (se não for público) */}
          {!isPublic && onOpenAuditoria && (
            <div className="mt-2 sm:mt-0">
              <Button
                onClick={() => onOpenAuditoria()}
                className="shadow-lg text-white font-bold px-6 h-11"
                style={{ backgroundColor: secondaryColor }}
              >
                <Sparkles className="h-4 w-4 mr-2" /> Realizar Nova Auditoria
              </Button>
            </div>
          )}
        </div>
      </header>

      {/* 2. CARDS DE KPIS VISUAIS (BIG NUMBERS) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Setor Campeão */}
        <Card className="border shadow-sm hover:shadow-md transition-shadow relative overflow-hidden bg-gradient-to-br from-amber-500/10 via-background to-background">
          <div className="absolute top-0 right-0 p-3 opacity-15">
            <Trophy className="h-20 w-20 text-amber-500" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5 font-semibold text-xs uppercase tracking-wider text-amber-600">
              <Trophy className="h-4 w-4 text-amber-500" /> Setor Campeão 5S
            </CardDescription>
            <CardTitle className="text-xl font-bold truncate">
              {kpis.setorCampeao?.nome_setor || "Em apuração"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-black text-amber-600">
                {kpis.setorCampeao?.ultima_nota ? `${kpis.setorCampeao.ultima_nota.toFixed(1)}%` : "--"}
              </span>
              <Badge className="bg-amber-100 text-amber-800 border-amber-300 font-bold">
                <Sparkles className="h-3 w-3 mr-1 text-amber-600" /> Selo Ouro
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">
              Guardião: <strong className="text-foreground">{kpis.setorCampeao?.guardiao_nome || "Comitê"}</strong>
            </p>
          </CardContent>
        </Card>

        {/* Nota Média Global */}
        <Card className="border shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
          <CardHeader className="pb-2">
            <CardDescription className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">
              Média Global da Empresa
            </CardDescription>
            <CardTitle className="text-xl font-bold">Índice Geral de 5S</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              <span className={`text-3xl font-black ${globalScoreColor}`}>
                {globalScore.toFixed(1)}%
              </span>
              <Badge variant="outline" className={`font-bold ${globalScoreBadge}`}>
                {globalScore >= 90 ? "Excelente (Ouro)" : globalScore >= 80 ? "Bom (Prata)" : "Atenção"}
              </Badge>
            </div>
            <Progress
              value={globalScore}
              className="h-2 mt-3"
            />
          </CardContent>
        </Card>

        {/* Senso do Mês */}
        <Card className="border shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
          <CardHeader className="pb-2">
            <CardDescription className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">
              Foco & Engajamento
            </CardDescription>
            <CardTitle className="text-xl font-bold truncate">
              Senso em Destaque
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm"
                style={{ backgroundColor: secondaryColor }}
              >
                <Flame className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="text-lg font-black truncate text-foreground">
                  {kpis.sensoDestaqueMes}
                </div>
                <p className="text-[11px] text-muted-foreground truncate">
                  Campanha mensal ativa em todos os setores
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quarentena & Planos de Ação */}
        <Card className="border shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
          <CardHeader className="pb-2">
            <CardDescription className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">
              Ações & Cartões Vermelhos
            </CardDescription>
            <CardTitle className="text-xl font-bold">Controle Operacional</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="bg-muted/40 p-2 rounded-lg border">
                <span className="block text-2xl font-black text-rose-600">
                  {kpis.totalDescartes}
                </span>
                <span className="text-[10px] uppercase font-bold text-muted-foreground">
                  Cartão Vermelho
                </span>
              </div>
              <div className="bg-muted/40 p-2 rounded-lg border">
                <span className="block text-2xl font-black text-primary">
                  {kpis.totalPlanosAcao}
                </span>
                <span className="text-[10px] uppercase font-bold text-muted-foreground">
                  Planos de Ação
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* 3. GRÁFICO DE TEIA / RADAR + LEADERBOARD GAMIFICADO */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Gráfico Radar (5 Colunas no Desktop) */}
        <Card className="lg:col-span-5 border shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5" style={{ color: secondaryColor }} />
                  Radar Geral dos 5 Sensos
                </CardTitle>
                <CardDescription>
                  Desempenho consolidado nos 5 pilares metodológicos
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="h-72 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} outerRadius="75%">
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis
                    dataKey="nome"
                    tick={{ fill: "#4b5563", fontSize: 12, fontWeight: 600 }}
                  />
                  <PolarRadiusAxis
                    angle={90}
                    domain={[0, 100]}
                    tick={{ fill: "#9ca3af", fontSize: 10 }}
                  />
                  <Radar
                    name="Média Atual"
                    dataKey="score"
                    stroke={primaryColor}
                    fill={secondaryColor}
                    fillOpacity={0.45}
                  />
                  <Tooltip
                    formatter={(value: any) => [`${Number(value).toFixed(1)}%`, "Conformidade"]}
                    contentStyle={{
                      backgroundColor: "#FFFFFF",
                      borderRadius: "8px",
                      border: "1px solid #e2e8f0",
                      fontSize: "12px",
                      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                    }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* Legenda Resumida dos Sensos */}
            <div className="grid grid-cols-5 gap-1 pt-3 border-t text-center">
              {radarData.map((d) => (
                <div key={d.senso} className="p-1 rounded bg-muted/30">
                  <span className="block text-[10px] font-bold text-muted-foreground truncate">
                    {d.senso}
                  </span>
                  <span className="text-xs font-black" style={{ color: primaryColor }}>
                    {d.score.toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Leaderboard Gamificado dos Setores (7 Colunas no Desktop) */}
        <Card className="lg:col-span-7 border shadow-sm">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-500" />
                Ranking Oficial dos Setores (Leaderboard)
              </CardTitle>
              <CardDescription>
                Gamificação contínua e distribuição de selos de conformidade
              </CardDescription>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300">
                Ouro &ge; 90%
              </Badge>
              <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-300">
                Prata &ge; 80%
              </Badge>
              <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-300">
                &lt; 80%
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {setores.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                Nenhum setor cadastrado até o momento.
              </div>
            ) : (
              setores.map((setor, idx) => {
                const nota = setor.ultima_nota ?? 0;
                const isPrimeiro = idx === 0;
                const isSegundo = idx === 1;
                const isTerceiro = idx === 2;

                return (
                  <div
                    key={setor.id}
                    className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                      isPrimeiro
                        ? "bg-amber-500/10 border-amber-300 shadow-sm"
                        : "bg-card hover:bg-muted/30 border-border"
                    }`}
                  >
                    {/* Posição e Nome */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0 shadow-sm ${
                          isPrimeiro
                            ? "bg-amber-500 text-white"
                            : isSegundo
                            ? "bg-slate-400 text-white"
                            : isTerceiro
                            ? "bg-amber-700 text-white"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {idx + 1}º
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm truncate text-foreground">
                            {setor.nome_setor}
                          </h4>
                          {setor.selo === "Ouro" && (
                            <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[10px] py-0 px-1.5 font-bold">
                              Ouro
                            </Badge>
                          )}
                          {setor.selo === "Prata" && (
                            <Badge className="bg-slate-100 text-slate-800 border-slate-300 text-[10px] py-0 px-1.5 font-bold">
                              Prata
                            </Badge>
                          )}
                          {setor.selo === "Atencao" && (
                            <Badge className="bg-rose-100 text-rose-800 border-rose-300 text-[10px] py-0 px-1.5 font-bold">
                              Atenção
                            </Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate">
                          Guardião: {setor.guardiao_nome || "Comitê"} | Meta: {setor.meta_nota}%
                        </p>
                      </div>
                    </div>

                    {/* Barra de Progresso e Nota */}
                    <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                      <div className="w-28 sm:w-32 hidden md:block">
                        <Progress value={nota} className="h-2" />
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <span className="text-base font-black text-foreground">
                            {nota > 0 ? `${nota.toFixed(1)}%` : "Pendente"}
                          </span>
                        </div>

                        {/* Indicador de Tendência */}
                        <div className="w-6 flex justify-center">
                          {setor.tendencia === "up" && (
                            <TrendingUp className="h-4 w-4 text-emerald-600" />
                          )}
                          {setor.tendencia === "down" && (
                            <TrendingDown className="h-4 w-4 text-rose-600" />
                          )}
                          {setor.tendencia === "stable" && (
                            <Minus className="h-4 w-4 text-slate-400" />
                          )}
                        </div>

                        {/* Botão para ver IT do setor */}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSelectedSectorId(setor.id);
                            const el = document.getElementById("central-its-section");
                            if (el) el.scrollIntoView({ behavior: "smooth" });
                          }}
                          className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                          title="Ver IT de Limpeza do Setor"
                        >
                          IT <ChevronRight className="h-3 w-3 ml-0.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </section>

      {/* 4. MURAL "ANTES VS. DEPOIS" */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" />
              Mural "Antes vs. Depois" — Transformações Visuais
            </h2>
            <p className="text-xs text-muted-foreground">
              Evidências visuais de evolução prática e superação dos setores na implantação dos 5 Sensos.
            </p>
          </div>

          {canEditPortal && (
            <Button
              onClick={handleOpenNovoMural}
              size="sm"
              className="font-bold text-xs shadow-md gap-1.5 shrink-0 text-white"
              style={{ backgroundColor: secondaryColor }}
            >
              <Plus className="h-4 w-4" /> + Nova Transformação (Antes e Depois)
            </Button>
          )}
        </div>

        {muralFotos.length === 0 ? (
          <Card className="p-8 text-center border-dashed space-y-3">
            <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
              <Camera className="h-6 w-6" />
            </div>
            <p className="text-sm font-semibold text-muted-foreground">
              Nenhuma transformação cadastrada no mural ainda.
            </p>
            {canEditPortal && (
              <Button
                size="sm"
                onClick={handleOpenNovoMural}
                className="font-bold text-xs gap-1.5 text-white"
                style={{ backgroundColor: secondaryColor }}
              >
                <Plus className="h-4 w-4" /> Cadastrar Primeira Transformação
              </Button>
            )}
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {muralFotos.map((foto) => (
              <Card
                key={foto.id}
                className="overflow-hidden border shadow-sm hover:shadow-md transition-shadow group cursor-pointer"
                onClick={() => setZoomMuralFoto(foto)}
              >
                <div className="grid grid-cols-2 h-48 bg-muted relative">
                  {/* Foto Antes */}
                  <div className="relative border-r overflow-hidden">
                    <img
                      src={foto.foto_antes_url}
                      alt={`Antes - ${foto.titulo}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <Badge className="absolute top-2 left-2 bg-rose-600/90 text-white text-[10px] font-bold border-none">
                      ANTES
                    </Badge>
                  </div>

                  {/* Foto Depois */}
                  <div className="relative overflow-hidden">
                    <img
                      src={foto.foto_depois_url}
                      alt={`Depois - ${foto.titulo}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <Badge className="absolute top-2 right-2 bg-emerald-600/90 text-white text-[10px] font-bold border-none">
                      DEPOIS
                    </Badge>
                  </div>
                </div>

                <CardContent className="p-4">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span className="font-semibold" style={{ color: primaryColor }}>
                      {foto.setor_nome || "Setor Geral"}
                    </span>
                    <span>{foto.data_registro || "Recente"}</span>
                  </div>
                  <h3 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">
                    {foto.titulo}
                  </h3>
                  {foto.descricao && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {foto.descricao}
                    </p>
                  )}
                  <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground pt-2 border-t">
                    <span className="flex items-center gap-1">
                      <Eye className="h-3 w-3" /> Clique para ampliar
                    </span>
                    {canEditPortal ? (
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenEditMural(foto)}
                          className="h-6 text-[10px] px-2 gap-1 rounded-md"
                        >
                          <Pencil className="h-3 w-3" /> Editar
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteMural(foto)}
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-rose-600"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <Sparkles className="h-3 w-3 text-amber-500" />
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* 5. CENTRAL DE ITS & PADRÕES DE LIMPEZA POR SETOR */}
      <section id="central-its-section" className="space-y-4 pt-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <FileText className="h-5 w-5" style={{ color: secondaryColor }} />
              Central de ITs & Padrões de Limpeza por Setor
            </h2>
            <p className="text-xs text-muted-foreground">
              Consulte o Padrão Ouro do local e as rotinas diárias, semanais e mensais de organização e asseio.
            </p>
          </div>

          {currentSetor && (
            <Button
              variant="outline"
              onClick={() => setQrModalSector(currentSetor)}
              className="border-primary/40 text-primary font-bold shadow-sm"
            >
              <QrCode className="h-4 w-4 mr-2" /> Gerar QR Code do Setor
            </Button>
          )}
        </div>

        {/* Seletor de Setor */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap flex items-center gap-1">
            <Filter className="h-3.5 w-3.5" /> Filtrar Setor:
          </span>
          {setores.map((s) => (
            <Button
              key={s.id}
              size="sm"
              variant={selectedSectorId === s.id ? "default" : "outline"}
              onClick={() => setSelectedSectorId(s.id)}
              className={`rounded-full text-xs font-semibold shrink-0 ${
                selectedSectorId === s.id
                  ? "text-white shadow-sm"
                  : "hover:bg-muted text-muted-foreground"
              }`}
              style={
                selectedSectorId === s.id
                  ? { backgroundColor: primaryColor, borderColor: primaryColor }
                  : {}
              }
            >
              {s.nome_setor}
            </Button>
          ))}
        </div>

        {/* Detalhes da IT e Padrão Ouro */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Card do Padrão Ouro (Estado Ideal) */}
          <Card className="lg:col-span-5 border shadow-sm overflow-hidden flex flex-col justify-between">
            <CardHeader className="pb-3 bg-muted/20 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  Padrão Ouro (Estado Ideal)
                </CardTitle>
                <Badge variant="outline" className="text-[10px] font-bold border-amber-300 text-amber-700 bg-amber-50">
                  Referência Visual
                </Badge>
              </div>
              <CardDescription>
                Fotografia oficial do setor no seu melhor estado de conservação
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="w-full h-56 rounded-xl overflow-hidden bg-muted border relative shadow-inner flex items-center justify-center">
                {currentIT?.foto_padrao_ouro_url ? (
                  <img
                    src={currentIT.foto_padrao_ouro_url}
                    alt={`Padrão Ouro - ${currentSetor?.nome_setor}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center p-6 space-y-2">
                    <Sparkles className="h-10 w-10 text-amber-500/50 mx-auto" />
                    <p className="text-xs text-muted-foreground">
                      Foto do Padrão Ouro ainda não cadastrada para este setor.
                    </p>
                  </div>
                )}
              </div>

              <div className="bg-muted/30 p-3 rounded-lg border text-xs space-y-1">
                <div className="font-bold text-foreground">
                  Título da Instrução: {currentIT?.titulo || `IT 5S - ${currentSetor?.nome_setor}`}
                </div>
                <div className="text-muted-foreground">
                  Guardião Responsável: <strong>{currentSetor?.guardiao_nome || "Comitê 5S"}</strong>
                </div>
                <div className="text-muted-foreground">
                  Meta de Conformidade: <strong>{currentSetor?.meta_nota}%</strong>
                </div>
              </div>

              {currentIT?.documento_url && (
                <a
                  href={currentIT.documento_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-block"
                >
                  <Button variant="outline" className="w-full text-xs font-semibold">
                    <FileText className="h-3.5 w-3.5 mr-2" /> Abrir PDF Oficial da IT
                  </Button>
                </a>
              )}
            </CardContent>
          </Card>

          {/* Tabela de Rotina de Limpeza */}
          <Card className="lg:col-span-7 border shadow-sm">
            <CardHeader className="pb-3 border-b bg-muted/20 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  Tabela de Rotina de Limpeza & Conservação
                </CardTitle>
                <CardDescription>
                  Passo a passo operacional, produtos e periodicidades exigidas
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {(!currentIT || !currentIT.rotina_limpeza || currentIT.rotina_limpeza.length === 0) ? (
                <div className="p-8 text-center text-muted-foreground text-xs">
                  Nenhuma rotina cadastrada para este setor ainda.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b bg-muted/40 font-semibold text-muted-foreground">
                        <th className="p-3">Item / Local</th>
                        <th className="p-3">Procedimento</th>
                        <th className="p-3">Produto / EPI</th>
                        <th className="p-3">Frequência</th>
                        <th className="p-3">Responsável</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {currentIT.rotina_limpeza.map((item) => (
                        <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                          <td className="p-3 font-bold text-foreground">
                            {item.item_local}
                          </td>
                          <td className="p-3 text-muted-foreground max-w-xs">
                            {item.procedimento}
                          </td>
                          <td className="p-3 text-muted-foreground">
                            <span className="px-2 py-0.5 rounded bg-muted font-mono text-[11px]">
                              {item.produto_epi}
                            </span>
                          </td>
                          <td className="p-3">
                            <Badge
                              variant="outline"
                              className={`text-[10px] font-bold ${
                                item.frequencia === "Diária"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : item.frequencia === "Semanal"
                                  ? "bg-sky-50 text-sky-700 border-sky-200"
                                  : "bg-purple-50 text-purple-700 border-purple-200"
                              }`}
                            >
                              {item.frequencia}
                            </Badge>
                          </td>
                          <td className="p-3 font-medium text-foreground">
                            {item.responsavel}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* 6. CRONOGRAMA DA IMPLANTAÇÃO 5S (ROADMAP DO PROJETO) */}
      <section className="space-y-4 pt-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Cronograma da Campanha 5S & Roadmap
            </h2>
            <p className="text-xs text-muted-foreground">
              Acompanhamento do ciclo de implantação, marcos do projeto, Dia D e rodadas de auditorias contínuas.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {cronogramaProjeto.map((etapa, idx) => {
            const isConcluido = etapa.status === "CONCLUIDO";
            const isEmAndamento = etapa.status === "EM_ANDAMENTO";

            return (
              <Card
                key={etapa.id}
                className={`p-4 border transition-all ${
                  isConcluido
                    ? "border-emerald-300 bg-emerald-50/20 dark:border-emerald-800/40"
                    : isEmAndamento
                    ? "border-orange-400 bg-orange-50/20 shadow-sm dark:border-orange-700/50"
                    : "border-muted bg-card opacity-85"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 ${
                        isConcluido
                          ? "bg-emerald-600 text-white"
                          : isEmAndamento
                          ? "text-white"
                          : "bg-muted text-muted-foreground"
                      }`}
                      style={isEmAndamento ? { backgroundColor: secondaryColor } : undefined}
                    >
                      {isConcluido ? <CheckCheck className="h-4 w-4" /> : `#${etapa.ordem || idx + 1}`}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-sm text-foreground">
                          {etapa.etapa_titulo}
                        </h4>
                        {isEmAndamento && (
                          <Badge
                            className="text-[10px] font-black px-2.5 py-0.5 animate-pulse flex items-center gap-1 shadow-sm text-white"
                            style={{ backgroundColor: secondaryColor }}
                          >
                            <Flame className="h-3 w-3 fill-current" />
                            EM EXECUÇÃO
                          </Badge>
                        )}
                        <Badge
                          className={`text-[10px] font-bold ${
                            isConcluido
                              ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                              : isEmAndamento
                              ? "bg-orange-100 text-orange-800 border-orange-300"
                              : "bg-slate-100 text-slate-700 border-slate-300"
                          }`}
                        >
                          {isConcluido ? "Concluído" : isEmAndamento ? "Fase Ativa" : "Pendente"}
                        </Badge>
                      </div>

                      {etapa.descricao && (
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {etapa.descricao}
                        </p>
                      )}

                      <div className="flex items-center gap-4 text-[11px] text-muted-foreground flex-wrap pt-0.5">
                        {etapa.responsavel && (
                          <span>
                            Responsável: <strong>{etapa.responsavel}</strong>
                          </span>
                        )}
                        {(etapa.data_inicio || etapa.data_fim) && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {etapa.data_inicio ? `Início: ${formatFivesDate(etapa.data_inicio)}` : ""}
                            {etapa.data_fim ? ` • Prazo: ${formatFivesDate(etapa.data_fim)}` : ""}
                          </span>
                        )}
                        {etapa.data_execucao && (
                          <span className="flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                            Data de Execução: <strong>{formatFivesDate(etapa.data_execucao)}</strong>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {canEditPortal && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenEditCrono(etapa)}
                      className="text-xs font-semibold gap-1 shrink-0 self-end sm:self-center"
                    >
                      <Pencil className="h-3 w-3" /> Editar Etapa
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Modal QR Code do Setor */}
      <SectorQrModal
        isOpen={!!qrModalSector}
        onClose={() => setQrModalSector(null)}
        setor={qrModalSector}
        config={config}
        companyName={company.name}
      />

      {/* Modal de Zoom da Foto do Mural */}
      {zoomMuralFoto && (
        <Dialog open={!!zoomMuralFoto} onOpenChange={() => setZoomMuralFoto(null)}>
          <DialogContent className="max-w-4xl w-full bg-background p-6 rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold flex items-center justify-between">
                <span>{zoomMuralFoto.titulo}</span>
                <Badge variant="outline" style={{ color: primaryColor }}>
                  {zoomMuralFoto.setor_nome || "Setor Geral"}
                </Badge>
              </DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="space-y-2">
                <Badge className="bg-rose-600 text-white font-bold text-xs">ANTES DA TRANSFORMAÇÃO</Badge>
                <div className="h-80 rounded-xl overflow-hidden border bg-muted">
                  <img
                    src={zoomMuralFoto.foto_antes_url}
                    alt="Antes"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Badge className="bg-emerald-600 text-white font-bold text-xs">DEPOIS DA TRANSFORMAÇÃO</Badge>
                <div className="h-80 rounded-xl overflow-hidden border bg-muted">
                  <img
                    src={zoomMuralFoto.foto_depois_url}
                    alt="Depois"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>
            {zoomMuralFoto.descricao && (
              <p className="text-sm text-muted-foreground mt-4 p-3 bg-muted/30 rounded-xl border">
                {zoomMuralFoto.descricao}
              </p>
            )}
          </DialogContent>
        </Dialog>
      )}

      {/* Modal Adicionar / Editar Antes e Depois */}
      {editMuralFoto && (
        <Dialog open={!!editMuralFoto} onOpenChange={() => setEditMuralFoto(null)}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-bold">
                {muralFotos.some((f) => f.id === editMuralFoto.id) ? (
                  <>
                    <Pencil className="h-4 w-4 text-primary" />
                    Editar Transformação "Antes vs. Depois"
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 text-primary" />
                    Nova Transformação "Antes vs. Depois"
                  </>
                )}
              </DialogTitle>
              <DialogDescription className="text-xs">
                {muralFotos.some((f) => f.id === editMuralFoto.id)
                  ? "Atualize o título, a descrição e as evidências fotográficas deste setor."
                  : "Registre a evolução prática do ambiente com fotos do estado inicial (Antes) e do resultado obtido (Depois)."}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2">
              <div className="space-y-1">
                <Label htmlFor="mural-titulo" className="text-xs font-semibold">Título do Ajuste / Transformação *</Label>
                <Input
                  id="mural-titulo"
                  placeholder="Ex: Organização e demarcação da bancada de ferramentas"
                  value={editFotoTitulo}
                  onChange={(e) => setEditFotoTitulo(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="mural-setor" className="text-xs font-semibold">Setor / Zona Vinculada</Label>
                <select
                  id="mural-setor"
                  value={editFotoSetorId}
                  onChange={(e) => setEditFotoSetorId(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs"
                >
                  <option value="">Geral / Toda a Empresa</option>
                  {setores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nome_setor}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="mural-desc" className="text-xs font-semibold">Descrição da Melhoria (Opcional)</Label>
                <Textarea
                  id="mural-desc"
                  rows={2}
                  placeholder="Descreva o que foi eliminado, reorganizado ou padronizado..."
                  value={editFotoDescricao}
                  onChange={(e) => setEditFotoDescricao(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                {/* Foto do Antes */}
                <div className="space-y-2 p-3 rounded-xl border border-rose-200 bg-rose-50/20">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-rose-700 flex items-center gap-1.5">
                      <Camera className="h-3.5 w-3.5" /> Foto do ANTES *
                    </Label>
                    {editFotoAntes && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditFotoAntes("")}
                        className="h-5 text-[10px] text-rose-600 hover:text-rose-700 p-0"
                      >
                        Trocar Foto
                      </Button>
                    )}
                  </div>

                  {editFotoAntes ? (
                    <div className="relative h-28 w-full rounded-lg overflow-hidden border">
                      <img src={editFotoAntes} alt="Preview Antes" className="h-full w-full object-cover" />
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleUploadMuralFoto(setEditFotoAntes, e)}
                        className="text-[11px] cursor-pointer h-8"
                      />
                      <Input
                        placeholder="Ou cole a URL da imagem..."
                        value={editFotoAntes}
                        onChange={(e) => setEditFotoAntes(e.target.value)}
                        className="text-xs h-7"
                      />
                    </div>
                  )}
                </div>

                {/* Foto do Depois */}
                <div className="space-y-2 p-3 rounded-xl border border-emerald-200 bg-emerald-50/20">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-emerald-700 flex items-center gap-1.5">
                      <Camera className="h-3.5 w-3.5" /> Foto do DEPOIS *
                    </Label>
                    {editFotoDepois && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditFotoDepois("")}
                        className="h-5 text-[10px] text-emerald-600 hover:text-emerald-700 p-0"
                      >
                        Trocar Foto
                      </Button>
                    )}
                  </div>

                  {editFotoDepois ? (
                    <div className="relative h-28 w-full rounded-lg overflow-hidden border">
                      <img src={editFotoDepois} alt="Preview Depois" className="h-full w-full object-cover" />
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleUploadMuralFoto(setEditFotoDepois, e)}
                        className="text-[11px] cursor-pointer h-8"
                      />
                      <Input
                        placeholder="Ou cole a URL da imagem..."
                        value={editFotoDepois}
                        onChange={(e) => setEditFotoDepois(e.target.value)}
                        className="text-xs h-7"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setEditMuralFoto(null)} className="text-xs">
                Cancelar
              </Button>
              <Button size="sm" onClick={handleSaveMural} disabled={savingMural} className="text-xs font-bold">
                {savingMural ? "Salvando..." : muralFotos.some((f) => f.id === editMuralFoto.id) ? "Salvar Alterações" : "Publicar no Mural"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal Editar Cronograma */}
      {editCronoEtapa && (
        <Dialog open={!!editCronoEtapa} onOpenChange={() => setEditCronoEtapa(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-bold">
                <Calendar className="h-4 w-4 text-primary" />
                Editar Etapa do Cronograma 5S
              </DialogTitle>
              <DialogDescription className="text-xs">
                Atualize o status, o responsável e as datas de início e conclusão desta fase do projeto.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2">
              <div className="space-y-1">
                <Label htmlFor="crono-titulo" className="text-xs font-semibold">Título da Etapa</Label>
                <Input
                  id="crono-titulo"
                  value={cronoTitulo}
                  onChange={(e) => setCronoTitulo(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="crono-resp" className="text-xs font-semibold">Responsável</Label>
                <Input
                  id="crono-resp"
                  value={cronoResponsavel}
                  onChange={(e) => setCronoResponsavel(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="crono-dt-ini" className="text-xs font-semibold">Data Início</Label>
                  <Input
                    id="crono-dt-ini"
                    type="date"
                    value={cronoDtInicio}
                    onChange={(e) => setCronoDtInicio(e.target.value)}
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="crono-dt-fim" className="text-xs font-semibold">Data Fim / Prazo</Label>
                  <Input
                    id="crono-dt-fim"
                    type="date"
                    value={cronoDtFim}
                    onChange={(e) => setCronoDtFim(e.target.value)}
                    className="text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="crono-dt-exec" className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Data de Execução / Realização
                </Label>
                <Input
                  id="crono-dt-exec"
                  type="date"
                  value={cronoDtExecucao}
                  onChange={(e) => setCronoDtExecucao(e.target.value)}
                  className="text-xs border-emerald-300 bg-emerald-50/20"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="crono-status" className="text-xs font-semibold">Status Atual</Label>
                <select
                  id="crono-status"
                  value={cronoStatus}
                  onChange={(e) => setCronoStatus(e.target.value as any)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs"
                >
                  <option value="PENDENTE">Pendente</option>
                  <option value="EM_ANDAMENTO">Em Execução (Etapa Atual do Projeto)</option>
                  <option value="CONCLUIDO">Concluído</option>
                </select>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditCronoEtapa(null)} className="text-xs">
                Cancelar
              </Button>
              <Button size="sm" onClick={handleSaveCrono} disabled={savingCrono} className="text-xs font-bold">
                {savingCrono ? "Salvando..." : "Salvar Etapa"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}