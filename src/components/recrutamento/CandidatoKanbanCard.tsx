// src/components/recrutamento/CandidatoKanbanCard.tsx
// Card do Candidato dentro das colunas do Kanban ATS
// Exibe dados cadastrais, match %, timeline de entrada nas colunas e atalhos contextuais da etapa

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  User,
  Clock,
  Sparkles,
  ArrowRight,
  UserX,
  FileText,
  Star,
  Building2,
  CheckCircle2,
  Eye,
  Calendar,
} from "lucide-react";
import { CandidaturaFunil, EtapaKanban } from "@/lib/recrutamento-types";

interface CandidatoKanbanCardProps {
  candidatura: CandidaturaFunil;
  onOpenStageAction: (candidatura: CandidaturaFunil) => void;
  onReprovar: (candidatura: CandidaturaFunil) => void;
}

export default function CandidatoKanbanCard({
  candidatura,
  onOpenStageAction,
  onReprovar,
}: CandidatoKanbanCardProps) {
  const candidato = candidatura.candidato;
  const vaga = candidatura.vaga;
  const etapa = candidatura.etapa_kanban;
  const match = candidatura.matchScore || 50;

  // Última data de entrada registrada no histórico
  const historico = candidatura.historico_etapas || [];
  const ultimaTransicao = historico.length > 0 ? historico[historico.length - 1] : null;
  const dataEntradaFormatada = ultimaTransicao?.data
    ? new Date(ultimaTransicao.data).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "-";

  const getMatchBadge = (score: number) => {
    if (score >= 75) {
      return (
        <Badge variant="default" className="text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white font-mono">
          <Sparkles className="h-2.5 w-2.5 mr-0.5" />
          {score}% Match
        </Badge>
      );
    }
    if (score >= 50) {
      return (
        <Badge variant="secondary" className="text-[10px] text-amber-700 dark:text-amber-300 font-mono">
          {score}% Match
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-[10px] font-mono text-muted-foreground">
        {score}% Match
      </Badge>
    );
  };

  const getStageActionLabel = (stage: EtapaKanban) => {
    switch (stage) {
      case "TRIAGEM":
        return "Avaliar Triagem";
      case "ENTREVISTA_CONSULTORIA":
        return "Abrir Split-Screen";
      case "ANALISE_PERFIL":
        return "Análise de Perfil";
      case "ALINHAMENTO_CONTRATANTE":
        return "Desenhar Proposta";
      case "ENTREVISTA_CONTRATANTE":
        return "Parecer Contratante";
      case "FINALIZACAO_CONTRATADO":
        return "Ver Dossiê";
      default:
        return "Ver Detalhes";
    }
  };

  return (
    <Card
      className="p-3 bg-card border border-border/80 shadow-xs hover:shadow-sm hover:border-primary/50 transition-all cursor-pointer group space-y-2.5"
      onClick={() => onOpenStageAction(candidatura)}
    >
      {/* Cabeçalho do Card */}
      <div className="flex items-start justify-between gap-1.5">
        <div className="space-y-0.5 flex-1 min-w-0">
          <h4 className="font-bold text-xs text-foreground group-hover:text-primary transition-colors truncate">
            {candidato?.nome || "Candidato sem nome"}
          </h4>
          <p className="text-[11px] text-muted-foreground truncate">
            {candidato?.formacao || "Formação não informada"}
          </p>
        </div>
        {getMatchBadge(match)}
      </div>

      {/* Vaga e Empresa vinculadas */}
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground bg-muted/30 px-2 py-1 rounded">
        <Building2 className="h-3 w-3 text-primary shrink-0" />
        <span className="truncate">{vaga?.titulo || "Vaga Geral"}</span>
      </div>

      {/* Indicadores específicos da etapa */}
      {etapa === "ENTREVISTA_CONSULTORIA" && candidatura.parecer_consultoria && (
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
            Nota de Aderência:
          </span>
          <span className="font-bold font-mono text-primary">
            {candidatura.parecer_consultoria.nota_aderencia} / 10
          </span>
        </div>
      )}

      {etapa === "ANALISE_PERFIL" && candidatura.analise_perfil && (
        <div className="text-[10px] flex items-center justify-between">
          <span className="text-muted-foreground">Recomendação:</span>
          <Badge variant="outline" className="text-[9px] py-0 text-emerald-600 border-emerald-500/30">
            {candidatura.analise_perfil.recomendacao}
          </Badge>
        </div>
      )}

      {etapa === "ALINHAMENTO_CONTRATANTE" && candidatura.proposta_contratacao && (
        <div className="text-[10px] flex items-center justify-between">
          <span className="text-muted-foreground">Proposta:</span>
          <span className="font-semibold text-emerald-600">
            R$ {candidatura.proposta_contratacao.remuneracao_mensal.toLocaleString("pt-BR")} ({candidatura.proposta_contratacao.tipo_contrato})
          </span>
        </div>
      )}

      {etapa === "FINALIZACAO_CONTRATADO" && (
        <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-semibold">
          <CheckCircle2 className="h-3 w-3" />
          Contratado com Sucesso
        </div>
      )}

      {/* Rastreabilidade / Data de entrada na coluna */}
      <div className="flex items-center justify-between pt-1 border-t text-[10px] text-muted-foreground">
        <div className="flex items-center gap-1" title="Data exata de entrada nesta coluna">
          <Clock className="h-2.5 w-2.5 text-muted-foreground/80" />
          <span>{dataEntradaFormatada}</span>
        </div>

        <span className="text-[9px] text-muted-foreground/70">
          {historico.length} {historico.length === 1 ? "etapa" : "etapas"}
        </span>
      </div>

      {/* Ações Rápidas no Hover */}
      <div className="flex items-center justify-between pt-1 gap-1">
        {etapa !== "FINALIZACAO_CONTRATADO" && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onReprovar(candidatura);
            }}
            title="Reprovar e Enviar Devolutiva"
            className="h-6 px-1.5 text-[10px] text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950"
          >
            <UserX className="h-3 w-3 mr-1" />
            Reprovar
          </Button>
        )}

        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onOpenStageAction(candidatura);
          }}
          className={`h-6 px-2 text-[10px] ml-auto font-medium ${
            etapa === "FINALIZACAO_CONTRATADO" ? "w-full bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20" : ""
          }`}
        >
          {getStageActionLabel(etapa)}
          <ArrowRight className="h-2.5 w-2.5 ml-1" />
        </Button>
      </div>
    </Card>
  );
}
