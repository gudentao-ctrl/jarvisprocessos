// src/routes/_authenticated/pessoas/nps.tsx
// Painel Administrativo de Gestão de Pesquisas NPS e eNPS (Hub de Pessoas - Bloco 26)

import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Smile,
  Users,
  Plus,
  ArrowLeft,
  Search,
  ExternalLink,
  Copy,
  BarChart3,
  Edit,
  Power,
  Trash2,
  Sparkles,
  Award,
  Layers,
  Building2,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { useCompanyFilter } from "@/hooks/useCompanyFilter";
import type { Pesquisa, PesquisaPergunta, NpsRelatorioConsolidado, TipoPesquisa } from "@/lib/nps-types";
import { supabase } from "@/integrations/supabase/client";
import {
  getPesquisas,
  getPerguntasByPesquisaId,
  savePesquisaCompleta,
  toggleStatusPesquisa,
  calcularRelatorioPesquisa,
  deletePesquisa,
  generatePublicSurveyLink,
  NPS_REALTIME_CHANNEL,
} from "@/lib/nps-storage";
import { PesquisaFormModal } from "@/components/nps/PesquisaFormModal";
import { PesquisaRelatorioModal } from "@/components/nps/PesquisaRelatorioModal";

export const Route = createFileRoute("/_authenticated/pessoas/nps")({
  head: () => ({
    meta: [
      { title: "NPS & eNPS | Hub de Pessoas Maia" },
      { name: "description", content: "Pesquisas de satisfação NPS para clientes e eNPS para colaboradores." },
    ],
  }),
  component: NpsDashboardPage,
});

