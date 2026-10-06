// src/components/recrutamento/SplitScreenEntrevistaModal.tsx
// Interface Split-Screen para Entrevista da Consultoria (Coluna 3)
// Lado Esquerdo: Visualizador de Currículo e Dados do Candidato
// Lado Direito: Parecer de Avaliação do Consultor (Experiência, Perfil Comportamental, Nota de Aderência)

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  User,
  GraduationCap,
  Briefcase,
  Wrench,
  DollarSign,
  Star,
  CheckCircle2,
  UserX,
  ArrowRight,
  Split,
  MessageCircle,
} from "lucide-react";
import { toast } from "sonner";
import { CandidaturaFunil, ParecerConsultoria } from "@/lib/recrutamento-types";
import { avancarEtapaCandidatura } from "@/lib/recrutamento-storage";

interface SplitScreenEntrevistaModalProps {
  candidatura: CandidaturaFunil | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onReprovar: (candidatura: CandidaturaFunil) => void;
}

export default function SplitScreenEntrevistaModal({
  candidatura,
  isOpen,
  onClose,
  onSuccess,
  onReprovar,
}: SplitScreenEntrevistaModalProps) {
  if (!candidatura) return null;

  const candidato = candidatura.candidato;
  const vaga = candidatura.vaga;
  const parecerAtual = candidatura.parecer_consultoria;

  const [experiencia, setExperiencia] = useState(
    parecerAtual?.experiencia ||
      "Candidato demonstrou sólida experiência prática nas atribuições essenciais da função, com clareza na exposição de entregáveis anteriores.",
  );
  const [perfilComportamental, setPerfilComportamental] = useState(
    parecerAtual?.perfil_comportamental ||
      "Boa postura profissional, escuta empática e boa articulação interpessoal durante o diálogo de alinhamento.",
  );
  const [notaAderencia, setNotaAderencia] = useState<number>(parecerAtual?.nota_aderencia || 8.5);
  const [pontosFortes, setPontosFortes] = useState(parecerAtual?.pontos_fortes || "");
  const [pontosAtencao, setPontosAtencao] = useState(parecerAtual?.pontos_atencao || "");
  const [consultorNome, setConsultorNome] = useState(parecerAtual?.consultor_nome || "Consultor Maia");
  const [loading, setLoading] = useState(false);

  const handleSalvarParecer = async (avancarParaPerfil = false) => {
    try {
      setLoading(true);
      const novoParecer: ParecerConsultoria = {
        experiencia: experiencia.trim(),
        perfil_comportamental: perfilComportamental.trim(),
        nota_aderencia: Number(notaAderencia),
        pontos_fortes: pontosFortes.trim(),
        pontos_atencao: pontosAtencao.trim(),
        data_entrevista: new Date().toISOString().split("T")[0],
        consultor_nome: consultorNome.trim(),
      };

      if (avancarParaPerfil) {
        await avancarEtapaCandidatura(
          candidatura.id,
          "ANALISE_PERFIL",
          `Aprovado na entrevista da consultoria com nota ${notaAderencia}/10. Direcionado para Análise de Perfil.`,
          { parecer_consultoria: novoParecer },
        );
        toast.success("Candidato aprovado e avançado para Análise de Perfil!");
      } else {
        await avancarEtapaCandidatura(
          candidatura.id,
          candidatura.etapa_kanban,
          "Parecer de entrevista da consultoria atualizado.",
          { parecer_consultoria: novoParecer },
        );
        toast.success("Parecer salvo com sucesso!");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar avaliação.");
    } finally {
      setLoading(false);
    }
  };

  const getBadgeColorNota = (n: number) => {
    if (n >= 8.0) return "bg-emerald-500/10 text-emerald-600 border-emerald-500/30";
    if (n >= 6.0) return "bg-amber-500/10 text-amber-600 border-amber-500/30";
    return "bg-rose-500/10 text-rose-600 border-rose-500/30";
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="p-4 border-b bg-muted/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Split className="h-5 w-5 text-primary" />
              <div>
                <DialogTitle className="text-base font-bold">
                  Entrevista da Consultoria • Avaliação Split-Screen
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Vaga: <strong>{vaga?.titulo}</strong> ({vaga?.empresa_nome || "Cliente"}) • Candidato: <strong>{candidato?.nome}</strong>
                </DialogDescription>
              </div>
            </div>

            <Badge variant="outline" className={`font-mono text-xs px-2.5 py-1 ${getBadgeColorNota(notaAderencia)}`}>
              Nota de Aderência: {notaAderencia.toFixed(1)} / 10
            </Badge>
          </div>
        </DialogHeader>

        {/* Corpo Split Screen */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x">
          {/* LADO ESQUERDO: Currículo e Ficha Cadastral do Candidato */}
          <div className="overflow-y-auto p-4 space-y-4 bg-muted/10 text-xs">
            <div className="flex items-center justify-between border-b pb-2">
              <span className="font-semibold text-muted-foreground uppercase text-[10px] tracking-wider flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-primary" />
                Dossiê & Currículo do Candidato
              </span>
              {candidato?.curriculo_nome && (
                <Badge variant="secondary" className="text-[10px]">
                  {candidato.curriculo_nome}
                </Badge>
              )}
            </div>

            {/* Cabeçalho do Candidato */}
            <div className="bg-background p-3 rounded-lg border space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm text-foreground">{candidato?.nome}</h4>
                <span className="text-[11px] text-muted-foreground">CPF: {candidato?.cpf || "-"}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-muted-foreground text-[11px]">
                <div>Email: {candidato?.email || "-"}</div>
                <div>Telefone: {candidato?.telefone || "-"}</div>
                <div>Nascimento: {candidato?.data_nascimento || "-"}</div>
                <div>Pretensão: {candidato?.pretensao_salarial ? `R$ ${candidato.pretensao_salarial.toLocaleString("pt-BR")}` : "-"}</div>
              </div>
            </div>

            {/* Formação */}
            <div className="space-y-1 bg-background p-3 rounded-lg border">
              <div className="font-semibold flex items-center gap-1.5 text-foreground">
                <GraduationCap className="h-3.5 w-3.5 text-primary" />
                Formação Acadêmica
              </div>
              <p className="text-muted-foreground pl-5 leading-relaxed">
                {candidato?.formacao || "Nenhuma formação informada."}
              </p>
            </div>

            {/* Experiências */}
            <div className="space-y-1 bg-background p-3 rounded-lg border">
              <div className="font-semibold flex items-center gap-1.5 text-foreground">
                <Briefcase className="h-3.5 w-3.5 text-primary" />
                Experiências Profissionais
              </div>
              <p className="text-muted-foreground pl-5 leading-relaxed whitespace-pre-line">
                {candidato?.experiencias || candidato?.curriculo_texto || "Resumo de experiências não preenchido."}
              </p>
            </div>

            {/* Ferramentas Dominadas */}
            {candidato?.ferramentas && candidato.ferramentas.length > 0 && (
              <div className="space-y-1.5 bg-background p-3 rounded-lg border">
                <div className="font-semibold flex items-center gap-1.5 text-foreground">
                  <Wrench className="h-3.5 w-3.5 text-primary" />
                  Ferramentas Dominadas
                </div>
                <div className="flex flex-wrap gap-1 pl-5">
                  {candidato.ferramentas.map((f, i) => (
                    <Badge key={i} variant="secondary" className="text-[10px]">
                      {f}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Requisitos da Vaga para Comparação Imediata */}
            {vaga && (
              <div className="space-y-1.5 bg-amber-500/5 border border-amber-500/20 p-3 rounded-lg">
                <div className="font-semibold text-amber-800 dark:text-amber-300 text-[11px]">
                  Requisitos Chave da Vaga ({vaga.titulo}):
                </div>
                <div className="text-[11px] text-muted-foreground space-y-1">
                  <div>• <strong>Formação:</strong> {vaga.requisitos_formacao || "-"}</div>
                  <div>• <strong>Experiência:</strong> {vaga.experiencias_exigidas || "-"}</div>
                  <div>
                    • <strong>Ferramentas exigidas:</strong>{" "}
                    {(vaga.ferramentas_obrigatorias || []).join(", ") || "Nenhuma específica"}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* LADO DIREITO: Formulário de Avaliação do Consultor */}
          <div className="overflow-y-auto p-4 space-y-4 bg-background text-xs">
            <div className="flex items-center justify-between border-b pb-2">
              <span className="font-semibold text-primary uppercase text-[10px] tracking-wider">
                Parecer Técnico do Consultor Maia
              </span>
              <span className="text-[11px] text-muted-foreground">Etapa 3 de 7</span>
            </div>

            {/* Slider de Nota de Aderência (0 a 10) */}
            <div className="space-y-2 bg-muted/30 p-3 rounded-lg border">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                  Nota de Aderência à Vaga (0 a 10)
                </Label>
                <span className="text-base font-bold font-mono text-primary">
                  {notaAderencia.toFixed(1)}
                </span>
              </div>
              <Slider
                value={[notaAderencia]}
                min={0}
                max={10}
                step={0.5}
                onValueChange={(val) => setNotaAderencia(val[0])}
                className="py-1 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>0 - Inadequado</span>
                <span>5 - Parcial</span>
                <span>8 - Bom</span>
                <span>10 - Excelente</span>
              </div>
            </div>

            {/* Parecer sobre Experiência */}
            <div className="space-y-1">
              <Label htmlFor="parecerExp" className="text-xs font-semibold">
                Parecer sobre a Experiência Profissional *
              </Label>
              <Textarea
                id="parecerExp"
                rows={3}
                value={experiencia}
                onChange={(e) => setExperiencia(e.target.value)}
                placeholder="Descreva a consistência técnica, profundidade de casos práticos e resolução de problemas..."
                className="text-xs"
              />
            </div>

            {/* Parecer sobre Perfil Comportamental */}
            <div className="space-y-1">
              <Label htmlFor="parecerComp" className="text-xs font-semibold">
                Parecer sobre Perfil Comportamental *
              </Label>
              <Textarea
                id="parecerComp"
                rows={3}
                value={perfilComportamental}
                onChange={(e) => setPerfilComportamental(e.target.value)}
                placeholder="Postura na entrevista, comunicação, maturidade emocional, alinhamento com a cultura..."
                className="text-xs"
              />
            </div>

            {/* Pontos Fortes e Atenção */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="pFortes" className="text-[11px] font-semibold text-emerald-600">
                  Pontos Fortes Observados
                </Label>
                <Textarea
                  id="pFortes"
                  rows={2}
                  value={pontosFortes}
                  onChange={(e) => setPontosFortes(e.target.value)}
                  placeholder="Ex: Domínio de Bizagi, boa oratória..."
                  className="text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="pAtencao" className="text-[11px] font-semibold text-amber-600">
                  Pontos de Atenção / Gaps
                </Label>
                <Textarea
                  id="pAtencao"
                  rows={2}
                  value={pontosAtencao}
                  onChange={(e) => setPontosAtencao(e.target.value)}
                  placeholder="Ex: Pouca experiência em liderança..."
                  className="text-xs"
                />
              </div>
            </div>

            {/* Consultor Avaliador */}
            <div className="space-y-1">
              <Label htmlFor="consultor" className="text-[11px] font-semibold text-muted-foreground">
                Consultor Responsável
              </Label>
              <Input
                id="consultor"
                value={consultorNome}
                onChange={(e) => setConsultorNome(e.target.value)}
                className="text-xs"
              />
            </div>
          </div>
        </div>

        {/* Rodapé de Ações do Split Screen */}
        <div className="p-3 border-t bg-muted/20 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2">
          {/* Botão Reprovar (Gatilho da Devolutiva Global) */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              onClose();
              onReprovar(candidatura);
            }}
            className="text-rose-600 border-rose-200 hover:bg-rose-50 dark:hover:bg-rose-950 text-xs"
          >
            <UserX className="h-3.5 w-3.5 mr-1" />
            Reprovar & Enviar Devolutiva
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleSalvarParecer(false)}
              disabled={loading}
              className="text-xs"
            >
              Salvar Parecer
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={() => handleSalvarParecer(true)}
              disabled={loading}
              className="text-xs bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
              Aprovar para Análise de Perfil
              <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
