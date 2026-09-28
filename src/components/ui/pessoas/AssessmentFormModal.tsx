import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCompanyFilter } from "@/hooks/useCompanyFilter";
import { toast } from "sonner";
import { createCandidate, Candidate } from "@/lib/assessment-storage";
import { Building2, User, UserCheck, Shield } from "lucide-react";

interface AssessmentFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (newCandidate?: Candidate) => void;
}

export default function AssessmentFormModal({
  open,
  onOpenChange,
  onCreated,
}: AssessmentFormModalProps) {
  const { companies } = useCompanyFilter();
  const [fullName, setFullName] = useState("");
  const [cpf, setCpf] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [currentRole, setCurrentRole] = useState("");
  const [desiredRole, setDesiredRole] = useState("");
  const [companyId, setCompanyId] = useState<string>("");
  const [external, setExternal] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      if (companies && companies.length > 0 && !companyId) {
        setCompanyId(companies[0].id);
      }
    }
  }, [open, companies, companyId]);

  const resetForm = () => {
    setFullName("");
    setCpf("");
    setBirthDate("");
    setCurrentRole("");
    setDesiredRole("");
    setExternal(false);
    if (companies && companies.length > 0) {
      setCompanyId(companies[0].id);
    } else {
      setCompanyId("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const cpfDigits = cpf.replace(/\D/g, "");
      if (cpfDigits.length !== 11) {
        throw new Error("CPF inválido. É obrigatório digitar os 11 dígitos numéricos.");
      }

      const selectedCompany = companies.find((c) => c.id === companyId);
      const companyName = external ? "Candidato Externo" : selectedCompany ? selectedCompany.name : "Empresa Cadastrada";

      const newCand = await createCandidate({
        full_name: fullName.trim(),
        cpf: cpfDigits,
        birth_date: birthDate || undefined,
        current_role: currentRole.trim(),
        desired_role: desiredRole.trim() || undefined,
        status: "aguardando",
        external: external,
        company_id: external ? null : companyId || null,
        company_name: companyName,
        profile_data: {
          radar: [
            { name: "Abertura à Experiência", factor: "A", value: 50, description: "Criatividade e flexibilidade mental" },
            { name: "Conscienciosidade", factor: "C", value: 50, description: "Organização, foco em metas e método" },
            { name: "Extroversão", factor: "E", value: 50, description: "Comunicação, liderança e assertividade" },
            { name: "Amabilidade", factor: "M", value: 50, description: "Empatia, cooperação e trabalho em equipe" },
            { name: "Estabilidade Emocional", factor: "N", value: 50, description: "Resiliência, serenidade e equilíbrio sob pressão" },
          ],
        },
        ai_summary: {
          natural: "Aguardando preenchimento do questionário Big Five de 50 perguntas para consolidação do diagnóstico comportamental.",
        },
      });

      toast.success(`Assessment de ${newCand.full_name} criado com sucesso!`);
      resetForm();
      onOpenChange(false);
      onCreated?.(newCand);
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
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-primary" />
            Cadastrar Novo Assessment Comportamental
          </DialogTitle>
          <DialogDescription className="text-xs">
            Cadastre os dados prévios do colaborador ou candidato para gerar o link individual do portal.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div>
            <Label htmlFor="fullName" className="text-xs font-medium">Nome Completo *</Label>
            <Input
              id="fullName"
              placeholder="Ex: Carlos Alberto Silveira"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="mt-1"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="cpf" className="text-xs font-medium">CPF (11 dígitos) *</Label>
              <Input
                id="cpf"
                placeholder="000.000.000-00"
                value={cpf}
                onChange={(e) => setCpf(e.target.value)}
                maxLength={14}
                className="mt-1"
                required
              />
            </div>
            <div>
              <Label htmlFor="birthDate" className="text-xs font-medium">Data de Nascimento *</Label>
              <Input
                id="birthDate"
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="mt-1"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="currentRole" className="text-xs font-medium">Cargo Atual *</Label>
              <Input
                id="currentRole"
                placeholder="Ex: Analista de Processos Sênior"
                value={currentRole}
                onChange={(e) => setCurrentRole(e.target.value)}
                className="mt-1"
                required
              />
            </div>
            <div>
              <Label htmlFor="desiredRole" className="text-xs font-medium">Cargo Alvo / Pretendido</Label>
              <Input
                id="desiredRole"
                placeholder="Ex: Coordenador de Operações"
                value={desiredRole}
                onChange={(e) => setDesiredRole(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          {/* Vínculo Seleção */}
          <div className="p-3 bg-muted/40 rounded-lg border space-y-2.5">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="external"
                checked={external}
                onChange={(e) => setExternal(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <Label htmlFor="external" className="cursor-pointer text-xs font-medium">
                Candidato Externo (sem vínculo corporativo direto ou processo seletivo)
              </Label>
            </div>

            {!external && (
              <div>
                <Label htmlFor="companySelect" className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                  <Building2 className="h-3.5 w-3.5 text-primary" /> Empresa Vinculada:
                </Label>
                <select
                  id="companySelect"
                  value={companyId}
                  onChange={(e) => setCompanyId(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  required={!external}
                >
                  <option value="" disabled>
                    Selecione a empresa
                  </option>
                  {(companies ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                  {(!companies || companies.length === 0) && (
                    <option value="matriz">Matriz Corporativa</option>
                  )}
                </select>
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="text-xs">
              {loading ? "Salvando..." : "Criar Assessment"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
