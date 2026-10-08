import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import ConsultantReport from "@/components/assessment/ConsultantReport";
import { getCandidateById } from "@/lib/assessment-storage";
import {
  CandidatePsychometricResult,
  buildReportForCandidate,
} from "@/utils/psychometrics";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/pessoas/assessment/detail/$id")({
  head: () => ({ meta: [
    { title: "Relatório de Perfil Profissional | Jarvis Processos" },
    { name: "description", content: "Relatório confidencial de perfil, controles do protocolo e desenvolvimento profissional." },
    { property: "og:title", content: "Relatório de Perfil Profissional | Jarvis Processos" },
    { property: "og:description", content: "Análise integrada dos cinco fatores e estilos de atuação." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: DetailPage,
});

export default function DetailPage() {
  const { id } = Route.useParams();
  const [reportData, setReportData] = useState<CandidatePsychometricResult | null>(null);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const cand = await getCandidateById(id);
        if (cand?.status === "concluido" && cand.profile_data?.psychometrics) {
          const report = buildReportForCandidate(cand);
          setReportData(report);
        } else {
          setLoadError("Esta avaliação ainda não possui respostas concluídas para gerar um relatório.");
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

  if (loadError || !reportData) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <Link to="/pessoas/assessment" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
          <ArrowLeft className="h-3 w-3" /> Voltar para Análise de Perfil
        </Link>
        <div className="mt-6 rounded-lg border bg-card p-8 text-center">
          <h1 className="text-lg font-semibold">Relatório indisponível</h1>
          <p className="mt-2 text-sm text-muted-foreground">{loadError || "Não foi possível carregar esta avaliação."}</p>
        </div>
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