function NpsDashboardPage() {
  const { companyId, company } = useCompanyFilter();
  const [pesquisas, setPesquisas] = useState<Pesquisa[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState<"todas" | "nps" | "enps">("todas");

  // Modais
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingPesquisa, setEditingPesquisa] = useState<Pesquisa | null>(null);
  const [editingPerguntas, setEditingPerguntas] = useState<PesquisaPergunta[]>([]);

  const [isRelatorioOpen, setIsRelatorioOpen] = useState(false);
  const [selectedPesquisaParaRelatorio, setSelectedPesquisaParaRelatorio] = useState<Pesquisa | null>(null);
  const [relatorioData, setRelatorioData] = useState<NpsRelatorioConsolidado | null>(null);

  // Link copiado feedback temporário
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const carregarPesquisas = useCallback(async () => {
    try {
      setLoading(true);
      const lista = await getPesquisas(companyId);
      setPesquisas(lista);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao carregar lista de pesquisas.");
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    carregarPesquisas();
  }, [carregarPesquisas]);

  // Escuta respostas submetidas publicamente em tempo real via Realtime Broadcast
  useEffect(() => {
    const channel = supabase.channel(NPS_REALTIME_CHANNEL);
    channel
      .on("broadcast", { event: "nova_resposta_nps" }, (payload: any) => {
        const resp = payload?.payload?.resposta;
        if (resp) {
          // Atualiza o cache local do painel com a resposta recebida
          try {
            const raw = localStorage.getItem("maia_nps_respostas_v1");
            const list = raw ? JSON.parse(raw) : [];
            if (!list.some((r: any) => r.id === resp.id)) {
              list.unshift(resp);
              localStorage.setItem("maia_nps_respostas_v1", JSON.stringify(list));
            }
          } catch {}
          toast.info("Nova resposta de pesquisa recebida em tempo real!");
          carregarPesquisas();
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [carregarPesquisas]);

  // Filtragem
  const pesquisasFiltradas = useMemo(() => {
    return pesquisas.filter((p) => {
      const matchTipo = tipoFiltro === "todas" || p.tipo === tipoFiltro;
      const matchSearch =
        p.titulo.toLowerCase().includes(search.toLowerCase()) ||
        (p.descricao && p.descricao.toLowerCase().includes(search.toLowerCase()));
      return matchTipo && matchSearch;
    });
  }, [pesquisas, tipoFiltro, search]);

  // Métricas de resumo gerais
  const metrics = useMemo(() => {
    const total = pesquisas.length;
    const ativas = pesquisas.filter((p) => p.status === "ativa").length;
    const npsCount = pesquisas.filter((p) => p.tipo === "nps").length;
    const enpsCount = pesquisas.filter((p) => p.tipo === "enps").length;
    const totalRespostas = pesquisas.reduce((acc, p) => acc + (p.total_respostas || 0), 0);
    return { total, ativas, npsCount, enpsCount, totalRespostas };
  }, [pesquisas]);

  // Ações
  const handleOpenCreate = () => {
    setEditingPesquisa(null);
    setEditingPerguntas([]);
    setIsFormModalOpen(true);
  };

  const handleOpenEdit = async (pesquisa: Pesquisa) => {
    try {
      const pergs = await getPerguntasByPesquisaId(pesquisa.id);
      setEditingPesquisa(pesquisa);
      setEditingPerguntas(pergs);
      setIsFormModalOpen(true);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao carregar detalhes da pesquisa.");
    }
  };

  const handleOpenRelatorio = async (pesquisa: Pesquisa) => {
    try {
      const rel = await calcularRelatorioPesquisa(pesquisa.id);
      setSelectedPesquisaParaRelatorio(pesquisa);
      setRelatorioData(rel);
      setIsRelatorioOpen(true);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao gerar relatório consolidado.");
    }
  };

  const handleToggleStatus = async (pesquisa: Pesquisa) => {
    try {
      const novoStatus = pesquisa.status === "ativa" ? "inativa" : "ativa";
      await toggleStatusPesquisa(pesquisa.id, novoStatus);
      toast.success(`Pesquisa marcada como ${novoStatus === "ativa" ? "ativa" : "inativa"}.`);
      carregarPesquisas();
    } catch (err) {
      console.error(err);
      toast.error("Erro ao alterar status da pesquisa.");
    }
  };

  const handleDeletePesquisa = async (pesquisa: Pesquisa) => {
    if (
      !window.confirm(
        `Tem certeza que deseja excluir permanentemente a pesquisa "${pesquisa.titulo}"? Esta ação removerá também as respostas coletadas.`
      )
    ) {
      return;
    }

    try {
      await deletePesquisa(pesquisa.id);
      toast.success("Pesquisa excluída com sucesso.");
      carregarPesquisas();
    } catch (err) {
      console.error(err);
      toast.error("Erro ao excluir pesquisa.");
    }
  };

  const handleCopyLink = (p: Pesquisa) => {
    const url = generatePublicSurveyLink(p);
    navigator.clipboard.writeText(url);
    const key = p.id;
    setCopiedHash(key);
    toast.success("Link público copiado! Acessível em qualquer navegador ou guia anônima.");
    setTimeout(() => setCopiedHash(null), 2500);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Top Header com Voltar e Ações */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-muted-foreground hover:text-foreground"
            >
              <Link to="/pessoas/dashboard">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Hub de Pessoas
              </Link>
            </Button>
            <span className="text-muted-foreground text-sm">/</span>
            <span className="text-sm font-semibold text-[#3E100C]">NPS & eNPS</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#3E100C] text-[#FFF8F5] flex items-center justify-center shadow-sm">
              <Smile className="h-5 w-5 text-[#E05A10]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-[#3E100C]">
                Gestão de Pesquisas NPS e eNPS
              </h1>
              <p className="text-xs text-muted-foreground">
                {company
                  ? `Pesquisas customizáveis e termômetros de satisfação para ${company.name}`
                  : "Formulários de satisfação (NPS Clientes e eNPS Colaboradores) com links públicos dinâmicos"}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={handleOpenCreate}
            className="bg-[#E05A10] hover:bg-[#E05A10]/90 text-white shadow-sm font-medium"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            + Nova Pesquisa
          </Button>
        </div>
      </div>

      {/* Mini KPIs do Módulo */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card className="border-l-4 border-l-[#3E100C] shadow-sm">
          <CardHeader className="pb-1 pt-4">
            <CardTitle className="text-xs text-muted-foreground font-semibold flex items-center justify-between">
              Total de Pesquisas
              <Layers className="h-4 w-4 text-[#3E100C]" />
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="text-2xl font-bold text-[#3E100C]">{metrics.total}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">{metrics.ativas} ativas no momento</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-[#E05A10] shadow-sm">
          <CardHeader className="pb-1 pt-4">
            <CardTitle className="text-xs text-muted-foreground font-semibold flex items-center justify-between">
              Respostas Coletadas
              <Users className="h-4 w-4 text-[#E05A10]" />
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="text-2xl font-bold text-[#E05A10]">{metrics.totalRespostas}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Feedback acumulado em todas as pesquisas</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-400 shadow-sm">
          <CardHeader className="pb-1 pt-4">
            <CardTitle className="text-xs text-muted-foreground font-semibold flex items-center justify-between">
              NPS (Clientes)
              <Smile className="h-4 w-4 text-orange-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="text-2xl font-bold text-orange-600">{metrics.npsCount}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Formulários voltados a clientes e parceiros</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500 shadow-sm">
          <CardHeader className="pb-1 pt-4">
            <CardTitle className="text-xs text-muted-foreground font-semibold flex items-center justify-between">
              eNPS (Colaboradores)
              <Award className="h-4 w-4 text-purple-600" />
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="text-2xl font-bold text-purple-700">{metrics.enpsCount}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Pesquisas internas de clima organizacional</p>
          </CardContent>
        </Card>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-muted/20 p-3 rounded-xl border">
        <div className="flex items-center gap-2">
          <Tabs value={tipoFiltro} onValueChange={(v) => setTipoFiltro(v as any)}>
            <TabsList className="bg-background shadow-xs">
              <TabsTrigger value="todas" className="text-xs">
                Todas ({pesquisas.length})
              </TabsTrigger>
              <TabsTrigger value="nps" className="text-xs">
                NPS Clientes ({metrics.npsCount})
              </TabsTrigger>
              <TabsTrigger value="enps" className="text-xs">
                eNPS Colaboradores ({metrics.enpsCount})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="relative flex-1 sm:max-w-xs">
          <Search className="h-4 w-4 absolute left-3 top-2.5 text-muted-foreground" />
          <Input
            placeholder="Buscar por título ou descrição..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs bg-background"
          />
        </div>
      </div>

      {/* Grid de Cards de Pesquisas */}
      {loading ? (
        <div className="py-20 text-center text-muted-foreground text-sm">
          Carregando pesquisas...
        </div>
      ) : pesquisasFiltradas.length === 0 ? (
        <div className="py-16 text-center border-2 border-dashed rounded-2xl p-8 space-y-3">
          <Smile className="h-10 w-10 mx-auto text-muted-foreground/60" />
          <h3 className="text-base font-semibold text-[#3E100C]">Nenhuma pesquisa encontrada</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            {search
              ? "Nenhum resultado corresponde à sua pesquisa."
              : "Crie sua primeira pesquisa NPS ou eNPS para começar a coletar a percepção de satisfação."}
          </p>
          <Button
            onClick={handleOpenCreate}
            size="sm"
            className="bg-[#E05A10] hover:bg-[#E05A10]/90 text-white mt-2"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            + Criar Pesquisa Agora
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {pesquisasFiltradas.map((pesquisa) => {
            const isNps = pesquisa.tipo === "nps";
            const score = pesquisa.score_nps ?? pesquisa.scoreNps;
            const linkHash = pesquisa.url_hash || pesquisa.hash_publico || pesquisa.id;
            let scoreBg = "bg-muted text-muted-foreground";
            if (score !== null && score !== undefined) {
              if (score >= 75) scoreBg = "bg-emerald-100 text-emerald-800 border-emerald-300";
              else if (score >= 50) scoreBg = "bg-sky-100 text-sky-800 border-sky-300";
              else if (score >= 0) scoreBg = "bg-amber-100 text-amber-800 border-amber-300";
              else scoreBg = "bg-rose-100 text-rose-800 border-rose-300";
            }

            return (
              <Card
                key={pesquisa.id}
                className="flex flex-col justify-between hover:shadow-md transition-all border border-muted-foreground/15 hover:border-[#E05A10]/50"
              >
                <div className="p-5 space-y-4">
                  {/* Topo do Card */}
                  <div className="flex items-start justify-between gap-2">
                    <Badge
                      variant="outline"
                      className={
                        isNps
                          ? "bg-orange-50 text-[#E05A10] border-orange-200"
                          : "bg-purple-50 text-purple-700 border-purple-200"
                      }
                    >
                      {pesquisa.tipo.toUpperCase()}
                    </Badge>

                    <div className="flex items-center gap-1.5">
                      <Badge
                        variant="secondary"
                        className={
                          pesquisa.status === "ativa"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-muted text-muted-foreground"
                        }
                      >
                        {pesquisa.status === "ativa" ? "Ativa" : "Inativa"}
                      </Badge>
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(pesquisa)}
                        title={pesquisa.status === "ativa" ? "Pausar pesquisa" : "Ativar pesquisa"}
                        className="text-muted-foreground hover:text-[#3E100C] p-1 rounded transition-colors"
                      >
                        <Power className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Título e Descrição */}
                  <div>
                    <h3 className="font-bold text-base text-[#3E100C] line-clamp-1">
                      {pesquisa.titulo}
                    </h3>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                      {pesquisa.descricao || "Sem descrição informada."}
                    </p>
                  </div>

                  {/* Score & Respostas */}
                  <div className="grid grid-cols-2 gap-2 p-3 bg-muted/20 rounded-xl border">
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                        Score Atual
                      </span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-lg font-black text-[#3E100C]">
                          {score !== null && score !== undefined
                            ? score > 0
                              ? `+${score}`
                              : score
                            : "—"}
                        </span>
                        {score !== null && score !== undefined && (
                          <Badge variant="outline" className={`text-[10px] py-0 px-1.5 ${scoreBg}`}>
                            {score >= 75
                              ? "Excelente"
                              : score >= 50
                              ? "Muito Bom"
                              : score >= 0
                              ? "Razoável"
                              : "Crítico"}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                        Respostas
                      </span>
                      <span className="text-lg font-bold text-foreground block mt-0.5">
                        {pesquisa.total_respostas || 0}
                      </span>
                    </div>
                  </div>

                  {/* Hash / Link de Acesso */}
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t">
                    <span className="font-mono truncate max-w-[170px]" title={linkHash}>
                      /p/{linkHash}
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-[#E05A10] hover:bg-[#E05A10]/10"
                        onClick={() => handleCopyLink(pesquisa)}
                      >
                        {copiedHash === pesquisa.id ? (
                          <>
                            <Check className="h-3 w-3 mr-1 text-emerald-600" />
                            Copiado!
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3 mr-1" />
                            Copiar Link
                          </>
                        )}
                      </Button>
                      <a
                        href={generatePublicSurveyLink(pesquisa)}
                        target="_blank"
                        rel="noreferrer"
                        className="h-7 w-7 flex items-center justify-center text-muted-foreground hover:text-foreground rounded"
                        title="Abrir formulário em nova aba"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  </div>
                </div>

                {/* Ações Inferiores do Card */}
                <div className="p-3 bg-muted/10 border-t flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-muted-foreground hover:text-foreground h-8 px-2"
                      onClick={() => handleOpenEdit(pesquisa)}
                    >
                      <Edit className="h-3.5 w-3.5 mr-1" />
                      Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 h-8 px-2"
                      onClick={() => handleDeletePesquisa(pesquisa)}
                      title="Excluir pesquisa"
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" />
                      Excluir
                    </Button>
                  </div>

                  <Button
                    size="sm"
                    className="bg-[#3E100C] hover:bg-[#3E100C]/90 text-white text-xs h-8"
                    onClick={() => handleOpenRelatorio(pesquisa)}
                  >
                    <BarChart3 className="h-3.5 w-3.5 mr-1" />
                    Ver Relatório
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal Form Builder (Criação e Edição) */}
      {isFormModalOpen && (
        <PesquisaFormModal
          isOpen={isFormModalOpen}
          onClose={() => setIsFormModalOpen(false)}
          onSave={async (dadosPesquisa, perguntasLista) => {
            await savePesquisaCompleta(
              {
                ...dadosPesquisa,
                id: editingPesquisa?.id,
              },
              perguntasLista
            );
            await carregarPesquisas();
          }}
          pesquisaEdit={editingPesquisa}
          perguntasEdit={editingPerguntas}
          companyId={companyId}
          companyName={company?.name}
        />
      )}

      {/* Modal de Relatório e Resultados */}
      {isRelatorioOpen && selectedPesquisaParaRelatorio && relatorioData && (
        <PesquisaRelatorioModal
          isOpen={isRelatorioOpen}
          onClose={() => setIsRelatorioOpen(false)}
          pesquisa={selectedPesquisaParaRelatorio}
          relatorio={relatorioData}
        />
      )}
    </div>
  );
}
