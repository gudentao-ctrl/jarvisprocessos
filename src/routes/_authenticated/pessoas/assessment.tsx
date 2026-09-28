import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyFilter } from "@/hooks/useCompanyFilter";
import AssessmentFormModal from "@/components/ui/pessoas/AssessmentFormModal";

export const Route = createFileRoute("/_authenticated/pessoas/assessment")({
  component: AssessmentPage,
});

function AssessmentPage() {
  const navigate = useNavigate();
  const { selectedCompanyId } = useCompanyFilter();
  const [candidates, setCandidates] = useState<any[]>([]);
  const [isModalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from("candidates")
        .select("id, full_name, status, created_at")
        .eq("company_id", selectedCompanyId);
      if (!error) setCandidates(data ?? []);
    }
    if (selectedCompanyId) load();
  }, [selectedCompanyId]);

  const copyLink = (uuid: string) => {
    const link = `${window.location.origin}/pessoas/assessment/portal/${uuid}`;
    navigator.clipboard.writeText(link);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Assessments</h1>
      <Button onClick={() => setModalOpen(true)} className="mb-4">
        + Novo Assessment
      </Button>
      <AssessmentFormModal open={isModalOpen} onOpenChange={setModalOpen} />

      <table className="w-full table-auto border">
        <thead>
          <tr className="bg-muted">
            <th className="p-2 text-left">Nome</th>
            <th className="p-2 text-left">Status</th>
            <th className="p-2 text-left">Ações</th>
          </tr>
        </thead>
        <tbody>
          {candidates.map((c) => (
            <tr key={c.id} className="border-t">
              <td className="p-2">{c.full_name}</td>
              <td className="p-2 capitalize">{c.status}</td>
              <td className="p-2 space-x-2">
                <Button variant="outline" size="sm" onClick={() => copyLink(c.id)}>
                  Copiar Link
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const wa = `https://wa.me/?text=${encodeURIComponent(`Link do Assessment: ${window.location.origin}/pessoas/assessment/portal/${c.id}`)}`;
                    window.open(wa, "_blank");
                  }}
                >
                  WhatsApp
                </Button>
                <Link to="/pessoas/assessment/detail/$id" params={{ id: c.id }}>
                  <Button variant="ghost" size="sm">
                    Abrir
                  </Button>
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
