import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  User,
  Briefcase,
  GraduationCap,
  Phone,
  Mail,
  Calendar,
  Clock,
  CheckSquare,
  TrendingUp,
  FileDown,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
} from "lucide-react";
import type { Mentorado } from "@/lib/mentoria-types";

// Helper de Sparkline SVG
function Sparkline({ values }: { values: number[] }) {
  if (!values || values.length === 0) return null;
  const width = 80;
  const height = 24;
  const min = 0;
  const max = 5;

  if (values.length === 1) {
    const y = height - (values[0] / max) * height;
    return (
      <svg width={width} height={height} className="overflow-visible">
        <line x1="0" y1={y} x2={width} y2={y} stroke="#E05A10" strokeWidth="2" strokeDasharray="3 3" />
        <circle cx={width / 2} cy={y} r="3" fill="#E05A10" />
      </svg>
    );
  }

  const step = width / (values.length - 1);
  const points = values
    .map((v, i) => {
      const x = i * step;
      const y = height - ((v - min) / (max - min)) * (height - 4) - 2;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        fill="none"
        stroke="#E05A10"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
      {values.map((v, i) => {
        const x = i * step;
        const y = height - ((v - min) / (max - min)) * (height - 4) - 2;
        return <circle key={i} cx={x} cy={y} r="2.5" fill="#3E100C" stroke="#FFF" strokeWidth="1" />;
      })}
    </svg>
  );
}

export function MentoradoCard({
  mentorado,
  onOpenDetail,
  onDownloadReport,
  onReopen,
}: {
  mentorado: Mentorado;
  onOpenDetail: (mentorado: Mentorado) => void;
  onDownloadReport?: (mentorado: Mentorado) => void;
  onReopen?: (mentorado: Mentorado) => void;
}) {
  const isAtiva = mentorado.status === "ativa";
  const media = Number(mentorado.mediaAvanco || 0);

  const getAvancoBadge = (nota: number) => {
    if (nota >= 4.0) return { label: "Alto Avanço", bg: "bg-emerald-50 text-emerald-800 border-emerald-300" };
    if (nota >= 3.0) return { label: "Avanço Adequado", bg: "bg-blue-50 text-blue-800 border-blue-300" };
    if (nota > 0) return { label: "Em Desenvolvimento", bg: "bg-amber-50 text-amber-800 border-amber-300" };
    return { label: "Sem Diagnóstico", bg: "bg-muted text-muted-foreground border-border" };
  };

  const avanco = getAvancoBadge(media);

  return (
    <Card
      onClick={() => onOpenDetail(mentorado)}
      className="group relative flex flex-col justify-between overflow-hidden border border-[#E5D5CE] hover:border-[#E05A10]/60 hover:shadow-md transition-all cursor-pointer bg-white"
    >
      {/* Top Banner sutil */}
      <div className={`h-1.5 w-full ${isAtiva ? "bg-gradient-to-r from-[#3E100C] to-[#E05A10]" : "bg-muted-foreground/40"}`} />

      <div className="p-4 sm:p-5 space-y-4">
        {/* Cabeçalho do Card */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-bold text-base text-[#3E100C] group-hover:text-[#E05A10] transition-colors truncate">
                {mentorado.nome}
              </h3>
              <Badge
                variant="outline"
                className={`text-[10px] font-semibold ${
                  isAtiva
                    ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                    : "bg-muted text-muted-foreground border-border"
                }`}
              >
                {isAtiva ? "Mentoria Ativa" : "Finalizada"}
              </Badge>
              {mentorado.behavioral_profile?.dominant_factor && (
                <Badge
                  variant="outline"
                  className="bg-[#FFF8F5] text-[#E05A10] border-[#E05A10]/30 text-[10px] font-medium"
                >
                  <ShieldCheck className="h-3 w-3 mr-0.5" />
                  {mentorado.behavioral_profile.dominant_factor}
                </Badge>
              )}
            </div>
            <p className="text-xs font-medium text-muted-foreground mt-0.5 flex items-center gap-1">
              <Briefcase className="h-3.5 w-3.5 text-[#E05A10] shrink-0" />
              <span className="truncate">{mentorado.cargo || "Cargo não informado"}</span>
              {mentorado.idade ? ` · ${mentorado.idade} anos` : ""}
            </p>
          </div>
        </div>

        {/* Informações Pessoais / Dados do Card */}
        <div className="space-y-1.5 text-xs text-muted-foreground bg-[#FFF8F5]/60 p-2.5 rounded-lg border border-[#E5D5CE]/50">
          {mentorado.formacao && (
            <p className="flex items-center gap-1.5 truncate">
              <GraduationCap className="h-3.5 w-3.5 text-[#3E100C] shrink-0" />
              <span className="truncate font-medium text-foreground">{mentorado.formacao}</span>
            </p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 pt-0.5">
            {mentorado.telefone && (
              <p className="flex items-center gap-1.5 truncate">
                <Phone className="h-3 w-3 text-muted-foreground shrink-0" />
                <span>{mentorado.telefone}</span>
              </p>
            )}
            {mentorado.email && (
              <p className="flex items-center gap-1.5 truncate">
                <Mail className="h-3 w-3 text-muted-foreground shrink-0" />
                <span className="truncate">{mentorado.email}</span>
              </p>
            )}
          </div>
        </div>

        {/* Big Numbers (KPIs do Card) */}
        <div className="grid grid-cols-3 gap-2 pt-1 border-t border-[#E5D5CE]/60">
          <div className="p-2 rounded-lg bg-muted/20 text-center">
            <span className="text-[10px] uppercase font-bold text-muted-foreground block">
              Atendimentos
            </span>
            <span className="text-sm sm:text-base font-black text-[#3E100C]">
              {mentorado.totalAtendimentos || 0}
            </span>
          </div>

          <div className="p-2 rounded-lg bg-muted/20 text-center">
            <span className="text-[10px] uppercase font-bold text-muted-foreground block">
              Horas Totais
            </span>
            <span className="text-sm sm:text-base font-black text-[#3E100C]">
              {(mentorado.totalHoras || 0).toFixed(1)}h
            </span>
          </div>

          <div className="p-2 rounded-lg bg-muted/20 text-center">
            <span className="text-[10px] uppercase font-bold text-muted-foreground block">
              Ações Feitas
            </span>
            <span className="text-sm sm:text-base font-black text-[#E05A10]">
              {mentorado.acoesConcluidas || 0}/{mentorado.totalAcoes || 0}
            </span>
          </div>
        </div>

        {/* Minigráfico (Sparkline/Gauge): Nota média do Indicador de Avanço */}
        <div className="flex items-center justify-between gap-3 p-2.5 rounded-lg border border-[#E5D5CE]/80 bg-white">
          <div>
            <div className="flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-[#E05A10]" />
              <span className="text-[11px] font-bold text-[#3E100C]">
                Indicador de Avanço
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-base font-black text-[#E05A10]">
                {media > 0 ? media.toFixed(1) : "—"}
              </span>
              <span className="text-[10px] text-muted-foreground">/ 5.0</span>
              <Badge variant="outline" className={`text-[9px] font-semibold py-0 px-1.5 ${avanco.bg}`}>
                {avanco.label}
              </Badge>
            </div>
          </div>

          {/* Sparkline Visual */}
          <div className="flex flex-col items-end">
            <span className="text-[9px] text-muted-foreground mb-1">Evolução</span>
            <Sparkline values={mentorado.sparklineNotas || [media]} />
          </div>
        </div>
      </div>

      {/* Rodapé com Ações */}
      <div className="p-3 bg-muted/10 border-t border-[#E5D5CE]/60 flex items-center justify-between gap-2">
        <span className="text-[11px] text-muted-foreground flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          Início: {new Date(mentorado.created_at).toLocaleDateString("pt-BR")}
        </span>

        <div className="flex items-center gap-1.5">
          {!isAtiva && onDownloadReport && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1 border-[#3E100C]/30 text-[#3E100C] hover:bg-[#FFF8F5]"
              onClick={(e) => {
                e.stopPropagation();
                onDownloadReport(mentorado);
              }}
            >
              <FileDown className="h-3.5 w-3.5 text-[#E05A10]" /> Relatório
            </Button>
          )}

          {!isAtiva && onReopen && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
              onClick={(e) => {
                e.stopPropagation();
                onReopen(mentorado);
              }}
            >
              <RotateCcw className="h-3 w-3" /> Reabrir
            </Button>
          )}

          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs font-semibold text-[#3E100C] group-hover:text-[#E05A10] gap-1 p-0 px-2"
          >
            Acessar <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
