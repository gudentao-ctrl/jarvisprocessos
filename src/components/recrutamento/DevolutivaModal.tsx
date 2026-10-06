// src/components/recrutamento/DevolutivaModal.tsx
// Modal de Reprovação com Frase de Devolutiva Padrão e Disparo em 1-Clique (WhatsApp / E-mail)

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MessageCircle, Mail, UserX, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { CandidaturaFunil } from "@/lib/recrutamento-types";
import { reprovarCandidatura, marcarDevolutivaEnviada } from "@/lib/recrutamento-storage";

interface DevolutivaModalProps {
  candidatura: CandidaturaFunil | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function DevolutivaModal({
  candidatura,
  isOpen,
  onClose,
  onSuccess,
}: DevolutivaModalProps) {
  if (!candidatura) return null;

  const candidato = candidatura.candidato;
  const vaga = candidatura.vaga;

  const nomeCandidato = candidato?.nome || "Candidato";
  const tituloVaga = vaga?.titulo || "esta oportunidade";
  const telefone = candidato?.telefone || "";
  const email = candidato?.email || "";

  const defaultMensagem = `Olá, ${nomeCandidato}!

Agradecemos muito o tempo e dedicação que você investiu no processo seletivo para a vaga de ${tituloVaga} na Maia Consultoria.

Após criteriosa análise e considerando os requisitos específicos para este momento do projeto, decidimos avançar com outros perfis. No entanto, seu currículo e perfil profissional foram direcionados para o nosso Banco Global de Talentos.

Assim que surgir uma nova oportunidade alinhada com as suas competências e experiências, entraremos em contato prioritariamente!

Desejamos muito sucesso em sua trajetória profissional.

Atenciosamente,
Equipe Maia Consultoria`;

  const [motivo, setMotivo] = useState("Perfil não atende integralmente aos requisitos técnicos no momento.");
  const [mensagemDevolutiva, setMensagemDevolutiva] = useState(defaultMensagem);
  const [loading, setLoading] = useState(false);

  const cleanPhone = telefone.replace(/\D/g, "");
  const formattedPhone = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;

  const handleSendWhatsApp = async () => {
    if (!cleanPhone) {
      toast.error("Candidato não possui telefone válido cadastrado.");
      return;
    }
    await marcarDevolutivaEnviada(candidatura.id, "whatsapp");
    const encoded = encodeURIComponent(mensagemDevolutiva);
    const url = `https://wa.me/${formattedPhone}?text=${encoded}`;
    window.open(url, "_blank");
    toast.success("Mensagem aberta no WhatsApp!");
  };

  const handleSendEmail = async () => {
    if (!email) {
      toast.error("Candidato não possui e-mail cadastrado.");
      return;
    }
    await marcarDevolutivaEnviada(candidatura.id, "email");
    const subject = encodeURIComponent(`Devolutiva do Processo Seletivo - ${tituloVaga} | Maia Consultoria`);
    const body = encodeURIComponent(mensagemDevolutiva);
    const mailto = `mailto:${email}?subject=${subject}&body=${body}`;
    window.location.href = mailto;
    toast.success("Cliente de e-mail acionado!");
  };

  const handleConfirmarReprovacao = async () => {
    try {
      setLoading(true);
      await reprovarCandidatura(
        candidatura.id,
        motivo,
        `Devolutiva registrada e currículo movido para o Banco de Talentos. Mensagem gerada: ${mensagemDevolutiva.slice(0, 100)}...`,
      );
      toast.success(`${nomeCandidato} movido para o Banco de Talentos!`);
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Erro ao reprovar candidato.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 text-rose-600">
            <UserX className="h-6 w-6" />
            <DialogTitle className="text-lg">Reprovação & Envio de Devolutiva</DialogTitle>
          </div>
          <DialogDescription>
            O candidato será movido para o <strong>Banco Global de Currículos</strong> e uma devolutiva formal e humanizada poderá ser enviada em 1 clique.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Alerta de transparência */}
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-start gap-2 text-xs text-amber-800 dark:text-amber-300">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <strong>Rastreabilidade de Histórico:</strong> Esta ação registrará a data de saída da etapa{" "}
              <span className="font-semibold">{candidatura.etapa_kanban}</span> e arquivará o motivo no dossiê do candidato.
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div>
              <Label className="text-xs text-muted-foreground">Candidato</Label>
              <div className="font-medium text-foreground">{nomeCandidato}</div>
              <div className="text-muted-foreground">{email || "Sem e-mail"} • {telefone || "Sem telefone"}</div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Vaga Vinculada</Label>
              <div className="font-medium text-foreground">{tituloVaga}</div>
              <div className="text-muted-foreground">Etapa atual: {candidatura.etapa_kanban}</div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="motivo" className="text-xs font-semibold">
              Motivo Interno da Reprovação (para histórico)
            </Label>
            <Input
              id="motivo"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ex: Pretensão salarial incompatível, falta de certificação..."
              className="text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="msgDevolutiva" className="text-xs font-semibold">
                Frase de Devolutiva Padrão (Editável)
              </Label>
              <span className="text-[11px] text-muted-foreground">Personalize antes de disparar</span>
            </div>
            <Textarea
              id="msgDevolutiva"
              rows={7}
              value={mensagemDevolutiva}
              onChange={(e) => setMensagemDevolutiva(e.target.value)}
              className="text-xs font-mono leading-relaxed"
            />
          </div>

          {/* Disparo em 1-clique */}
          <div className="bg-muted/40 p-3 rounded-lg border space-y-2">
            <div className="text-xs font-medium">Disparo Rápido em 1-Clique:</div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSendWhatsApp}
                className="text-xs bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20"
              >
                <MessageCircle className="h-3.5 w-3.5 mr-1.5 text-emerald-600" />
                Enviar via WhatsApp
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSendEmail}
                className="text-xs bg-sky-500/10 border-sky-500/30 text-sky-700 dark:text-sky-300 hover:bg-sky-500/20"
              >
                <Mail className="h-3.5 w-3.5 mr-1.5 text-sky-600" />
                Enviar via E-mail
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-between sm:space-x-2 gap-2">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>

          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={handleConfirmarReprovacao}
            disabled={loading}
            className="text-xs"
          >
            <UserX className="h-3.5 w-3.5 mr-1.5" />
            {loading ? "Salvando..." : "Mover para Banco de Talentos"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
