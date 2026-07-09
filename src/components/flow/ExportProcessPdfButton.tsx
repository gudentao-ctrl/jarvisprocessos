import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import html2canvas from "html2canvas-pro";
import jsPDF from "jspdf";

/* Exporta o documento do processo (cabeçalho + fluxo BPMN + tabelas)
 * capturando o container informado por id. */

export function ExportProcessPdfButton({
  containerId,
  processName,
}: {
  containerId: string;
  processName: string;
}) {
  const [busy, setBusy] = useState(false);

  async function exportPdf() {
    setBusy(true);
    try {
      const root = document.getElementById(containerId);
      if (!root) throw new Error("Container do documento não encontrado");
      const canvas = await html2canvas(root, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
        logging: false,
      });
      const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const imgW = pageW - 20;
      const imgH = (canvas.height * imgW) / canvas.width;

      // Página única com escala fitting; se muito longo, quebra por altura
      if (imgH <= pageH - 20) {
        pdf.addImage(canvas.toDataURL("image/jpeg", 0.92), "JPEG", 10, 10, imgW, imgH);
      } else {
        // multi-página: divide o canvas
        const pageCanvas = document.createElement("canvas");
        pageCanvas.width = canvas.width;
        const perPageH = Math.floor((canvas.width * (pageH - 20)) / imgW);
        pageCanvas.height = perPageH;
        const ctx = pageCanvas.getContext("2d")!;
        let y = 0;
        let first = true;
        while (y < canvas.height) {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
          ctx.drawImage(canvas, 0, -y);
          const slice = pageCanvas.toDataURL("image/jpeg", 0.92);
          if (!first) pdf.addPage();
          pdf.addImage(slice, "JPEG", 10, 10, imgW, pageH - 20);
          first = false;
          y += perPageH;
        }
      }

      const safe = processName.replace(/[^\w\-]+/g, "_").slice(0, 60) || "processo";
      pdf.save(`${safe}.pdf`);
      toast.success("PDF gerado");
    } catch (e: any) {
      console.error("[ExportProcessPdf]", e);
      toast.error(e?.message ?? "Falha ao gerar PDF");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={exportPdf} disabled={busy}>
      {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
      Exportar PDF
    </Button>
  );
}
