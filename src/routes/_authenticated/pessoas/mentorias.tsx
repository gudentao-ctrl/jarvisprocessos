import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Award,
  Users,
  UserCheck,
  Plus,
  ArrowLeft,
  Calendar,
  Sparkles,
  Briefcase,
  Search,
  Filter,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useCompanyFilter } from "@/hooks/useCompanyFilter";
import type { Mentorado, MentoriaSessao } from "@/lib/mentoria-types";
import {
  getMentoradosList,
  getMentoradoById,
  createMentorado,
  updateMentorado,
  saveMentoriaSessao,
  deleteMentoriaSessao,
  finalizarMentoria,
  reabrirMentoria,
} from "@/lib/mentoria-storage";
import { MentoradoCard } from "@/components/mentoria/MentoradoCard";
import { MentoradoDetail } from "@/components/mentoria/MentoradoDetail";
import { AtendimentoModal } from "@/components/mentoria/AtendimentoModal";
import { FinalizarMentoriaModal } from "@/components/mentoria/FinalizarMentoriaModal";
import { NovoMentoradoModal } from "@/components/mentoria/NovoMentoradoModal";
import { generateMentoriaFinalReportPDF } from "@/utils/mentoriaPdfGenerator";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/pessoas/mentorias")({
  head: () => ({
    meta: [
      { title: "Mentorias & Feedbacks | Jarvis Processos" },
      { name: "description", content: "Acompanhamento individual de desenvolvimento de colaboradores e líderes." },
    ],
  }),
  component: MentoriasPage,
});

