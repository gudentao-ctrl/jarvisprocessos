// src/components/recrutamento/PublicVagaModal.tsx
// Modal com Link de Divulgação e Página Pública Simplificada da Vaga

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, MessageCircle, Share2, ExternalLink, Building2, CheckCircle2, Globe } from "lucide-react";
import { toast } from "sonner";
import { Vaga } from "@/lib/recrutamento-types";

interface PublicVagaModalProps {
  vaga: Vaga;
  isOpen: boolean;
  onClose: () => void;
}

export default function PublicVagaModal({ vaga, isOpen, onClose }: PublicVagaModalProps) {
  const publicUrl = typeof window !== "undefined"
    ? `${window.location.origin}/vagas/${vaga.id}`
    : `https://maiaconsultoria.com.br/vagas/${vaga.id}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    toast.success("Link público da vaga copiado com sucesso!");
  };

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(
      `🎯 Vaga Aberta: ${vaga.titulo} na ${vaga.empresa_nome || "Maia Consultoria"}!\n\nConfira os requisitos e candidate-se pelo link oficial:\n${publicUrl}`,
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary">
            <Globe className="h-5 w-5" />
            <DialogTitle className="text-base font-bold">Link de Divulgação & Página Pública</DialogTitle>
          </div>
          <DialogDescription className="text-xs">
            Compartilhe a vaga com candidatos através do link oficial de inscrição simplificada.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* Campo Copiar Link */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Link Público da Vaga</Label>
            <div className="flex items-center gap-2">
              <Input value={publicUrl} readOnly className="text-xs font-mono bg-muted" />
              <Button type="button" size="sm" onClick={handleCopyLink} className="shrink-0 text-xs">
                <Copy className="h-3.5 w-3.5 mr-1" />
                Copiar
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleWhatsAppShare}
              className="text-xs bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20"
            >
              <MessageCircle className="h-3.5 w-3.5 mr-1.5 text-emerald-600" />
              Compartilhar no WhatsApp
            </Button>
          </div>

          {/* Preview da Página Pública Simplificada */}
          <div className="border rounded-xl p-4 bg-muted/20 space-y-3">
            <div className="flex items-center justify-between border-b pb-2">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                Preview da Página do Candidato
              </span>
              <Badge variant="outline" className="text-[10px]">
                {vaga.tipo_contratacao}
              </Badge>
            </div>

            {vaga.flyer_url && (
              <div className="h-28 w-full rounded-lg overflow-hidden">
                <img src={vaga.flyer_url} alt="Flyer" className="w-full h-full object-cover" />
              </div>
            )}

            <div>
              <h3 className="text-base font-bold text-foreground">{vaga.titulo}</h3>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                <Building2 className="h-3.5 w-3.5 text-primary" />
                <span>{vaga.empresa_nome || "Empresa Cliente"}</span>
                {vaga.departamento && <span>• {vaga.departamento}</span>}
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="font-semibold text-foreground">Sobre a Vaga:</span>
              <p className="text-muted-foreground leading-relaxed">
                {vaga.descricao || vaga.experiencias_exigidas || "Oportunidade para profissionais orientados a resultados."}
              </p>
            </div>

            {vaga.ferramentas_obrigatorias && vaga.ferramentas_obrigatorias.length > 0 && (
              <div className="space-y-1">
                <span className="font-semibold text-foreground">Requisitos Técnicos:</span>
                <div className="flex flex-wrap gap-1">
                  {vaga.ferramentas_obrigatorias.map((f, i) => (
                    <Badge key={i} variant="secondary" className="text-[10px]">
                      {f}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
