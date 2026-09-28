import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import AssessmentRadar from "@/components/ui/pessoas/AssessmentRadar";
import { generateAssessmentReport } from "@/lib/pdf-generator";

export const Route = createFileRoute("/_authenticated/pessoas/assessment/detail/$id")({
  component: DetailPage,
});

function DetailPage() {
  const { id } = useParams({ from: "/pessoas/assessment/detail/$id" });
  const navigate = useNavigate();
  const [candidate, setCandidate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from("candidates")
        .select("*, profile_data") // assume profile_data holds radar values as JSON
        .eq("id", id)
        .single();
      if (error) {
        toast.error("Candidate not found.");
        navigate({ to: "/pessoas/assessment" });
        return;
      }
      setCandidate(data);
      setLoading(false);
    }
    load();
  }, [id, navigate]);

  const handlePdf = async () => {
    if (!candidate) return;
    setGeneratingPdf(true);
    try {
      const pdfBlob = await generateAssessmentReport(candidate);
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${candidate.full_name.replace(/\s+/g, "_")}_assessment.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Dossiê PDF gerado.");
    } catch (e) {
      toast.error("Erro ao gerar PDF.");
    } finally {
      setGeneratingPdf(false);
    }
  };

  if (loading) return <div className="p-6">Carregando...</div>;

  const { full_name, current_role, desired_role, birth_date, profile_data } = candidate;
  const age = (() => {
    const diff = Date.now() - new Date(birth_date).getTime();
    return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
  })();

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">Assessment – {full_name}</h1>
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <div>
          <p><strong>Cargo atual:</strong> {current_role}</p>
          <p><strong>Cargo desejado:</strong> {desired_role}</p>
          <p><strong>Idade:</strong> {age} anos</p>
        </div>
        <div className="flex items-center justify-center">
          {/* Radar chart showing 4 behavioural profiles */}
          <AssessmentRadar data={profile_data?.radar ?? []} />
        </div>
      </div>

      {/* AI‑generated text blocks – placeholder static content for now */}
      <section className="space-y-4 mb-6">
        <h2 className="text-xl font-semibold">Resumo do Perfil Natural</h2>
        <p>{candidate.ai_summary?.natural ?? "Resumo gerado por IA (placeholder)."}</p>
        <h2 className="text-xl font-semibold">Pontos Fortes & Estilo de Liderança</h2>
        <p>{candidate.ai_summary?.strengths ?? "Texto de IA (placeholder)."}</p>
        <h2 className="text-xl font-semibold">Ambiente de Trabalho Ideal</h2>
        <p>{candidate.ai_summary?.ideal_env ?? "Texto de IA (placeholder)."}</p>
        <h2 className="text-xl font-semibold">Pontos Cegos</h2>
        <p>{candidate.ai_summary?.blind_spots ?? "Texto de IA (placeholder)."}</p>
      </section>

      <Button onClick={handlePdf} disabled={generatingPdf}>
        {generatingPdf ? "Gerando PDF…" : "Gerar Dossiê em PDF"}
      </Button>
    </div>
  );
}
