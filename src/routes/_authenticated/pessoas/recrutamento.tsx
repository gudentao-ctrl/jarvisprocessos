// src/routes/_authenticated/pessoas/recrutamento.tsx
// Rota principal do Applicant Tracking System (ATS) Kanban do Hub de Pessoas

import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Briefcase,
  Users,
  Search,
  Plus,
  ArrowLeft,
  Building2,
  FolderArchive,
  Layers,
  Sparkles,
  Filter,
  CheckCircle2,
  Trophy,
  Split,
  Radar,
  FileSpreadsheet,
  Handshake,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";
import { useCompanyFilter } from "@/hooks/useCompanyFilter";
import {
  Vaga,
  CandidaturaFunil,
  EtapaKanban,
  RecrutamentoCandidato,
} from "@/lib/recrutamento-types";
import {
  getVagasList,
  getCandidaturasFunil,
  getBancoTalentos,
  avancarEtapaCandidatura,
} from "@/lib/recrutamento-storage";

// Componentes
import VagaCard from "@/components/recrutamento/VagaCard";
import VagaFormModal from "@/components/recrutamento/VagaFormModal";
import NovoCandidatoModal from "@/components/recrutamento/NovoCandidatoModal";
import CandidatoKanbanCard from "@/components/recrutamento/CandidatoKanbanCard";
import SplitScreenEntrevistaModal from "@/components/recrutamento/SplitScreenEntrevistaModal";
import AnalisePerfilModal from "@/components/recrutamento/AnalisePerfilModal";
import PropostaContratacaoModal from "@/components/recrutamento/PropostaContratacaoModal";
import EntrevistaClienteModal from "@/components/recrutamento/EntrevistaClienteModal";
import CandidatoContratadoModal from "@/components/recrutamento/CandidatoContratadoModal";
import DevolutivaModal from "@/components/recrutamento/DevolutivaModal";
import BancoTalentosDrawer from "@/components/recrutamento/BancoTalentosDrawer";

export const Route = createFileRoute("/_authenticated/pessoas/recrutamento")({
  head: () => ({
    meta: [
      { title: "ATS Recrutamento & Seleção | Jarvis Processos" },
      { name: "description", content: "Sistema completo de ATS Kanban para recrutamento, triagem e contratação." },
    ],
  }),
  component: RecrutamentoKanbanView,
});

