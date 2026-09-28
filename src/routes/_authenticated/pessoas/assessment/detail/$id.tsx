import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import ConsultantReport from "@/components/assessment/ConsultantReport";
import { getCandidateById } from "@/lib/assessment-storage";
import {
  CandidatePsychometricResult,
  MOCK_CONSULTANT_REPORT_STATE,
  buildReportForCandidate,
} from "@/utils/psychometrics";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/pessoas/assessment/detail/$id")({
  component: DetailPage,
});

export default function DetailPage() {
  const { id } = Route.useParams();
  const [reportData, setReportData] = useState<CandidatePsychometricResult>(MOCK_CONSULTANT_REPORT_STATE);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const cand = await getCandidateById(id);
        if (cand) {
          const report = buildReportForCandidate(cand);
          setReportData(report);
        } else {
          setReportData(MOCK_CONSULTANT_REPORT_STATE);
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
    <div className="p-6 max-w-7xl mx-auto space-y-4">
      <div className="flex items-center gap-2">
        <Link
          to="/pessoas/assessment"
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
        >
          <ArrowLeft className="h-3 w-3" /> Voltar para Análise de Perfil (Assessments)
        </Link>
      </div>

      <ConsultantReport data={reportData} />
    </div>
  );
}
