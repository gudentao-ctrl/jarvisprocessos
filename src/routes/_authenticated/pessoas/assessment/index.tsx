import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useCompanyFilter } from "@/hooks/useCompanyFilter";
import AssessmentFilter from "@/components/ui/pessoas/AssessmentFilter";
import TeamScatterChart from "@/components/ui/pessoas/TeamScatterChart";
import AssessmentFormModal from "@/components/ui/pessoas/AssessmentFormModal";
import { Plus, Copy, MessageCircle, FileText, ArrowLeft, Building2, User, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getCandidatesList, Candidate } from "@/lib/assessment-storage";

export const Route = createFileRoute("/_authenticated/pessoas/assessment/")({
  component: AssessmentList,
});

function AssessmentList() {
  const navigate = useNavigate();
  const { companies } = useCompanyFilter();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  // Filtro de vínculo independente do filtro global de empresas
  const [vinculoFilter, setVinculoFilter] = useState("todos");

  const loadCandidates = useCallback(async () => {
    try {
      setLoading(true);
      const list = await getCandidatesList(vinculoFilter);
      setCandidates(list);
    } catch (err) {
      console.error("Error loading candidates:", err);
      toast.error("Erro ao carregar lista de assessments.");
    } finally {
      setLoading(false);
    }
  }, [vinculoFilter]);

  useEffect(() => {
    loadCandidates();
  }, [loadCandidates]);

  const handleCandidateCreated = (newCand?: Candidate) => {
    // Recarrega lista
    loadCandidates();
    // Se o candidato criado tiver um vínculo que seria ocultado pelo filtro atual, muda para "todos"
    if (newCand && vinculoFilter !== "todos") {
      const match = newCand.external ? vinculoFilter === "externo" : vinculoFilter === newCand.company_id;
      if (!match) {
        setVinculoFilter("todos");
      }
    }
  };

  const handleCopyLink = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const link = `${window.location.origin}/pessoas/assessment/portal/${id}`;
    navigator.clipboard.writeText(link).then(() => {
      toast.success("Link do Portal do Candidato copiado!");
    });
  };

  const handleWhatsApp = (candidate: Candidate, e: React.MouseEvent) => {
    e.stopPropagation();
    const portalLink = `${window.location.origin}/pessoas/assessment/portal/${candidate.id}`;
    const message = encodeURIComponent(
      `Olá ${candidate.full_name}, seu assessment comportamental (Big Five) do Jarvis Processos está disponível. Acesse o portal no link para responder o teste: ${portalLink}`,
    );
    const url = `https://wa.me/?text=${message}`;
    window.open(url, "_blank");
  };

  const handleOpenDetail = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigate({
      to: "/pessoas/assessment/detail/$id",
      params: { id },
    });
  };

  // Label amigável do vínculo selecionado para exibição nos títulos e no gráfico
  const vinculoLabel = useMemo(() => {
    if (vinculoFilter === "todos") return "Todos os Vínculos (Geral)";
    if (vinculoFilter === "externo") return "Candidatos Externos";
    const comp = companies?.find((c) => c.id === vinculoFilter);
    return comp ? `Empresa: ${comp.name}` : "Empresa Selecionada";
  }, [vinculoFilter, companies]);

  const filteredCandidates = useMemo(() => {
    return candidates.filter((c) => {
      const matchSearch =
        search === "" ||
        c.full_name.toLowerCase().includes(search.toLowerCase()) ||
        c.cpf.includes(search.replace(/\D/g, "")) ||
        (c.current_role && c.current_role.toLowerCase().includes(search.toLowerCase())) ||
        (c.company_name && c.company_name.toLowerCase().includes(search.toLowerCase()));

      const matchStatus =
        statusFilter === "todos" ||
        (statusFilter === "concluido" && c.status === "concluido") ||
        (statusFilter === "em_teste" && c.status === "em_teste") ||
        (statusFilter === "aguardando" && (c.status === "aguardando" || !c.status));

      return matchSearch && matchStatus;
    });
  }, [candidates, search, statusFilter]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "concluido":
        return (
          <Badge className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/20 border-emerald-300">
            Concluído
          </Badge>
        );
      case "em_teste":
        return (
          <Badge className="bg-amber-500/15 text-amber-700 hover:bg-amber-500/20 border-amber-300">
            Em Teste
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-blue-600 border-blue-300">
            Aguardando
          </Badge>
        );
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              to="/pessoas/dashboard"
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              <ArrowLeft className="h-3 w-3" /> Hub de Pessoas
            </Link>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Análise de Perfil (Assessment)</h1>
          <p className="text-sm text-muted-foreground">
            Mapeamento comportamental Big Five (OCEAN), cadastro prévio, links do portal e dossiês
          </p>
        </div>

        <Button onClick={() => setIsModalOpen(true)} className="gap-2 shadow-xs">
          <Plus className="h-4 w-4" />
          Novo Assessment
        </Button>
      </div>

      {/* Independent Vínculo & Search Filter */}
      <AssessmentFilter
        search={search}
        onSearchChange={setSearch}
        status={statusFilter}
        onStatusChange={setStatusFilter}
        vinculo={vinculoFilter}
        onVinculoChange={setVinculoFilter}
        companies={companies}
        totalCount={filteredCandidates.length}
      />

      {/* Table Section */}
      <div className="rounded-lg border bg-card overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b text-muted-foreground font-medium text-xs">
              <tr>
                <th className="p-3 text-left">Colaborador / Candidato</th>
                <th className="p-3 text-left">Vínculo Corporativo</th>
                <th className="p-3 text-left">Cargo</th>
                <th className="p-3 text-left">CPF</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    Carregando assessments...
                  </td>
                </tr>
              ) : filteredCandidates.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground space-y-2">
                    <p>Nenhum assessment encontrado para os filtros selecionados.</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsModalOpen(true)}
                      className="text-xs"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" /> Criar Primeiro Teste
                    </Button>
                  </td>
                </tr>
              ) : (
                filteredCandidates.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => handleOpenDetail(c.id)}
                    className="hover:bg-muted/40 transition-colors cursor-pointer group"
                    title="Clique para ver as informações e o dossiê do colaborador"
                  >
                    <td className="p-3 font-medium">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold">
                          {c.full_name?.charAt(0) || "C"}
                        </div>
                        <div>
                          <div className="group-hover:text-primary transition-colors flex items-center gap-1 font-semibold">
                            {c.full_name}
                            <ChevronRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
                          </div>
                          {c.desired_role && (
                            <div className="text-xs text-muted-foreground font-normal">
                              Alvo: {c.desired_role}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-xs">
                      {c.external ? (
                        <Badge variant="outline" className="text-muted-foreground font-normal">
                          Externo
                        </Badge>
                      ) : (
                        <span className="flex items-center gap-1 text-foreground font-medium">
                          <Building2 className="h-3.5 w-3.5 text-primary" />
                          {c.company_name || "Empresa Vinculada"}
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-muted-foreground">{c.current_role || "—"}</td>
                    <td className="p-3 text-muted-foreground font-mono text-xs">
                      {c.cpf ? c.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4") : "—"}
                    </td>
                    <td className="p-3">{getStatusBadge(c.status)}</td>
                    <td className="p-3 text-right space-x-1 whitespace-nowrap">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => handleCopyLink(c.id, e)}
                        title="Copiar link do portal"
                        className="h-8 px-2.5 text-xs"
                      >
                        <Copy className="h-3.5 w-3.5 mr-1" />
                        <span className="hidden sm:inline">Copiar Link</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => handleWhatsApp(c, e)}
                        title="Enviar link via WhatsApp"
                        className="h-8 px-2.5 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                      >
                        <MessageCircle className="h-3.5 w-3.5 mr-1" />
                        <span className="hidden sm:inline">WhatsApp</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="default"
                        onClick={(e) => handleOpenDetail(c.id, e)}
                        className="h-8 px-2.5 text-xs"
                      >
                        <FileText className="h-3.5 w-3.5 mr-1" />
                        Dossiê
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Team Scatter Chart Section - Vinculo label & filter synced */}
      <section className="pt-2">
        <TeamScatterChart candidates={filteredCandidates} vinculoLabel={vinculoLabel} />
      </section>

      {/* Modal for creating a new candidate assessment */}
      <AssessmentFormModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        onCreated={handleCandidateCreated}
      />
    </div>
  );
}

export default AssessmentList;
