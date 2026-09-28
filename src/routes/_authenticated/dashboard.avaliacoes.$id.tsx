import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import ConsultantReport from "@/components/assessment/ConsultantReport";
import { getCandidateById } from "@/lib/assessment-storage";
import { CandidatePsychometricResult, MOCK_CONSULTANT_REPORT_STATE } from "@/utils/psychometrics";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard/avaliacoes/$id")({
  component: DashboardAvaliacaoDetalhePage,
});

export default function DashboardAvaliacaoDetalhePage() {
  const { id } = Route.useParams();
  const [reportData, setReportData] = useState<CandidatePsychometricResult>(MOCK_CONSULTANT_REPORT_STATE);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const cand = await getCandidateById(id);
        if (cand && cand.profile_data?.psychometrics) {
          setReportData(cand.profile_data.psychometrics);
        } else if (cand) {
          // Utiliza o estado do mock enriquecido com os dados do candidato encontrado
          setReportData({
            ...MOCK_CONSULTANT_REPORT_STATE,
            candidato: {
              ...MOCK_CONSULTANT_REPORT_STATE.candidato,
              id: cand.id,
              nome: cand.full_name,
              cargoPretendido: cand.desired_role || cand.current_role || "Operações",
            },
          });
        }
      } catch (err) {
        console.error("Error loading candidate assessment:", err);
        toast.error("Erro ao carregar avaliação do consultor.");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  if (loading) {
    return (
      <div className="p-12 text-center text-muted-foreground text-sm">
        Carregando Relatório Técnico do Consultor...
      </div>
    );
  }

  return (
    <div className="p-6">
      <ConsultantReport data={reportData} />
    </div>
  );
}
