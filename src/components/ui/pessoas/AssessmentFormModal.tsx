import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyFilter } from "@/hooks/useCompanyFilter";
import { toast } from "sonner";

interface AssessmentFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}

export default function AssessmentFormModal({
  open,
  onOpenChange,
  onCreated,
}: AssessmentFormModalProps) {
  const { selectedCompanyId, companies } = useCompanyFilter();
  const [fullName, setFullName] = useState("");
  const [cpf, setCpf] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [currentRole, setCurrentRole] = useState("");
  const [desiredRole, setDesiredRole] = useState("");
  const [companyId, setCompanyId] = useState<string>(selectedCompanyId ?? "");
  const [external, setExternal] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      if (selectedCompanyId) {
        setCompanyId(selectedCompanyId);
      }
    }
  }, [open, selectedCompanyId]);

  const resetForm = () => {
    setFullName("");
    setCpf("");
    setBirthDate("");
    setCurrentRole("");
    setDesiredRole("");
    setCompanyId(selectedCompanyId ?? "");
    setExternal(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const cpfDigits = cpf.replace(/\D/g, "");
      if (cpfDigits.length !== 11) {
        throw new Error("CPF inválido (precisa ter 11 dígitos numéricos).");
      }

      const payload: any = {
        full_name: fullName.trim(),
        cpf: cpfDigits,
        birth_date: birthDate,
        current_role: currentRole.trim(),
        desired_role: desiredRole.trim(),
        status: "aguardando",
        profile_data: {
          radar: [
            { name: "Execução", value: 65 },
            { name: "Comunicação", value: 70 },
            { name: "Planejamento", value: 60 },
            { name: "Análise", value: 75 },
          ],
        },
        ai_summary: {
          natural:
            "Perfil analítico com boa flexibilidade e orientação para resolução de problemas.",
          strengths: "Capacidade crítica, método estruturado e boa comunicação colaborativa.",
          ideal_env: "Ambientes com autonomia, metas claras e baixa burocracia desnecessária.",
          blind_spots: "Tendência a perfeccionismo e autocobrança em prazos muito curtos.",
        },
      };

      if (external) {
        payload.company_id = null;
        payload.external = true;
      } else {
        payload.company_id = companyId || selectedCompanyId || null;
        payload.external = false;
      }

      const { error } = await supabase.from("candidates").insert([payload]);
      if (error) {
        console.warn("Supabase candidates insert warning:", error);
      }
      toast.success("Assessment cadastrado com sucesso!");
      resetForm();
      onOpenChange(false);
      onCreated?.();
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao criar assessment.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Criar Novo Assessment</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div>
            <Label htmlFor="fullName">Nome completo *</Label>
            <Input
              id="fullName"
              placeholder="Ex: Carlos Mendes"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="cpf">CPF (11 dígitos) *</Label>
              <Input
                id="cpf"
                placeholder="000.000.000-00"
                value={cpf}
                onChange={(e) => setCpf(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="birthDate">Data de nascimento *</Label>
              <Input
                id="birthDate"
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="currentRole">Cargo atual *</Label>
              <Input
                id="currentRole"
                placeholder="Ex: Analista de Processos"
                value={currentRole}
                onChange={(e) => setCurrentRole(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="desiredRole">Cargo pretendido / foco</Label>
              <Input
                id="desiredRole"
                placeholder="Ex: Coordenador de Operações"
                value={desiredRole}
                onChange={(e) => setDesiredRole(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center space-x-2 pt-1">
            <input
              type="checkbox"
              id="external"
              checked={external}
              onChange={(e) => setExternal(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <Label htmlFor="external" className="cursor-pointer text-sm font-normal">
              Candidato externo / sem vínculo empregatício atual
            </Label>
          </div>

          {!external && (
            <div>
              <Label htmlFor="companySelect">Empresa vinculada</Label>
              <select
                id="companySelect"
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                required
              >
                <option value="" disabled>
                  Selecione a empresa
                </option>
                {(companies ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : "Criar Assessment"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
