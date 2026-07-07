import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import html2canvas from "html2canvas-pro";
import jsPDF from "jspdf";

export function ExportPdfButton({ filename = "relatorio.pdf" }: { filename?: string }) {
  const [busy, setBusy] = useState(false);

  async function exportPdf() {
    setBusy(true);
    try {
      const root = document.getElementById("report-print-root");
      if (!root) throw new Error("Preview não encontrado");
      const pages = Array.from(root.querySelectorAll<HTMLElement>(".report-page"));
      if (!pages.length) throw new Error("Nenhum bloco visível");

      const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();

      for (let i = 0; i < pages.length; i++) {
        // html2canvas-pro supports oklch() colors used by Tailwind v4.
        const canvas = await html2canvas(pages[i], {
          scale: 2,
          backgroundColor: "#ffffff",
          useCORS: true,
          logging: false,
        });
        const img = canvas.toDataURL("image/jpeg", 0.92);
        if (i > 0) pdf.addPage();
        pdf.addImage(img, "JPEG", 0, 0, pageW, pageH, undefined, "FAST");
      }
      pdf.save(filename);
      toast.success("PDF gerado");
    } catch (e: any) {
      console.error("[ExportPdf]", e);
      toast.error(e?.message ?? "Falha ao gerar PDF");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button onClick={exportPdf} disabled={busy}>
      {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
      Exportar PDF
    </Button>
  );
}
