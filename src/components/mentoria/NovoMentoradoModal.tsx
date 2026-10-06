import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { User, Briefcase, GraduationCap, Phone, Mail, Award, Users } from "lucide-react";
import { getCandidatesList, type Candidate } from "@/lib/assessment-storage";
import { toast } from "sonner";

export function NovoMentoradoModal({
  open,
  onOpenChange,
  companyId,
  companies = [],
  onSaveMentorado,
  isSaving,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string | null;
  companies?: any[];
  onSaveMentorado: (payload: any) => Promise<any>;
  isSaving?: boolean;
}) {
  const [nome, setNome] = useState("");
  const [cargo, setCargo] = useState("");
  const [idade, setIdade] = useState<number | "">("");
  const [formacao, setFormacao] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(companyId || "");

  // Integração com candidatos existentes do Hub
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>("__none");

  useEffect(() => {
    async function loadCandidates() {
      try {
        const list = await getCandidatesList("todos");
        setCandidates(list);
      } catch {}
    }
    if (open) {
      loadCandidates();
      setSelectedCompanyId(companyId || "");
    }
  }, [open, companyId]);

  // Ao selecionar um candidato existente, preenche automaticamente os campos
  const handleSelectCandidate = (candId: string) => {
    setSelectedCandidateId(candId);
    if (candId === "__none") return;

    const cand = candidates.find((c) => c.id === candId);
    if (cand) {
      setNome(cand.full_name || "");
      setCargo(cand.current_role || cand.desired_role || "");
      setEmail(cand.email || "");
      if (cand.company_id) {
        setSelectedCompanyId(cand.company_id);
      }

      // Calcula idade aproximada se houver data de nascimento
      if (cand.birth_date) {
        const birthYear = new Date(cand.birth_date).getFullYear();
        const currentYear = new Date().getFullYear();
        if (birthYear > 1940 && birthYear < currentYear) {
          setIdade(currentYear - birthYear);
        }
      }
      toast.success("Dados importados do perfil de assessment!");
    }
  };

  const handleSubmit = async () => {
    if (!nome.trim()) {
      toast.error("Informe o nome do mentorado.");
      return;
    }

    const matchedCand = candidates.find((c) => c.id === selectedCandidateId);
    let behavioralProfile = undefined;

    if (matchedCand) {
      behavioralProfile = {
        candidate_id: matchedCand.id,
        dominant_factor: matchedCand.profile_data?.dominant_factor,
        radar: matchedCand.profile_data?.radar,
        ai_summary: matchedCand.ai_summary,
      };
    }

    try {
      await onSaveMentorado({
        nome: nome.trim(),
        cargo: cargo.trim(),
        idade: idade ? Number(idade) : 0,
        formacao: formacao.trim(),
        telefone: telefone.trim(),
        email: email.trim(),
        company_id: selectedCompanyId && selectedCompanyId !== "__all" ? selectedCompanyId : null,
        candidate_id: matchedCand ? matchedCand.id : null,
        behavioral_profile: behavioralProfile,
        status: "ativa",
      });
      toast.success("Mentorado cadastrado com sucesso!");
      onOpenChange(false);
      setNome("");
      setCargo("");
      setIdade("");
      setFormacao("");
      setTelefone("");
      setEmail("");
      setSelectedCandidateId("__none");
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao cadastrar mentorado.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-4 sm:p-6">
        <DialogHeader className="border-b pb-3">
          <div className="flex items-center gap-2">
            <Award className="h-5 w-5 text-[#E05A10]" />
            <DialogTitle className="text-base sm:text-lg font-bold text-[#3E100C]">
              Iniciar Novo Ciclo de Mentoria
            </DialogTitle>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Cadastre um colaborador/líder para acompanhamento individual de desenvolvimento
          </p>
        </DialogHeader>

        <div className="space-y-3.5 py-2 text-xs">
          {/* Opção de Vincular a Candidato/Assessment Existente */}
          {candidates.length > 0 && (
            <div className="p-3 rounded-lg border border-[#E05A10]/30 bg-[#FFF8F5]/60 space-y-1.5">
              <Label className="text-xs font-semibold text-[#3E100C] flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-[#E05A10]" />
                Importar de Perfil Comportamental do Hub (Opcional)
              </Label>
              <Select value={selectedCandidateId} onValueChange={handleSelectCandidate}>
                <SelectTrigger className="h-9 text-xs bg-white">
                  <SelectValue placeholder="Selecione um colaborador já cadastrado..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">— Cadastrar novo sem vínculo prévio —</SelectItem>
                  {candidates.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.full_name} {c.current_role ? `(${c.current_role})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Nome e Cargo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold">Nome Completo *</Label>
              <Input
                placeholder="Ex: Mariana Souza"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">Cargo / Função *</Label>
              <Input
                placeholder="Ex: Gerente de Operações"
                value={cargo}
                onChange={(e) => setCargo(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>

          {/* Idade e Formação */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs font-semibold">Idade</Label>
              <Input
                type="number"
                placeholder="Ex: 34"
                value={idade}
                onChange={(e) => setIdade(e.target.value === "" ? "" : Number(e.target.value))}
                className="h-9 text-xs"
              />
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs font-semibold">Formação Acadêmica</Label>
              <Input
                placeholder="Ex: Engenharia de Produção c/ MBA"
                value={formacao}
                onChange={(e) => setFormacao(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>

          {/* Telefone e Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold">Telefone (WhatsApp)</Label>
              <Input
                placeholder="Ex: (11) 98765-4321"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">E-mail</Label>
              <Input
                placeholder="Ex: mariana.souza@empresa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>

          {/* Empresa */}
          {companies.length > 0 && (
            <div>
              <Label className="text-xs font-semibold">Empresa</Label>
              <Select value={selectedCompanyId || "__none"} onValueChange={(v) => setSelectedCompanyId(v === "__none" ? "" : v)}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Selecione a empresa..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">— Sem empresa vinculada —</SelectItem>
                  {companies.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter className="border-t pt-3">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            type="button"
            className="bg-[#3E100C] hover:bg-[#3E100C]/90 text-white font-semibold text-xs h-9 px-4"
            disabled={isSaving}
            onClick={handleSubmit}
          >
            {isSaving ? "Iniciando..." : "Iniciar Mentoria"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