function MentoriasPage() {
  const { companyId, company, companies } = useCompanyFilter();
  const [mentorados, setMentorados] = useState<Mentorado[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"ativas" | "inativas">("ativas");
  const [search, setSearch] = useState("");

  // Navegação de detalhes
  const [selectedMentoradoId, setSelectedMentoradoId] = useState<string | null>(null);

  // Modais
  const [isNovoModalOpen, setIsNovoModalOpen] = useState(false);
  const [isAtendimentoModalOpen, setIsAtendimentoModalOpen] = useState(false);
  const [isFinalizarModalOpen, setIsFinalizarModalOpen] = useState(false);
  const [sessaoToEdit, setSessaoToEdit] = useState<MentoriaSessao | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const list = await getMentoradosList(companyId);
      setMentorados(list);
    } catch (err) {
      console.error("Erro ao carregar mentorados:", err);
      toast.error("Erro ao carregar lista de mentorias.");
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Mentorado selecionado atual
  const selectedMentorado = useMemo(() => {
    if (!selectedMentoradoId) return null;
    return mentorados.find((m) => m.id === selectedMentoradoId) || null;
  }, [mentorados, selectedMentoradoId]);

  // Listas filtradas por aba e busca
  const mentoradosAtivos = useMemo(() => {
    return mentorados.filter((m) => m.status === "ativa");
  }, [mentorados]);

  const mentoradosInativos = useMemo(() => {
    return mentorados.filter((m) => m.status === "inativa");
  }, [mentorados]);

  const displayedMentorados = useMemo(() => {
    const list = activeTab === "ativas" ? mentoradosAtivos : mentoradosInativos;
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(
      (m) =>
        m.nome.toLowerCase().includes(q) ||
        (m.cargo && m.cargo.toLowerCase().includes(q)) ||
        (m.formacao && m.formacao.toLowerCase().includes(q)),
    );
  }, [activeTab, mentoradosAtivos, mentoradosInativos, search]);

  // Handlers
  const handleCreateMentorado = async (payload: any) => {
    const created = await createMentorado(payload);
    await loadData();
    setSelectedMentoradoId(created.id);
  };

  const handleSaveSessao = async (sessaoPayload: any) => {
    await saveMentoriaSessao(sessaoPayload);
    await loadData();
  };

  const handleDeleteSessao = async (sessaoId: string) => {
    await deleteMentoriaSessao(sessaoId);
    toast.success("Atendimento excluído com sucesso.");
    await loadData();
  };

  const handleFinalizarMentoria = async (parecerFinal: string, pdfUrl?: string) => {
    if (!selectedMentorado) return;
    await finalizarMentoria(selectedMentorado.id, parecerFinal, pdfUrl);
    await loadData();
    setIsFinalizarModalOpen(false);
    setActiveTab("inativas");
  };

  const handleReabrirMentoria = async (mentorado: Mentorado) => {
    await reabrirMentoria(mentorado.id);
    toast.success(`Mentoria de ${mentorado.nome} reaberta com sucesso.`);
    await loadData();
    setActiveTab("ativas");
  };

  const handleDownloadFinalReport = async (mentorado: Mentorado) => {
    try {
      const compName = companies?.find((c) => c.id === mentorado.company_id)?.name || company?.name || "Empresa Cliente";
      const pdf = await generateMentoriaFinalReportPDF(mentorado, mentorado.parecer_final || "", compName);
      pdf.download();
      toast.success("Relatório de Conclusão baixado com sucesso!");
    } catch {
      toast.error("Erro ao gerar relatório.");
    }
  };

  const handleUpdateBehavioralProfile = async (profile: any) => {
    if (!selectedMentorado) return;
    await updateMentorado(selectedMentorado.id, { behavioral_profile: profile });
    await loadData();
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Subnavegação e Breadcrumb do Hub de Pessoas */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E5D5CE]/70 pb-3">
        <div className="flex items-center gap-2">
          <Link
            to="/pessoas/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-[#3E100C] transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Hub de Pessoas
          </Link>
          <span className="text-muted-foreground/40 text-xs">/</span>
          <span className="text-xs font-bold text-[#3E100C]">Mentorias & Feedbacks</span>
        </div>

        {/* Links Rápidos do Hub */}
        <div className="flex items-center gap-1.5">
          <Link
            to="/pessoas/assessment"
            className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <UserCheck className="h-3.5 w-3.5" /> Análise de Perfil
          </Link>
          <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md font-bold bg-[#FFF8F5] text-[#E05A10] border border-[#E05A10]/30 shadow-2xs">
            <Award className="h-3.5 w-3.5" /> Mentorias & Ciclos
          </span>
        </div>
      </div>

      {/* Se houver um mentorado selecionado, exibe a Tela de Detalhes (Requisito B) */}
      {selectedMentorado ? (
        <MentoradoDetail
          mentorado={selectedMentorado}
          companyName={companies?.find((c) => c.id === selectedMentorado.company_id)?.name || company?.name || "Empresa"}
          onBack={() => setSelectedMentoradoId(null)}
          onNovoAtendimento={() => {
            setSessaoToEdit(null);
            setIsAtendimentoModalOpen(true);
          }}
          onEditSessao={(sessao) => {
            setSessaoToEdit(sessao);
            setIsAtendimentoModalOpen(true);
          }}
          onDeleteSessao={handleDeleteSessao}
          onFinalizarMentoria={() => setIsFinalizarModalOpen(true)}
          onReabrirMentoria={() => handleReabrirMentoria(selectedMentorado)}
          onDownloadFinalReport={() => handleDownloadFinalReport(selectedMentorado)}
          onUpdateBehavioralProfile={handleUpdateBehavioralProfile}
        />
      ) : (
        /* Caso contrário, exibe o Dashboard e Card do Mentorado (Requisito A) */
        <div className="space-y-6">
          {/* Cabeçalho do Dashboard */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-lg bg-[#3E100C] text-white flex items-center justify-center">
                  <Award className="h-5 w-5 text-[#E05A10]" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[#3E100C]">
                    Módulo de Mentorias Individuais
                  </h1>
                  <p className="text-xs text-muted-foreground">
                    {company
                      ? `Gestão de planos de desenvolvimento e ciclos de mentoria para ${company.name}`
                      : "Acompanhamento individual de desenvolvimento de colaboradores e lideranças"}
                  </p>
                </div>
              </div>
            </div>

            <Button
              className="bg-[#3E100C] hover:bg-[#3E100C]/90 text-white font-bold text-xs h-10 px-4 gap-1.5 shadow-sm"
              onClick={() => setIsNovoModalOpen(true)}
            >
              <Plus className="h-4 w-4 text-[#E05A10]" /> Iniciar Novo Ciclo de Mentoria
            </Button>
          </div>

          {/* Abas Superiores: "Mentorias Ativas" vs "Mentorias Inativas/Finalizadas" */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5D5CE]/70 pb-3">
            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as any)}
              className="w-full sm:w-auto"
            >
              <TabsList className="bg-[#FFF8F5] border border-[#E5D5CE] p-1 gap-1">
                <TabsTrigger
                  value="ativas"
                  className="data-[state=active]:bg-[#3E100C] data-[state=active]:text-white font-bold text-xs gap-1.5"
                >
                  Mentorias Ativas
                  <Badge
                    variant="secondary"
                    className="ml-1 text-[10px] py-0 px-1.5 bg-white/20 text-inherit"
                  >
                    {mentoradosAtivos.length}
                  </Badge>
                </TabsTrigger>

                <TabsTrigger
                  value="inativas"
                  className="data-[state=active]:bg-[#3E100C] data-[state=active]:text-white font-bold text-xs gap-1.5"
                >
                  Mentorias Inativas / Finalizadas
                  <Badge
                    variant="secondary"
                    className="ml-1 text-[10px] py-0 px-1.5 bg-white/20 text-inherit"
                  >
                    {mentoradosInativos.length}
                  </Badge>
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Campo de Busca Rápida */}
            <div className="relative w-full sm:w-64">
              <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar mentorado ou cargo..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 pl-8 text-xs bg-white"
              />
            </div>
          </div>

          {/* Lista de Cards de Mentorados */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-64 rounded-xl border border-dashed border-[#E5D5CE] animate-pulse bg-muted/20" />
              ))}
            </div>
          ) : displayedMentorados.length === 0 ? (
            <div className="p-12 text-center rounded-xl border border-dashed border-[#E5D5CE] bg-[#FFF8F5]/30 space-y-3">
              <Award className="h-10 w-10 mx-auto text-[#E05A10]/60" />
              <p className="font-bold text-base text-[#3E100C]">
                {activeTab === "ativas"
                  ? "Nenhuma mentoria ativa encontrada"
                  : "Nenhuma mentoria finalizada no histórico"}
              </p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                {activeTab === "ativas"
                  ? "Inicie um ciclo de mentoria para acompanhar sessões, planos de ação e indicadores de avanço de líderes."
                  : "Mentorias que forem concluídas e tiverem seu relatório final emitido aparecerão nesta aba."}
              </p>
              {activeTab === "ativas" && (
                <Button
                  size="sm"
                  className="bg-[#3E100C] hover:bg-[#3E100C]/90 text-white font-semibold text-xs mt-2"
                  onClick={() => setIsNovoModalOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-1 text-[#E05A10]" /> Cadastrar Primeiro Mentorado
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayedMentorados.map((mentorado) => (
                <MentoradoCard
                  key={mentorado.id}
                  mentorado={mentorado}
                  onOpenDetail={(m) => setSelectedMentoradoId(m.id)}
                  onDownloadReport={handleDownloadFinalReport}
                  onReopen={handleReabrirMentoria}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal: Iniciar Novo Mentorado */}
      <NovoMentoradoModal
        open={isNovoModalOpen}
        onOpenChange={setIsNovoModalOpen}
        companyId={companyId}
        companies={companies}
        onSaveMentorado={handleCreateMentorado}
      />

      {/* Modal: Atendimento / Sessão (Requisito C) */}
      {selectedMentorado && (
        <AtendimentoModal
          open={isAtendimentoModalOpen}
          onOpenChange={setIsAtendimentoModalOpen}
          mentoriaId={selectedMentorado.id}
          mentoradoNome={selectedMentorado.nome}
          sessaoToEdit={sessaoToEdit}
          onSaveSessao={handleSaveSessao}
        />
      )}

      {/* Modal: Finalizar Mentoria e Emitir Relatório (Requisito D) */}
      {selectedMentorado && (
        <FinalizarMentoriaModal
          open={isFinalizarModalOpen}
          onOpenChange={setIsFinalizarModalOpen}
          mentorado={selectedMentorado}
          companyName={companies?.find((c) => c.id === selectedMentorado.company_id)?.name || company?.name || "Empresa"}
          onConfirmFinalizacao={handleFinalizarMentoria}
        />
      )}
    </div>
  );
}
