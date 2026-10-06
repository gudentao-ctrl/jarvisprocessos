import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  ArrowLeft,
  Award,
  Calendar,
  Clock,
  Briefcase,
  GraduationCap,
  Phone,
  Mail,
  Plus,
  FileText,
  Upload,
  Link as LinkIcon,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  FileDown,
  RotateCcw,
  Pencil,
  Trash2,
  Users,
  ShieldCheck,
  CheckSquare,
  ExternalLink,
} from "lucide-react";
import type { Mentorado, MentoriaSessao } from "@/lib/mentoria-types";
import { toast } from "sonner";

export function MentoradoDetail({
  mentorado,
  companyName = "Empresa Cliente",
  onBack,
  onNovoAtendimento,
  onEditSessao,
  onDeleteSessao,
  onFinalizarMentoria,
  onReabrirMentoria,
  onDownloadFinalReport,
  onUpdateBehavioralProfile,
}: {
  mentorado: Mentorado;
  companyName?: string;
  onBack: () => void;
  onNovoAtendimento: () => void;
  onEditSessao: (sessao: MentoriaSessao) => void;
  onDeleteSessao: (sessaoId: string) => void;
  onFinalizarMentoria: () => void;
  onReabrirMentoria: () => void;
  onDownloadFinalReport: () => void;
  onUpdateBehavioralProfile: (profile: any) => Promise<any>;
}) {
  const isAtiva = mentorado.status === "ativa";
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingPdf, setUploadingPdf] = useState(false);

  const profile = mentorado.behavioral_profile;
  const hasProfile = !!(profile?.dominant_factor || (profile?.radar && profile.radar.length > 0) || profile?.pdf_attachment_url);

  // Upload de PDF manual de perfil
  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("O arquivo deve ter no máximo 10MB.");
      return;
    }

    setUploadingPdf(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Url = reader.result as string;
        await onUpdateBehavioralProfile({
          ...profile,
          pdf_attachment_url: base64Url,
          pdf_attachment_name: file.name,
        });
        toast.success("Laudo de Perfil Comportamental anexado com sucesso!");
        setUploadingPdf(false);
      };
      reader.readAsDataURL(file);
    } catch {
      toast.error("Erro ao carregar o arquivo.");
      setUploadingPdf(false);
    }
  };

  // Gerar Link de Análise de Perfil
  const handleGerarLinkTeste = () => {
    const candidateId = mentorado.candidate_id || mentorado.id;
    const testUrl = `${window.location.origin}/teste/${candidateId}`;

    navigator.clipboard.writeText(testUrl).then(() => {
      toast.success("Link do Teste Comportamental copiado para a área de transferência!");
    });

    if (mentorado.telefone) {
      const msg = encodeURIComponent(
        `Olá ${mentorado.nome}, segue o link para preenchimento da sua Avaliação de Perfil do programa de mentoria: ${testUrl}`,
      );
      window.open(`https://wa.me/?text=${msg}`, "_blank");
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Botão Voltar & Ações de Topo */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="gap-1.5 text-xs text-muted-foreground hover:text-foreground -ml-2"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar para Lista de Mentorados
        </Button>

        <div className="flex flex-wrap items-center gap-2">
          {isAtiva ? (
            <>
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-1.5 text-xs font-semibold border-[#E05A10]/40 text-[#3E100C] hover:bg-[#FFF8F5]"
                onClick={onFinalizarMentoria}
              >
                <Award className="h-4 w-4 text-[#E05A10]" /> Finalizar Projeto de Mentoria
              </Button>

              <Button
                size="sm"
                className="h-9 gap-1.5 text-xs font-bold bg-[#3E100C] hover:bg-[#3E100C]/90 text-white shadow-xs"
                onClick={onNovoAtendimento}
              >
                <Plus className="h-4 w-4 text-[#E05A10]" /> + Novo Atendimento
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-1.5 text-xs font-semibold border-[#3E100C]/40 text-[#3E100C] hover:bg-[#FFF8F5]"
                onClick={onDownloadFinalReport}
              >
                <FileDown className="h-4 w-4 text-[#E05A10]" /> Baixar Relatório Final (PDF)
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="h-9 gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
                onClick={onReabrirMentoria}
              >
                <RotateCcw className="h-3.5 w-3.5" /> Reabrir Mentoria
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Header do Mentorado com Dados Pessoais & Big Numbers */}
      <Card className="overflow-hidden border border-[#E5D5CE] shadow-xs bg-white">
        <div className="h-2 w-full bg-gradient-to-r from-[#3E100C] via-[#E05A10] to-[#3E100C]" />
        <div className="p-4 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-black text-[#3E100C]">{mentorado.nome}</h1>
                <Badge
                  variant="outline"
                  className={
                    isAtiva
                      ? "bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold"
                      : "bg-muted text-muted-foreground border-border font-semibold"
                  }
                >
                  {isAtiva ? "Mentoria Ativa" : "Mentoria Finalizada"}
                </Badge>
              </div>
              <p className="text-xs sm:text-sm font-medium text-muted-foreground mt-0.5 flex flex-wrap items-center gap-2">
                <span className="flex items-center gap-1 text-[#E05A10] font-semibold">
                  <Briefcase className="h-3.5 w-3.5" /> {mentorado.cargo || "Cargo não informado"}
                </span>
                <span>· Empresa: <strong>{companyName}</strong></span>
                {mentorado.idade && <span>· {mentorado.idade} anos</span>}
              </p>
            </div>

            {/* Big Number Nota Média no Header */}
            <div className="flex items-center gap-3 p-3 rounded-xl border border-[#E5D5CE] bg-[#FFF8F5]/80 shrink-0">
              <TrendingUp className="h-6 w-6 text-[#E05A10]" />
              <div>
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                  Indicador de Avanço
                </span>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-black text-[#3E100C]">
                    {(mentorado.mediaAvanco || 0).toFixed(1)}
                  </span>
                  <span className="text-xs text-muted-foreground">/ 5.0</span>
                </div>
              </div>
            </div>
          </div>

          {/* Dados Pessoais do Card */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs text-muted-foreground p-3 rounded-lg bg-muted/15 border border-[#E5D5CE]/50">
            <p className="flex items-center gap-1.5 truncate">
              <GraduationCap className="h-4 w-4 text-[#3E100C] shrink-0" />
              <span className="truncate">Formação: <strong className="text-foreground">{mentorado.formacao || "—"}</strong></span>
            </p>
            <p className="flex items-center gap-1.5 truncate">
              <Phone className="h-4 w-4 text-[#E05A10] shrink-0" />
              <span className="truncate">Telefone: <strong className="text-foreground">{mentorado.telefone || "—"}</strong></span>
            </p>
            <p className="flex items-center gap-1.5 truncate">
              <Mail className="h-4 w-4 text-[#3E100C] shrink-0" />
              <span className="truncate">E-mail: <strong className="text-foreground">{mentorado.email || "—"}</strong></span>
            </p>
          </div>

          {/* 4 KPIs Consolidados */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-[#E5D5CE]/60 text-center">
            <div className="p-2.5 rounded-lg bg-[#FFF8F5] border border-[#E5D5CE]/50">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                Atendimentos
              </span>
              <span className="text-lg font-black text-[#3E100C]">
                {mentorado.totalAtendimentos || 0}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-[#FFF8F5] border border-[#E5D5CE]/50">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                Horas Totais
              </span>
              <span className="text-lg font-black text-[#3E100C]">
                {(mentorado.totalHoras || 0).toFixed(1)}h
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-[#FFF8F5] border border-[#E5D5CE]/50">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                Ações Concluídas
              </span>
              <span className="text-lg font-black text-[#E05A10]">
                {mentorado.acoesConcluidas || 0}/{mentorado.totalAcoes || 0}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-[#FFF8F5] border border-[#E5D5CE]/50">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                Ações Pendentes
              </span>
              <span className="text-lg font-black text-amber-700">
                {(mentorado.totalAcoes || 0) - (mentorado.acoesConcluidas || 0)}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* 1. Mapeamento Comportamental (Requisito B1) */}
      <Card className="p-5 border border-[#E5D5CE] shadow-xs space-y-4 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E5D5CE]/60 pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-[#E05A10]" />
            <div>
              <h2 className="text-sm sm:text-base font-bold text-[#3E100C]">
                Mapeamento Comportamental (Perfil Integrado)
              </h2>
              <p className="text-xs text-muted-foreground">
                Análise psicométrica e comportamental vinculada ao ciclo de mentoria
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              accept="application/pdf"
              className="hidden"
              onChange={handlePdfUpload}
            />

            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1 text-xs border-[#3E100C]/30 text-[#3E100C] hover:bg-[#FFF8F5]"
              disabled={uploadingPdf}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-3.5 w-3.5 text-[#E05A10]" />
              {profile?.pdf_attachment_url ? "Substituir Laudo PDF" : "Fazer Upload de PDF"}
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1 text-xs border-[#E05A10]/40 text-[#E05A10] hover:bg-[#FFF8F5]"
              onClick={handleGerarLinkTeste}
            >
              <LinkIcon className="h-3.5 w-3.5" /> Gerar Link de Análise de Perfil
            </Button>
          </div>
        </div>

        {hasProfile ? (
          <div className="space-y-4 pt-1">
            {/* Top badges de perfil */}
            <div className="flex flex-wrap items-center gap-2">
              {profile?.dominant_factor && (
                <Badge className="bg-[#3E100C] text-white text-xs font-semibold py-1 px-2.5">
                  Fator Dominante: {profile.dominant_factor}
                </Badge>
              )}
              {profile?.pdf_attachment_url && (
                <a
                  href={profile.pdf_attachment_url}
                  download={profile.pdf_attachment_name || "Laudo_Perfil_Comportamental.pdf"}
                  className="inline-flex items-center gap-1 text-xs font-medium text-[#E05A10] hover:underline bg-[#FFF8F5] border border-[#E05A10]/30 px-2 py-0.5 rounded"
                >
                  <FileDown className="h-3.5 w-3.5" /> {profile.pdf_attachment_name || "Laudo PDF Anexo"}
                </a>
              )}
            </div>

            {/* Radar / Fatores se existirem */}
            {profile?.radar && profile.radar.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 pt-1">
                {profile.radar.map((r, i) => (
                  <div key={i} className="p-3 rounded-lg border border-[#E5D5CE]/70 bg-[#FFF8F5]/60 text-center">
                    <span className="text-[11px] font-bold text-muted-foreground block truncate">
                      {r.name}
                    </span>
                    <span className="text-xl font-black text-[#E05A10] block mt-1">
                      {r.value}%
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {r.value >= 80 ? "Muito Alto" : r.value >= 65 ? "Alto" : r.value >= 45 ? "Médio" : "Baixo"}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Resumo qualitativo de forças e pontos cegos */}
            {profile?.ai_summary && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-muted/15 p-3 rounded-lg border border-[#E5D5CE]/50">
                {profile.ai_summary.strengths && (
                  <div className="space-y-1">
                    <span className="font-bold text-emerald-800 flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Principais Fortalezas:
                    </span>
                    <p className="text-muted-foreground">{profile.ai_summary.strengths}</p>
                  </div>
                )}
                {profile.ai_summary.blind_spots && (
                  <div className="space-y-1">
                    <span className="font-bold text-amber-800 flex items-center gap-1">
                      <AlertCircle className="h-3.5 w-3.5 text-amber-600" /> Pontos de Atenção (Pontos Cegos):
                    </span>
                    <p className="text-muted-foreground">{profile.ai_summary.blind_spots}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="p-6 text-center rounded-lg border border-dashed border-[#E5D5CE] bg-[#FFF8F5]/30 space-y-3">
            <div className="h-10 w-10 mx-auto rounded-full bg-[#E05A10]/10 flex items-center justify-center text-[#E05A10]">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-[#3E100C]">Nenhum Mapeamento Comportamental Vinculado</p>
              <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1">
                Integre a análise psicométrica para cruzar o perfil com as sessões de mentoria. Você pode gerar o link do teste ou fazer upload de um laudo em PDF.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs font-semibold border-[#3E100C]/30 text-[#3E100C] hover:bg-[#FFF8F5]"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-3.5 w-3.5 text-[#E05A10]" /> Fazer Upload de PDF
              </Button>
              <Button
                size="sm"
                className="h-8 gap-1.5 text-xs font-semibold bg-[#E05A10] hover:bg-[#E05A10]/90 text-white"
                onClick={handleGerarLinkTeste}
              >
                <LinkIcon className="h-3.5 w-3.5" /> Gerar Link de Análise de Perfil
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* 2. Histórico de Atendimentos (Timeline ou Tabela) - Requisito B2 */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-[#3E100C] flex items-center gap-2">
              <Calendar className="h-5 w-5 text-[#E05A10]" />
              Histórico de Atendimentos Realizados
            </h2>
            <p className="text-xs text-muted-foreground">
              Linha do tempo das sessões, diagnósticos e planos de ação
            </p>
          </div>

          {isAtiva && (
            <Button
              size="sm"
              className="h-8 text-xs font-semibold bg-[#3E100C] hover:bg-[#3E100C]/90 text-white gap-1"
              onClick={onNovoAtendimento}
            >
              <Plus className="h-3.5 w-3.5 text-[#E05A10]" /> + Novo Atendimento
            </Button>
          )}
        </div>

        {/* Timeline das Sessões */}
        {(!mentorado.sessoes || mentorado.sessoes.length === 0) ? (
          <Card className="p-8 text-center border-dashed border-[#E5D5CE] text-sm text-muted-foreground space-y-2">
            <Clock className="h-8 w-8 mx-auto text-muted-foreground/60" />
            <p className="font-semibold text-[#3E100C]">Nenhum atendimento registrado ainda</p>
            <p className="text-xs max-w-sm mx-auto">
              Clique no botão "+ Novo Atendimento" para registrar a primeira sessão com este mentorado.
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {mentorado.sessoes.map((sessao, index) => {
              const nota = Number(sessao.diagnostico?.media_nota || 0);
              return (
                <Card
                  key={sessao.id}
                  className="p-4 sm:p-5 border border-[#E5D5CE] hover:border-[#E05A10]/50 transition-all bg-white"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-2 flex-1">
                      {/* Cabeçalho da Sessão */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-black text-white bg-[#3E100C] px-2 py-0.5 rounded">
                          Sessão #{index + 1}
                        </span>
                        <span className="text-xs font-bold text-foreground flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5 text-[#E05A10]" />
                          {new Date(sessao.data_atendimento).toLocaleDateString("pt-BR")}
                        </span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 text-[#3E100C]" />
                          {sessao.horas}h de sessão
                        </span>
                        <Badge
                          className={`text-[10px] font-bold ${
                            nota >= 4.0
                              ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                              : nota >= 3.0
                                ? "bg-blue-50 text-blue-800 border-blue-300"
                                : "bg-amber-50 text-amber-800 border-amber-300"
                          }`}
                          variant="outline"
                        >
                          Aproveitamento: {nota.toFixed(1)}/5.0
                        </Badge>
                      </div>

                      {/* Resumo */}
                      <div className="text-xs text-foreground bg-[#FFF8F5]/60 p-2.5 rounded-lg border border-[#E5D5CE]/50">
                        <span className="font-bold text-[#3E100C] block mb-0.5">Temas e Tópicos Abordados:</span>
                        <p className="text-muted-foreground leading-relaxed">{sessao.resumo}</p>
                      </div>

                      {/* Checklist de Ações */}
                      {sessao.acoes && sessao.acoes.length > 0 && (
                        <div className="space-y-1 pt-1">
                          <span className="text-xs font-bold text-[#3E100C] flex items-center gap-1">
                            <CheckSquare className="h-3.5 w-3.5 text-[#E05A10]" /> Ações Definidas:
                          </span>
                          <div className="space-y-1">
                            {sessao.acoes.map((ac) => (
                              <div
                                key={ac.id}
                                className="flex items-center gap-2 text-xs text-muted-foreground pl-1"
                              >
                                <span className={ac.concluida ? "text-emerald-600 font-bold" : "text-amber-600"}>
                                  {ac.concluida ? "✓" : "○"}
                                </span>
                                <span className={ac.concluida ? "line-through text-muted-foreground/80" : "font-medium text-foreground"}>
                                  {ac.texto}
                                </span>
                                {ac.prazo && (
                                  <span className="text-[10px] bg-muted/40 px-1 rounded">
                                    Prazo: {new Date(ac.prazo).toLocaleDateString("pt-BR")}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Pontos de Atenção & Informe */}
                      {(sessao.pontos_atencao || sessao.pontos_informe) && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1">
                          {sessao.pontos_atencao && (
                            <p className="bg-amber-50/60 p-2 rounded border border-amber-200 text-amber-900">
                              <strong>Atenção:</strong> {sessao.pontos_atencao}
                            </p>
                          )}
                          {sessao.pontos_informe && (
                            <p className="bg-blue-50/60 p-2 rounded border border-blue-200 text-blue-900">
                              <strong>Informe Equipe:</strong> {sessao.pontos_informe}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Botões de Ação na Sessão */}
                    <div className="flex sm:flex-col items-center gap-1 self-end sm:self-start shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs gap-1 border-[#3E100C]/30 text-[#3E100C] hover:bg-[#FFF8F5]"
                        onClick={() => onEditSessao(sessao)}
                      >
                        <Pencil className="h-3.5 w-3.5 text-[#E05A10]" /> Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => {
                          if (confirm("Excluir este registro de atendimento?")) {
                            onDeleteSessao(sessao.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. Botão Flutuante / Destaque de Novo Atendimento (Requisito B3) */}
      {isAtiva && (
        <div className="fixed bottom-6 right-6 z-40">
          <Button
            size="lg"
            className="h-12 px-5 rounded-full shadow-lg bg-[#E05A10] hover:bg-[#E05A10]/90 text-white font-bold gap-2 active:scale-95 transition-all"
            onClick={onNovoAtendimento}
          >
            <Plus className="h-5 w-5" /> + Novo Atendimento
          </Button>
        </div>
      )}
    </div>
  );
}
