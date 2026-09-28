import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyFilter } from "@/hooks/useCompanyFilter";
import { toast } from "sonner";

interface AssessmentFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AssessmentFormModal({ open, onOpenChange }: AssessmentFormModalProps) {
  const { selectedCompanyId, companies } = useCompanyFilter();
  const [fullName, setFullName] = useState("");
  const [cpf, setCpf] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [currentRole, setCurrentRole] = useState("");
  const [desiredRole, setDesiredRole] = useState("");
  const [companyId, setCompanyId] = useState<string>(selectedCompanyId ?? "");
  const [external, setExternal] = useState(false);
  const [loading, setLoading] = useState(false);

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
      if (cpfDigits.length !== 11) throw new Error("CPF inválido (precisa ter 11 dígitos).");

      const payload: any = {
        full_name: fullName,
        cpf: cpfDigits,
        birth_date: birthDate,
        current_role: currentRole,
        desired_role: desiredRole,
        status: "aguardando",
      };

      if (external) {
        payload.company_id = null;
        payload.external = true;
      } else {
        payload.company_id = companyId;
        payload.external = false;
      }

      const { error } = await supabase.from("candidates").insert([payload]);
      if (error) throw error;
      toast.success("Assessment criado. Aguarde a aprovação do administrador.");
      resetForm();
      onOpenChange(false);
    } catch (err) {
      toast.error((err as Error).message ?? "Erro ao criar assessment.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" onClick={() => onOpenChange(true)}>
          + Novo Assessment
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Criar novo Assessment</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="fullName">Nome completo</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="cpf">CPF</Label>
            <Input id="cpf" value={cpf} onChange={(e) => setCpf(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="birthDate">Data de nascimento</Label>
            <Input
              id="birthDate"
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="currentRole">Cargo atual</Label>
            <Input
              id="currentRole"
              value={currentRole}
              onChange={(e) => setCurrentRole(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="desiredRole">Cargo desejado</Label>
            <Input
              id="desiredRole"
              value={desiredRole}
              onChange={(e) => setDesiredRole(e.target.value)}
              required
            />
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="external"
              checked={external}
              onChange={(e) => setExternal(e.target.checked)}
            />
            <Label htmlFor="external">Candidato externo / sem vínculo</Label>
          </div>
          {!external && (
            <div>
              <Label htmlFor="companySelect">Empresa vinculada</Label>
              <select
                id="companySelect"
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                className="mt-1 block w-full rounded border-gray-300 shadow-sm"
                required
              >
                <option value="" disabled>
                  Selecione a empresa
                </option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Criando..." : "Criar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
