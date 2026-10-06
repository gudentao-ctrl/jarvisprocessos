// src/components/recrutamento/NovoCandidatoModal.tsx
// Formulário de Cadastro do Candidato para a Coluna 2 (Triagem) com Match Automático de Vagas

import { useState, useMemo } from "react";
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
import {
  UserPlus,
  Upload,
  Sparkles,
  FileText,
  Plus,
  X,
  CheckCircle2,
  Briefcase,
} from "lucide-react";
import { toast } from "sonner";
import { Vaga, RecrutamentoCandidato } from "@/lib/recrutamento-types";
import { createCandidato, calcularMatchVagas } from "@/lib/recrutamento-storage";

interface NovoCandidatoModalProps {
  vagas: Vaga[];
  selectedVagaId?: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (cand: RecrutamentoCandidato) => void;
}

export default function NovoCandidatoModal({
  vagas,
  selectedVagaId,
  isOpen,
  onClose,
  onSuccess,
}: NovoCandidatoModalProps) {
  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [formacao, setFormacao] = useState("");
  const [experiencias, setExperiencias] = useState("");
  const [ultimosSalarios, setUltimosSalarios] = useState("");
  const [pretensaoSalarial, setPretensaoSalarial] = useState<number>(0);
  const [vagaAlvoId, setVagaAlvoId] = useState(selectedVagaId || vagas[0]?.id || "");

  // Ferramentas / Tecnologias
  const [ferramentas, setFerramentas] = useState<string[]>([]);
  const [novaFerramenta, setNovaFerramenta] = useState("");

  // Upload do Currículo
  const [curriculoNome, setCurriculoNome] = useState("");
  const [curriculoTexto, setCurriculoTexto] = useState("");

  const [loading, setLoading] = useState(false);

  // Match Automático com as Vagas em Aberto
  const matchResultados = useMemo(() => {
    if (!vagas || vagas.length === 0) return [];
    return calcularMatchVagas(
      {
        nome,
        formacao,
        experiencias,
        pretensao_salarial: pretensaoSalarial,
        ferramentas,
      },
      vagas,
    );
  }, [nome, formacao, experiencias, pretensaoSalarial, ferramentas, vagas]);

  const handleAddFerramenta = () => {
    if (!novaFerramenta.trim()) return;
    if (!ferramentas.includes(novaFerramenta.trim())) {
      setFerramentas([...ferramentas, novaFerramenta.trim()]);
    }
    setNovaFerramenta("");
  };

  const handleUploadCV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCurriculoNome(file.name);
      toast.success(`Arquivo "${file.name}" anexado!`);
      // Leitura simulada de texto do currículo para auxiliar o match
      setCurriculoTexto(`Currículo de ${nome || "candidato"} importado do arquivo ${file.name}.`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) {
      toast.error("O nome do candidato é obrigatório.");
      return;
    }
    if (!vagaAlvoId) {
      toast.error("Selecione a vaga inicial para candidatura.");
      return;
    }

    try {
      setLoading(true);
      const candData: Partial<RecrutamentoCandidato> = {
        nome: nome.trim(),
        cpf: cpf.trim(),
        data_nascimento: dataNascimento,
        email: email.trim(),
        telefone: telefone.trim(),
        formacao: formacao.trim(),
        experiencias: experiencias.trim(),
        ultimos_salarios: ultimosSalarios.trim(),
        pretensao_salarial: Number(pretensaoSalarial) || 0,
        ferramentas,
        curriculo_nome: curriculoNome || (experiencias ? "Curriculo_Declarado.pdf" : ""),
        curriculo_texto: curriculoTexto || experiencias,
        curriculo_url: "",
      };

      const result = await createCandidato(candData, vagaAlvoId);
      toast.success(`${nome} cadastrado com sucesso e incluído na Triagem!`);
      onSuccess(result.candidato);
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Erro ao cadastrar candidato.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary">
            <UserPlus className="h-5 w-5" />
            <DialogTitle className="text-base font-bold">Cadastro de Candidato (Triagem ATS)</DialogTitle>
          </div>
          <DialogDescription className="text-xs">
            Insira os dados profissionais e anexe o currículo. O sistema calculará o match automático com as vagas ativas.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2 text-xs">
          {/* Seletor de Vaga Alvo */}
          <div className="space-y-1 bg-primary/5 p-3 rounded-lg border border-primary/20">
            <Label className="text-xs font-semibold text-primary">Vaga de Inscrição Inicial *</Label>
            <Select value={vagaAlvoId} onValueChange={(val) => setVagaAlvoId(val)}>
              <SelectTrigger className="text-xs bg-background">
                <SelectValue placeholder="Selecione a vaga" />
              </SelectTrigger>
              <SelectContent>
                {vagas.map((v) => (
                  <SelectItem key={v.id} value={v.id} className="text-xs">
                    {v.titulo} ({v.empresa_nome || "Cliente"})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Dados Pessoais */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1 md:col-span-2">
              <Label htmlFor="nome" className="text-xs font-semibold">
                Nome Completo *
              </Label>
              <Input
                id="nome"
                required
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Carlos Eduardo Silveira"
                className="text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="cpf" className="text-xs font-semibold">
                CPF
              </Label>
              <Input
                id="cpf"
                value={cpf}
                onChange={(e) => setCpf(e.target.value)}
                placeholder="000.000.000-00"
                className="text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="dataNasc" className="text-xs font-semibold">
                Data de Nascimento
              </Label>
              <Input
                id="dataNasc"
                type="date"
                value={dataNascimento}
                onChange={(e) => setDataNascimento(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="email" className="text-xs font-semibold">
                E-mail
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="candidato@email.com"
                className="text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="telefone" className="text-xs font-semibold">
                Telefone / WhatsApp
              </Label>
              <Input
                id="telefone"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                placeholder="(11) 98765-4321"
                className="text-xs"
              />
            </div>
          </div>

          {/* Formação e Experiências */}
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="formacao" className="text-xs font-semibold">
                Formação Acadêmica
              </Label>
              <Input
                id="formacao"
                value={formacao}
                onChange={(e) => setFormacao(e.target.value)}
                placeholder="Ex: Administração de Empresas - FGV (2020)"
                className="text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="exp" className="text-xs font-semibold">
                Resumo das Experiências Profissionais
              </Label>
              <Textarea
                id="exp"
                rows={3}
                value={experiencias}
                onChange={(e) => setExperiencias(e.target.value)}
                placeholder="Principais empresas, cargos exercidos, tempo de atuação e conquistas relevantes..."
                className="text-xs"
              />
            </div>
          </div>

          {/* Salários */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-muted/30 p-3 rounded-lg border">
            <div className="space-y-1">
              <Label htmlFor="ultSal" className="text-xs font-semibold">
                Últimos Salários Praticados
              </Label>
              <Input
                id="ultSal"
                value={ultimosSalarios}
                onChange={(e) => setUltimosSalarios(e.target.value)}
                placeholder="Ex: R$ 6.200,00 CLT + Benefícios"
                className="text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="pretSal" className="text-xs font-semibold">
                Pretensão Salarial Mensal (R$)
              </Label>
              <Input
                id="pretSal"
                type="number"
                value={pretensaoSalarial || ""}
                onChange={(e) => setPretensaoSalarial(Number(e.target.value))}
                placeholder="Ex: 7000"
                className="text-xs"
              />
            </div>
          </div>

          {/* Ferramentas Dominadas (Tags) */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Ferramentas e Competências Dominadas</Label>
            <div className="flex gap-2">
              <Input
                value={novaFerramenta}
                onChange={(e) => setNovaFerramenta(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddFerramenta())}
                placeholder="Ex: Bizagi, Excel Avançado, SAP..."
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

          {/* Upload do Arquivo de Currículo */}
          <div className="space-y-1.5 border border-dashed rounded-lg p-3 text-center hover:bg-muted/30 transition-colors">
            <Label htmlFor="uploadCv" className="cursor-pointer block space-y-1">
              <Upload className="h-5 w-5 mx-auto text-primary" />
              <span className="text-xs font-semibold text-primary block">
                {curriculoNome ? `Arquivo anexado: ${curriculoNome}` : "Upload do Arquivo de Currículo (PDF/Doc)"}
              </span>
              <span className="text-[11px] text-muted-foreground block">
                Clique para selecionar ou arraste o arquivo do candidato
              </span>
            </Label>
            <input
              id="uploadCv"
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={handleUploadCV}
              className="hidden"
            />
          </div>

          {/* Match Automático de Vagas */}
          <div className="space-y-2 bg-gradient-to-r from-primary/5 via-amber-500/5 to-transparent p-3 rounded-lg border border-primary/20">
            <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
              <Sparkles className="h-4 w-4 text-amber-500" />
              Match Automático: Vagas que podem ser adequadas ao perfil
            </div>
            <p className="text-[11px] text-muted-foreground">
              Baseado na correlação de ferramentas dominadas, experiências e pretensão salarial:
            </p>

            <div className="grid grid-cols-1 gap-2 pt-1">
              {matchResultados.slice(0, 3).map((match, idx) => (
                <div
                  key={idx}
                  onClick={() => setVagaAlvoId(match.vaga.id)}
                  className={`p-2 rounded-md border text-xs cursor-pointer transition-all flex items-center justify-between ${
                    vagaAlvoId === match.vaga.id
                      ? "bg-primary/10 border-primary shadow-xs"
                      : "bg-background hover:bg-muted/50"
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="font-semibold text-foreground flex items-center gap-1.5">
                      {match.vaga.titulo}
                      {vagaAlvoId === match.vaga.id && (
                        <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                      )}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {match.vaga.empresa_nome} • {match.vaga.tipo_contratacao}
                    </div>
                    {match.motivos.length > 0 && (
                      <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                        ✓ {match.motivos[0]}
                      </div>
                    )}
                  </div>
                  <Badge
                    variant={match.score >= 70 ? "default" : "secondary"}
                    className="text-xs font-mono font-bold"
                  >
                    {match.score}% Match
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" size="sm" disabled={loading} className="text-xs">
              {loading ? "Cadastrando..." : "Cadastrar na Triagem"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
