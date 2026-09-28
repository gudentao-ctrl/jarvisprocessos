import { useNavigate } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyFilter } from "@/hooks/useCompanyFilter";

export default function PessoasDashboard() {
  const navigate = useNavigate();
  const { selectedCompanyId } = useCompanyFilter();
  const [summary, setSummary] = useState({ colaboradores: 0, mentorias: 0, alertas: 0 });

  // Load mini‑summary (placeholder values for now)
  useEffect(() => {
    async function loadSummary() {
      // TODO: replace with real queries
      const { data: people } = await supabase
        .from("candidates")
        .select("id", { count: "exact", head: true })
        .eq("company_id", selectedCompanyId);
      const { data: mentors } = await supabase
        .from("mentorias")
        .select("id", { count: "exact", head: true })
        .eq("company_id", selectedCompanyId);
      // placeholder alert count
      const alerts = 0;
      setSummary({
        colaboradores: people?.length ?? 0,
        mentorias: mentors?.length ?? 0,
        alertas: alerts,
      });
    }
    if (selectedCompanyId) loadSummary();
  }, [selectedCompanyId]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Hub de Pessoas</h1>
      {/* Quick‑access cards */}
      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <Card
          className="p-6 flex flex-col items-center justify-center cursor-pointer"
          onClick={() => navigate({ to: "/pessoas/assessment" })}
        >
          <ShieldAlert className="h-8 w-8 mb-2" />
          <span className="font-medium">Análise de Perfil</span>
        </Card>
        <Card
          className="p-6 flex flex-col items-center justify-center cursor-pointer"
          onClick={() => navigate({ to: "/pessoas/entrevistas" })}
        >
          <ShieldAlert className="h-8 w-8 mb-2" />
          <span className="font-medium">Entrevistas</span>
        </Card>
        <Card
          className="p-6 flex flex-col items-center justify-center cursor-pointer"
          onClick={() => navigate({ to: "/pessoas/mentorias" })}
        >
          <ShieldAlert className="h-8 w-8 mb-2" />
          <span className="font-medium">Mentorias</span>
        </Card>
      </div>

      {/* Mini‑resumo */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Colaboradores mapeados</p>
          <p className="text-xl font-semibold">{summary.colaboradores}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Mentorias ativas</p>
          <p className="text-xl font-semibold">{summary.mentorias}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Alertas de gap de perfil</p>
          <p className="text-xl font-semibold">{summary.alertas}</p>
        </Card>
      </div>
    </div>
  );
}
