// src/components/fives/PortalColaboradorView.tsx
// Componente Principal do Portal do Colaborador 5S (Público e Integrado)

import { compressImageFile } from "@/lib/image-compress";
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
import { ITEditorDialog } from "./ITEditorDialog";
import fivesBanner from "@/assets/fives-banner.jpg";

interface PortalColaboradorViewProps {
  portalData: FivesPortalData;
  isPublic?: boolean;
  canEdit?: boolean;
  onRefresh?: () => void;
  onOpenAuditoria?: (setorId?: string) => void;
  selectedSectorIdFilter?: string | null;
}

export function PortalColaboradorView({
  portalData,
  isPublic = false,
  canEdit = false,
  onRefresh,
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
    compressImageFile(file)
      .then(setter)
      .catch((err: Error) => toast.error(err.message));
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

  // IT do Setor Atual (cai no primeiro setor quando a seleção ainda não existe)
  const currentSetor = setores.find((s) => s.id === selectedSectorId) ?? setores[0];
  const currentIT: FivesInstrucaoTrabalho | undefined = currentSetor ? instrucoesTrabalho[currentSetor.id] : undefined;
  const canEditIT = !isPublic && canEdit;
  const [itEditorOpen, setItEditorOpen] = useState(false);
  const [itNovoSetor, setItNovoSetor] = useState(false);
  const openITEditor = (novoSetor = false) => { setItNovoSetor(novoSetor || !currentSetor); setItEditorOpen(true); };

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

  const handleShare = async () => {
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({ title: `Portal 5S · ${company.name}`, url: publicUrl });
        return;
      } catch {
        // usuário cancelou ou o navegador recusou; cai na cópia do link
      }
    }
    handleCopyLink();
  };

  // Cor do Big Number Nota Global
  const globalScore = kpis.notaMediaGlobal || 0;
  const hasAuditorias = (kpis.totalAuditorias || 0) > 0;
  const isImageSrc = (v?: string | null) => !!v && /^(https:\/\/|data:image\/)/i.test(v);
  const logoSrc = [config.logo_url, company.logo_url].find(isImageSrc) || null;
  const bannerSrc = isImageSrc(config.header_banner_url) ? (config.header_banner_url as string) : fivesBanner;
  const globalScoreColor =
    globalScore >= 90 ? "text-emerald-600" : globalScore >= 80 ? "text-amber-500" : "text-rose-600";
  const globalScoreBadge =
    globalScore >= 90 ? "bg-emerald-50 text-emerald-700 border-emerald-200" : globalScore >= 80 ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-rose-50 text-rose-700 border-rose-200";

  const quickNav = [
    { id: "visao-geral", label: "Visão geral" },
    { id: "ranking", label: "Ranking" },
    { id: "mural", label: "Antes e Depois" },
    { id: "central-its-section", label: "Padrões" },
    { id: "cronograma", label: "Cronograma" },
  ];
  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div
      className="min-h-screen space-y-6 sm:space-y-8 pb-16 transition-colors duration-300"
      style={
        {
          "--company-primary": primaryColor,
          "--company-secondary": secondaryColor,
          "--company-bg": bgColor,
        } as React.CSSProperties
      }
    >
      {/* 1. HEADER WHITELABEL */}
      <header className="relative overflow-hidden rounded-3xl shadow-xl border bg-card">
        {/* Banner de Capa com nome da empresa sobreposto */}
        <div
          className="relative h-60 sm:h-72 w-full"
          style={{
            backgroundImage: `url(${bannerSrc})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/25" />

          <div className="absolute top-3 inset-x-3 sm:top-4 sm:inset-x-5 z-10 flex items-center justify-between gap-2">
            <Badge className="bg-black/50 text-white backdrop-blur-md border-white/20 px-2.5 py-1 text-[11px] font-semibold hover:bg-black/50">
              <Sparkles className="h-3 w-3 mr-1 text-amber-400" /> Portal Oficial 5S
            </Badge>
            {isPublic ? (
              <Button
                size="sm"
                onClick={handleShare}
                className="h-8 rounded-full bg-white/90 hover:bg-white text-slate-900 text-xs font-semibold shadow-md border-none"
              >
                <Share2 className="h-3.5 w-3.5 mr-1" /> Compartilhar
              </Button>
            ) : (
              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  onClick={handleCopyLink}
                  className="h-8 rounded-full bg-white/90 hover:bg-white text-slate-900 text-xs font-semibold shadow-md border-none"
                >
                  <Share2 className="h-3.5 w-3.5 sm:mr-1" /> <span className="hidden sm:inline">Copiar link público</span><span className="sm:hidden">Link</span>
                </Button>
                <a href={publicUrl} target="_blank" rel="noopener noreferrer">
                  <Button size="sm" variant="outline" className="h-8 rounded-full bg-white/15 hover:bg-white/25 text-white border-white/30 text-xs backdrop-blur-md">
                    <ExternalLink className="h-3.5 w-3.5 sm:mr-1" /> <span className="hidden sm:inline">Abrir no navegador</span><span className="sm:hidden">Abrir</span>
                  </Button>
                </a>
              </div>
            )}
          </div>

          <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6 flex items-end gap-3 sm:gap-5">
            <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-2xl bg-white p-1.5 shadow-2xl ring-2 ring-white/70 flex items-center justify-center overflow-hidden shrink-0">
              {logoSrc ? (
                <img src={logoSrc} alt={company.name} className="max-h-full max-w-full object-contain" />
              ) : (
                <div
                  className="w-full h-full rounded-xl flex items-center justify-center font-black text-xl sm:text-3xl text-white"
                  style={{ backgroundColor: primaryColor }}
                >
                  {company.name.slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>
            <div className="min-w-0 pb-0.5">
              <span
                className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm"
                style={{ backgroundColor: secondaryColor }}
              >
                Programa 5S Maia
              </span>
              <h1 className="mt-1.5 text-2xl sm:text-4xl font-black tracking-tight text-white leading-tight drop-shadow-md line-clamp-2">
                {company.name}
              </h1>
            </div>
          </div>
        </div>

        {/* Slogan + ação principal */}
        <div className="px-4 py-3.5 sm:px-6 sm:py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground italic leading-snug border-l-4 pl-3" style={{ borderColor: secondaryColor }}>
            {config.slogan_campanha || "Cuidar do nosso espaço de trabalho é valorizar as pessoas e a excelência operacional."}
          </p>
          {!isPublic && onOpenAuditoria && (
            <Button
              onClick={() => onOpenAuditoria()}
              className="shadow-lg text-white font-bold px-6 h-11 w-full sm:w-auto shrink-0"
              style={{ backgroundColor: secondaryColor }}
            >
              <Sparkles className="h-4 w-4 mr-2" /> Realizar nova auditoria
            </Button>
          )}
        </div>
      </header>

      {/* Navegação rápida entre as seções (celular) */}
      {isPublic && (
        <nav className="sm:hidden sticky top-0 z-30 -mx-3 px-3 py-2 bg-background/95 backdrop-blur-md border-b shadow-sm">
          <div className="flex gap-2 overflow-x-auto scrollbar-none">
            {quickNav.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => scrollToSection(item.id)}
                className="shrink-0 rounded-full border bg-card px-3.5 py-1.5 text-xs font-semibold text-foreground shadow-sm active:scale-95 transition"
              >
                {item.label}
              </button>
            ))}
          </div>
        </nav>
      )}

      {/* 2. CARDS DE KPIS VISUAIS (BIG NUMBERS) */}
      <section id="visao-geral" className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 scroll-mt-16">
        {/* Índice Geral (destaque) */}
        <Card className="col-span-2 lg:col-span-1 p-4 rounded-2xl border shadow-sm flex items-center gap-4">
          <ScoreRing value={globalScore} active={hasAuditorias} className={globalScoreColor} />
          <div className="min-w-0 space-y-1.5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Índice Geral 5S</p>
            <Badge variant="outline" className={`font-bold ${hasAuditorias ? globalScoreBadge : "text-muted-foreground"}`}>
              {!hasAuditorias ? "Sem auditorias" : globalScore >= 90 ? "Excelente (Ouro)" : globalScore >= 80 ? "Bom (Prata)" : "Atenção"}
            </Badge>
            <p className="text-[11px] text-muted-foreground">
              {hasAuditorias
                ? `${kpis.totalAuditorias} auditoria${kpis.totalAuditorias === 1 ? "" : "s"} realizada${kpis.totalAuditorias === 1 ? "" : "s"}`
                : "Aguardando a primeira auditoria"}
            </p>
          </div>
        </Card>

        {/* Setor Campeão */}
        <Card className="p-3.5 sm:p-4 rounded-2xl border shadow-sm relative overflow-hidden bg-gradient-to-br from-amber-500/15 via-card to-card">
          <Trophy className="absolute -right-3 -bottom-3 h-16 w-16 text-amber-500/10" />
          <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-700">
            <Trophy className="h-3.5 w-3.5" /> Campeão
          </p>
          <p className="mt-2 text-sm font-bold leading-tight text-foreground line-clamp-2">
            {kpis.setorCampeao?.nome_setor || "Em apuração"}
          </p>
          <p className="mt-1 text-2xl font-black text-amber-600">
            {kpis.setorCampeao?.ultima_nota ? `${kpis.setorCampeao.ultima_nota.toFixed(1)}%` : "--"}
          </p>
          {kpis.setorCampeao?.selo === "Ouro" && (
            <Badge className="mt-1 bg-amber-100 text-amber-800 border-amber-300 font-bold text-[10px]">
              <Sparkles className="h-3 w-3 mr-1 text-amber-600" /> Selo Ouro
            </Badge>
          )}
        </Card>

        {/* Senso do Mês */}
        <Card className="p-3.5 sm:p-4 rounded-2xl border shadow-sm relative overflow-hidden">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Senso do mês</p>
          <div
            className="mt-2 w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-sm"
            style={{ backgroundColor: secondaryColor }}
          >
            <Flame className="h-5 w-5" />
          </div>
          <p className="mt-2 text-sm font-black leading-tight text-foreground line-clamp-2">
            {kpis.sensoDestaqueMes}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Campanha em todos os setores</p>
        </Card>

        {/* Quarentena & Planos de Ação */}
        <Card className="col-span-2 lg:col-span-1 p-3.5 sm:p-4 rounded-2xl border shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Controle operacional</p>
          <div className="mt-2 grid grid-cols-2 gap-2 text-center">
            <div className="rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 p-2.5">
              <span className="block text-2xl font-black text-rose-600">{kpis.totalDescartes}</span>
              <span className="text-[10px] uppercase font-bold text-muted-foreground">Cartão vermelho</span>
            </div>
            <div className="rounded-xl bg-muted/50 border p-2.5">
              <span className="block text-2xl font-black text-primary">{kpis.totalPlanosAcao}</span>
              <span className="text-[10px] uppercase font-bold text-muted-foreground">Planos de ação</span>
            </div>
          </div>
        </Card>
      </section>

      {/* 3. GRÁFICO DE TEIA / RADAR + LEADERBOARD GAMIFICADO */}
      <section id="ranking" className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 scroll-mt-16">
        {/* Gráfico Radar (5 Colunas no Desktop) */}
        <Card className="lg:col-span-5 border shadow-sm rounded-2xl">
          <CardHeader className="p-4 sm:p-6 pb-0 sm:pb-2">
            <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 shrink-0" style={{ color: secondaryColor }} />
              Radar dos 5 Sensos
            </CardTitle>
            <CardDescription className="text-xs">
              Desempenho consolidado em cada pilar
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 sm:pt-2">
            <div className="h-60 sm:h-72 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} outerRadius="70%" margin={{ top: 8, right: 28, bottom: 8, left: 28 }}>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis
                    dataKey="senso"
                    tick={{ fill: "#4b5563", fontSize: 11, fontWeight: 700 }}
                  />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar
                    name="Média Atual"
                    dataKey="score"
                    stroke={secondaryColor}
                    strokeWidth={2}
                    fill={secondaryColor}
                    fillOpacity={0.35}
                    dot={{ r: 3, fill: secondaryColor }}
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
            <div className="space-y-2 pt-3 border-t">
              {radarData.map((d) => (
                <div key={d.senso} className="flex items-center gap-3">
                  <span className="w-16 text-[11px] font-bold text-muted-foreground truncate">{d.senso}</span>
                  <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${Math.max(0, Math.min(100, d.score))}%`, backgroundColor: secondaryColor }}
                    />
                  </div>
                  <span className="w-10 text-right text-xs font-black text-foreground">
                    {hasAuditorias ? `${d.score.toFixed(0)}%` : "--"}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Leaderboard Gamificado dos Setores (7 Colunas no Desktop) */}
        <Card className="lg:col-span-7 border shadow-sm rounded-2xl">
          <CardHeader className="p-4 sm:p-6 pb-3 space-y-2">
            <div>
              <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-500 shrink-0" />
                Ranking dos Setores
              </CardTitle>
              <CardDescription className="text-xs">
                Selos de conformidade por setor
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
              <Badge variant="outline" className="whitespace-nowrap bg-amber-50 text-amber-800 border-amber-300 text-[10px]">
                Ouro &ge; 90%
              </Badge>
              <Badge variant="outline" className="whitespace-nowrap bg-slate-100 text-slate-700 border-slate-300 text-[10px]">
                Prata &ge; 80%
              </Badge>
              <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-300 text-[10px]">
                Atenção &lt; 80%
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-2.5">
            {setores.length === 0 ? (
              <div className="text-center py-8 space-y-2">
                <div className="h-12 w-12 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center mx-auto">
                  <Trophy className="h-6 w-6" />
                </div>
                <p className="text-sm text-muted-foreground">Nenhum setor cadastrado ainda.</p>
              </div>
            ) : (
              setores.map((setor, idx) => {
                const nota = setor.ultima_nota ?? 0;
                const isPrimeiro = idx === 0;
                const isSegundo = idx === 1;
                const isTerceiro = idx === 2;

                return (
                  <button
                    type="button"
                    key={setor.id}
                    onClick={() => {
                      setSelectedSectorId(setor.id);
                      const el = document.getElementById("central-its-section");
                      if (el) el.scrollIntoView({ behavior: "smooth" });
                    }}
                    title="Ver padrão de limpeza do setor"
                    className={`w-full text-left p-3 rounded-2xl border transition-all active:scale-[0.99] ${
                      isPrimeiro
                        ? "bg-amber-500/10 border-amber-300 shadow-sm"
                        : "bg-card hover:bg-muted/30 border-border"
                    }`}
                  >
                    <div className="flex items-center gap-3">
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
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-bold text-sm truncate text-foreground">
                            {setor.nome_setor}
                          </h4>
                          {setor.selo === "Ouro" && (
                            <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[10px] py-0 px-1.5 font-bold shrink-0">
                              Ouro
                            </Badge>
                          )}
                          {setor.selo === "Prata" && (
                            <Badge className="bg-slate-100 text-slate-800 border-slate-300 text-[10px] py-0 px-1.5 font-bold shrink-0">
                              Prata
                            </Badge>
                          )}
                          {setor.selo === "Atencao" && (
                            <Badge className="bg-rose-100 text-rose-800 border-rose-300 text-[10px] py-0 px-1.5 font-bold shrink-0">
                              Atenção
                            </Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {setor.guardiao_nome || "Comitê"} · Meta {setor.meta_nota}%
                        </p>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <span className={`text-base font-black ${nota > 0 ? "text-foreground" : "text-xs font-semibold text-muted-foreground"}`}>
                          {nota > 0 ? `${nota.toFixed(1)}%` : "Pendente"}
                        </span>
                        {setor.tendencia === "up" && <TrendingUp className="h-4 w-4 text-emerald-600" />}
                        {setor.tendencia === "down" && <TrendingDown className="h-4 w-4 text-rose-600" />}
                        {setor.tendencia === "stable" && <Minus className="h-4 w-4 text-slate-400" />}
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                    <Progress value={nota} className="h-1.5 mt-2.5" />
                  </button>
                );
              })
            )}
          </CardContent>
        </Card>
      </section>

      {/* 4. MURAL "ANTES VS. DEPOIS" */}
      <section id="mural" className="space-y-4 scroll-mt-16">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <SectionTitle
            icon={<Sparkles className="h-5 w-5" />}
            color={secondaryColor}
            title="Mural Antes e Depois"
            subtitle="A evolução real dos setores com os 5 Sensos."
          />

          {canEditPortal && (
            <Button
              onClick={handleOpenNovoMural}
              size="sm"
              className="font-bold text-xs shadow-md gap-1.5 shrink-0 text-white h-9 w-full sm:w-auto"
              style={{ backgroundColor: secondaryColor }}
            >
              <Plus className="h-4 w-4" /> Nova transformação
            </Button>
          )}
        </div>

        {muralFotos.length === 0 ? (
          <Card className="p-6 sm:p-8 text-center border-dashed rounded-2xl space-y-3 bg-gradient-to-br from-amber-50/60 to-transparent dark:from-amber-950/10">
            <div className="flex justify-center gap-2">
              <div className="h-16 w-14 rounded-lg bg-rose-100 text-rose-700 text-[9px] font-black flex items-end justify-center pb-1 rotate-[-6deg] shadow-sm">ANTES</div>
              <div className="h-16 w-14 rounded-lg bg-emerald-100 text-emerald-700 text-[9px] font-black flex items-end justify-center pb-1 rotate-[6deg] shadow-sm">DEPOIS</div>
            </div>
            <p className="text-sm font-semibold text-muted-foreground">
              Nenhuma transformação no mural ainda.
            </p>
            {canEditPortal && (
              <Button
                size="sm"
                onClick={handleOpenNovoMural}
                className="font-bold text-xs gap-1.5 text-white"
                style={{ backgroundColor: secondaryColor }}
              >
                <Camera className="h-4 w-4" /> Cadastrar primeira transformação
              </Button>
            )}
          </Card>
        ) : (
          <div className="-mx-3 px-3 sm:mx-0 sm:px-0 flex md:grid md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5 overflow-x-auto md:overflow-visible snap-x snap-mandatory pb-2 scrollbar-none">
            {muralFotos.map((foto) => (
              <Card
                key={foto.id}
                className="w-[85%] shrink-0 snap-center md:w-auto overflow-hidden border shadow-sm hover:shadow-md transition-shadow group cursor-pointer rounded-2xl"
                onClick={() => setZoomMuralFoto(foto)}
              >
                <div className="grid grid-cols-2 h-44 sm:h-48 bg-muted relative">
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
      <section id="central-its-section" className="space-y-4 pt-2 scroll-mt-16">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <SectionTitle
            icon={<FileText className="h-5 w-5" />}
            color={secondaryColor}
            title="Padrões de Limpeza por Setor"
            subtitle="Padrão Ouro do local e rotinas diárias, semanais e mensais."
          />

          <div className="grid grid-cols-1 sm:flex gap-2">
            {canEditIT && (
              <Button onClick={() => openITEditor(true)} className="font-bold shadow-sm">
                <Plus className="h-4 w-4 mr-2" /> Novo setor com padrão de limpeza
              </Button>
            )}
            {currentSetor && (
              <Button
                variant="outline"
                onClick={() => setQrModalSector(currentSetor)}
                className="border-primary/40 text-primary font-bold shadow-sm"
              >
                <QrCode className="h-4 w-4 mr-2" /> QR Code do setor
              </Button>
            )}
          </div>
        </div>

        {setores.length === 0 && !isPublic && (
          <div className="rounded-xl border border-dashed p-4 text-xs text-muted-foreground">
            {canEditIT
              ? "Nenhum setor cadastrado ainda. Use os botões abaixo para criar o primeiro setor junto com a foto do Padrão Ouro e a rotina de limpeza."
              : "Nenhum setor cadastrado ainda. Peça ao gestor do 5S para cadastrar os setores."}
          </div>
        )}

        {/* Seletor de Setor */}
        {setores.length > 0 && (
        <div className="-mx-3 px-3 sm:mx-0 sm:px-0 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap flex items-center gap-1">
            <Filter className="h-3.5 w-3.5" /> Setor:
          </span>
          {setores.map((s) => (
            <Button
              key={s.id}
              size="sm"
              variant={selectedSectorId === s.id ? "default" : "outline"}
              onClick={() => setSelectedSectorId(s.id)}
              className={`rounded-full text-xs font-semibold shrink-0 h-8 ${
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
        )}

        {/* Detalhes da IT e Padrão Ouro */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
          {/* Card do Padrão Ouro (Estado Ideal) */}
          <Card className="lg:col-span-5 border shadow-sm overflow-hidden flex flex-col justify-between rounded-2xl">
            <CardHeader className="p-4 sm:p-5 pb-3 bg-muted/20 border-b">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-500 shrink-0" />
                  Padrão Ouro
                </CardTitle>
                <Badge variant="outline" className="text-[10px] font-bold border-amber-300 text-amber-700 bg-amber-50 shrink-0">
                  Estado ideal
                </Badge>
              </div>
              <CardDescription className="text-xs">
                Foto oficial do setor no seu melhor estado
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="w-full aspect-[4/3] sm:aspect-auto sm:h-56 rounded-xl overflow-hidden border relative flex items-center justify-center bg-gradient-to-br from-amber-50 via-muted/40 to-muted dark:from-amber-950/20">
                {currentIT?.foto_padrao_ouro_url ? (
                  <img
                    src={currentIT.foto_padrao_ouro_url}
                    alt={`Padrão Ouro - ${currentSetor?.nome_setor}`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="text-center p-6 space-y-2">
                    <div className="h-14 w-14 rounded-2xl bg-card shadow-sm flex items-center justify-center mx-auto">
                      <Camera className="h-7 w-7 text-amber-500" />
                    </div>
                    <p className="text-xs font-medium text-muted-foreground max-w-[220px] mx-auto">
                      Foto do Padrão Ouro ainda não cadastrada para este setor.
                    </p>
                  </div>
                )}
              </div>

              {currentSetor && (
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
              )}

              {canEditIT && (
                <Button onClick={() => openITEditor()} className="w-full text-xs font-bold">
                  {currentIT?.foto_padrao_ouro_url ? (
                    <><Pencil className="h-3.5 w-3.5 mr-2" /> Editar Padrão Ouro</>
                  ) : (
                    <><Camera className="h-3.5 w-3.5 mr-2" /> Cadastrar foto do Padrão Ouro</>
                  )}
                </Button>
              )}

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
          <Card className="lg:col-span-7 border shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="p-4 sm:p-5 pb-3 border-b bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 space-y-0">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  Rotina de Limpeza
                </CardTitle>
                <CardDescription className="text-xs">
                  O que limpar, como, com qual produto e quando
                </CardDescription>
              </div>
              {canEditIT && (
                <Button size="sm" onClick={() => openITEditor()} className="font-bold text-xs w-full sm:w-auto shrink-0">
                  {currentIT?.rotina_limpeza?.length ? (
                    <><Pencil className="h-3.5 w-3.5 mr-1.5" /> Editar rotina</>
                  ) : (
                    <><Plus className="h-3.5 w-3.5 mr-1.5" /> Cadastrar rotina</>
                  )}
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-0">
              {(!currentIT || !currentIT.rotina_limpeza || currentIT.rotina_limpeza.length === 0) ? (
                <div className="p-8 text-center text-muted-foreground text-xs">
                  {currentSetor ? "Nenhuma rotina cadastrada para este setor ainda." : "Cadastre um setor para montar a rotina de limpeza."}
                </div>
              ) : (
                <>
                  {/* Celular: um cartão por item */}
                  <div className="sm:hidden divide-y">
                    {currentIT.rotina_limpeza.map((item) => (
                      <div key={item.id} className="p-4 space-y-1.5 text-xs">
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-bold text-sm text-foreground">{item.item_local}</span>
                          <Badge variant="outline" className="text-[10px] font-bold shrink-0">{item.frequencia}</Badge>
                        </div>
                        {item.procedimento && <p className="text-muted-foreground">{item.procedimento}</p>}
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
                          {item.produto_epi && <span>Produto/EPI: <strong className="text-foreground">{item.produto_epi}</strong></span>}
                          {item.responsavel && <span>Responsável: <strong className="text-foreground">{item.responsavel}</strong></span>}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="hidden sm:block overflow-x-auto">
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
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {canEditIT && (
          <ITEditorDialog
            open={itEditorOpen}
            onOpenChange={setItEditorOpen}
            companyId={company.id}
            setor={itNovoSetor ? null : currentSetor ?? null}
            existing={itNovoSetor ? null : currentIT ?? null}
            onSaved={(id) => { setSelectedSectorId(id); onRefresh?.(); }}
          />
        )}
      </section>

      {/* 6. CRONOGRAMA DA IMPLANTAÇÃO 5S (ROADMAP DO PROJETO) */}
      <section id="cronograma" className="space-y-4 pt-2 scroll-mt-16">
        <SectionTitle
          icon={<Calendar className="h-5 w-5" />}
          color={primaryColor}
          title="Cronograma da Campanha"
          subtitle="Etapas da implantação, Dia D e rodadas de auditoria."
        />

        <ol className="relative space-y-3">
          {cronogramaProjeto.map((etapa, idx) => {
            const isConcluido = etapa.status === "CONCLUIDO";
            const isEmAndamento = etapa.status === "EM_ANDAMENTO";
            const isLast = idx === cronogramaProjeto.length - 1;

            return (
              <li key={etapa.id} className="relative pl-12 sm:pl-14">
                {!isLast && (
                  <span
                    aria-hidden
                    className={`absolute left-[19px] sm:left-[23px] top-11 -bottom-3 w-0.5 ${isConcluido ? "bg-emerald-400" : "bg-border"}`}
                  />
                )}
                <div
                  className={`absolute left-0 top-2 h-10 w-10 sm:h-12 sm:w-12 rounded-full flex items-center justify-center font-black text-xs ring-4 ring-background shadow-sm ${
                    isConcluido
                      ? "bg-emerald-600 text-white"
                      : isEmAndamento
                      ? "text-white"
                      : "bg-muted text-muted-foreground"
                  }`}
                  style={isEmAndamento ? { backgroundColor: secondaryColor } : undefined}
                >
                  {isConcluido ? <CheckCheck className="h-4 w-4" /> : isEmAndamento ? <Flame className="h-4 w-4" /> : etapa.ordem || idx + 1}
                </div>

                <Card
                  className={`p-3.5 sm:p-4 rounded-2xl border transition-all ${
                    isConcluido
                      ? "border-emerald-200 bg-emerald-50/40 dark:border-emerald-800/40 dark:bg-emerald-950/10"
                      : isEmAndamento
                      ? "border-orange-300 bg-orange-50/40 shadow-md dark:border-orange-700/50 dark:bg-orange-950/10"
                      : "bg-card"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          Etapa {etapa.ordem || idx + 1}
                        </span>
                        <Badge
                          className={`text-[10px] font-bold px-2 py-0 border ${
                            isConcluido
                              ? "bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-100"
                              : isEmAndamento
                              ? "text-white border-transparent animate-pulse"
                              : "bg-muted text-muted-foreground border-border hover:bg-muted"
                          }`}
                          style={isEmAndamento ? { backgroundColor: secondaryColor } : undefined}
                        >
                          {isConcluido ? "Concluído" : isEmAndamento ? "Em execução" : "Pendente"}
                        </Badge>
                      </div>
                      <h4 className="font-bold text-sm sm:text-base leading-snug text-foreground">
                        {etapa.etapa_titulo}
                      </h4>

                      {etapa.descricao && (
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {etapa.descricao}
                        </p>
                      )}

                      <div className="flex items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground flex-wrap pt-0.5">
                        {etapa.responsavel && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-muted/60 px-2 py-0.5">
                            Responsável: <strong className="text-foreground">{etapa.responsavel}</strong>
                          </span>
                        )}
                        {(etapa.data_inicio || etapa.data_fim) && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {etapa.data_inicio ? `Início ${formatFivesDate(etapa.data_inicio)}` : ""}
                            {etapa.data_fim ? ` • Prazo ${formatFivesDate(etapa.data_fim)}` : ""}
                          </span>
                        )}
                        {etapa.data_execucao && (
                          <span className="flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                            Executado em {formatFivesDate(etapa.data_execucao)}
                          </span>
                        )}
                      </div>
                    </div>

                    {canEditPortal && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenEditCrono(etapa)}
                        className="text-xs font-semibold gap-1 shrink-0 w-full sm:w-auto"
                      >
                        <Pencil className="h-3 w-3" /> Editar etapa
                      </Button>
                    )}
                  </div>
                </Card>
              </li>
            );
          })}
        </ol>
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

function SectionTitle({
  icon,
  color,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  color: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div
        className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
        style={{ backgroundColor: `${color}1A`, color }}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <h2 className="text-lg sm:text-xl font-black tracking-tight text-foreground leading-tight">{title}</h2>
        {subtitle && <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

function ScoreRing({ value, active, className }: { value: number; active: boolean; className: string }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  const pct = active ? Math.max(0, Math.min(100, value)) : 0;
  return (
    <div className="relative h-24 w-24 shrink-0">
      <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90">
        <circle cx="40" cy="40" r={r} fill="none" strokeWidth="8" className="stroke-muted" />
        <circle
          cx="40"
          cy="40"
          r={r}
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          stroke="currentColor"
          strokeDasharray={c}
          strokeDashoffset={c - (pct / 100) * c}
          className={`${active ? className : "text-muted-foreground"} transition-all duration-700`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-xl font-black leading-none ${active ? className : "text-muted-foreground"}`}>
          {active ? `${pct.toFixed(0)}%` : "--"}
        </span>
        <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mt-0.5">Índice</span>
      </div>
    </div>
  );
}