export default function RecrutamentoKanbanView() {
  const navigate = useNavigate();
  const { companyId, company, companies } = useCompanyFilter();

  // Estados principais de dados
  const [vagas, setVagas] = useState<Vaga[]>([]);
  const [candidaturas, setCandidaturas] = useState<CandidaturaFunil[]>([]);
  const [bancoCount, setBancoCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  // Filtros Globais
  const [selectedVagaId, setSelectedVagaId] = useState<string>("todas");
  const [search, setSearch] = useState("");

  // Modais
  const [isNovaVagaOpen, setIsNovaVagaOpen] = useState(false);
  const [isNovoCandidatoOpen, setIsNovoCandidatoOpen] = useState(false);
  const [isBancoDrawerOpen, setIsBancoDrawerOpen] = useState(false);

  // Modais de Ação por Etapa
  const [activeCandidatura, setActiveCandidatura] = useState<CandidaturaFunil | null>(null);
  const [modalType, setModalType] = useState<
    "SPLIT_SCREEN" | "ANALISE_PERFIL" | "PROPOSTA" | "ENTREVISTA_CLIENTE" | "CONTRATADO" | null
  >(null);

  // Modal de Reprovação / Devolutiva Global
  const [reprovarCandidaturaTarget, setReprovarCandidaturaTarget] = useState<CandidaturaFunil | null>(null);

  // Carregamento de dados
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [vagasList, funilList, bancoList] = await Promise.all([
        getVagasList(companyId),
        getCandidaturasFunil(selectedVagaId, companyId),
        getBancoTalentos(),
      ]);

      setVagas(vagasList);
      setCandidaturas(funilList);
      setBancoCount(bancoList.length);

      // Se havia uma vaga selecionada que não existe mais, reseta para "todas"
      if (selectedVagaId !== "todas" && !vagasList.some((v) => v.id === selectedVagaId)) {
        setSelectedVagaId("todas");
      }
    } catch (err) {
      console.error("Error loading recrutamento data:", err);
      toast.error("Erro ao carregar dados do recrutamento.");
    } finally {
      setLoading(false);
    }
  }, [companyId, selectedVagaId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Vaga mestre ativa exibida na Coluna 1
  const vagaMestreAtiva = useMemo(() => {
    if (selectedVagaId !== "todas") {
      return vagas.find((v) => v.id === selectedVagaId) || vagas[0] || null;
    }
    return vagas[0] || null;
  }, [selectedVagaId, vagas]);

  // Filtragem de candidaturas por busca textual
  const filteredCandidaturas = useMemo(() => {
    let list = candidaturas;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((cf) => {
        const c = cf.candidato;
        return (
          c?.nome.toLowerCase().includes(q) ||
          c?.cpf?.toLowerCase().includes(q) ||
          c?.formacao?.toLowerCase().includes(q) ||
          c?.ferramentas.some((f) => f.toLowerCase().includes(q))
        );
      });
    }
    return list;
  }, [candidaturas, search]);

  // Agrupamento dos candidatos por coluna do Kanban (excluindo Banco de Talentos que fica na gaveta global)
  const columns = useMemo(() => {
    return {
      triagem: filteredCandidaturas.filter((c) => c.etapa_kanban === "TRIAGEM" && c.status === "ATIVO"),
      entrevistaConsultoria: filteredCandidaturas.filter(
        (c) => c.etapa_kanban === "ENTREVISTA_CONSULTORIA" && c.status === "ATIVO",
      ),
      analisePerfil: filteredCandidaturas.filter(
        (c) => c.etapa_kanban === "ANALISE_PERFIL" && c.status === "ATIVO",
      ),
      alinhamentoContratante: filteredCandidaturas.filter(
        (c) => c.etapa_kanban === "ALINHAMENTO_CONTRATANTE" && c.status === "ATIVO",
      ),
      entrevistaContratante: filteredCandidaturas.filter(
        (c) => c.etapa_kanban === "ENTREVISTA_CONTRATANTE" && c.status === "ATIVO",
      ),
      contratados: filteredCandidaturas.filter(
        (c) => c.etapa_kanban === "FINALIZACAO_CONTRATADO" || c.status === "CONTRATADO",
      ),
    };
  }, [filteredCandidaturas]);

  // Disparo do modal apropriado de acordo com a etapa do card
  const handleOpenStageAction = (candidatura: CandidaturaFunil) => {
    setActiveCandidatura(candidatura);
    switch (candidatura.etapa_kanban) {
      case "TRIAGEM":
        // Na triagem podemos abrir diretamente para aprovar para entrevista ou editar
        setModalType("SPLIT_SCREEN");
        break;
      case "ENTREVISTA_CONSULTORIA":
        setModalType("SPLIT_SCREEN");
        break;
      case "ANALISE_PERFIL":
        setModalType("ANALISE_PERFIL");
        break;
      case "ALINHAMENTO_CONTRATANTE":
        setModalType("PROPOSTA");
        break;
      case "ENTREVISTA_CONTRATANTE":
        setModalType("ENTREVISTA_CLIENTE");
        break;
      case "FINALIZACAO_CONTRATADO":
        setModalType("CONTRATADO");
        break;
      default:
        setModalType("SPLIT_SCREEN");
    }
  };

  // Gatilho da regra global de Reprovação (abre modal de Devolutiva com WhatsApp / E-mail)
  const handleReprovar = (candidatura: CandidaturaFunil) => {
    setReprovarCandidaturaTarget(candidatura);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden bg-background">
      {/* 1. Header do Módulo com Breadcrumb e Filtros Globais */}
      <div className="border-b bg-card px-4 py-3 space-y-3 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Link
                to="/pessoas/dashboard"
                className="hover:text-primary transition-colors flex items-center gap-1"
              >
                <ArrowLeft className="h-3 w-3" />
                Hub de Pessoas
              </Link>
              <span>/</span>
              <span className="text-foreground font-medium">Recrutamento & Seleção (ATS)</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              Funil de Recrutamento Kanban
              {company && (
                <Badge variant="secondary" className="text-xs font-normal">
                  <Building2 className="h-3 w-3 mr-1 text-primary" />
                  {company.name}
                </Badge>
              )}
            </h1>
          </div>

          {/* Botões de Ação Global */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsBancoDrawerOpen(true)}
              className="text-xs h-8 border-border relative bg-muted/40 hover:bg-muted"
            >
              <FolderArchive className="h-3.5 w-3.5 mr-1.5 text-primary" />
              Banco de Currículos
              {bancoCount > 0 && (
                <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-primary/20 text-primary font-mono text-[10px] font-bold">
                  {bancoCount}
                </span>
              )}
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsNovaVagaOpen(true)}
              className="text-xs h-8"
            >
              <Briefcase className="h-3.5 w-3.5 mr-1.5 text-primary" />
              + Nova Vaga
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={() => setIsNovoCandidatoOpen(true)}
              className="text-xs h-8 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              + Cadastrar Candidato
            </Button>
          </div>
        </div>

        {/* Barra de Filtros Globais (Vaga, Busca e Status) */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-1 text-xs">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Seletor Global de Vaga */}
            <div className="flex items-center gap-1.5 min-w-[220px]">
              <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <Select value={selectedVagaId} onValueChange={(val) => setSelectedVagaId(val)}>
                <SelectTrigger className="h-8 text-xs bg-background">
                  <SelectValue placeholder="Filtrar por Vaga" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas" className="text-xs font-semibold">
                    Todas as Vagas Ativas ({vagas.length})
                  </SelectItem>
                  {vagas.map((v) => (
                    <SelectItem key={v.id} value={v.id} className="text-xs">
                      {v.titulo} ({v.empresa_nome || "Cliente"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Input de Busca de Candidatos */}
            <div className="relative flex-1 sm:w-64">
              <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar candidato, CPF, ferramenta..."
                className="h-8 text-xs pl-8 bg-background"
              />
            </div>
          </div>

          <div className="text-[11px] text-muted-foreground flex items-center gap-3">
            <span>
              Candidaturas Ativas:{" "}
              <strong className="text-foreground">{candidaturas.filter((c) => c.status === "ATIVO").length}</strong>
            </span>
            <span>•</span>
            <span>
              Contratados:{" "}
              <strong className="text-emerald-600 font-bold">{columns.contratados.length}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* 2. O FUNIL KANBAN COM AS 7 COLUNAS */}
      <div className="flex-1 overflow-x-auto p-4 bg-muted/20">
        <div className="flex gap-4 h-full min-w-[1950px] pb-2">
          {/* ======================================================== */}
          {/* COLUNA 1: ABERTURA (Gestão da Vaga) */}
          {/* ======================================================== */}
          <div className="w-[320px] shrink-0 flex flex-col bg-background/80 rounded-xl border shadow-xs overflow-hidden">
            <div className="p-3 border-b bg-card flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Briefcase className="h-4 w-4 text-primary" />
                <h3 className="font-bold text-xs uppercase tracking-wider text-foreground">
                  1. Abertura
                </h3>
              </div>
              <Badge variant="outline" className="text-[10px] uppercase font-mono">
                Gestão da Vaga
              </Badge>
            </div>

            <div className="p-3 flex-1 overflow-y-auto space-y-3">
              {vagaMestreAtiva ? (
                <VagaCard vaga={vagaMestreAtiva} onVagaUpdated={loadData} />
              ) : (
                <div className="text-center py-10 space-y-2">
                  <Briefcase className="h-8 w-8 mx-auto text-muted-foreground/40" />
                  <p className="text-xs font-semibold text-muted-foreground">Nenhuma vaga cadastrada</p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setIsNovaVagaOpen(true)}
                    className="text-xs"
                  >
                    + Abrir Vaga
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* ======================================================== */}
          {/* COLUNA 2: TRIAGEM (Entrada de Candidatos) */}
          {/* ======================================================== */}
          <div className="w-[310px] shrink-0 flex flex-col bg-background/80 rounded-xl border shadow-xs overflow-hidden">
            <div className="p-3 border-b bg-card flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Users className="h-4 w-4 text-sky-500" />
                <h3 className="font-bold text-xs uppercase tracking-wider text-foreground">
                  2. Triagem
                </h3>
              </div>
              <Badge variant="secondary" className="text-[10px] font-mono font-bold">
                {columns.triagem.length}
              </Badge>
            </div>

            <div className="p-2 border-b bg-muted/30">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsNovoCandidatoOpen(true)}
                className="w-full text-xs h-7.5 border-dashed border-primary/40 text-primary hover:bg-primary/5"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                + Cadastrar Candidato
              </Button>
            </div>

            <div className="p-3 flex-1 overflow-y-auto space-y-3">
              {columns.triagem.length === 0 ? (
                <div className="text-center py-12 text-xs text-muted-foreground space-y-1">
                  <p>Nenhum candidato em triagem.</p>
                  <p className="text-[11px]">Clique em + Cadastrar para inserir currículos.</p>
                </div>
              ) : (
                columns.triagem.map((candf) => (
                  <CandidatoKanbanCard
                    key={candf.id}
                    candidatura={candf}
                    onOpenStageAction={handleOpenStageAction}
                    onReprovar={handleReprovar}
                  />
                ))
              )}
            </div>
          </div>

          {/* ======================================================== */}
          {/* COLUNA 3: ENTREVISTA DA CONSULTORIA */}
          {/* ======================================================== */}
          <div className="w-[310px] shrink-0 flex flex-col bg-background/80 rounded-xl border shadow-xs overflow-hidden">
            <div className="p-3 border-b bg-card flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Split className="h-4 w-4 text-indigo-500" />
                <h3 className="font-bold text-xs uppercase tracking-wider text-foreground">
                  3. Entrevista Maia
                </h3>
              </div>
              <Badge variant="secondary" className="text-[10px] font-mono font-bold">
                {columns.entrevistaConsultoria.length}
              </Badge>
            </div>

            <div className="p-3 flex-1 overflow-y-auto space-y-3">
              {columns.entrevistaConsultoria.length === 0 ? (
                <div className="text-center py-12 text-xs text-muted-foreground">
                  Nenhum candidato aguardando entrevista com a consultoria.
                </div>
              ) : (
                columns.entrevistaConsultoria.map((candf) => (
                  <CandidatoKanbanCard
                    key={candf.id}
                    candidatura={candf}
                    onOpenStageAction={handleOpenStageAction}
                    onReprovar={handleReprovar}
                  />
                ))
              )}
            </div>
          </div>

          {/* ======================================================== */}
          {/* COLUNA 4: ANÁLISE DE PERFIL (Bloco 23) */}
          {/* ======================================================== */}
          <div className="w-[310px] shrink-0 flex flex-col bg-background/80 rounded-xl border shadow-xs overflow-hidden">
            <div className="p-3 border-b bg-card flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Radar className="h-4 w-4 text-purple-500" />
                <h3 className="font-bold text-xs uppercase tracking-wider text-foreground">
                  4. Análise de Perfil
                </h3>
              </div>
              <Badge variant="secondary" className="text-[10px] font-mono font-bold">
                {columns.analisePerfil.length}
              </Badge>
            </div>

            <div className="p-3 flex-1 overflow-y-auto space-y-3">
              {columns.analisePerfil.length === 0 ? (
                <div className="text-center py-12 text-xs text-muted-foreground">
                  Nenhum candidato em análise de perfil comportamental.
                </div>
              ) : (
                columns.analisePerfil.map((candf) => (
                  <CandidatoKanbanCard
                    key={candf.id}
                    candidatura={candf}
                    onOpenStageAction={handleOpenStageAction}
                    onReprovar={handleReprovar}
                  />
                ))
              )}
            </div>
          </div>

          {/* ======================================================== */}
          {/* COLUNA 5: ALINHAMENTO COM CONTRATANTE */}
          {/* ======================================================== */}
          <div className="w-[310px] shrink-0 flex flex-col bg-background/80 rounded-xl border shadow-xs overflow-hidden">
            <div className="p-3 border-b bg-card flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <FileSpreadsheet className="h-4 w-4 text-amber-500" />
                <h3 className="font-bold text-xs uppercase tracking-wider text-foreground">
                  5. Alinhamento
                </h3>
              </div>
              <Badge variant="secondary" className="text-[10px] font-mono font-bold">
                {columns.alinhamentoContratante.length}
              </Badge>
            </div>

            <div className="p-3 flex-1 overflow-y-auto space-y-3">
              {columns.alinhamentoContratante.length === 0 ? (
                <div className="text-center py-12 text-xs text-muted-foreground">
                  Nenhum candidato em alinhamento de proposta com o cliente.
                </div>
              ) : (
                columns.alinhamentoContratante.map((candf) => (
                  <CandidatoKanbanCard
                    key={candf.id}
                    candidatura={candf}
                    onOpenStageAction={handleOpenStageAction}
                    onReprovar={handleReprovar}
                  />
                ))
              )}
            </div>
          </div>

          {/* ======================================================== */}
          {/* COLUNA 6: ENTREVISTA COM O CONTRATANTE */}
          {/* ======================================================== */}
          <div className="w-[310px] shrink-0 flex flex-col bg-background/80 rounded-xl border shadow-xs overflow-hidden">
            <div className="p-3 border-b bg-card flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Handshake className="h-4 w-4 text-teal-500" />
                <h3 className="font-bold text-xs uppercase tracking-wider text-foreground">
                  6. Entrevista Cliente
                </h3>
              </div>
              <Badge variant="secondary" className="text-[10px] font-mono font-bold">
                {columns.entrevistaContratante.length}
              </Badge>
            </div>

            <div className="p-3 flex-1 overflow-y-auto space-y-3">
              {columns.entrevistaContratante.length === 0 ? (
                <div className="text-center py-12 text-xs text-muted-foreground">
                  Nenhum candidato em entrevista decisória com o contratante.
                </div>
              ) : (
                columns.entrevistaContratante.map((candf) => (
                  <CandidatoKanbanCard
                    key={candf.id}
                    candidatura={candf}
                    onOpenStageAction={handleOpenStageAction}
                    onReprovar={handleReprovar}
                  />
                ))
              )}
            </div>
          </div>

          {/* ======================================================== */}
          {/* COLUNA 7: FINALIZAÇÃO (CONTRATADOS) */}
          {/* ======================================================== */}
          <div className="w-[310px] shrink-0 flex flex-col bg-background/80 rounded-xl border border-emerald-500/30 shadow-xs overflow-hidden">
            <div className="p-3 border-b bg-emerald-500/10 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Trophy className="h-4 w-4 text-emerald-600" />
                <h3 className="font-bold text-xs uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                  7. Contratados
                </h3>
              </div>
              <Badge className="bg-emerald-600 text-white text-[10px] font-mono font-bold">
                {columns.contratados.length}
              </Badge>
            </div>

            <div className="p-3 flex-1 overflow-y-auto space-y-3">
              {columns.contratados.length === 0 ? (
                <div className="text-center py-12 text-xs text-muted-foreground">
                  Nenhum profissional contratado neste ciclo até o momento.
                </div>
              ) : (
                columns.contratados.map((candf) => (
                  <CandidatoKanbanCard
                    key={candf.id}
                    candidatura={candf}
                    onOpenStageAction={handleOpenStageAction}
                    onReprovar={handleReprovar}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* MODAIS GLOBAIS DE FLUXO */}
      {/* ======================================================== */}

      {/* Modal de Criação de Vaga */}
      <VagaFormModal
        isOpen={isNovaVagaOpen}
        onClose={() => setIsNovaVagaOpen(false)}
        onSuccess={() => {
          setIsNovaVagaOpen(false);
          loadData();
        }}
      />

      {/* Modal de Cadastro de Candidato com Match Automático */}
      <NovoCandidatoModal
        vagas={vagas}
        selectedVagaId={selectedVagaId !== "todas" ? selectedVagaId : undefined}
        isOpen={isNovoCandidatoOpen}
        onClose={() => setIsNovoCandidatoOpen(false)}
        onSuccess={() => {
          setIsNovoCandidatoOpen(false);
          loadData();
        }}
      />

      {/* Drawer do Banco Global de Currículos / Talentos */}
      <BancoTalentosDrawer
        vagas={vagas}
        isOpen={isBancoDrawerOpen}
        onClose={() => setIsBancoDrawerOpen(false)}
        onCandidatoReativado={() => {
          setIsBancoDrawerOpen(false);
          loadData();
        }}
      />

      {/* Modal Automático de Reprovação & Devolutiva Padrão (Regra Global do ATS) */}
      <DevolutivaModal
        candidatura={reprovarCandidaturaTarget}
        isOpen={!!reprovarCandidaturaTarget}
        onClose={() => setReprovarCandidaturaTarget(null)}
        onSuccess={() => {
          setReprovarCandidaturaTarget(null);
          loadData();
        }}
      />

      {/* Modal Split-Screen para Entrevista da Consultoria (Coluna 3) */}
      <SplitScreenEntrevistaModal
        candidatura={activeCandidatura}
        isOpen={modalType === "SPLIT_SCREEN" && !!activeCandidatura}
        onClose={() => {
          setModalType(null);
          setActiveCandidatura(null);
        }}
        onSuccess={loadData}
        onReprovar={handleReprovar}
      />

      {/* Modal de Análise de Perfil (Coluna 4) */}
      <AnalisePerfilModal
        candidatura={activeCandidatura}
        isOpen={modalType === "ANALISE_PERFIL" && !!activeCandidatura}
        onClose={() => {
          setModalType(null);
          setActiveCandidatura(null);
        }}
        onSuccess={loadData}
        onReprovar={handleReprovar}
      />

      {/* Modal de Alinhamento com Contratante / Desenho da Proposta (Coluna 5) */}
      <PropostaContratacaoModal
        candidatura={activeCandidatura}
        isOpen={modalType === "PROPOSTA" && !!activeCandidatura}
        onClose={() => {
          setModalType(null);
          setActiveCandidatura(null);
        }}
        onSuccess={loadData}
        onReprovar={handleReprovar}
      />

      {/* Modal de Entrevista com o Contratante & PDF de Admissão (Coluna 6) */}
      <EntrevistaClienteModal
        candidatura={activeCandidatura}
        isOpen={modalType === "ENTREVISTA_CLIENTE" && !!activeCandidatura}
        onClose={() => {
          setModalType(null);
          setActiveCandidatura(null);
        }}
        onSuccess={loadData}
        onReprovar={handleReprovar}
      />

      {/* Modal de Dossiê Consolidado de Contratados (Coluna 7) */}
      <CandidatoContratadoModal
        candidatura={activeCandidatura}
        isOpen={modalType === "CONTRATADO" && !!activeCandidatura}
        onClose={() => {
          setModalType(null);
          setActiveCandidatura(null);
        }}
      />
    </div>
  );
}
