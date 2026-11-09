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
  Download,
  Paperclip,
  FileSpreadsheet,
  FileImage,
  File,
  Loader2,
} from "lucide-react";
import type { Mentorado, MentoriaSessao, MentoriaAttachment, MentoriaBehavioralProfile } from "@/lib/mentoria-types";
import { toast } from "sonner";

function normalizeAttachments(profile?: MentoriaBehavioralProfile): MentoriaAttachment[] {
  const list: MentoriaAttachment[] = [];
  if (profile?.attachments && Array.isArray(profile.attachments)) {
    list.push(...profile.attachments);
  }
  // Se houver anexo legado (pdf_attachment_url) que não está na lista de attachments
  if (profile?.pdf_attachment_url) {
    const alreadyExists = list.some((a) => a.url === profile.pdf_attachment_url);
    if (!alreadyExists) {
      list.unshift({
        id: "legacy-pdf-attachment",
        name: profile.pdf_attachment_name || "Laudo_Perfil_Comportamental.pdf",
        url: profile.pdf_attachment_url,
        type: "application/pdf",
        uploaded_at: profile.ai_summary ? new Date().toISOString() : undefined,
      });
    }
  }
  return list;
}

function formatFileSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(fileName: string, mimeType?: string) {
  const ext = fileName.split(".").pop()?.toLowerCase();
  if (ext === "pdf" || mimeType?.includes("pdf")) {
    return <FileText className="h-4 w-4 text-rose-600 shrink-0" />;
  }
  if (
    ["png", "jpg", "jpeg", "webp", "gif", "svg"].includes(ext || "") ||
    mimeType?.startsWith("image/")
  ) {
    return <FileImage className="h-4 w-4 text-blue-600 shrink-0" />;
  }
  if (
    ["xls", "xlsx", "csv"].includes(ext || "") ||
    mimeType?.includes("sheet") ||
    mimeType?.includes("excel") ||
    mimeType?.includes("csv")
  ) {
    return <FileSpreadsheet className="h-4 w-4 text-emerald-600 shrink-0" />;
  }
  return <File className="h-4 w-4 text-muted-foreground shrink-0" />;
}

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
  const [uploading, setUploading] = useState(false);

  const profile = mentorado.behavioral_profile;
  const attachments = normalizeAttachments(profile);
  const hasProfile = !!(
    profile?.dominant_factor ||
    (profile?.radar && profile.radar.length > 0) ||
    attachments.length > 0
  );

  // Upload de múltiplos arquivos para o Mapeamento Comportamental
  const handleFilesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const oversized = files.filter((f) => f.size > 20 * 1024 * 1024);
    if (oversized.length > 0) {
      toast.error(
        `Arquivo(s) ultrapassam o limite de 20MB: ${oversized.map((f) => f.name).join(", ")}`
      );
      return;
    }

    setUploading(true);
    try {
      const readAsDataURL = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      };

      const newAttachments: MentoriaAttachment[] = [];
      for (const file of files) {
        const base64Url = await readAsDataURL(file);
        newAttachments.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          name: file.name,
          url: base64Url,
          size: file.size,
          type: file.type,
          uploaded_at: new Date().toISOString(),
        });
      }

      const currentAttachments = normalizeAttachments(profile);
      const updatedAttachments = [...currentAttachments, ...newAttachments];

      await onUpdateBehavioralProfile({
        ...profile,
        attachments: updatedAttachments,
        pdf_attachment_url:
          profile?.pdf_attachment_url ||
          newAttachments.find((a) => a.name.toLowerCase().endsWith(".pdf"))?.url ||
          newAttachments[0]?.url,
        pdf_attachment_name:
          profile?.pdf_attachment_name ||
          newAttachments.find((a) => a.name.toLowerCase().endsWith(".pdf"))?.name ||
          newAttachments[0]?.name,
      });

      toast.success(
        files.length === 1
          ? "Arquivo anexado com sucesso!"
          : `${files.length} arquivos anexados com sucesso!`
      );
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao carregar o arquivo.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveAttachment = async (attachmentId: string) => {
    if (!confirm("Tem certeza que deseja remover este anexo do mapeamento comportamental?")) return;
    const currentAttachments = normalizeAttachments(profile);
    const updated = currentAttachments.filter((a) => a.id !== attachmentId);

    const nextPdfUrl =
      updated.find((a) => a.name.toLowerCase().endsWith(".pdf"))?.url || updated[0]?.url;
    const nextPdfName =
      updated.find((a) => a.name.toLowerCase().endsWith(".pdf"))?.name || updated[0]?.name;

    await onUpdateBehavioralProfile({
      ...profile,
      attachments: updated,
      pdf_attachment_url: nextPdfUrl,
      pdf_attachment_name: nextPdfName,
    });
    toast.success("Anexo removido com sucesso.");
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

      {/* Parecer Final de Conclusão (Caso Mentoria esteja Inativa/Finalizada) */}
      {!isAtiva && mentorado.parecer_final && (
        <Card className="p-4 bg-muted/20 border-l-4 border-l-[#E05A10] space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#3E100C] uppercase tracking-wider flex items-center gap-1.5">
              <Award className="h-4 w-4 text-[#E05A10]" /> Parecer Final de Mentoria Concluída
            </span>
            {mentorado.finalizada_em && (
              <span className="text-[11px] text-muted-foreground">
                Finalizada em {new Date(mentorado.finalizada_em).toLocaleDateString("pt-BR")}
              </span>
            )}
          </div>
          <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
            {mentorado.parecer_final}
          </p>
        </Card>
      )}

      {/* Header do Mentorado: Dados Pessoais & KPIs Resumo */}
      <Card className="p-5 border border-[#E5D5CE] shadow-xs bg-white space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-[#3E100C] tracking-tight">
                {mentorado.nome}
              </h1>
              <Badge
                variant="outline"
                className={`text-[10px] font-bold ${
                  isAtiva
                    ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                    : "bg-muted text-muted-foreground border-border"
                }`}
              >
                {isAtiva ? "Em Andamento" : "Mentoria Concluída"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {companyName} • Cadastrado em {new Date(mentorado.created_at).toLocaleDateString("pt-BR")}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            {mentorado.telefone && (
              <a
                href={`https://wa.me/55${mentorado.telefone.replace(/\D/g, "")}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-[#E5D5CE] bg-[#FFF8F5] text-[#3E100C] hover:text-[#E05A10] transition-colors"
              >
                <Phone className="h-3.5 w-3.5 text-[#E05A10]" /> {mentorado.telefone}
              </a>
            )}
            {mentorado.email && (
              <a
                href={`mailto:${mentorado.email}`}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-[#E5D5CE] bg-[#FFF8F5] text-[#3E100C] hover:text-[#E05A10] transition-colors"
              >
                <Mail className="h-3.5 w-3.5 text-[#E05A10]" /> {mentorado.email}
              </a>
            )}
          </div>
        </div>

        {/* Ficha Rápida do Profissional */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-[#E5D5CE]/60 text-xs">
          <div>
            <span className="text-muted-foreground block text-[11px]">Cargo Atual</span>
            <span className="font-semibold text-foreground flex items-center gap-1 mt-0.5">
              <Briefcase className="h-3.5 w-3.5 text-[#E05A10]" /> {mentorado.cargo || "Não informado"}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground block text-[11px]">Idade</span>
            <span className="font-semibold text-foreground mt-0.5 block">
              {mentorado.idade ? `${mentorado.idade} anos` : "Não informada"}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground block text-[11px]">Formação / Escolaridade</span>
            <span className="font-semibold text-foreground flex items-center gap-1 mt-0.5 truncate">
              <GraduationCap className="h-3.5 w-3.5 text-[#E05A10]" /> {mentorado.formacao || "Não informada"}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground block text-[11px]">Status no Programa</span>
            <span className="font-semibold text-foreground mt-0.5 block">
              {mentorado.totalAtendimentos || 0} sessões registradas
            </span>
          </div>
        </div>

        {/* Big Numbers de Desempenho do Mentorado */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-[#E5D5CE]/60">
          <div className="p-3 rounded-lg border border-[#E5D5CE]/80 bg-[#FFF8F5]/50">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
              Atendimentos
            </span>
            <span className="text-xl sm:text-2xl font-black text-[#3E100C] block mt-0.5">
              {mentorado.totalAtendimentos || 0}
            </span>
          </div>

          <div className="p-3 rounded-lg border border-[#E5D5CE]/80 bg-[#FFF8F5]/50">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
              Horas Acumuladas
            </span>
            <span className="text-xl sm:text-2xl font-black text-[#E05A10] block mt-0.5">
              {mentorado.totalHoras || 0}h
            </span>
          </div>

          <div className="p-3 rounded-lg border border-[#E5D5CE]/80 bg-[#FFF8F5]/50">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
              Ações Concluídas
            </span>
            <span className="text-xl sm:text-2xl font-black text-[#3E100C] block mt-0.5">
              {mentorado.acoesConcluidas || 0}/{mentorado.totalAcoes || 0}
            </span>
          </div>

          <div className="p-3 rounded-lg border border-[#E5D5CE]/80 bg-[#FFF8F5]/50">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
              Média de Evolução
            </span>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-xl sm:text-2xl font-black text-emerald-700">
                {mentorado.mediaAvanco ? mentorado.mediaAvanco.toFixed(1) : "—"}
              </span>
              <span className="text-xs text-muted-foreground">/ 5.0</span>
            </div>
          </div>
        </div>
      </Card>

      {/* 1. Mapeamento Comportamental (Requisito B1 - com suporte a MÚLTIPLOS UPLOADS) */}
      <Card className="p-5 border border-[#E5D5CE] shadow-xs space-y-4 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E5D5CE]/60 pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-[#E05A10]" />
            <div>
              <h2 className="text-sm sm:text-base font-bold text-[#3E100C]">
                Mapeamento Comportamental (Perfil Integrado)
              </h2>
              <p className="text-xs text-muted-foreground">
                Análise psicométrica, laudos e documentos vinculados ao ciclo de mentoria
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              multiple
              accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.png,.jpg,.jpeg,.webp,application/pdf,image/*,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="hidden"
              onChange={handleFilesUpload}
            />

            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs border-[#3E100C]/30 text-[#3E100C] hover:bg-[#FFF8F5]"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-[#E05A10]" /> Enviando...
                </>
              ) : (
                <>
                  <Upload className="h-3.5 w-3.5 text-[#E05A10]" /> Fazer Upload de Arquivo(s)
                </>
              )}
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
            {profile?.dominant_factor && (
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-[#3E100C] text-white text-xs font-semibold py-1 px-2.5">
                  Fator Dominante: {profile.dominant_factor}
                </Badge>
              </div>
            )}

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

            {/* Bloco de Arquivos e Laudos Anexados (Múltiplos uploads) */}
            <div className="space-y-2 pt-2 border-t border-[#E5D5CE]/50">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#3E100C] flex items-center gap-1.5">
                  <Paperclip className="h-3.5 w-3.5 text-[#E05A10]" />
                  Arquivos e Laudos Anexados ({attachments.length})
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-[#E05A10] hover:text-[#E05A10] hover:bg-[#FFF8F5] gap-1"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Plus className="h-3.5 w-3.5" /> Adicionar arquivo(s)
                </Button>
              </div>

              {attachments.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {attachments.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between gap-2 p-2.5 rounded-md border border-[#E5D5CE] bg-[#FFF8F5]/40 hover:bg-[#FFF8F5] transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {getFileIcon(file.name, file.type)}
                        <div className="min-w-0 flex-1">
                          <p
                            className="text-xs font-semibold text-foreground truncate"
                            title={file.name}
                          >
                            {file.name}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {formatFileSize(file.size)}
                            {file.uploaded_at &&
                              ` • ${new Date(file.uploaded_at).toLocaleDateString("pt-BR")}`}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-[#E05A10]"
                          title="Baixar arquivo"
                          asChild
                        >
                          <a
                            href={file.url}
                            download={file.name}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </a>
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          title="Excluir arquivo"
                          onClick={() => handleRemoveAttachment(file.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 text-center rounded border border-dashed text-xs text-muted-foreground bg-muted/10">
                  Nenhum arquivo anexado ainda. Clique em "Adicionar arquivo(s)" para enviar laudos, relatórios ou testes.
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="p-6 text-center rounded-lg border border-dashed border-[#E5D5CE] bg-[#FFF8F5]/30 space-y-3">
            <div className="h-10 w-10 mx-auto rounded-full bg-[#E05A10]/10 flex items-center justify-center text-[#E05A10]">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-[#3E100C]">Nenhum Mapeamento Comportamental Vinculado</p>
              <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1">
                Integre a análise psicométrica para cruzar o perfil com as sessões de mentoria. Você pode gerar o link do teste ou fazer upload de diversos laudos e arquivos (PDF, documentos, planilhas ou imagens).
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs font-semibold border-[#3E100C]/30 text-[#3E100C] hover:bg-[#FFF8F5]"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-[#E05A10]" /> Enviando...
                  </>
                ) : (
                  <>
                    <Upload className="h-3.5 w-3.5 text-[#E05A10]" /> Fazer Upload de Arquivo(s)
                  </>
                )}
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
              className="h-8 gap-1.5 text-xs font-semibold bg-[#3E100C] hover:bg-[#3E100C]/90 text-white"
              onClick={onNovoAtendimento}
            >
              <Plus className="h-3.5 w-3.5 text-[#E05A10]" /> + Registrar Atendimento
            </Button>
          )}
        </div>

        {/* Lista de Atendimentos ou Estado Vazio */}
        {!mentorado.sessoes || mentorado.sessoes.length === 0 ? (
          <Card className="p-8 text-center border-dashed border-[#E5D5CE] space-y-3 bg-muted/10">
            <Clock className="h-10 w-10 text-muted-foreground/60 mx-auto" />
            <div>
              <p className="text-sm font-semibold text-[#3E100C]">Nenhum atendimento registrado ainda</p>
              <p className="text-xs text-muted-foreground mt-0.5 max-w-sm mx-auto">
                Inicie o acompanhamento cadastrando a primeira sessão com diagnóstico inicial e plano prático de ação.
              </p>
            </div>
            {isAtiva && (
              <Button
                size="sm"
                className="h-8 gap-1.5 text-xs bg-[#E05A10] hover:bg-[#E05A10]/90 text-white font-bold"
                onClick={onNovoAtendimento}
              >
                <Plus className="h-4 w-4" /> Registrar Primeiro Atendimento
              </Button>
            )}
          </Card>
        ) : (
          <div className="space-y-3">
            {mentorado.sessoes.map((sessao, idx) => {
              const numSessao = mentorado.sessoes!.length - idx;
              return (
                <Card
                  key={sessao.id}
                  className="p-4 sm:p-5 border border-[#E5D5CE] shadow-xs hover:border-[#E05A10]/40 transition-all bg-white"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="space-y-3 flex-1">
                      {/* Topo do Card de Sessão */}
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className="bg-[#3E100C] text-white font-black text-xs px-2.5 py-0.5">
                          Sessão #{numSessao}
                        </Badge>
                        <span className="text-xs font-bold text-foreground flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5 text-[#E05A10]" />
                          {new Date(sessao.data_atendimento).toLocaleDateString("pt-BR")}
                        </span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 text-[#E05A10]" /> {sessao.horas}h de duração
                        </span>

                        {/* Média da Sessão */}
                        <Badge
                          variant="outline"
                          className="text-[11px] font-bold border-[#E05A10]/40 bg-[#FFF8F5] text-[#3E100C] ml-auto sm:ml-0"
                        >
                          Média: {sessao.diagnostico?.media_nota?.toFixed(1) || "—"} / 5.0
                        </Badge>
                      </div>

                      {/* NOVO CAMPO: Objetivo da Sessão */}
                      {sessao.objetivo_sessao && (
                        <div className="bg-[#FFF8F5]/80 p-2.5 rounded-md border border-[#E5D5CE]/80 text-xs">
                          <strong className="text-[#3E100C] block text-[11px] uppercase tracking-wider mb-0.5">
                            🎯 Objetivo da Sessão:
                          </strong>
                          <p className="text-foreground/90 leading-snug">{sessao.objetivo_sessao}</p>
                        </div>
                      )}

                      {/* Resumo do Atendimento */}
                      <div className="text-xs text-foreground/90 space-y-1">
                        <strong className="text-[#3E100C] block text-[11px] uppercase tracking-wider">
                          Resumo dos Tópicos Abordados:
                        </strong>
                        <p className="whitespace-pre-wrap leading-relaxed text-muted-foreground pl-2 border-l-2 border-[#E5D5CE]">
                          {sessao.resumo}
                        </p>
                      </div>

                      {/* NOVO BLOCO: Registro da Mentora (Grid 2x2 Avançado) */}
                      {(sessao.avancos_observados ||
                        sessao.pontos_desenvolvimento ||
                        sessao.evidencias_comportamentais ||
                        sessao.foco_proxima_sessao ||
                        sessao.pontos_atencao ||
                        sessao.pontos_informe) && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1">
                          {(sessao.avancos_observados || sessao.pontos_informe) && (
                            <div className="bg-emerald-50/60 p-2 rounded border border-emerald-200 text-emerald-900 space-y-0.5">
                              <strong>Principais Avanços:</strong>
                              <p className="text-emerald-800 leading-snug">
                                {sessao.avancos_observados || sessao.pontos_informe}
                              </p>
                            </div>
                          )}

                          {(sessao.pontos_desenvolvimento || sessao.pontos_atencao) && (
                            <div className="bg-amber-50/60 p-2 rounded border border-amber-200 text-amber-900 space-y-0.5">
                              <strong>Pontos em Desenvolvimento:</strong>
                              <p className="text-amber-800 leading-snug">
                                {sessao.pontos_desenvolvimento || sessao.pontos_atencao}
                              </p>
                            </div>
                          )}

                          {sessao.evidencias_comportamentais && (
                            <div className="bg-sky-50/60 p-2 rounded border border-sky-200 text-sky-900 space-y-0.5">
                              <strong>Evidências Comportamentais:</strong>
                              <p className="text-sky-800 leading-snug">
                                {sessao.evidencias_comportamentais}
                              </p>
                            </div>
                          )}

                          {sessao.foco_proxima_sessao && (
                            <div className="bg-[#FFF8F5] p-2 rounded border border-[#E05A10]/30 text-[#3E100C] space-y-0.5">
                              <strong>Foco para a Próxima Sessão:</strong>
                              <p className="text-muted-foreground leading-snug">
                                {sessao.foco_proxima_sessao}
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Checklist de Ações Expandido */}
                      {sessao.acoes && sessao.acoes.length > 0 && (
                        <div className="space-y-1.5 pt-1">
                          <span className="text-xs font-bold text-[#3E100C] flex items-center gap-1">
                            <CheckSquare className="h-3.5 w-3.5 text-[#E05A10]" /> Ações Definidas (Plano Prático):
                          </span>
                          <div className="space-y-1.5">
                            {sessao.acoes.map((ac) => {
                              const status = ac.status || (ac.concluida ? "Concluída" : "Pendente");
                              const statusColor =
                                status === "Concluída"
                                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                  : status === "Parcial"
                                    ? "bg-sky-50 text-sky-800 border-sky-200"
                                    : status === "Não realizada"
                                      ? "bg-rose-50 text-rose-800 border-rose-200"
                                      : "bg-amber-50 text-amber-800 border-amber-200";

                              return (
                                <div
                                  key={ac.id}
                                  className="p-2 rounded bg-[#FFF8F5]/30 border border-[#E5D5CE]/60 text-xs space-y-1"
                                >
                                  <div className="flex flex-wrap items-center justify-between gap-1.5">
                                    <div className="flex items-center gap-2">
                                      <span className={status === "Concluída" ? "text-emerald-600 font-bold" : "text-amber-600"}>
                                        {status === "Concluída" ? "✓" : "○"}
                                      </span>
                                      <span className={status === "Concluída" ? "line-through text-muted-foreground" : "font-medium text-foreground"}>
                                        {ac.texto}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <span className={`text-[10px] px-1.5 py-0.5 rounded border font-semibold ${statusColor}`}>
                                        {status}
                                      </span>
                                      {ac.prazo && (
                                        <span className="text-[10px] text-muted-foreground bg-muted/40 px-1.5 py-0.5 rounded">
                                          Prazo: {new Date(ac.prazo).toLocaleDateString("pt-BR")}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  {ac.resultado_aprendizado && (
                                    <p className="text-[11px] text-muted-foreground italic pl-4 border-l-2 border-[#E05A10]/40">
                                      Resultado: {ac.resultado_aprendizado}
                                    </p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
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
