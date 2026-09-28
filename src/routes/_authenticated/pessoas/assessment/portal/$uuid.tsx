import { useEffect, useState } from "react";
import { useNavigate, useParams, createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/pessoas/assessment/portal/$uuid")({
  component: PortalPage,
});

function PortalPage() {
  const { uuid } = useParams({ from: "/pessoas/assessment/portal/$uuid" });
  const navigate = useNavigate();
  const [candidate, setCandidate] = useState<any>(null);
  const [cpf, setCpf] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchCandidate() {
      const { data, error } = await supabase
        .from("candidates")
        .select("full_name, cpf, birth_date, status")
        .eq("id", uuid)
        .single();
      if (error) {
        toast.error("Candidate not found.");
        navigate({ to: "/pessoas/assessment" });
        return;
      }
      setCandidate(data);
    }
    fetchCandidate();
  }, [uuid, navigate]);

  const handleValidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!candidate) return;
    setLoading(true);
    try {
      const cpfDigits = cpf.replace(/\D/g, "");
      if (cpfDigits !== candidate.cpf) throw new Error("CPF não corresponde.");
      if (birthDate !== candidate.birth_date) throw new Error("Data de nascimento não corresponde.");
      // Validation passed – update status to "em_teste"
      const { error } = await supabase
        .from("candidates")
        .update({ status: "em_teste" })
        .eq("id", uuid);
      if (error) throw error;
      toast.success(`Bem‑vindo, ${candidate.full_name}. O teste levará cerca de 10 minutos.`);
      // Redirect to detail page where the assessment will be taken
      navigate({ to: "/pessoas/assessment/detail/$id", params: { id: uuid } });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (!candidate) return null;

  return (
    <div className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Portal do Candidato</h1>
      <p className="mb-4">Digite seu CPF e data de nascimento para iniciar o assessment.</p>
      <form onSubmit={handleValidate} className="space-y-4">
        <div>
          <Input placeholder="CPF" value={cpf} onChange={(e) => setCpf(e.target.value)} required />
        </div>
        <div>
          <Input type="date" placeholder="Data de Nascimento" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} required />
        </div>
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Validando…" : "Iniciar Teste"}
        </Button>
      </form>
    </div>
  );
}
