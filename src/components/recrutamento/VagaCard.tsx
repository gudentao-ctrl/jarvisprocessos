// src/components/recrutamento/VagaCard.tsx
// Card da Vaga Mestre na Coluna 1 do Kanban de Recrutamento

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Briefcase,
  Building2,
  Calendar,
  Clock,
  DollarSign,
  GraduationCap,
  Share2,
  Upload,
  Edit,
  Sparkles,
  Layers,
  Wrench,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import { Vaga } from "@/lib/recrutamento-types";
import { toast } from "sonner";
import PublicVagaModal from "./PublicVagaModal";
import VagaFormModal from "./VagaFormModal";

interface VagaCardProps {
  vaga: Vaga;
  onVagaUpdated: () => void;
}

export default function VagaCard({ vaga, onVagaUpdated }: VagaCardProps) {
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);

  const handleUploadFlyer = () => {
    // Simula upload de imagem do flyer para redes sociais
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (e: any) => {
      const file = e.target?.files?.[0];
      if (file) {
        toast.success(`Imagem "${file.name}" carregada como Card de Divulgação!`);
      }
    };
    input.click();
  };

  return (
    <>
      <Card className="border border-border/80 shadow-sm bg-card hover:border-primary/40 transition-all">
        {/* Banner / Flyer da Vaga se houver */}
        {vaga.flyer_url && (
          <div className="relative h-28 w-full overflow-hidden rounded-t-lg bg-muted">
            <img
              src={vaga.flyer_url}
              alt={vaga.titulo}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
            <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between text-white text-xs">
              <span className="font-semibold">{vaga.tipo_contratacao}</span>
              <Badge variant="secondary" className="text-[10px] bg-white/20 text-white backdrop-blur-xs">
                {vaga.status}
              </Badge>
            </div>
          </div>
        )}

        <CardHeader className="p-4 pb-2 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">
                Vaga Mestre
              </span>
              <CardTitle className="text-base font-bold leading-tight mt-0.5">
                {vaga.titulo}
              </CardTitle>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                <Building2 className="h-3.5 w-3.5 text-primary shrink-0" />
                <span>{vaga.empresa_nome || "Empresa Cliente"}</span>
                {vaga.departamento && <span>• {vaga.departamento}</span>}
              </div>
            </div>
            {!vaga.flyer_url && (
              <Badge variant="outline" className="text-[10px] uppercase font-mono">
                {vaga.status}
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-4 pt-1 space-y-3.5 text-xs">
          {/* Informações Econômicas & Jornada */}
          <div className="grid grid-cols-2 gap-2 bg-muted/40 p-2.5 rounded-lg border">
            <div>
              <span className="text-[10px] text-muted-foreground block">Salário</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                {vaga.salario_combinar
                  ? "A combinar"
                  : `${formatCurrency(vaga.salario_min)} - ${formatCurrency(vaga.salario_max)}`}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground block">Contratação</span>
              <span className="font-medium">{vaga.tipo_contratacao}</span>
            </div>
            <div className="col-span-2 border-t pt-1.5 mt-0.5">
              <span className="text-[10px] text-muted-foreground block">Jornada</span>
              <span className="font-medium text-muted-foreground">{vaga.jornada}</span>
            </div>
          </div>

          {/* Formação & Experiência */}
          {vaga.requisitos_formacao && (
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-[11px] font-semibold text-foreground">
                <GraduationCap className="h-3.5 w-3.5 text-primary" />
                Formação Requerida
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed pl-4">
                {vaga.requisitos_formacao}
              </p>
            </div>
          )}

          {vaga.experiencias_exigidas && (
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-[11px] font-semibold text-foreground">
                <Briefcase className="h-3.5 w-3.5 text-primary" />
                Experiências Exigidas
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed pl-4">
                {vaga.experiencias_exigidas}
              </p>
            </div>
          )}

          {/* Ferramentas Obrigatórias */}
          {vaga.ferramentas_obrigatorias && vaga.ferramentas_obrigatorias.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1 text-[11px] font-semibold text-foreground">
                <Wrench className="h-3.5 w-3.5 text-primary" />
                Ferramentas & Tecnologias
              </div>
              <div className="flex flex-wrap gap-1 pl-4">
                {vaga.ferramentas_obrigatorias.map((tool, i) => (
                  <Badge key={i} variant="secondary" className="text-[10px] font-normal py-0">
                    {tool}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Soft Skills */}
          {vaga.soft_skills && vaga.soft_skills.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1 text-[11px] font-semibold text-foreground">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                Soft Skills Desejadas
              </div>
              <div className="flex flex-wrap gap-1 pl-4">
                {vaga.soft_skills.map((skill, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-800 dark:text-amber-300 text-[10px]"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Benefícios */}
          {vaga.beneficios && vaga.beneficios.length > 0 && (
            <div className="space-y-1">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase">
                Benefícios
              </span>
              <ul className="grid grid-cols-1 gap-1 text-[11px] text-muted-foreground pl-1">
                {vaga.beneficios.map((b, i) => (
                  <li key={i} className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Ações Obrigatórias do Bloco 24 */}
          <div className="border-t pt-3 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsShareModalOpen(true)}
                className="text-xs h-8 bg-primary/5 hover:bg-primary/10 border-primary/20 text-primary"
              >
                <Share2 className="h-3.5 w-3.5 mr-1" />
                Link de Divulgação
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleUploadFlyer}
                className="text-xs h-8"
              >
                <Upload className="h-3.5 w-3.5 mr-1" />
                Upload do Card
              </Button>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsEditModalOpen(true)}
              className="w-full text-xs h-7 text-muted-foreground hover:text-foreground"
            >
              <Edit className="h-3.5 w-3.5 mr-1" />
              Editar Informações da Vaga
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Modal de Divulgação da Vaga */}
      <PublicVagaModal
        vaga={vaga}
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
      />

      {/* Modal de Edição da Vaga */}
      <VagaFormModal
        vagaToEdit={vaga}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={() => {
          setIsEditModalOpen(false);
          onVagaUpdated();
        }}
      />
    </>
  );
}
