// src/components/fives/SectorQrModal.tsx
// Modal para Geração e Download da Etiqueta de Identificação e QR Code do Setor

import React, { useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, QrCode, Sparkles, Printer, CheckCircle2 } from "lucide-react";
import type { FivesSetor, FivesConfiguracao } from "@/lib/fives-types";

interface SectorQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  setor: FivesSetor | null;
  config: FivesConfiguracao;
  companyName: string;
}

export function SectorQrModal({
  isOpen,
  onClose,
  setor,
  config,
  companyName,
}: SectorQrModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  if (!setor) return null;

  const publicUrl = typeof window !== "undefined"
    ? `${window.location.origin}/p/5s/${config.url_hash || "default"}?setor=${encodeURIComponent(setor.id)}`
    : `https://jarvisprocessos.com/p/5s/${config.url_hash || "default"}`;

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=10&data=${encodeURIComponent(
    publicUrl
  )}`;

  const handleDownloadPng = async () => {
    try {
      // Cria imagem e desenha num canvas de alta resolução para download de etiqueta
      const canvas = document.createElement("canvas");
      canvas.width = 800;
      canvas.height = 1000;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Fundo
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, 800, 1000);

      // Borda decorativa com cores da empresa
      ctx.strokeStyle = config.primary_color || "#3E100C";
      ctx.lineWidth = 14;
      ctx.strokeRect(20, 20, 760, 960);

      // Faixa Superior
      ctx.fillStyle = config.primary_color || "#3E100C";
      ctx.fillRect(20, 20, 760, 140);

      // Texto Faixa Superior
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 32px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("PROGRAMA 5S • EXCELÊNCIA OPERACIONAL", 400, 75);

      ctx.font = "20px sans-serif";
      ctx.fillStyle = "#F3F4F6";
      ctx.fillText(companyName.toUpperCase(), 400, 115);

      // Nome do Setor em destaque
      ctx.fillStyle = config.secondary_color || "#E05A10";
      ctx.font = "bold 44px sans-serif";
      ctx.fillText(setor.nome_setor.toUpperCase(), 400, 230);

      ctx.fillStyle = "#4B5563";
      ctx.font = "20px sans-serif";
      ctx.fillText(`Guardião: ${setor.guardiao_nome || "Comitê 5S"} | Meta: ${setor.meta_nota}%`, 400, 270);

      // QR Code
      const qrImg = new Image();
      qrImg.crossOrigin = "anonymous";
      qrImg.src = qrImageUrl;

      await new Promise<void>((resolve, reject) => {
        qrImg.onload = () => {
          ctx.drawImage(qrImg, 220, 320, 360, 360);
          resolve();
        };
        qrImg.onerror = () => reject();
      });

      // Instrução ao colaborador
      ctx.fillStyle = "#111827";
      ctx.font = "bold 24px sans-serif";
      ctx.fillText("APONTE A CÂMERA DO CELULAR", 400, 740);

      ctx.fillStyle = "#4B5563";
      ctx.font = "18px sans-serif";
      ctx.fillText("Acesse em tempo real: Padrão Ouro, IT de Limpeza e Auditorias", 400, 775);

      // Rodapé com 5 sensos
      ctx.fillStyle = "#F3F4F6";
      ctx.fillRect(27, 830, 746, 143);

      ctx.fillStyle = "#374151";
      ctx.font = "bold 16px sans-serif";
      ctx.fillText("SEIRI • SEITON • SEISO • SEIKETSU • SHITSUKE", 400, 885);

      ctx.font = "14px sans-serif";
      ctx.fillStyle = "#6B7280";
      ctx.fillText("Jarvis Processos & Maia Consultoria • Gestão da Qualidade", 400, 920);

      const link = document.createElement("a");
      link.download = `etiqueta-5s-${setor.nome_setor.toLowerCase().replace(/[^a-z0-9]/g, "-")}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch {
      // Fallback simples para baixar apenas a imagem QR
      const link = document.createElement("a");
      link.href = qrImageUrl;
      link.download = `qr-5s-${setor.nome_setor}.png`;
      link.target = "_blank";
      link.click();
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md w-full bg-background border shadow-2xl rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <QrCode className="h-5 w-5 text-primary" />
            Etiqueta & QR Code do Setor
          </DialogTitle>
          <DialogDescription>
            Gere a placa de identificação física para afixar no setor e permitir acesso público rápido às ITs e rotinas de limpeza.
          </DialogDescription>
        </DialogHeader>

        {/* Visualização da Placa */}
        <div
          ref={cardRef}
          className="border-4 rounded-xl p-6 text-center space-y-4 shadow-sm relative overflow-hidden"
          style={{
            borderColor: config.primary_color || "#3E100C",
            backgroundColor: "#FFFFFF",
          }}
        >
          <div
            className="py-2.5 px-3 rounded-lg text-white font-bold text-xs uppercase tracking-wider"
            style={{ backgroundColor: config.primary_color || "#3E100C" }}
          >
            {companyName} • Programa 5S
          </div>

          <div>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
              Setor Identificado
            </span>
            <h3
              className="text-2xl font-black mt-0.5"
              style={{ color: config.secondary_color || "#E05A10" }}
            >
              {setor.nome_setor}
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Guardião: <strong className="text-foreground">{setor.guardiao_nome || "Comitê 5S"}</strong> | Meta: {setor.meta_nota}%
            </p>
          </div>

          <div className="flex justify-center py-2">
            <div className="p-2.5 bg-white border-2 rounded-xl shadow-inner inline-block">
              <img
                src={qrImageUrl}
                alt={`QR Code Setor ${setor.nome_setor}`}
                className="w-48 h-48 object-contain"
              />
            </div>
          </div>

          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-foreground">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              Aponte a câmera do seu celular
            </div>
            <p className="text-[11px] text-muted-foreground">
              Acesse o Padrão Ouro, IT de Limpeza e Ranking sem precisar fazer login.
            </p>
          </div>

          <div className="pt-2 border-t text-[10px] text-muted-foreground flex items-center justify-between">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-emerald-600" /> 5 Sensos Ativos
            </span>
            <span>Maia Consultoria</span>
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="grid grid-cols-2 gap-2 pt-2">
          <Button
            variant="outline"
            onClick={handlePrint}
            className="flex items-center justify-center gap-2"
          >
            <Printer className="h-4 w-4" />
            Imprimir
          </Button>
          <Button
            onClick={handleDownloadPng}
            className="flex items-center justify-center gap-2 text-white"
            style={{ backgroundColor: config.primary_color || "#3E100C" }}
          >
            <Download className="h-4 w-4" />
            Baixar Etiqueta PNG
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}