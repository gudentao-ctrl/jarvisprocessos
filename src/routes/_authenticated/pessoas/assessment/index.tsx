import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useCompanyFilter } from "@/hooks/useCompanyFilter";
import AssessmentFilter from "@/components/ui/pessoas/AssessmentFilter";
import TeamScatterChart from "@/components/ui/pessoas/TeamScatterChart";

export const Route = createFileRoute("/pessoas/assessment")({
  component: AssessmentList,
});

interface Candidate {
  id: string;
  full_name: string;
  cpf: string;
  birth_date: string;
  status: string;
  company_id: string;
  profile_data: any;
}

function AssessmentList() {
  const navigate = useNavigate();
  const { companyId } = useCompanyFilter();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const query = supabase.from("candidates").select("*");
      if (companyId) query.eq("company_id", companyId);
      const { data, error } = await query;
      if (error) {
        toast.error("Erro ao buscar assessments.");
        console.error(error);
      } else {
        setCandidates(data as Candidate[]);
      }
      setLoading(false);
    }
    load();
  }, [companyId]);

  const handleCopyLink = (id: string) => {
    const link = `${window.location.origin}/pessoas/assessment/portal/${id}`;
    navigator.clipboard.writeText(link).then(() => toast.success("Link copiado!"));
  };

  const handleWhatsApp = (candidate: Candidate) => {
    // Mensagem padrão (placeholder) – pode ser customizada.
    const message = encodeURIComponent(
      `Olá ${candidate.full_name}, seu assessment está pronto. Acesse: ${window.location.origin}/pessoas/assessment/portal/${candidate.id}`
    );
    const url = `https://wa.me/${candidate.cpf.replace(/\D/g, "")}?text=${message}`;
    window.open(url, "_blank");
  };

  const handleOpen = (id: string) => {
    navigate({ to: "/pessoas/assessment/portal/$uuid", params: { uuid: id } });
  };

  if (loading) return <div className="p-6">Carregando...</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Assessments</h1>
      {/* Filtro secundário por empresa */}
      <AssessmentFilter />

      <table className="min-w-full border border-gray-200">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2 text-left">Nome</th>
            <th className="p-2 text-left">CPF</th>
            <th className="p-2 text-left">Status</th>
            <th className="p-2 text-left">Ações</th>
          </tr>
        </thead>
        <tbody>
          {candidates.map((c) => (
            <tr key={c.id} className="border-t">
              <td className="p-2">{c.full_name}</td>
              <td className="p-2">{c.cpf}</td>
              <td className="p-2 capitalize">{c.status}</td>
              <td className="p-2 space-x-2">
                <Button size="sm" onClick={() => handleCopyLink(c.id)}>
                  Copiar link
                </Button>
                <Button size="sm" onClick={() => handleWhatsApp(c)}>
                  WhatsApp
                </Button>
                <Button size="sm" onClick={() => handleOpen(c.id)}>
                  Abrir
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Gráfico de dispersão da equipe */}
      <section className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Perfil da Equipe</h2>
        <TeamScatterChart candidates={candidates} />
      </section>
    </div>
  );
}

export default AssessmentList;
