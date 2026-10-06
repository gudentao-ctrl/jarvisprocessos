// src/components/recrutamento/VagaFormModal.tsx
// Formulário completo para Criação e Edição de Vagas do ATS Kanban

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Briefcase, Building2, Plus, X, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Vaga, TipoContratacao, StatusVaga } from "@/lib/recrutamento-types";
import { createVaga, updateVaga } from "@/lib/recrutamento-storage";
import { useCompanyFilter } from "@/hooks/useCompanyFilter";

interface VagaFormModalProps {
  vagaToEdit?: Vaga | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (vaga: Vaga) => void;
}

export default function VagaFormModal({
  vagaToEdit,
  isOpen,
  onClose,
  onSuccess,
}: VagaFormModalProps) {
  const { companies, companyId } = useCompanyFilter();

  const [titulo, setTitulo] = useState("");
  const [empresaId, setEmpresaId] = useState("");
  const [empresaNome, setEmpresaNome] = useState("");
  const [departamento, setDepartamento] = useState("");
  const [tipoContratacao, setTipoContratacao] = useState<TipoContratacao>("CLT");
  const [jornada, setJornada] = useState("Presencial - 44h semanais");
  const [salarioMin, setSalarioMin] = useState<number>(6000);
  const [salarioMax, setSalarioMax] = useState<number>(8000);
  const [salarioCombinar, setSalarioCombinar] = useState(false);
  const [requisitosFormacao, setRequisitosFormacao] = useState("");
  const [experienciasExigidas, setExperienciasExigidas] = useState("");
  const [descricao, setDescricao] = useState("");
  const [flyerUrl, setFlyerUrl] = useState("");
  const [status, setStatus] = useState<StatusVaga>("ABERTA");

  // Tags
  const [ferramentas, setFerramentas] = useState<string[]>([]);
  const [novaFerramenta, setNovaFerramenta] = useState("");

  const [softSkills, setSoftSkills] = useState<string[]>([]);
  const [novaSoftSkill, setNovaSoftSkill] = useState("");

  const [beneficios, setBeneficios] = useState<string[]>([]);
  const [novoBeneficio, setNovoBeneficio] = useState("");

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (vagaToEdit) {
      setTitulo(vagaToEdit.titulo || "");
      setEmpresaId(vagaToEdit.empresa_id || "");
      setEmpresaNome(vagaToEdit.empresa_nome || "");
      setDepartamento(vagaToEdit.departamento || "");
      setTipoContratacao(vagaToEdit.tipo_contratacao || "CLT");
      setJornada(vagaToEdit.jornada || "Presencial - 44h semanais");
      setSalarioMin(vagaToEdit.salario_min || 0);
      setSalarioMax(vagaToEdit.salario_max || 0);
      setSalarioCombinar(vagaToEdit.salario_combinar ?? false);
      setRequisitosFormacao(vagaToEdit.requisitos_formacao || "");
      setExperienciasExigidas(vagaToEdit.experiencias_exigidas || "");
      setDescricao(vagaToEdit.descricao || "");
      setFlyerUrl(vagaToEdit.flyer_url || "");
      setStatus(vagaToEdit.status || "ABERTA");
      setFerramentas(vagaToEdit.ferramentas_obrigatorias || []);
      setSoftSkills(vagaToEdit.soft_skills || []);
      setBeneficios(vagaToEdit.beneficios || []);
    } else {
      setTitulo("");
      setEmpresaId(companyId || (companies?.[0]?.id ?? ""));
      const c = companies?.find((comp) => comp.id === (companyId || companies?.[0]?.id));
      setEmpresaNome(c?.name || "Empresa Cliente");
      setDepartamento("Operações");
      setTipoContratacao("CLT");
      setJornada("Presencial - 44h semanais");
      setSalarioMin(6000);
      setSalarioMax(8000);
      setSalarioCombinar(false);
      setRequisitosFormacao("Superior completo na área de atuação.");
      setExperienciasExigidas("Experiência comprovada em rotinas da função.");
      setDescricao("");
      setFlyerUrl("");
      setStatus("ABERTA");
      setFerramentas(["BPMN", "Excel Avançado"]);
      setSoftSkills(["Comunicação Assertiva", "Foco em Resultados"]);
      setBeneficios(["Vale Refeição", "Plano de Saúde", "Seguro de Vida"]);
    }
  }, [vagaToEdit, isOpen, companyId, companies]);

  const handleAddFerramenta = () => {
    if (!novaFerramenta.trim()) return;
    if (!ferramentas.includes(novaFerramenta.trim())) {
      setFerramentas([...ferramentas, novaFerramenta.trim()]);
    }
    setNovaFerramenta("");
  };

  const handleAddSoftSkill = () => {
    if (!novaSoftSkill.trim()) return;
    if (!softSkills.includes(novaSoftSkill.trim())) {
      setSoftSkills([...softSkills, novaSoftSkill.trim()]);
    }
    setNovaSoftSkill("");
  };

  const handleAddBeneficio = () => {
    if (!novoBeneficio.trim()) return;
    if (!beneficios.includes(novoBeneficio.trim())) {
      setBeneficios([...beneficios, novoBeneficio.trim()]);
    }
    setNovoBeneficio("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim()) {
      toast.error("O título da vaga é obrigatório.");
      return;
    }

    try {
      setLoading(true);
      const vagaData: Partial<Vaga> = {
        titulo: titulo.trim(),
        empresa_id: empresaId || null,
        empresa_nome: empresaNome || "Empresa Cliente",
        departamento: departamento.trim(),
        tipo_contratacao: tipoContratacao,
        jornada: jornada.trim(),
        salario_min: Number(salarioMin) || 0,
        salario_max: Number(salarioMax) || 0,
        salario_combinar: salarioCombinar,
        beneficios,
        requisitos_formacao: requisitosFormacao.trim(),
        experiencias_exigidas: experienciasExigidas.trim(),
        ferramentas_obrigatorias: ferramentas,
        soft_skills: softSkills,
        descricao: descricao.trim(),
        flyer_url: flyerUrl.trim(),
        status,
      };

      let result: Vaga;
      if (vagaToEdit) {
        result = await updateVaga(vagaToEdit.id, vagaData);
        toast.success("Vaga atualizada com sucesso!");
      } else {
        result = await createVaga(vagaData);
        toast.success("Vaga criada e aberta para candidaturas!");
      }

      onSuccess(result);
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar vaga.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary">
            <Briefcase className="h-5 w-5" />
            <DialogTitle className="text-base font-bold">
              {vagaToEdit ? "Editar Vaga Mestre" : "Abertura de Nova Vaga"}
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs">
            Preencha todos os requisitos técnicos, econômicos e contratuais da vaga para o ATS.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2 text-xs">
          {/* Dados Principais */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1 md:col-span-2">
              <Label htmlFor="titulo" className="text-xs font-semibold">
                Título do Cargo / Posição *
              </Label>
              <Input
                id="titulo"
                required
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ex: Analista de Processos Sênior"
                className="text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Empresa Contratante</Label>
              <Select
                value={empresaId}
                onValueChange={(val) => {
                  setEmpresaId(val);
                  const c = companies?.find((item) => item.id === val);
                  if (c) setEmpresaNome(c.name);
                }}
              >
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Selecione a empresa" />
                </SelectTrigger>
                <SelectContent>
                  {companies?.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="text-xs">
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="depto" className="text-xs font-semibold">
                Departamento / Área
              </Label>
              <Input
                id="depto"
                value={departamento}
                onChange={(e) => setDepartamento(e.target.value)}
                placeholder="Ex: Operações & Qualidade"
                className="text-xs"
              />
            </div>
          </div>

          {/* Tipo de Contratação e Jornada */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Tipo de Contratação</Label>
              <Select
                value={tipoContratacao}
                onValueChange={(val: any) => setTipoContratacao(val)}
              >
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CLT" className="text-xs">CLT</SelectItem>
                  <SelectItem value="PJ" className="text-xs">PJ</SelectItem>
                  <SelectItem value="Estágio" className="text-xs">Estágio</SelectItem>
                  <SelectItem value="Temporário" className="text-xs">Temporário</SelectItem>
                  <SelectItem value="Cooperado" className="text-xs">Cooperado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1 md:col-span-2">
              <Label htmlFor="jornada" className="text-xs font-semibold">
                Jornada de Trabalho
              </Label>
              <Input
                id="jornada"
                value={jornada}
                onChange={(e) => setJornada(e.target.value)}
                placeholder="Ex: Híbrido (3x presencial, 2x home) - 44h semanais"
                className="text-xs"
              />
            </div>
          </div>

          {/* Faixa Salarial */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-muted/30 p-3 rounded-lg border">
            <div className="space-y-1">
              <Label htmlFor="salMin" className="text-xs font-semibold">
                Salário Mínimo (R$)
              </Label>
              <Input
                id="salMin"
                type="number"
                disabled={salarioCombinar}
                value={salarioMin}
                onChange={(e) => setSalarioMin(Number(e.target.value))}
                className="text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="salMax" className="text-xs font-semibold">
                Salário Máximo (R$)
              </Label>
              <Input
                id="salMax"
                type="number"
                disabled={salarioCombinar}
                value={salarioMax}
                onChange={(e) => setSalarioMax(Number(e.target.value))}
                className="text-xs"
              />
            </div>

            <div className="flex items-center gap-2 pt-5">
              <input
                type="checkbox"
                id="salCombinar"
                checked={salarioCombinar}
                onChange={(e) => setSalarioCombinar(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary"
              />
              <Label htmlFor="salCombinar" className="text-xs cursor-pointer">
                Salário a Combinar
              </Label>
            </div>
          </div>

          {/* Requisitos de Formação e Experiências */}
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="formacao" className="text-xs font-semibold">
                Requisitos de Formação
              </Label>
              <Textarea
                id="formacao"
                rows={2}
                value={requisitosFormacao}
                onChange={(e) => setRequisitosFormacao(e.target.value)}
                placeholder="Ex: Graduação em Engenharia de Produção, Administração ou afins..."
                className="text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="experiencias" className="text-xs font-semibold">
                Experiências Exigidas
              </Label>
              <Textarea
                id="experiencias"
                rows={2}
                value={experienciasExigidas}
                onChange={(e) => setExperienciasExigidas(e.target.value)}
                placeholder="Ex: Mínimo 3 anos de experiência em mapeamento de processos AS-IS/TO-BE..."
                className="text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="descricao" className="text-xs font-semibold">
                Descritivo Detalhado do Cargo / Escopo de Atuação
              </Label>
              <Textarea
                id="descricao"
                rows={3}
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Responsabilidades do dia a dia, entregáveis e desafios da posição..."
                className="text-xs"
              />
            </div>
          </div>

          {/* Ferramentas Obrigatórias (Tags) */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Ferramentas & Tecnologias Requeridas</Label>
            <div className="flex gap-2">
              <Input
                value={novaFerramenta}
                onChange={(e) => setNovaFerramenta(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddFerramenta())}
                placeholder="Ex: Bizagi, Power BI, BPMN..."
                className="text-xs"
              />
              <Button type="button" size="sm" variant="outline" onClick={handleAddFerramenta} className="text-xs">
                <Plus className="h-3.5 w-3.5 mr-1" />
                Adicionar
              </Button>
            </div>
            <div className="flex flex-wrap gap-1 mt-1">
              {ferramentas.map((f, i) => (
                <Badge key={i} variant="secondary" className="text-[10px] gap-1">
                  {f}
                  <X
                    className="h-3 w-3 cursor-pointer hover:text-destructive"
                    onClick={() => setFerramentas(ferramentas.filter((_, idx) => idx !== i))}
                  />
                </Badge>
              ))}
            </div>
          </div>

          {/* Soft Skills (Tags) */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Soft Skills Desejadas</Label>
            <div className="flex gap-2">
              <Input
                value={novaSoftSkill}
                onChange={(e) => setNovaSoftSkill(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddSoftSkill())}
                placeholder="Ex: Liderança, Resiliência, Comunicação Assertiva..."
                className="text-xs"
              />
              <Button type="button" size="sm" variant="outline" onClick={handleAddSoftSkill} className="text-xs">
                <Plus className="h-3.5 w-3.5 mr-1" />
                Adicionar
              </Button>
            </div>
            <div className="flex flex-wrap gap-1 mt-1">
              {softSkills.map((s, i) => (
                <Badge key={i} variant="outline" className="text-[10px] gap-1 text-amber-700 dark:text-amber-300">
                  {s}
                  <X
                    className="h-3 w-3 cursor-pointer hover:text-destructive"
                    onClick={() => setSoftSkills(softSkills.filter((_, idx) => idx !== i))}
                  />
                </Badge>
              ))}
            </div>
          </div>

          {/* Benefícios (Tags) */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Pacote de Benefícios</Label>
            <div className="flex gap-2">
              <Input
                value={novoBeneficio}
                onChange={(e) => setNovoBeneficio(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddBeneficio())}
                placeholder="Ex: VR R$ 40/dia, Plano Bradesco..."
                className="text-xs"
              />
              <Button type="button" size="sm" variant="outline" onClick={handleAddBeneficio} className="text-xs">
                <Plus className="h-3.5 w-3.5 mr-1" />
                Adicionar
              </Button>
            </div>
            <div className="flex flex-wrap gap-1 mt-1">
              {beneficios.map((b, i) => (
                <Badge key={i} variant="secondary" className="text-[10px] gap-1 text-emerald-700 dark:text-emerald-300">
                  {b}
                  <X
                    className="h-3 w-3 cursor-pointer hover:text-destructive"
                    onClick={() => setBeneficios(beneficios.filter((_, idx) => idx !== i))}
                  />
                </Badge>
              ))}
            </div>
          </div>

          {/* Flyer da Vaga / Imagem Social */}
          <div className="space-y-1">
            <Label htmlFor="flyer" className="text-xs font-semibold">
              URL da Imagem / Card da Vaga (Flyer para Redes Sociais)
            </Label>
            <Input
              id="flyer"
              value={flyerUrl}
              onChange={(e) => setFlyerUrl(e.target.value)}
              placeholder="https://exemplo.com/flyer-vaga.jpg"
              className="text-xs"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" size="sm" disabled={loading} className="text-xs">
              {loading ? "Salvando..." : vagaToEdit ? "Salvar Alterações" : "Criar Vaga"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
