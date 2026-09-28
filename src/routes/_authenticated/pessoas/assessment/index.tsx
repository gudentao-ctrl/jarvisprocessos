import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useCompanyFilter } from "@/hooks/useCompanyFilter";
import AssessmentFilter from "@/components/ui/pessoas/AssessmentFilter";
import TeamScatterChart from "@/components/ui/pessoas/TeamScatterChart";
import AssessmentFormModal from "@/components/ui/pessoas/AssessmentFormModal";
import { Plus, Copy, ExternalLink, MessageCircle, FileText, ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/pessoas/assessment/")({
  component: AssessmentList,
});

interface Candidate {
  id: string;
  full_name: string;
  cpf: string;
  birth_date?: string;
  current_role?: string;
  desired_role?: string;
  status: string;
  company_id?: string;
  profile_data?: any;
  ai_summary?: any;
  created_at?: string;
}

// Sample fallback data in case database table is not populated yet
const MOCK_CANDIDATES: Candidate[] = [
  {
    id: "demo-cand-1",
    full_name: "Mariana Souza",
    cpf: "12345678901",
    birth_date: "1992-05-14",
    current_role: "Gerente de Operações",
    desired_role: "Diretoria de Operações",
    status: "concluido",
    profile_data: {
      radar: [
        { name: "Execução", value: 85 },
        { name: "Comunicação", value: 72 },
        { name: "Planejamento", value: 80 },
        { name: "Análise", value: 78 },
      ],
    },
    ai_summary: {
      natural: "Orientação para resultados com alta capacidade de liderança operacional.",
      strengths: "Tomada de decisão rápida, pragmatismo e engajamento da equipe.",
      ideal_env: "Projetos estratégicos e gestão de múltiplos processos.",
      blind_spots: "Pode acelerar processos antes de ouvir todas as partes.",
    },
  },
  {
    id: "demo-cand-2",
    full_name: "Lucas Ribeiro",
    cpf: "23456789012",
    birth_date: "1995-10-22",
    current_role: "Analista de Processos Sênior",
    desired_role: "Especialista BPM",
    status: "em_teste",
    profile_data: {
      radar: [
        { name: "Execução", value: 65 },
        { name: "Comunicação", value: 55 },
        { name: "Planejamento", value: 90 },
        { name: "Análise", value: 95 },
      ],
    },
  },
  {
    id: "demo-cand-3",
    full_name: "Camila Fernandes",
    cpf: "34567890123",
    birth_date: "1998-03-30",
    current_role: "Consultora de Negócios",
    desired_role: "Líder de Projetos",
    status: "aguardando",
  },
];

function AssessmentList() {
  const navigate = useNavigate();
  const { companyId, company } = useCompanyFilter();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");

  const loadCandidates = async () => {
    try {
      setLoading(true);
      let query = supabase.from("candidates").select("*").order("created_at", { ascending: false });
      if (companyId) {
        query = query.eq("company_id", companyId);
      }
      const { data, error } = await query;
      if (error) {
        console.warn("Could not query candidates from supabase, using fallbacks:", error);
        setCandidates(MOCK_CANDIDATES);
      } else if (data && data.length > 0) {
        setCandidates(data as Candidate[]);
      } else {
        // If table exists but is empty for this company, show mock candidates as starting demonstration
        setCandidates(MOCK_CANDIDATES);
      }
    } catch (err) {
      console.error(err);
      setCandidates(MOCK_CANDIDATES);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCandidates();
  }, [companyId]);

  const handleCopyLink = (id: string) => {
    const link = `${window.location.origin}/pessoas/assessment/portal/${id}`;
    navigator.clipboard.writeText(link).then(() => {
      toast.success("Link do Portal do Candidato copiado!");
    });
  };

  const handleWhatsApp = (candidate: Candidate) => {
    const portalLink = `${window.location.origin}/pessoas/assessment/portal/${candidate.id}`;
    const message = encodeURIComponent(
      `Olá ${candidate.full_name}, seu assessment do Jarvis Processos está disponível. Acesse o portal no link: ${portalLink}`,
    );
    const cleanCpf = candidate.cpf?.replace(/\D/g, "") ?? "";
    const url = `https://wa.me/?text=${message}`;
    window.open(url, "_blank");
  };

  const handleOpenDetail = (id: string) => {
    navigate({
      to: "/pessoas/assessment/detail/$id",
      params: { id },
    });
  };

  const filteredCandidates = useMemo(() => {
    return candidates.filter((c) => {
      const matchSearch =
        search === "" ||
        c.full_name.toLowerCase().includes(search.toLowerCase()) ||
        c.cpf.includes(search.replace(/\D/g, "")) ||
        (c.current_role && c.current_role.toLowerCase().includes(search.toLowerCase()));

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
          <h1 className="text-2xl font-bold tracking-tight">Assessments Comportamentais</h1>
          <p className="text-sm text-muted-foreground">
            {company
              ? `Empresa: ${company.name}`
              : "Mapeamento comportamental e dossiês de colaboradores"}
          </p>
        </div>

        <Button onClick={() => setIsModalOpen(true)} className="gap-2 shadow-xs">
          <Plus className="h-4 w-4" />
          Novo Assessment
        </Button>
      </div>

      {/* Filter Component */}
      <AssessmentFilter
        search={search}
        onSearchChange={setSearch}
        status={statusFilter}
        onStatusChange={setStatusFilter}
        totalCount={filteredCandidates.length}
      />

      {/* Table Section */}
      <div className="rounded-lg border bg-card overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b text-muted-foreground font-medium text-xs">
              <tr>
                <th className="p-3 text-left">Colaborador / Candidato</th>
                <th className="p-3 text-left">Cargo</th>
                <th className="p-3 text-left">CPF</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-muted-foreground">
                    Carregando assessments...
                  </td>
                </tr>
              ) : filteredCandidates.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-muted-foreground">
                    Nenhum assessment encontrado para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredCandidates.map((c) => (
                  <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                    <td className="p-3 font-medium">
                      <div>{c.full_name}</div>
                      {c.desired_role && (
                        <div className="text-xs text-muted-foreground font-normal">
                          Alvo: {c.desired_role}
                        </div>
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
                        onClick={() => handleCopyLink(c.id)}
                        title="Copiar link do portal"
                        className="h-8 px-2.5"
                      >
                        <Copy className="h-3.5 w-3.5 mr-1" />
                        <span className="hidden sm:inline">Link</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleWhatsApp(c)}
                        title="Enviar por WhatsApp"
                        className="h-8 px-2.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                      >
                        <MessageCircle className="h-3.5 w-3.5 mr-1" />
                        <span className="hidden sm:inline">WhatsApp</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleOpenDetail(c.id)}
                        className="h-8 px-2.5"
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

      {/* Team Scatter Chart Section */}
      <section className="pt-2">
        <TeamScatterChart candidates={filteredCandidates} />
      </section>

      {/* Modal for creating a new candidate assessment */}
      <AssessmentFormModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        onCreated={loadCandidates}
      />
    </div>
  );
}

export default AssessmentList;
